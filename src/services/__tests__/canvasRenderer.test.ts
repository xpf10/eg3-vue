import { describe, it, expect } from 'vitest'
import { getDownsamplingChoice, getFetchRegion, DownsamplingChoices } from '../canvasRenderer'
import type { GenomicRegion } from '../../types/region'
import type { Track } from '../../types/track'

describe('getDownsamplingChoice', () => {
  it('samples when bases-per-pixel exceeds the threshold', () => {
    const region: GenomicRegion = { chr: 'chr1', start: 1, end: 2_000_000 } // ~1666 bpp at 1200px
    expect(getDownsamplingChoice(region, 1200)).toBe(DownsamplingChoices.SAMPLE)
  })

  it('uses ALL resolution when zoomed in', () => {
    const region: GenomicRegion = { chr: 'chr1', start: 1, end: 10_000 } // ~8 bpp
    expect(getDownsamplingChoice(region, 1200)).toBe(DownsamplingChoices.ALL)
  })
})

describe('getFetchRegion', () => {
  it('applies the default flanking strategy without a track', () => {
    const region: GenomicRegion = { chr: 'chr7', start: 27_000_000, end: 27_100_000 }
    const out = getFetchRegion(region)
    // Center-based expansion: 2.5 Mb either side of the viewport centre,
    // capped at maxFetchSpan = 5 Mb.
    expect(out.start).toBe(24_550_000)
    expect(out.end).toBe(29_549_999)
    // The viewport stays fully contained.
    expect(out.start).toBeLessThanOrEqual(region.start)
    expect(out.end).toBeGreaterThanOrEqual(region.end)
  })

  it('honours a per-track flanking override', () => {
    const track: Track = {
      id: 't',
      name: 't',
      type: 'geneAnnotation',
      options: {
        flankingStrategy: { type: 'start', upstream: 1000, downstream: 1000, maxFetchSpan: 5000 }
      }
    }
    const region: GenomicRegion = { chr: 'chr7', start: 27_000_000, end: 27_001_000 }
    const out = getFetchRegion(region, track)
    expect(out.start).toBe(26_999_000)
    expect(out.end).toBe(27_001_000)
  })
})
