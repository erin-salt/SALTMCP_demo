// Venues SALT knows are closed that Google's place data still listed as
// operating, keyed by SALT venue id. Filled only from a reviewed run of
// scripts/check-google-listings.mjs, and checked by hand before it ships.
// Empty: no claim about Google is made until then.
export const STILL_LISTED: Record<string, { checked: string }> = {}
