import assert from 'node:assert/strict';
import test from 'node:test';

import { getSiteUrl } from '../lib/site.ts';

test('canonical site URL is normalized to a safe origin', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = '  https://example.com/some/path/  ';
  try {
    assert.equal(getSiteUrl(), 'https://example.com');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});

test('invalid canonical site URL falls back to production origin', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = 'javascript:alert(1)';
  try {
    assert.equal(getSiteUrl(), 'https://asteroidmap.com');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});
