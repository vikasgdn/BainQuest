import type { LocalDate, ProfileId } from '../models/types';

/* eslint-disable no-bitwise -- FNV-1a requires 32-bit integer operations. */

/** FNV-1a over stable UTF-16 code units; persisted plans remain authoritative. */
export function dailySeed(
  profileId: ProfileId,
  date: LocalDate,
  contentVersion: number,
): number {
  if (!profileId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError('profile ID and local date are required');
  }
  if (!Number.isSafeInteger(contentVersion) || contentVersion < 1) {
    throw new RangeError('content version must be a positive integer');
  }
  const text = `${profileId}|${date}|${contentVersion}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return hash >>> 0;
}
