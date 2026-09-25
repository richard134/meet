import { beforeAll, describe, expect, it } from 'vitest';
import { createInvite, isValidInvite } from './invite';

describe('invite', () => {
  beforeAll(() => {
    process.env.LIVEKIT_API_SECRET = 'test-secret';
  });

  it('accepts an invite for the room it was created for', () => {
    expect(isValidInvite('abcd-efgh', createInvite('abcd-efgh'))).toBe(true);
  });

  it('rejects an invite for another room', () => {
    expect(isValidInvite('other-room', createInvite('abcd-efgh'))).toBe(false);
  });

  it('rejects an expired invite', () => {
    const invite = createInvite('abcd-efgh', 0);
    expect(isValidInvite('abcd-efgh', invite)).toBe(false);
  });

  it('rejects an invite with a moved expiry', () => {
    const [expiresAt, signature] = createInvite('abcd-efgh').split('.');
    const extended = `${Number(expiresAt) + 3600}.${signature}`;
    expect(isValidInvite('abcd-efgh', extended)).toBe(false);
  });

  it('rejects malformed invites', () => {
    expect(isValidInvite('abcd-efgh', '')).toBe(false);
    expect(isValidInvite('abcd-efgh', 'garbage')).toBe(false);
    expect(isValidInvite('abcd-efgh', '9999999999.')).toBe(false);
  });
});
