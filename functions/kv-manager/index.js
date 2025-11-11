export async function onRequest({ request, params, env }) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    if (request.method === 'GET') {
      // Get entries from KV storage
      const url = new URL(request.url);
      const namespace = url.searchParams.get('namespace');

      if (!namespace) {
        return new Response(
          JSON.stringify({ error: 'Namespace parameter is required' }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json; charset=UTF-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Get policy data based on namespace
      let policyData = null;
      let result = null;
      
      switch (namespace) {
        case '1':
          policyData = await ER_1.get('policy');
          if (!policyData) result = await ER_1.list({});
          break;
        case '2':
          policyData = await ER_2.get('policy');
          if (!policyData) result = await ER_2.list({});
          break;
        case '3':
          policyData = await ER_3.get('policy');
          if (!policyData) result = await ER_3.list({});
          break;
        case '4':
          policyData = await ER_4.get('policy');
          if (!policyData) result = await ER_4.list({});
          break;
        case '5':
          policyData = await ER_5.get('policy');
          if (!policyData) result = await ER_5.list({});
          break;
        case '6':
          policyData = await ER_6.get('policy');
          if (!policyData) result = await ER_6.list({});
          break;
        case '7':
          policyData = await ER_7.get('policy');
          if (!policyData) result = await ER_7.list({});
          break;
        case '8':
          policyData = await ER_8.get('policy');
          if (!policyData) result = await ER_8.list({});
          break;
        case '9':
          policyData = await ER_9.get('policy');
          if (!policyData) result = await ER_9.list({});
          break;
        default:
          return new Response(
            JSON.stringify({ error: `Invalid namespace: ${namespace}` }),
            {
              status: 400,
              headers: {
                'content-type': 'application/json; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
      }

      // First, check if there's a 'policy' key
      if (policyData) {
        // Policy exists, return it
        try {
          const policies = JSON.parse(policyData);
          return new Response(
            JSON.stringify({
              success: true,
              namespace,
              hasPolicy: true,
              policies: Array.isArray(policies) ? policies : [],
              count: Array.isArray(policies) ? policies.length : 0
            }),
            {
              headers: {
                'content-type': 'application/json; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        } catch (e) {
          console.error('Error parsing policy data:', e);
        }
      }

      // No policy key, traverse all entries
      if (result && result.keys && result.keys.length > 0) {
        const keys = result.keys;
        const policies = [];

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i].key;  // Fixed: was keys[i].name
          if (key === 'policy') continue; // Skip the policy key itself
          
          let value = null;
          switch (namespace) {
            case '1':
              value = await ER_1.get(key);
              break;
            case '2':
              value = await ER_2.get(key);
              break;
            case '3':
              value = await ER_3.get(key);
              break;
            case '4':
              value = await ER_4.get(key);
              break;
            case '5':
              value = await ER_5.get(key);
              break;
            case '6':
              value = await ER_6.get(key);
              break;
            case '7':
              value = await ER_7.get(key);
              break;
            case '8':
              value = await ER_8.get(key);
              break;
            case '9':
              value = await ER_9.get(key);
              break;
          }
          
          if (value) {
            try {
              const parsedValue = JSON.parse(value);
              policies.push(parsedValue);
            } catch (e) {
              console.error(`Error parsing value for key ${key}:`, e);
            }
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            namespace,
            hasPolicy: false,
            policies,
            count: policies.length
          }),
          {
            headers: {
              'content-type': 'application/json; charset=UTF-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // If we reach here, no data found at all
      return new Response(
        JSON.stringify({
          success: true,
          namespace,
          hasPolicy: false,
          policies: [],
          count: 0
        }),
        {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );

    } else if (request.method === 'POST') {
      // Add entries to KV storage
      const { namespace, entries } = await request.json();

      if (!namespace || typeof namespace !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Namespace is required and must be a string' }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json; charset=UTF-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      if (!Array.isArray(entries) || entries.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Entries must be a non-empty array' }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json; charset=UTF-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Validate entries
      for (const entry of entries) {
        if (!entry.key || !entry.value) {
          return new Response(
            JSON.stringify({ error: 'Each entry must have a key and value' }),
            {
              status: 400,
              headers: {
                'content-type': 'application/json; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }
      }

      // Add all entries to KV
      const results = [];
      for (const entry of entries) {
        try {
          switch (namespace) {
            case '1':
              console.log(entry)
              await ER_1.put(entry.key, entry.value);
              results.push({ key: entry.key, status: 'success' });
              break;
            case '2':
              await ER_2.put(entry.key, entry.value);
              results.push({ key: entry.key, status: 'success' });
              break;
            case '3':
              await ER_3.put(entry.key, entry.value);
              results.push({ key: entry.key, status: 'success' });
              break;
            case '4':
              await ER_4.put(entry.key, entry.value);
              results.push({ key: entry.key, status: 'success' });
              break;
            case '5':
              await ER_5.put(entry.key, entry.value);
              results.push({ key: entry.key, status: 'success' });
              break;
            case '6':
              await ER_6.put(entry.key, entry.value);
              results.push({ key: entry.key, status: 'success' });
              break;
            case '7':
              await ER_7.put(entry.key, entry.value);
              results.push({ key: entry.key, status: 'success' });
              break;
            case '8':
              await ER_8.put(entry.key, entry.value);
              results.push({ key: entry.key, status: 'success' });
              break;
            case '9':
              await ER_9.put(entry.key, entry.value);
              results.push({ key: entry.key, status: 'success' });
              break;
            default:
              break;
          }
        } catch (err) {
          results.push({ key: entry.key, status: 'failed', error: err.message });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          namespace,
          message: `Successfully added to ER_${namespace}"`,
          results
        }),
        {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );

    } 
    else if (request.method === 'PUT') {
      // Update policy array in KV storage
      const { namespace, policies } = await request.json();

      if (!namespace || typeof namespace !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Namespace is required and must be a string' }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json; charset=UTF-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      if (!Array.isArray(policies)) {
        return new Response(
          JSON.stringify({ error: 'Policies must be an array' }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json; charset=UTF-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Store the policies array as 'policy' key
      try {
        const policyString = JSON.stringify(policies);
        
        switch (namespace) {
          case '1':
            await ER_1.put('policy', policyString);
            break;
          case '2':
            await ER_2.put('policy', policyString);
            break;
          case '3':
            await ER_3.put('policy', policyString);
            break;
          case '4':
            await ER_4.put('policy', policyString);
            break;
          case '5':
            await ER_5.put('policy', policyString);
            break;
          case '6':
            await ER_6.put('policy', policyString);
            break;
          case '7':
            await ER_7.put('policy', policyString);
            break;
          case '8':
            await ER_8.put('policy', policyString);
            break;
          case '9':
            await ER_9.put('policy', policyString);
            break;
          default:
            return new Response(
              JSON.stringify({ error: `Invalid namespace: ${namespace}` }),
              {
                status: 400,
                headers: {
                  'content-type': 'application/json; charset=UTF-8',
                  'Access-Control-Allow-Origin': '*',
                },
              }
            );
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            namespace,
            message: `Successfully updated policy in ER_${namespace}`,
            count: policies.length
          }),
          {
            headers: {
              'content-type': 'application/json; charset=UTF-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update policy',
            details: err.message 
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
    else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

  } catch (error) {
    console.error('KV Manager Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
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
