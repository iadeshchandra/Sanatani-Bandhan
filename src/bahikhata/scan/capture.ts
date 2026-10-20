/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — capture helpers.                          */
/*                                                                     */
/* The paper is the org's only copy, so the flow's first promise is:   */
/* the photo is saved (File Vault, tenant-scoped 'crisis' visibility   */
/* + tenantId = workspaceId — tenant members may read it; 'public'     */
/* is NEVER used for devotee PII) BEFORE any reading happens. OCR      */
/* can fail completely and the page is still safe.                     */
/* ------------------------------------------------------------------ */

/**
 * Laplacian-variance blur metric over a grayscale raster. Pure — the
 * canvas shell feeds it pixels; tests feed it synthetic arrays.
 * Sharp text edges produce high variance; a shaky photo collapses it.
 */
export function laplacianVariance(
  gray: ArrayLike<number>,
  width: number,
  height: number
): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** Below this, the capture screen suggests a retake (never blocks —
 *  a dim courtyard photo that the sevadar accepts is still evidence). */
export const BLUR_WARN_THRESHOLD = 60;

export function looksBlurry(variance: number): boolean {
  return variance < BLUR_WARN_THRESHOLD;
}

/* --------------------- working-image persistence -------------------- */
/* The OCR working image (grayscale/contrast canvas render) is         */
/* device-only by doctrine — it never leaves the phone. It persists    */
/* in IndexedDB so a crash mid-page loses nothing and the review's     */
/* "what the machine saw" view survives a restart on the same device.  */

const workingKey = (batchId: string, pageNo: number) => `bk_working_${batchId}_${pageNo}`;

export async function saveWorkingImage(batchId: string, pageNo: number, blob: Blob): Promise<void> {
  try {
    const { set } = await import('idb-keyval');
    await set(workingKey(batchId, pageNo), blob);
  } catch { /* IDB unavailable — the vault evidence still exists */ }
}

export async function loadWorkingImage(batchId: string, pageNo: number): Promise<Blob | null> {
  try {
    const { get } = await import('idb-keyval');
    const v = await get<Blob>(workingKey(batchId, pageNo));
    return v instanceof Blob ? v : null;
  } catch {
    return null;
  }
}

export async function dropWorkingImage(batchId: string, pageNo: number): Promise<void> {
  try {
    const { del } = await import('idb-keyval');
    await del(workingKey(batchId, pageNo));
  } catch { /* best-effort */ }
}
