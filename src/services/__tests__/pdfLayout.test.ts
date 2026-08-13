import { describe, it, expect } from 'vitest'
import { computePdfLayout } from '../pdfLayout'

describe('computePdfLayout', () => {
  it('throws on non-positive dimensions', () => {
    expect(() => computePdfLayout(0, 100, 200, 100)).toThrow()
    expect(() => computePdfLayout(100, 100, 0, 100)).toThrow()
  })

  it('single page when the fitted image fits the page height', () => {
    // 1600x800 source, page usable 277x176 → scale fills width, height fits.
    const layout = computePdfLayout(1600, 800, 277, 176)
    expect(layout.pages).toBe(1)
    expect(layout.scale).toBeCloseTo(277 / 1600, 6)
    expect(layout.dstWUsed).toBeCloseTo(277, 6)
    expect(layout.dstHUsed).toBeCloseTo(800 * (277 / 1600), 6)
    expect(layout.slices).toHaveLength(1)
    expect(layout.slices[0].srcY).toBe(0)
    expect(layout.slices[0].srcH).toBe(800)
  })

  it('paginates a tall view into page-sized slices filling the width', () => {
    // 1600x10000 source vs 277x176 page: fills width (scale=277/1600),
    // fitted height = 10000 * 0.173125 = 1731.25 > 176 → 10+ pages.
    const layout = computePdfLayout(1600, 10000, 277, 176)
    expect(layout.scale).toBeCloseTo(277 / 1600, 6)
    expect(layout.dstWUsed).toBeCloseTo(277, 6)
    const srcPerPage = 176 / layout.scale
    expect(layout.srcPerPage).toBeCloseTo(srcPerPage, 4)
    expect(layout.pages).toBe(Math.ceil(10000 / srcPerPage))

    // Slices tile the full source height exactly — no gaps or overlaps.
    let prevEnd = 0
    for (const s of layout.slices) {
      expect(s.srcY).toBe(prevEnd)
      expect(s.srcH).toBeGreaterThan(0)
      prevEnd = s.srcY + s.srcH
    }
    expect(prevEnd).toBe(10000)

    // Each slice scaled by the same factor maps back to page height.
    for (const s of layout.slices) {
      expect(s.dstH).toBeCloseTo(s.srcH * layout.scale, 4)
      expect(s.dstH).toBeLessThanOrEqual(176 + 1e-6)
    }
  })

  it('produces exactly one page when the image is slightly shorter than a page', () => {
    const layout = computePdfLayout(1600, 1010, 277, 176)
    expect(layout.pages).toBe(1)
    expect(layout.slices[0].srcH).toBe(1010)
  })

  it('splits a hair-taller-than-page image into two pages', () => {
    // srcPerPage ≈ 1016.6 source rows; an image of 1100 rows needs 2 pages.
    const layout = computePdfLayout(1600, 1100, 277, 176)
    expect(layout.pages).toBe(2)
    expect(layout.slices[0].srcY).toBe(0)
    expect(layout.slices[1].srcY).toBe(layout.slices[0].srcH)
    expect(layout.slices[0].srcH + layout.slices[1].srcH).toBe(1100)
  })

  it('handles degenerate tiny heights', () => {
    const layout = computePdfLayout(1600, 1, 277, 176)
    expect(layout.pages).toBe(1)
    expect(layout.slices[0].srcH).toBe(1)
  })
})
