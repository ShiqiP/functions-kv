export async function onRequest({ request, params, env }) {
  try {
    
    async function lookupPolicy(){
      const policyID = 278664
      const result = await ER_lookup.list({});
      const keys = result.keys;
      for(let i = 0; i < keys.length; i++){
        const key = keys[i].key;
        const value = await ER_lookup.get(key);
        if(value == policyID) return key;
      }
      return null
    }
    const res = await lookupPolicy();
    console.log(res)
    return new Response("ok11", {
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        error: "KV storage hasn't been set up for your EdgeOne Pages Project.",
      }),
      {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// export async function onRequest({ request, params, env }) {
//   try {
    
//     const visitCount = await my_kv.get('visitCount');
//     console.log("visitCount",visitCount);
//     console.log("psq");
//     let visitCountInt = Number(visitCount);
//     visitCountInt += 1;
//     await my_kv.put('visitCount', visitCountInt.toString());

//     const res = JSON.stringify({
//       visitCount: visitCountInt,
//     });

//     return new Response(res, {
//       headers: {
//         'content-type': 'application/json; charset=UTF-8',
//         'Access-Control-Allow-Origin': '*',
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     return new Response(
//       JSON.stringify({
//         error: "KV storage hasn't been set up for your EdgeOne Pages Project.",
//       }),
//       {
//         headers: {
//           'content-type': 'application/json; charset=UTF-8',
//           'Access-Control-Allow-Origin': '*',
//         },
//       }
//     );
//   }
// }
