export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/nextdns')) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
        'Access-Control-Max-Age': '86400',
      };

      // Handle CORS preflight locally without hitting NextDNS API
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      const subPath = url.pathname.replace(/^\/api\/nextdns/, '');
      const targetUrl = `https://nextdns.io${subPath}${url.search}`;

      // Forward only required headers from client
      const forwardHeaders = new Headers({
        'Accept': 'application/json',
        'User-Agent': 'NextDNS-Live-Proxy/1.0'
      });
      const apiKey = request.headers.get('X-Api-Key');
      if (apiKey) forwardHeaders.set('X-Api-Key', apiKey);
      if (request.headers.has('Content-Type')) {
        forwardHeaders.set('Content-Type', request.headers.get('Content-Type'));
      }

      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: forwardHeaders,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
          redirect: 'follow'
        });

        const resHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => resHeaders.set(k, v));

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: resHeaders
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Proxy failed', message: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
