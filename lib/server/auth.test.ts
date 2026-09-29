import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { authorize, loggedInUser } from './auth';

const request = (headers: Record<string, string>) =>
  new NextRequest('https://share.example/api/channels', { method: 'POST', headers });

describe('authorize', () => {
  it('accepts same-origin requests from a logged-in user', () => {
    const r = request({ 'sec-fetch-site': 'same-origin', 'x-forwarded-user': 'anna' });
    expect(authorize(r)).toEqual({ user: 'anna' });
  });

  it('refuses cross-site requests even with a user', () => {
    const r = request({ 'sec-fetch-site': 'cross-site', 'x-forwarded-user': 'anna' });
    expect('error' in authorize(r) && authorize(r)).toBeTruthy();
  });

  it('falls back to the Origin header when Fetch Metadata is missing', () => {
    const same = request({
      origin: 'https://share.example',
      host: 'share.example',
      'x-forwarded-user': 'anna',
    });
    const other = request({
      origin: 'https://evil.example',
      host: 'share.example',
      'x-forwarded-user': 'anna',
    });
    const opaque = request({ origin: 'null', host: 'share.example', 'x-forwarded-user': 'anna' });
    expect(authorize(same)).toEqual({ user: 'anna' });
    expect('error' in authorize(other)).toBe(true);
    expect('error' in authorize(opaque)).toBe(true);
  });

  it('refuses requests without a valid user', () => {
    expect('error' in authorize(request({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
    const proto = request({ 'sec-fetch-site': 'same-origin', 'x-forwarded-user': '__proto__' });
    expect('error' in authorize(proto)).toBe(true);
    expect(loggedInUser(new Headers({ 'x-forwarded-user': 'Anna Admin' }))).toBeUndefined();
  });
});
