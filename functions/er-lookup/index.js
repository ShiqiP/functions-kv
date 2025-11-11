export async function onRequest({ request, env }) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    if (request.method === 'GET') {
      // Fetch all ER_lookup entries
      const result = await ER_lookup.list({});
      const keys = result.keys;

      const options = [];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i].key;
        const value = await ER_lookup.get(key);
        
        options.push({
          key: key,
          value: value,
          label: `ER_${key} - ${value}`
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          options
        }),
        {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } else if (request.method === 'PUT') {
      // Update ER_lookup entries
      const { entries } = await request.json();

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

      // Update all entries in ER_lookup
      const results = [];
      for (const entry of entries) {
        try {
          await ER_lookup.put(entry.key, entry.value);
          results.push({ key: entry.key, status: 'success' });
        } catch (err) {
          results.push({ key: entry.key, status: 'failed', error: err.message });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: entries.length,
          message: `Successfully updated ${entries.length} entries`,
          results
        }),
        {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
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
    console.error('ER Lookup Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
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
