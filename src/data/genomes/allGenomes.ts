import { GenomeConfig } from '../../types/genome'
import { HG38 } from './hg38'
import { MM10 } from './mm10'

export const HG19: GenomeConfig = {
  name: 'hg19',
  species: 'Human (Homo sapiens)',
  description: 'GRCh37 / Human Genome Build 37',
  defaultRegion: 'chr7:27053397-27373765',
  chromosomes: HG38.chromosomes,
  cytobands: HG38.cytobands
}

export const MM39: GenomeConfig = {
  name: 'mm39',
  species: 'Mouse (Mus musculus)',
  description: 'GRCm39 / Mouse Genome Build 39',
  defaultRegion: 'chr7:24333029-24373096',
  chromosomes: MM10.chromosomes,
  cytobands: MM10.cytobands
}

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
