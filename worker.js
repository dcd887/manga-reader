/**
 * 漫览 · MangaDex 图源代理
 * 部署为 Cloudflare Worker 后，你的漫画阅读器在任何网络下都能访问图源。
 * 部署步骤见 README.md
 */
const TARGET = "https://api.mangadex.org";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // 兼容两种用法：https://你的worker/ 或 https://你的worker/https://api.mangadex.org/xxx
    let rest = url.pathname.slice(1) + url.search;
    let targetUrl;
    if (rest.startsWith("http")) {
      targetUrl = rest;
    } else {
      targetUrl = TARGET + "/" + rest;
    }
    const target = new URL(targetUrl);

    // 透传方法、body 和必要的请求头
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("origin");

    const init = {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    };

    let resp;
    try {
      resp = await fetch(target, init);
    } catch (e) {
      return new Response(JSON.stringify({ error: "upstream error: " + e.message }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    // 允许任意来源跨域访问
    const newHeaders = new Headers(resp.headers);
    newHeaders.set("access-control-allow-origin", "*");
    newHeaders.set("access-control-allow-methods", "GET, POST, OPTIONS");
    newHeaders.set("access-control-allow-headers", "content-type, user-agent");
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: newHeaders });
    }
    return new Response(resp.body, { status: resp.status, headers: newHeaders });
  },
};
