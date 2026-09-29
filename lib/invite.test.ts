import { beforeAll, describe, expect, it } from 'vitest';
import { createInvite, createMemberInvite, verifyInvite } from './invite';

describe('invite', () => {
  beforeAll(() => {
    process.env.LIVEKIT_API_SECRET = 'test-secret';
  });

  it('accepts a guest invite for the room it was created for', () => {
    expect(verifyInvite('abcd-efgh', createInvite('abcd-efgh'))).toEqual({});
  });

  it('accepts a member invite and returns the member', () => {
    expect(verifyInvite('lounge-k3f9x2', createMemberInvite('lounge-k3f9x2', 'anna'))).toEqual({
      user: 'anna',
    });
  });

  it('rejects an invite for another room', () => {
    expect(verifyInvite('other-room', createInvite('abcd-efgh'))).toBeUndefined();
    expect(verifyInvite('other-room', createMemberInvite('lounge', 'anna'))).toBeUndefined();
  });

  it('rejects expired invites', () => {
    expect(verifyInvite('abcd-efgh', createInvite('abcd-efgh', 0))).toBeUndefined();
    const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;
    expect(verifyInvite('lounge', createMemberInvite('lounge', 'anna', elevenMinutesAgo))).toBe(
      undefined,
    );
  });

  it('rejects an invite with a moved expiry', () => {
    const [expiresAt, signature] = createInvite('abcd-efgh').split('.');
    const extended = `${Number(expiresAt) + 3600}.${signature}`;
    expect(verifyInvite('abcd-efgh', extended)).toBeUndefined();
  });

  it('rejects a member invite with another user swapped in', () => {
    const [expiresAt, , signature] = createMemberInvite('lounge', 'anna').split('.');
    expect(verifyInvite('lounge', `${expiresAt}.bo.${signature}`)).toBeUndefined();
  });

  it('rejects a guest signature presented as a member invite', () => {
    const [expiresAt, signature] = createInvite('lounge').split('.');
    expect(verifyInvite('lounge', `${expiresAt}.anna.${signature}`)).toBeUndefined();
  });

  it('rejects malformed invites', () => {
    expect(verifyInvite('abcd-efgh', '')).toBeUndefined();
    expect(verifyInvite('abcd-efgh', 'garbage')).toBeUndefined();
    expect(verifyInvite('abcd-efgh', '9999999999.')).toBeUndefined();
    expect(verifyInvite('abcd-efgh', '9999999999..')).toBeUndefined();
  });
});
