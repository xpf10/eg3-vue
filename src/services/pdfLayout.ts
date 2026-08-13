/**
 * Pure layout math for the PDF view export — kept free of any jsPDF import so
 * it can be unit-tested in isolation.
 *
 * The composite browser view is rasterized to a tall image.  We always scale
 * it to fill the usable page *width* (so the view is never shrunk to a postage
 * stamp).  If the fitted image is taller than one usable page, we slice the
 * source image into vertical pages and render one slice per page.
 */

export interface PdfSlice {
  /** Source-pixel Y of the top edge of this slice. */
  srcY: number
  /** Source-pixel height of this slice. */
  srcH: number
  /** Destination (page-mm) height of this slice. */
  dstH: number
}

export interface PdfLayout {
  /** Uniform scale factor: page-mm per source pixel. */
  scale: number
  /** Fitted destination width (always fills the usable page width). */
  dstWUsed: number
  /** Total fitted destination height of the full image. */
  dstHUsed: number
  /** Source-pixel rows per page (page height / scale). */
  srcPerPage: number
  pages: number
  slices: PdfSlice[]
}

export function computePdfLayout(
  totalW: number,
  totalH: number,
  dstW: number,
  dstH: number
): PdfLayout {
  if (totalW <= 0 || totalH <= 0 || dstW <= 0 || dstH <= 0) {
    throw new Error('computePdfLayout requires positive dimensions')
  }

  const scale = dstW / totalW
  const dstHUsed = totalH * scale
  const srcPerPage = dstH / scale

  // One page can hold the whole image (srcPerPage ≥ totalH): single slice.
  // Compared on source rows, not on fitted mm, to avoid float edge cases
  // where dstHUsed lands a hair above dstH and we emit a pointless 2nd page.
  if (srcPerPage >= totalH) {
    return {
      scale,
      dstWUsed: dstW,
      dstHUsed,
      srcPerPage,
      pages: 1,
      slices: [{ srcY: 0, srcH: totalH, dstH: dstHUsed }]
    }
  }

  // Tall view: slice the source image into page-sized vertical chunks.
  // Middle slices use floor(srcPerPage) rows so no slice scales past the
  // usable page height (ceil would overflow by up to one row's height).
  // Slices are tiled cumulatively so they are exactly contiguous — no
  // floor/ceil gaps or 1px overlaps at slice boundaries.
  const sliceRows = Math.floor(srcPerPage)
  const slices: PdfSlice[] = []
  let srcY = 0
  while (srcY < totalH) {
    const srcH = Math.min(sliceRows, totalH - srcY)
    if (srcH <= 0) break
    slices.push({ srcY, srcH, dstH: srcH * scale })
    srcY += srcH
  }

  return {
    scale,
    dstWUsed: dstW,
    dstHUsed,
    srcPerPage,
    pages: slices.length,
    slices
  }
}
