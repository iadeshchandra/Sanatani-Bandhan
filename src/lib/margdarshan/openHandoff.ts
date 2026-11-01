/**
 * lib/margdarshan/openHandoff.ts — "open the manual at this page".
 * =====================================================================
 * J4: the Copilot's citation door. The assistant sheet lives OUTSIDE
 * the Margdarshan centre (org shell FAB / org header), so a citation
 * tap hands the page slug over through two race-safe channels:
 *
 *   1. A window event ('sb:open-manual-page') — when the centre is
 *      already mounted (e.g. Ask opened from inside Margdarshan),
 *      it hears the event and opens the page immediately.
 *   2. A sessionStorage note — when the centre is not mounted yet,
 *      the 'sanatani:navigate' desk event mounts it, and its mount
 *      effect reads + clears the note and opens the page.
 *
 * Whichever channel lands first wins; the other finds the note
 * already cleared and does nothing. Reading the manual needs no
 * account (the read law) — the PUBLIC mirror route
 * (/margdarshan/manual/:pageId) remains the citation's href, and
 * signed-in solo sessions navigate there directly.
 */

export const MARG_OPEN_PAGE_EVENT = 'sb:open-manual-page';
export const MARG_OPEN_PAGE_KEY = 'sb-marg-open-page';

/** Ask the centre (mounted or about to mount) to open a page. */
export function requestOpenManualPage(slug: string): void {
  try {
    sessionStorage.setItem(MARG_OPEN_PAGE_KEY, slug);
  } catch {
    /* storage unavailable — the event channel may still land */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(MARG_OPEN_PAGE_EVENT, { detail: { slug } })
    );
  } catch {
    /* non-DOM environment — nothing to open */
  }
}

/** Read + clear the pending page note (mount effect). */
export function takeOpenManualPageRequest(): string | null {
  try {
    const slug = sessionStorage.getItem(MARG_OPEN_PAGE_KEY);
    if (slug) sessionStorage.removeItem(MARG_OPEN_PAGE_KEY);
    return slug;
  } catch {
    return null;
  }
}

/** Clear the note without acting (the event channel already won). */
export function clearOpenManualPageRequest(): void {
  try {
    sessionStorage.removeItem(MARG_OPEN_PAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
