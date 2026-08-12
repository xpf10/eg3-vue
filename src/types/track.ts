export type TrackType =
  | 'bigwig'
  | 'geneAnnotation'
  | 'bed'
  | 'bam'
  | 'hic'
  | 'genomealign'
  | 'methylc'
  | 'vcf'

export type DisplayMode = 'full' | 'dense' | 'pack' | 'squish'
export type ScaleType = 'auto' | 'fixed' | 'log'

/**
 * Per-track override for the eg3-style FlankingStrategy used when
 * computing the fetch region for a track (see models/FlankingStrategy.ts).
 */
export interface FlankingStrategyConfig {
  type?: 'all' | 'start' | 'end'
  upstream?: number
  downstream?: number
  maxFetchSpan?: number
}

export interface TrackOptions {
  color?: string
  secondaryColor?: string
  height?: number
  scaleType?: ScaleType
  min?: number
  max?: number
  label?: string
  displayMode?: DisplayMode
  showMismatch?: boolean
  group?: number
  smooth?: boolean
  flankingStrategy?: FlankingStrategyConfig
}

export interface TrackMetadata {
  cell?: string
  assay?: string
  lab?: string
  species?: string
  genome?: string
  tissue?: string
  [key: string]: any
}

export interface Track {
  id: string
  name: string
  type: TrackType
  url?: string
  genome?: string
  querygenome?: string
  showOnHubLoad?: boolean
  options: TrackOptions
  metadata?: TrackMetadata
  pinned?: boolean
  visible?: boolean
  items?: any[]
  bwInstance?: any
  rawContent?: any
}
