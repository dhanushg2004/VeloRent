export default async (request, context) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ok:false,error:"POST required"}), {status:405,headers:{"content-type":"application/json"}});
  }
  const gasUrl = Netlify.env.get("GAS_WEB_APP_URL");"https://script.google.com/macros/s/AKfycbwWcbP5yzVDKqBX4fNwFHkBXoWtanSSFQOUGMCfvRsYjlxOz8y8auS1fV_0dpELU17O/exec";
  if (!gasUrl || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(gasUrl)) {
    return new Response(JSON.stringify({ok:false,error:"GAS_WEB_APP_URL is missing or invalid in Netlify environment variables."}), {status:500,headers:{"content-type":"application/json"}});
  }
  try {
    const body = await request.text();
    if (body.length > 1_000_000) return new Response(JSON.stringify({ok:false,error:"Request too large"}),{status:413,headers:{"content-type":"application/json"}});
    const upstream = await fetch(gasUrl,{method:"POST",headers:{"content-type":"application/json"},body});
    const text = await upstream.text();
    return new Response(text,{status:200,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
  } catch (e) {
    return new Response(JSON.stringify({ok:false,error:"Could not reach Google Apps Script backend."}),{status:502,headers:{"content-type":"application/json"}});
  }
};
