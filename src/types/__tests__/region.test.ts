import { describe, it, expect } from 'vitest'
import { parseGenomicRegion, formatGenomicRegion, formatRegionCompact } from '../region'

describe('parseGenomicRegion', () => {
  it('parses full chr:start-end', () => {
    expect(parseGenomicRegion('chr7:27053397-27373765')).toEqual({
      chr: 'chr7',
      start: 27053397,
      end: 27373765
    })
  })

  it('adds chr prefix when missing', () => {
    expect(parseGenomicRegion('7:100-200')?.chr).toBe('chr7')
  })

  it('single coordinate becomes a default-size window', () => {
    const r = parseGenomicRegion('chr1:5000', 'chr1', 1000)
    expect(r).toEqual({ chr: 'chr1', start: 5000, end: 5999 })
  })

  it('swaps reversed start/end', () => {
    const r = parseGenomicRegion('chr1:5000-100')
    expect(r!.start).toBe(100)
    expect(r!.end).toBe(5000)
  })

  it('handles thousands separators', () => {
    expect(parseGenomicRegion('chr1:1,000-2,000')).toEqual({ chr: 'chr1', start: 1000, end: 2000 })
  })

  it('returns null for garbage input', () => {
    expect(parseGenomicRegion('')).toBeNull()
    expect(parseGenomicRegion('not-a-region!!!')).toBeNull()
    expect(parseGenomicRegion('chr:')).toBeNull()
  })
})

describe('formatGenomicRegion', () => {
  it('formats with thousands separators', () => {
    expect(formatGenomicRegion({ chr: 'chr7', start: 27053397, end: 27373765 }))
      .toBe('chr7:27,053,397-27,373,765')
  })
})

describe('formatRegionCompact', () => {
  it('formats without separators', () => {
    expect(formatRegionCompact({ chr: 'chr7', start: 27053397, end: 27373765 }))
      .toBe('chr7:27053397-27373765')
  })
})
