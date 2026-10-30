/**
 * hi — suites dictionary (seva suggestions catalog, samskara,
 * goshala, matha, pathshala and the remaining suite desks). Split
 * into suitesA/suitesB for transport size — the single file passed
 * the 131,072-byte connector push cap (hi was 128,575 B) —
 * and merged back here: the loader and importers keep seeing one
 * `suites` object. Standing rule: no dictionary file may approach
 * the cap; split by whole suite-key groups behind a merging barrel.
 */
import { suitesA } from './suitesA';
import { suitesB } from './suitesB';

export const suites = { ...suitesA, ...suitesB };
