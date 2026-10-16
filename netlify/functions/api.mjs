
export default async (request, context) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "POST required" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const gasUrl = Netlify.env.get("GAS_WEB_APP_URL");

  if (
    !gasUrl ||
    !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(gasUrl)
  ) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "GAS_WEB_APP_URL is missing or invalid in environment variables."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const body = await request.text();

    if (body.length > 1_000_000) {
      return new Response(
        JSON.stringify({ ok: false, error: "Request too large" }),
        {
          status: 413,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const upstream = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    const responseText = await upstream.text();

    return new Response(responseText, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Could not reach Google Apps Script backend."
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
