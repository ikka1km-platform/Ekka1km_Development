/**
 * ============================================================
 * EKKA1KM — CLOUDFLARE WORKER
 * _worker.js
 * 
 * - Serves static frontend assets via env.ASSETS
 * - Intercepts /store/:id, /product/:id, /property/:id, /news/:id routes
 * - Injects item-specific Open Graph & Twitter Card social preview metadata
 * - Normalizes nested asset requests to root
 * - Provides SPA fallback for client-side routing
 * ============================================================
 */

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxYdxeTloiDx986zDV529oi1WfpoUGZ4m58s9Bl6cY92fLYe3qgqHM-mj-bim2tXxvOnw/exec";
const DEFAULT_PREVIEW_IMAGE = "https://dummyimage.com/1200x630/0f9d58/ffffff.png&text=Ekka1km";
const DEFAULT_DESCRIPTION = "Ekka1km — Where Local Life Comes Together. Discover nearby stores, products, properties, and live updates.";

/**
 * Escape HTML characters to prevent XSS / markup corruption
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Extract first valid http/https image URL from various string/array formats
 */
function extractImageUrl(raw) {
  if (!raw) return "";
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr) && arr.length > 0) {
          const first = String(arr[0] || "").trim();
          if (/^https?:\/\//i.test(first)) return first;
        }
      } catch (_) {}
    }
    const parts = trimmed.split(",");
    for (const p of parts) {
      const clean = p.trim();
      if (/^https?:\/\//i.test(clean)) return clean;
    }
  }
  return "";
}

/**
 * Fetch item metadata from Google Apps Script backend
 */
async function fetchItemMetadata(routeType, id, origin) {
  let title = "Ekka1km";
  let description = DEFAULT_DESCRIPTION;
  let image = DEFAULT_PREVIEW_IMAGE;
  let canonicalUrl = `${origin}/${routeType}/${encodeURIComponent(id)}`;
  let ogType = "website";

  try {
    let apiUrl = "";
    if (routeType === "store") {
      apiUrl = `${GAS_API_URL}?action=getstore&businessId=${encodeURIComponent(id)}`;
    } else if (routeType === "product") {
      apiUrl = `${GAS_API_URL}?action=product&id=${encodeURIComponent(id)}`;
    } else if (routeType === "property") {
      apiUrl = `${GAS_API_URL}?action=property&id=${encodeURIComponent(id)}`;
    } else if (routeType === "news") {
      apiUrl = `${GAS_API_URL}?action=article&id=${encodeURIComponent(id)}`;
      ogType = "article";
    }

    if (apiUrl) {
      const apiRes = await fetch(apiUrl, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (apiRes && apiRes.ok) {
        const res = await apiRes.json();
        if (res && res.success && res.data) {
          if (routeType === "store" && res.data.business) {
            const b = res.data.business;
            const name = String(b.Title || b.BusinessName || "Store").trim();
            const category = String(b.Category || "").trim();
            const city = String(b.City || "").trim();
            const desc = String(b.Description || "").trim();
            const cover = extractImageUrl(b.CoverImage || b.Logo);

            title = `${name} — Ekka1km`;
            if (desc) {
              description = desc;
            } else if (category && city) {
              description = `${name} (${category}) in ${city} — on Ekka1km.`;
            } else if (category) {
              description = `${name} (${category}) — on Ekka1km.`;
            } else if (city) {
              description = `${name} in ${city} — on Ekka1km.`;
            }
            if (cover) image = cover;
          } else if (routeType === "product") {
            const p = res.data;
            const name = String(p.Title || "Product").trim();
            const price = p.Price ? Number(p.Price).toLocaleString('en-IN') : "";
            const category = String(p.Category || "").trim();
            const city = String(p.City || "").trim();
            const desc = String(p.Description || "").trim();
            const img = extractImageUrl(p.ImageURL || p.Image2 || p.Images);

            title = price ? `${name} (₹ ${price}) — Ekka1km` : `${name} — Ekka1km`;
            if (desc) {
              description = desc;
            } else if (category && city) {
              description = `${name} (${category}) in ${city}${price ? " • ₹ " + price : ""} — Available on Ekka1km.`;
            } else if (city) {
              description = `${name} in ${city}${price ? " • ₹ " + price : ""} — Available on Ekka1km.`;
            }
            if (img) image = img;
          } else if (routeType === "property") {
            const prop = res.data;
            const name = String(prop.Title || "Property").trim();
            const purpose = prop.Purpose === "Rent" ? "For Rent" : "For Sale";
            const price = prop.Price ? Number(prop.Price).toLocaleString('en-IN') : "";
            const type = String(prop.PropertyType || prop.Type || "").trim();
            const city = String(prop.City || prop.District || "").trim();
            const desc = String(prop.Description || "").trim();
            const img = extractImageUrl(prop.Images || prop.ImageURL || prop.Image);

            title = price ? `${name} (${purpose}: ₹ ${price}) — Ekka1km` : `${name} (${purpose}) — Ekka1km`;
            if (desc) {
              description = desc;
            } else {
              description = [name, purpose, type, city, price ? `₹ ${price}` : ""].filter(Boolean).join(" • ") + " — Available on Ekka1km.";
            }
            if (img) image = img;
          } else if (routeType === "news") {
            const n = res.data;
            const name = String(n.Title || "News").trim();
            const desc = String(n.Description || "").trim();
            const img = extractImageUrl(n.ImageURL);

            title = `${name} — Ekka1km News`;
            if (desc) {
              description = desc.length > 200 ? desc.substring(0, 200) + "..." : desc;
            }
            if (img) image = img;
          }
        }
      }
    }
  } catch (fetchErr) {
    // Gracefully fall back to defaults on timeout or error
  }

  return { title, description, image, canonicalUrl, ogType };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 0. Static asset rewrite: if an asset is requested with an item prefix (e.g. /product/Style.css, /store/App.js)
    const nestedAssetMatch = url.pathname.match(/^\/(?:store|product|products|property|properties|news|article)\/(.+\.[a-zA-Z0-9]+)$/i);
    if (nestedAssetMatch && env && env.ASSETS) {
      const strippedPath = "/" + nestedAssetMatch[1];
      const assetReq = new Request(new URL(strippedPath, request.url), request);
      return env.ASSETS.fetch(assetReq);
    }

    // 1. Intercept clean item routes: /store/:id, /product/:id, /products/:id, /property/:id, /properties/:id, /news/:id, /article/:id
    const itemMatch = url.pathname.match(/^\/(store|product|products|property|properties|news|article)\/([a-zA-Z0-9_-]+)\/?$/i);

    if (itemMatch) {
      const rawRoute = itemMatch[1].toLowerCase();
      const entityId = itemMatch[2];

      // Normalize route type
      let routeType = "store";
      if (rawRoute === "product" || rawRoute === "products") routeType = "product";
      else if (rawRoute === "property" || rawRoute === "properties") routeType = "property";
      else if (rawRoute === "news" || rawRoute === "article") routeType = "news";

      // Fetch base index.html from static assets
      let indexResponse = null;
      if (env && env.ASSETS) {
        try {
          indexResponse = await env.ASSETS.fetch(new Request(new URL('/', request.url), request));
        } catch (e) {
          indexResponse = null;
        }
      }

      if (!indexResponse || !indexResponse.ok) {
        if (env && env.ASSETS) {
          return env.ASSETS.fetch(request);
        }
        return new Response("Page unavailable", { status: 500 });
      }

      let html = await indexResponse.text();

      // Retrieve item metadata from backend Google Apps Script API
      const meta = await fetchItemMetadata(routeType, entityId, url.origin);

      // Build crawler-accessible Open Graph & Twitter Card metadata tags
      const metaTags = [
        `  <title>${escapeHtml(meta.title)}</title>`,
        `  <meta name="description" content="${escapeHtml(meta.description)}">`,
        `  <link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}">`,
        `  <meta property="og:site_name" content="Ekka1km">`,
        `  <meta property="og:type" content="${escapeHtml(meta.ogType || 'website')}">`,
        `  <meta property="og:title" content="${escapeHtml(meta.title)}">`,
        `  <meta property="og:description" content="${escapeHtml(meta.description)}">`,
        `  <meta property="og:image" content="${escapeHtml(meta.image)}">`,
        `  <meta property="og:image:secure_url" content="${escapeHtml(meta.image)}">`,
        `  <meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}">`,
        `  <meta name="twitter:card" content="summary_large_image">`,
        `  <meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
        `  <meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
        `  <meta name="twitter:image" content="${escapeHtml(meta.image)}">`
      ].join("\n");

      // Replace existing <title> and baseline og/twitter tags if present
      html = html.replace(/<title>.*?<\/title>/i, "");
      html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, "");
      html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "");
      html = html.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "");

      if (!/<base\s+href=/i.test(html)) {
        html = html.replace(/<head>/i, '<head>\n<base href="/">');
      }

      if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, metaTags + "\n</head>");
      } else {
        html = metaTags + "\n" + html;
      }

      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=60, s-maxage=300"
        }
      });
    }

    // 2. Static asset request handling with SPA fallback
    if (!env || !env.ASSETS) {
      return new Response("Asset handler unavailable", { status: 500 });
    }

    let response = await env.ASSETS.fetch(request);

    // If static asset not found and request is for a page navigation (GET without file extension),
    // serve index.html (SPA fallback)
    if (response.status === 404 && request.method === "GET") {
      const accept = request.headers.get("accept") || "";
      if (accept.includes("text/html") || !url.pathname.includes(".")) {
        response = await env.ASSETS.fetch(new Request(new URL('/', request.url), request));
      }
    }

    return response;
  }
};