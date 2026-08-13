import { describe, it, expect } from 'vitest'
import { LocalFileLoader } from '../localFileLoader'

function makeFile(content: string, name: string, type = 'text/plain'): File {
  return new File([content], name, { type })
}

describe('LocalFileLoader.parseFile', () => {
  it('parses a BED file into items with chr normalisation', async () => {
    const file = makeFile(
      [
        'track name=foo',
        '# comment line',
        'chr1	100	200	peakA	5	+',
        '2	300	400	peakB	10	-',
        'badline',
        'chr1	500	600'
      ].join('\n'),
      'peaks.bed'
    )
    const result = await LocalFileLoader.parseFile(file)
    expect(result.trackType).toBe('bed')
    expect(result.itemsCount).toBe(3)
    expect(result.items).toHaveLength(3)
    expect(result.items![0]).toMatchObject({ chr: 'chr1', start: 100, end: 200, name: 'peakA', score: 5, strand: '+' })
    expect(result.items![1]).toMatchObject({ chr: 'chr2', start: 300, end: 400, name: 'peakB', strand: '-' })
    expect(result.items![2]).toMatchObject({ chr: 'chr1', start: 500, end: 600, name: 'Item_3' })
  })

  it('normalises reversed BED coordinates', async () => {
    const result = await LocalFileLoader.parseFile(makeFile('chr1\t5000\t100\trev', 'rev.bed'))
    expect(result.items![0].start).toBe(100)
    expect(result.items![0].end).toBe(5000)
  })

  it('detects GFF/GTF as geneAnnotation tracks', async () => {
    const gff = 'chr1\tsrc\tgene\t1000\t2000\t.\t+\t.\tID=g1;Name=G1\n'
    const result = await LocalFileLoader.parseFile(makeFile(gff, 'genes.gff3'))
    expect(result.trackType).toBe('geneAnnotation')
    expect(result.itemsCount).toBe(1)
    expect(result.items![0]).toMatchObject({ chr: 'chr1', start: 1000, end: 2000, strand: '+' })
  })

  it('parses VCF files as text rawContent', async () => {
    const vcf = '##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\nchr1\t1000\t.\tA\tG\t50\n'
    const result = await LocalFileLoader.parseFile(makeFile(vcf, 'vars.vcf'))
    expect(result.trackType).toBe('vcf')
    expect(result.rawContent).toContain('##fileformat')
  })

  it('parses JSON session files without error', async () => {
    const result = await LocalFileLoader.parseFile(makeFile('{"a":1}', 'session.json'))
    expect(result.trackType).toBe('bed')
    expect(result.rawContent).toBe('{"a":1}')
  })

  it('rejects garbage coordinates', async () => {
    const result = await LocalFileLoader.parseFile(makeFile('chr1\tfoo\tbar\tx', 'bad.bed'))
    expect(result.itemsCount).toBe(0)
  })
})

describe('LocalFileLoader.createTrackFromLocalResult', () => {
  it('marks parsed BED items as ok and binary-only content as simulated', async () => {
    const bed = await LocalFileLoader.parseFile(makeFile('chr1\t100\t200\tp', 'p.bed'))
    const t1 = LocalFileLoader.createTrackFromLocalResult(bed)
    expect(t1.loadStatus).toBe('ok')
    expect(t1.url).toMatch(/^local:\/\//)

    const vcf = await LocalFileLoader.parseFile(makeFile('#CHROM\n', 'x.vcf'))
    const t2 = LocalFileLoader.createTrackFromLocalResult(vcf)
    expect(t2.loadStatus).toBe('simulated')
  })
})

describe('LocalFileLoader.tryConnectBigWig', () => {
  it('returns null for an unreachable URL instead of throwing', async () => {
    // A URL that is guaranteed to fail fast locally; the function must not
    // throw and must return null so callers can surface a LOAD FAILED state.
    const result = await LocalFileLoader.tryConnectBigWig('https://127.0.0.1:1/does-not-exist.bw')
    expect(result).toBeNull()
  }, 15000)
})
