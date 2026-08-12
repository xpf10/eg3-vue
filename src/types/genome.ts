export interface Chromosome {
  name: string
  size: number
}

export type CytobandStain =
  | 'gpos100'
  | 'gpos75'
  | 'gpos50'
  | 'gpos25'
  | 'gneg'
  | 'gvar'
  | 'stalk'
  | 'acen'

export interface Cytoband {
  chr: string
  start: number
  end: number
  name: string
  gStain: CytobandStain
}

export interface GenomeConfig {
  name: string
  species: string
  description: string
  defaultRegion: string
  chromosomes: Chromosome[]
  cytobands: Record<string, Cytoband[]>
}
