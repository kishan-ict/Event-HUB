export async function onRequestGet(context) {
  const { request, env, params } = context;
  const slug = params.slug ? params.slug[0] : null;

  // We explicitly fetch the root index.html to avoid 404 status codes on dynamic routes
  const url = new URL(request.url);
  url.pathname = '/';
  const response = await env.ASSETS.fetch(url);

  // If no slug or not a GET request to the event page, return HTML as-is
  if (!slug) return response;

  // We use the environment variables if available in CF, otherwise fallback to the hardcoded keys for this specific project.
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
      if (data && data.length > 0) {
        eventData = data[0];
      }
    }
  } catch (err) {
    // If Supabase fetch fails, we'll just return the standard HTML without custom meta tags
  }

  if (eventData) {
    const name = eventData.name || "EVENT-HUB";
    const desc = eventData.description ? eventData.description.substring(0, 200) : "Join this event on EVENT-HUB";
    const banner = eventData.banner_url || "https://event-aleropath.pages.dev/favicon.png";
    const logo = eventData.logo_url || "/favicon.png";

    // Ensure status is 200 so social scrapers don't ignore it
    const res = new Response(response.body, response);
    res.headers.set("content-type", "text/html;charset=UTF-8");

    // HTMLRewriter runs on the Edge Server and modifies the raw HTML before sending it to the client (or scraper)
    return new HTMLRewriter()
      .on('title', {
        element(e) { e.setInnerContent(`${name} — EVENT-HUB`); }
      })
      .on('meta[name="description"]', {
        element(e) { e.setAttribute("content", desc); }
      })
      .on('link[rel="icon"]', {
        element(e) { e.setAttribute("href", logo); }
      })
      .on('head', {
        element(e) {
          e.append(`<meta property="og:title" content="${name}">`, { html: true });
          e.append(`<meta property="og:description" content="${desc}">`, { html: true });
          e.append(`<meta property="og:image" content="${banner}">`, { html: true });
          e.append(`<meta property="og:type" content="website">`, { html: true });
          
          e.append(`<meta name="twitter:card" content="summary_large_image">`, { html: true });
          e.append(`<meta name="twitter:title" content="${name}">`, { html: true });
          e.append(`<meta name="twitter:description" content="${desc}">`, { html: true });
          e.append(`<meta name="twitter:image" content="${banner}">`, { html: true });
        }
      })
      .transform(res);
  }

  return response;
}
