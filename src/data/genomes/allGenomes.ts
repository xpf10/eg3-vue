import { GenomeConfig } from '../../types/genome'
import { HG38 } from './hg38'
import { MM10 } from './mm10'
import { HG19 } from './hg19'
import { MM39 } from './mm39'

// CHM13 (T2T) has no official UCSC chromInfo/cytoBand of its own in this
// codebase yet; it reuses hg38's chromosome sizes (a documented stopgap —
// T2T coordinates differ in detail, e.g. chrY is 62.5 Mb in v2.0).
export const CHM13: GenomeConfig = {
  name: 't2t-chm13-v2.0',
  species: 'Human (Homo sapiens)',
  description: 'T2T-CHM13 v2.0 Complete Human Genome',
  defaultRegion: 'chr7:27053397-27373765',
  chromosomes: HG38.chromosomes,
  cytobands: HG38.cytobands
}

export const ALL_GENOMES: GenomeConfig[] = [
  HG38,
  HG19,
  MM39,
  MM10,
  CHM13
]

export function getGenomeConfig(name: string): GenomeConfig {
  const found = ALL_GENOMES.find(g => g.name.toLowerCase() === name.toLowerCase())
  return found || HG38
}
