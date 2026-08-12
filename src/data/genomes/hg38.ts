import { GenomeConfig } from '../../types/genome'
import rawCytobands from './hg38_cytobands.json'

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

export const HG38: GenomeConfig = {
  name: 'hg38',
  species: 'Human (Homo sapiens)',
  description: 'GRCh38 / Genome Reference Consortium Human Build 38',
  defaultRegion: 'chr7:27053397-27373765',
  chromosomes: [
    { name: 'chr1', size: 248956422 },
    { name: 'chr2', size: 242193529 },
    { name: 'chr3', size: 198295559 },
    { name: 'chr4', size: 190214555 },
    { name: 'chr5', size: 181538259 },
    { name: 'chr6', size: 170805979 },
    { name: 'chr7', size: 159345973 },
    { name: 'chr8', size: 145138636 },
    { name: 'chr9', size: 138394717 },
    { name: 'chr10', size: 133797422 },
    { name: 'chr11', size: 135086622 },
    { name: 'chr12', size: 133275309 },
    { name: 'chr13', size: 114364328 },
    { name: 'chr14', size: 107043718 },
    { name: 'chr15', size: 101991189 },
    { name: 'chr16', size: 90338345 },
    { name: 'chr17', size: 83257441 },
    { name: 'chr18', size: 80373285 },
    { name: 'chr19', size: 58617616 },
    { name: 'chr20', size: 64444167 },
    { name: 'chr21', size: 46709983 },
    { name: 'chr22', size: 50818468 },
    { name: 'chrX', size: 156040895 },
    { name: 'chrY', size: 57227415 },
    { name: 'chrM', size: 16569 }
  ],
  cytobands
}