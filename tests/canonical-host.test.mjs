import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Stub only the generated application and image handler; execute the edge router.
const source = readFileSync(new URL('../cloudflare/worker.js', import.meta.url), 'utf8')
  .replace(/import handler from [^;]+;/, 'const handler = { fetch: () => new Response("application") };')
  .replace(/import \{ serveSiteImage \} from [^;]+;/, 'const serveSiteImage = async () => null;');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('alternate hosts redirect directly to the declared canonical host', async () => {
  for (const host of ['asteroidmap.com']) {
    const response = await worker.fetch(new Request(`https://${host}/example?src=test`), {}, {});
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('Location'), 'https://www.asteroidmap.com/example?src=test');
  }
});

test('canonical host serves the application without a redirect loop', async () => {
  const response = await worker.fetch(new Request('https://www.asteroidmap.com/'), {}, {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'application');
});
