/**
 * ml — suites dictionary (seva suggestions catalog, samskara,
 * goshala, matha, pathshala desks). Split into suitesA/suitesB for
 * transport size (Language Sweep B3) and merged back here — the
 * loader and importers keep seeing one `suites` object.
 */
import { suitesA } from './suitesA';
import { suitesB } from './suitesB';

export const suites = { ...suitesA, ...suitesB };
