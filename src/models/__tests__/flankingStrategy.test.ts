import { describe, it, expect } from 'vitest'
import { FlankingStrategy, DEFAULT_FLANKING_STRATEGY } from '../FlankingStrategy'
import type { GenomicRegion } from '../../types/region'

const region: GenomicRegion = { chr: 'chr7', start: 27_000_000, end: 27_100_000 }

describe('FlankingStrategy', () => {
  it('default strategy expands 2.5 Mb around the centre, capped at 5 Mb, keeping the viewport', () => {
    const out = DEFAULT_FLANKING_STRATEGY.apply(region)
    expect(out.chr).toBe('chr7')
    // centre = 27,050,000; ±2.5 Mb → 24,550,000 … 29,550,000, capped to 5 Mb span.
    expect(out.start).toBe(24_550_000)
    expect(out.end).toBe(29_549_999)
    expect(out.start).toBeLessThanOrEqual(region.start)
    expect(out.end).toBeGreaterThanOrEqual(region.end)
  })

  it('returns the viewport unchanged when it is already wider than the total flank', () => {
    const wide: GenomicRegion = { chr: 'chr1', start: 1, end: 20_000_000 }
    const out = DEFAULT_FLANKING_STRATEGY.apply(wide)
    expect(out).toEqual(wide)
  })

  it('clamps to chromosome start at the left edge', () => {
    const edge: GenomicRegion = { chr: 'chr1', start: 1, end: 1000 }
    const out = DEFAULT_FLANKING_STRATEGY.apply(edge)
    expect(out.start).toBe(1)
  })

  it('SURROUND_START only expands upstream', () => {
    const s = new FlankingStrategy('start', 1000, 1000, 10_000)
    const small: GenomicRegion = { chr: 'chr7', start: 27_000_000, end: 27_001_000 } // 1001 bp < total flank
    const out = s.apply(small)
    expect(out.start).toBe(26_999_000)
    expect(out.end).toBe(small.end)
  })

  it('SURROUND_END only expands downstream', () => {
    const s = new FlankingStrategy('end', 1000, 1000, 10_000)
    const small: GenomicRegion = { chr: 'chr7', start: 27_000_000, end: 27_001_000 }
    const out = s.apply(small)
    expect(out.start).toBe(small.start)
    expect(out.end).toBe(27_002_000)
  })

  it('caps the total fetch span at maxFetchSpan', () => {
    const s = new FlankingStrategy('all', 5_000_000, 5_000_000, 1_000_000)
    const out = s.apply(region)
    expect(out.end - out.start + 1).toBeLessThanOrEqual(1_000_000)
    // viewport still fully contained
    expect(out.start).toBeLessThanOrEqual(region.start)
    expect(out.end).toBeGreaterThanOrEqual(region.end)
  })

  it('sanitises negative constructor inputs to zero', () => {
    const s = new FlankingStrategy('all', -100, -200, 0)
    expect(s.upstream).toBe(0)
    expect(s.downstream).toBe(0)
    expect(s.maxFetchSpan).toBe(1)
  })
})
