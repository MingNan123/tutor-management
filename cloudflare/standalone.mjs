import app from './index.js';
export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (['GET','HEAD'].includes(request.method) && (path.startsWith('/_next/') || ['/favicon.svg','/file.svg','/globe.svg','/window.svg'].includes(path))) {
      return env.ASSETS.fetch(request);
    }
    if (['/signin-with-chatgpt','/signout-with-chatgpt','/callback'].includes(path)) {
      return new Response('本独立站使用账号密码登录。首次管理员设置请运行本地 npm run init。', {status:404, headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
    // Only the password session is trusted on standalone Cloudflare hosting.
    const headers = new Headers(request.headers);
    for (const key of [...headers.keys()]) {
      if (key.startsWith('oai-') || key.startsWith('x-oai-')) headers.delete(key);
    }
    const safeRequest = new Request(request, {headers});
    const safeContext = {props:{},waitUntil:ctx.waitUntil.bind(ctx),passThroughOnException:ctx.passThroughOnException.bind(ctx)};
    return app.fetch(safeRequest, env, safeContext);
  }
};
