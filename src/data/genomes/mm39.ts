import { GenomeConfig } from '../../types/genome'
import rawCytobands from './mm39_cytobands.json'

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

// Chromosome sizes for GRCm39 / mm39 (UCSC chromInfo, fetched 2026).
// These differ slightly from mm10 (GRCm38) — the two assemblies must NOT
// share sizes (e.g. mm39 chr1 = 195,154,279 vs mm10 chr1 = 195,471,971).
export const MM39: GenomeConfig = {
  name: 'mm39',
  species: 'Mouse (Mus musculus)',
  description: 'GRCm39 / Mouse Genome Build 39',
  defaultRegion: 'chr7:24333029-24373096',
  chromosomes: [
    { name: 'chr1', size: 195154279 },
    { name: 'chr2', size: 181755017 },
    { name: 'chr3', size: 159745316 },
    { name: 'chr4', size: 156860686 },
    { name: 'chr5', size: 151758149 },
    { name: 'chr6', size: 149588044 },
    { name: 'chr7', size: 144995196 },
    { name: 'chr8', size: 130127694 },
    { name: 'chr9', size: 124359700 },
    { name: 'chr10', size: 130530862 },
    { name: 'chr11', size: 121973369 },
    { name: 'chr12', size: 120092757 },
    { name: 'chr13', size: 120883175 },
    { name: 'chr14', size: 125139656 },
    { name: 'chr15', size: 104073951 },
    { name: 'chr16', size: 98008968 },
    { name: 'chr17', size: 95294699 },
    { name: 'chr18', size: 90720763 },
    { name: 'chr19', size: 61420004 },
    { name: 'chrX', size: 169476592 },
    { name: 'chrY', size: 91455967 },
    { name: 'chrM', size: 16299 }
  ],
  cytobands
}
