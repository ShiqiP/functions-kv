export async function onRequest({ request, params, env }) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    if (request.method === 'POST') {
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

      // Get the KV namespace from env
      const kv = env[namespace];

      if (!kv) {
        return new Response(
          JSON.stringify({ 
            error: `KV namespace "${namespace}" not found in environment bindings`,
            note: 'Make sure the namespace is configured in EdgeOne Pages settings'
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

      // Add all entries to KV
      let count = 0;
      const results = [];
      
      for (const entry of entries) {
        try {
          await kv.put(entry.key, entry.value);
          count++;
          results.push({ key: entry.key, status: 'success' });
        } catch (err) {
          results.push({ key: entry.key, status: 'failed', error: err.message });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          count,
          namespace,
          message: `Successfully added ${count} entries to namespace "${namespace}"`,
          results
        }),
        {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );

    } else if (request.method === 'GET') {
      // Get entries from KV storage (for debugging)
      const url = new URL(request.url);
      const namespace = url.searchParams.get('namespace');
      const key = url.searchParams.get('key');

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

      const kv = env[namespace];

      if (!kv) {
        return new Response(
          JSON.stringify({ 
            error: `KV namespace "${namespace}" not found in environment bindings` 
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

      if (key) {
        // Get specific key
        const value = await kv.get(key);
        
        if (!value) {
          return new Response(
            JSON.stringify({ error: `Key "${key}" not found in namespace "${namespace}"` }),
            {
              status: 404,
              headers: {
                'content-type': 'application/json; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }

        return new Response(
          JSON.stringify({
            namespace,
            key,
            value: JSON.parse(value)
          }),
          {
            headers: {
              'content-type': 'application/json; charset=UTF-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } else {
        // List all keys (if KV supports listing)
        return new Response(
          JSON.stringify({
            namespace,
            message: 'Listing all keys is not supported. Please provide a specific key parameter.'
          }),
          {
            headers: {
              'content-type': 'application/json; charset=UTF-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    } else {
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
