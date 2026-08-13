import { GenomeConfig } from '../../types/genome'
import rawCytobands from './hg19_cytobands.json'

// eg3 cytoBand JSON is keyed by chromosome; each value is an array of
// { chrom, chromStart, chromEnd, name, gieStain }.  We remap it to our
// GenomeConfig shape: Record<chr, { chr, start, end, name, gStain }[]>.
const cytobands: GenomeConfig['cytobands'] = {}
for (const [chr, entries] of Object.entries(rawCytobands)) {
  cytobands[chr] = (entries as any[]).map(e => ({
    chr,
    start: e.chromStart,
    end: e.chromEnd,
    name: e.name,
    gStain: e.gieStain
  }))
}

// Chromosome sizes for GRCh37 / hg19 (UCSC chromInfo, fetched 2026).
// These differ from hg38 — the two assemblies must NOT share sizes.
export const HG19: GenomeConfig = {
  name: 'hg19',
  species: 'Human (Homo sapiens)',
  description: 'GRCh37 / Human Genome Build 37',
  defaultRegion: 'chr7:27053397-27373765',
  chromosomes: [
    { name: 'chr1', size: 249250621 },
    { name: 'chr2', size: 243199373 },
    { name: 'chr3', size: 198022430 },
    { name: 'chr4', size: 191154276 },
    { name: 'chr5', size: 180915260 },
    { name: 'chr6', size: 171115067 },
    { name: 'chr7', size: 159138663 },
    { name: 'chr8', size: 146364022 },
    { name: 'chr9', size: 141213431 },
    { name: 'chr10', size: 135534747 },
    { name: 'chr11', size: 135006516 },
    { name: 'chr12', size: 133851895 },
    { name: 'chr13', size: 115169878 },
    { name: 'chr14', size: 107349540 },
    { name: 'chr15', size: 102531392 },
    { name: 'chr16', size: 90354753 },
    { name: 'chr17', size: 81195210 },
    { name: 'chr18', size: 78077248 },
    { name: 'chr19', size: 59128983 },
    { name: 'chr20', size: 63025520 },
    { name: 'chr21', size: 48129895 },
    { name: 'chr22', size: 51304566 },
    { name: 'chrX', size: 155270560 },
    { name: 'chrY', size: 59373566 },
    { name: 'chrM', size: 16571 }
  ],
  cytobands
}
