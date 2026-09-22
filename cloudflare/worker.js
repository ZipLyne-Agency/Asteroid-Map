// Host redirects that Vercel's domain settings used to do, then the OpenNext app.
import handler from "../.open-next/worker.js";

const REDIRECTS = {"asteroidmap.com": "www.asteroidmap.com"};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const target = REDIRECTS[url.hostname];
    if (target) {
      url.hostname = target;
      return Response.redirect(url.toString(), 308);
    }
    return handler.fetch(request, env, ctx);
  },
};
