import { GenomeConfig } from '../../types/genome'
import rawCytobands from './mm10_cytobands.json'

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

export const MM10: GenomeConfig = {
  name: 'mm10',
  species: 'Mouse (Mus musculus)',
  description: 'GRCm38 / Mouse Genome Build 38',
  defaultRegion: 'chr7:24333029-24373096',
  chromosomes: [
    { name: 'chr1', size: 195471971 },
    { name: 'chr2', size: 182113224 },
    { name: 'chr3', size: 160039680 },
    { name: 'chr4', size: 156508116 },
    { name: 'chr5', size: 151834684 },
    { name: 'chr6', size: 149736546 },
    { name: 'chr7', size: 145441459 },
    { name: 'chr8', size: 129401213 },
    { name: 'chr9', size: 124595110 },
    { name: 'chr10', size: 130694993 },
    { name: 'chr11', size: 122082543 },
    { name: 'chr12', size: 120129022 },
    { name: 'chr13', size: 120421639 },
    { name: 'chr14', size: 124902244 },
    { name: 'chr15', size: 104043685 },
    { name: 'chr16', size: 98207768 },
    { name: 'chr17', size: 94987271 },
    { name: 'chr18', size: 90702639 },
    { name: 'chr19', size: 61431566 },
    { name: 'chrX', size: 171031299 },
    { name: 'chrY', size: 91744698 },
    { name: 'chrM', size: 16299 }
  ],
  cytobands
}