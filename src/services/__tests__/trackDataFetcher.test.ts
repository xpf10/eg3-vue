import { describe, it, expect } from 'vitest'
import {
  parseRefGeneExons,
  normalizeGeneTrackName,
  isPrimaryChromosome,
  pickBestPos,
  type RefGeneItem
} from '../trackDataFetcher'

function makeItem(overrides: Partial<RefGeneItem> = {}): RefGeneItem {
  return {
    _id: 'x',
    chrom: 'chr7',
    txStart: 1000,
    txEnd: 5000,
    cdsStart: 2000,
    cdsEnd: 4000,
    strand: '+',
    name: 'GENE1',
    id: 'NM_1',
    exonStarts: '1000,2000,3000',
    exonEnds: '1500,2500,5000',
    ...overrides
  }
}

describe('parseRefGeneExons', () => {
  it('splits each exon into CDS vs UTR pieces', () => {
    const exons = parseRefGeneExons(makeItem())
    // exon1 (1000-1500) fully UTR
    expect(exons[0]).toEqual({ start: 1000, end: 1500 })
    // exon2 (2000-2500) fully CDS
    expect(exons[1]).toEqual({ start: 2000, end: 2500, cdsStart: 2000, cdsEnd: 2500 })
    // exon3 (3000-5000) partially CDS (3000-4000)
    expect(exons[2]).toEqual({ start: 3000, end: 5000, cdsStart: 3000, cdsEnd: 4000 })
  })

  it('treats cdsStart === cdsEnd as no CDS (lncRNA)', () => {
    const exons = parseRefGeneExons(makeItem({ cdsStart: 0, cdsEnd: 0 }))
    expect(exons).toEqual([
      { start: 1000, end: 1500 },
      { start: 2000, end: 2500 },
      { start: 3000, end: 5000 }
    ])
  })

  it('drops empty CDS intersections', () => {
    // CDS entirely outside all exons
    const exons = parseRefGeneExons(makeItem({ cdsStart: 9999, cdsEnd: 10000 }))
    expect(exons[0]).toEqual({ start: 1000, end: 1500 })
  })

  it('returns [] when there are no exon starts', () => {
    expect(parseRefGeneExons(makeItem({ exonStarts: '', exonEnds: '' }))).toEqual([])
  })

  it('fills missing exon ends with a default length', () => {
    const exons = parseRefGeneExons(makeItem({ exonStarts: '1000', exonEnds: '' }))
    expect(exons[0].start).toBe(1000)
    expect(exons[0].end).toBe(1100)
  })
})

describe('normalizeGeneTrackName', () => {
  it('maps common aliases', () => {
    expect(normalizeGeneTrackName('RefGene')).toBe('refGene')
    expect(normalizeGeneTrackName('GENCODE')).toBe('gencode')
    expect(normalizeGeneTrackName('ncbiRefSeq')).toBe('ncbiRefSeq')
    expect(normalizeGeneTrackName('')).toBe('refGene')
    expect(normalizeGeneTrackName('anything-else')).toBe('refGene')
  })
})

describe('isPrimaryChromosome', () => {
  it('accepts primary chromosomes and rejects patches', () => {
    expect(isPrimaryChromosome('chr7', 'hg38')).toBe(true)
    expect(isPrimaryChromosome('chrX', 'hg38')).toBe(true)
    expect(isPrimaryChromosome('chrM', 'hg38')).toBe(true)
    expect(isPrimaryChromosome('chrFNWR01000165.1', 'hg38')).toBe(false)
    expect(isPrimaryChromosome('chr1', 'mm10')).toBe(true)
    expect(isPrimaryChromosome('chrY', 'mm10')).toBe(true)
  })
})

describe('pickBestPos', () => {
  it('prefers a primary-chromosome entry', () => {
    const pos = [
      { chr: 'FNWR01000165.1', start: 1, end: 2 },
      { chr: '7', start: 100, end: 200 }
    ]
    expect(pickBestPos(pos, 'hg38')).toEqual({ chr: '7', start: 100, end: 200 })
  })

  it('falls back to the first entry when none are primary', () => {
    const pos = [{ chr: 'GL000220.1', start: 1, end: 2 }]
    expect(pickBestPos(pos, 'hg38')).toEqual(pos[0])
  })

  it('passes through a non-array position', () => {
    const pos = { chr: '7', start: 1, end: 2 }
    expect(pickBestPos(pos, 'hg38')).toBe(pos)
  })

  it('returns null for empty arrays', () => {
    expect(pickBestPos([], 'hg38')).toBeNull()
  })
})
