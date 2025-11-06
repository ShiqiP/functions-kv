// EdgeRedirector API
// Input: requestURL, policyID (via query params or POST body)
// Output: { status_code, redirectURL }

// Utility functions from edgeRediretor.js
const Utils = {
  wildcardToRegex: (pattern) => {
    return pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
  },
  isMatch: (value, pattern, caseSensitive = false, isWildcard = true) => {
    if (!isWildcard) {
      return caseSensitive ? value === pattern : value.toLowerCase() === pattern.toLowerCase();
    }
    const regexPattern = Utils.wildcardToRegex(pattern);
    const regex = new RegExp(`^${regexPattern}$`, caseSensitive ? '' : 'i');
    return regex.test(value);
  }
};

// Helper function to hex encode a string (Web Standard API)
function hexEncode(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Matching functions
const matchesURL = (rule, requestURL) => !rule.matchURL || rule.matchURL === requestURL;
const matchesScheme = (rule, s) => !rule.scheme || String(rule.scheme).toLowerCase() === String(s).toLowerCase();
const matchesHost = (rule, h) => {
  if (!rule.host) return true;
  const allowed = String(rule.host).toLowerCase().split(/\s+/).filter(Boolean);
  return allowed.includes(h);
};
const matchesPath = (rule, p) => {
  if (!rule.path) return true;
  const allowed = String(rule.path).split(/\s+/).filter(Boolean);
  return allowed.some(pattern => {
    const regex = new RegExp(`^${Utils.wildcardToRegex(pattern)}$`);
    return regex.test(p);
  });
};
const matchesQuery = (ruleQuery, incomingQuery) => {
  if (!ruleQuery || ruleQuery === "") return true;

  const parts = ruleQuery.split('=');
  if (parts.length !== 2) {
    console.error("Rule query format error: Must be key=value.", ruleQuery);
    return false;
  }

  const ruleKey = parts[0].trim();
  const ruleValuePattern = parts[1].trim();

  if (!incomingQuery || incomingQuery === "") return false;

  const params = new URLSearchParams(incomingQuery);
  if (!params.has(ruleKey)) return false;

  const incomingValues = params.getAll(ruleKey);
  for (const value of incomingValues) {
    if (ruleValuePattern === "*" && value.length === 0) continue;
    if (Utils.isMatch(value, ruleValuePattern, false, true)) return true;
  }
  return false;
};

const processRegexMatch = (rule, url) => {
  let regexPattern = rule.regex;
  const cleanPattern = regexPattern.replace(/\\\//g, '/');

  let regex;
  try {
    regex = new RegExp(cleanPattern);
  } catch (e) {
    console.error("Invalid regex pattern provided:", cleanPattern, e);
    return null;
  }

  const match = url.match(regex);
  if (!match) return null;

  let finalRedirectURL = rule.redirectURL;
  for (let i = 1; i < match.length; i++) {
    const placeholder = new RegExp(`\\\\${i}`, 'g');
    finalRedirectURL = finalRedirectURL.replace(placeholder, match[i] || '');
  }

  if (String(rule.useIncomingQueryString) === '1') {
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = url.substring(queryIndex);
      finalRedirectURL += queryString;
    }
  }

  return finalRedirectURL;
};

export async function onRequest({ request, params, env }) {
  try {
    // Parse input from query params or POST body
    let requestURL, policyID;
    if (request.method === 'POST') {
      const body = await request.json();
      requestURL = body.requestURL;
      policyID = body.policyID;
    } else {
      // Handle both absolute and relative URLs
      let url;
      try {
        url = new URL(request.url);
      } catch (e) {
        // If request.url is relative, create a URL with a base
        url = new URL(request.url, 'http://localhost');
      }
      requestURL = url.searchParams.get('requestURL');
      policyID = url.searchParams.get('policyID');
    }

    if (!requestURL || !policyID) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters: requestURL and policyID'
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Parse the request URL first
    const urlObj = new URL(requestURL);
    const scheme = urlObj.protocol.replace(':', '');
    const host = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname;
    const query = urlObj.search.substring(1); // Remove leading '?'

    // Hex encode the path - this will be the KV key
    const hexEncodedPath = hexEncode(path);

    // Get the KV namespace binding for this policy
    const kvNamespace = `ER_${policyID}`;

    // Use mock KV for development if the namespace is not available
    const mockKV = {
      storage: new Map([
        // /reservation/lookupReservation.mi
        [hexEncode('/reservation/lookupReservation.mi'), JSON.stringify({
          "ruleName": "/reservation/findReservationDetail.mi",
          "header": "",
          "path": "/reservation/lookupReservation.mi",
          "query": "r=*",
          "regex": "",
          "useIncomingQueryString": 1,
          "useRelativeUrl": "relative_url",
          "redirectURL": "/reservation/findReservationDetail.mi",
          "statusCode": 302
        })],
        // /reservation/upgradeReservation.mi
        [hexEncode('/reservation/upgradeReservation.mi'), JSON.stringify({
          "ruleName": "/phoenix-reservation/upsell/v1/upgradeReservation",
          "header": "",
          "path": "/reservation/upgradeReservation.mi",
          "query": "r=*",
          "regex": "",
          "useIncomingQueryString": 1,
          "useRelativeUrl": "relative_url",
          "redirectURL": "/phoenix-reservation/upsell/v1/upgradeReservation",
          "statusCode": 302
        })],
        // /search/submitSearch.mi
        [hexEncode('/search/submitSearch.mi'), JSON.stringify({
          "ruleName": "/search/findHotels.mi",
          "header": "",
          "path": "/search/submitSearch.mi",
          "query": "",
          "regex": "",
          "useIncomingQueryString": 1,
          "useRelativeUrl": "relative_url",
          "redirectURL": "/search/findHotels.mi",
          "statusCode": 302
        })]
      ]),
      async get(key) {
        return this.storage.get(key) || null;
      },
      async put(key, value) {
        this.storage.set(key, value);
      }
    };
    // Access the KV namespace from env
    const kv = env[kvNamespace] || mockKV;

    // Step 1: Check if there's a full policy array stored with key "policy"
    let matchedRule = null;
    let redirectURL = null;
    
    const policyData = await kv.get('policy');
    
    if (policyData) {
      // Policy array exists - traverse it like in edgeRediretor.js
      try {
        const rules = JSON.parse(policyData);
        
        if (Array.isArray(rules) && rules.length > 0) {
          // Traverse all rules to find a match
          for (let index = 0; index < rules.length; index++) {
            let rule = rules[index];

            if (rule.disabled) continue;
            if (!matchesURL(rule, requestURL)) continue;
            if (!matchesScheme(rule, scheme)) continue;
            if (!matchesHost(rule, host)) continue;
            if (!matchesPath(rule, path)) continue;
            if (!matchesQuery(rule.query, query)) continue;

            // Found a matching rule
            if (rule.regex) {
              redirectURL = processRegexMatch(rule, requestURL);
              if (!redirectURL) continue;
            }

            redirectURL = redirectURL || rule.redirectURL;
            if (!redirectURL) continue;

            matchedRule = rule;
            break;
          }
        }
      } catch (e) {
        console.error('Error parsing policy array:', e);
      }
    }
    
    // Step 2: If no policy or no match found, try hex-encoded path lookup
    if (!matchedRule) {
      const ruleData = await kv.get(hexEncodedPath);
      
      if (ruleData) {
        try {
          matchedRule = JSON.parse(ruleData);
          
          // Process the rule
          if (matchedRule.regex) {
            redirectURL = processRegexMatch(matchedRule, requestURL);
          }
          redirectURL = redirectURL || matchedRule.redirectURL;
        } catch (e) {
          console.error('Error parsing rule data:', e);
        }
      }
    }

    // Step 3: If still no rule found, return 404
    if (!matchedRule || !redirectURL) {
      return new Response(
        JSON.stringify({
          error: `No redirect rule found for the given path`,
          kvNamespace: kvNamespace,
          hexEncodedPath: hexEncodedPath,
          originalPath: path,
          message: policyData ? 'Policy exists but no matching rule found' : 'No policy or individual rule found'
        }),
        {
          status: 404,
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Step 4: Build final redirect URL
    let redirectObj;
    try {
      redirectObj = new URL(redirectURL);
    } catch (e) {
      redirectObj = new URL(redirectURL, `${scheme}://${host}`);
    }

    let finalProtocol = redirectObj.protocol || `${scheme}:`;
    let finalHost = redirectObj.hostname || host;
    let finalPath = redirectObj.pathname;
    let finalSearch = String(matchedRule.useIncomingQueryString) === '1' && query && !redirectURL.includes('?')
      ? `?${query}`
      : redirectObj.search;

    let statusCode = parseInt(matchedRule.statusCode, 10) || 302;
    let finalRedirectURL = `${finalProtocol}//${finalHost}${finalPath}${finalSearch}`;

    return new Response(
      JSON.stringify({
        status_code: statusCode,
        redirectURL: finalRedirectURL,
        matchedRule: matchedRule.ruleName || 'unnamed',
        hexEncodedPath: hexEncodedPath,
        lookupMethod: policyData ? 'policy_array' : 'hex_encoded_path'
      }),
      {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (err) {
    console.error('EdgeRedirector API error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err.message,
        stack: err.stack
      }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
