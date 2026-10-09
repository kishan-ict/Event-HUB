export async function onRequestGet(context) {
  const { request, env, params } = context;
  const slug = params.slug ? params.slug[0] : null;
  const reqUrl = new URL(request.url);

  // We explicitly fetch the root index.html to avoid 404 status codes on dynamic routes
  const assetUrl = new URL(request.url);
  assetUrl.pathname = '/';
  const response = await env.ASSETS.fetch(assetUrl);

  // If no slug or not a GET request to the event page, return HTML as-is
  if (!slug) return response;

  const SUPABASE_URL = env.VITE_SUPABASE_URL || "https://exhlbxumcsdigtgreiit.supabase.co";
  const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4aGxieHVtY3NkaWd0Z3JlaWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTc2NjEsImV4cCI6MjEwNjc5MzY2MX0.Z-VbWOIORCRTpnYg4aD5cLh4JnS_muubxEt-1QDEBuk";

  let eventData = null;
  try {
    const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/events?slug=eq.${slug}&select=name,description,banner_url,logo_url`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });
    if (supabaseRes.ok) {
      const data = await supabaseRes.json();
      if (data && data.length > 0) eventData = data[0];
    }
  } catch (err) {}

  if (eventData) {
    const name = eventData.name || "EVENT-HUB";
    const desc = eventData.description ? eventData.description.substring(0, 200) : "Join this event on EVENT-HUB";
    const banner = eventData.banner_url || "https://event-aleropath.pages.dev/favicon.png";
    const logo = eventData.logo_url || "/favicon.png";
    const fullUrl = reqUrl.origin + reqUrl.pathname;

    const res = new Response(response.body, response);
    res.headers.set("content-type", "text/html;charset=UTF-8");

    return new HTMLRewriter()
      .on('title', { element(e) { e.setInnerContent(`${name} — EVENT-HUB`); } })
      .on('meta[name="description"]', { element(e) { e.setAttribute("content", desc); } })
      .on('link[rel="icon"]', { element(e) { e.setAttribute("href", logo); } })
      .on('head', {
        element(e) {
          e.append(`<meta property="og:title" content="${name}">`, { html: true });
          e.append(`<meta property="og:description" content="${desc}">`, { html: true });
          e.append(`<meta property="og:image" content="${banner}">`, { html: true });
          e.append(`<meta property="og:type" content="website">`, { html: true });
          e.append(`<meta property="og:url" content="${fullUrl}">`, { html: true });
          e.append(`<meta property="og:site_name" content="EVENT-HUB">`, { html: true });
          
          e.append(`<meta name="twitter:card" content="summary_large_image">`, { html: true });
          e.append(`<meta name="twitter:title" content="${name}">`, { html: true });
          e.append(`<meta name="twitter:description" content="${desc}">`, { html: true });
          e.append(`<meta name="twitter:image" content="${banner}">`, { html: true });
          e.append(`<meta name="twitter:domain" content="${reqUrl.hostname}">`, { html: true });
          e.append(`<meta name="twitter:url" content="${fullUrl}">`, { html: true });
        }
      })
      .transform(res);
  }

  return response;
}
