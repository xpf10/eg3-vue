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

export type AggregateMethod = 'mean' | 'sum' | 'count' | 'min' | 'max'
export type BigWigDisplayMode = 'bar' | 'heatmap' | 'auto'

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
  flankingStrategy?: FlankingStrategyConfig

  // --- BigWig-specific options (reference eg3 NumericalTrackConfig) ---

  // Aggregation method when down-sampling features to per-pixel values.
  // Default: 'mean' (matches eg3 DEFAULT_OPTIONS.aggregateMethod = MEAN).
  aggregateMethod?: AggregateMethod

  // Smoothing strength: 0 = off, >0 = apply array-smooth averaging of
  // per-pixel values. Eg3 default is 0.  Replaces the previous boolean
  // `smooth` field; a truthy boolean value is interpreted as smooth=2.
  smooth?: number

  // FIXED-scale overrides (used when scaleType === 'fixed').
  // Eg3 defaults: yMax=10, yMin=0.  When both are set the Y axis is
  // clamped to [yMin, yMax] via a D3-style scaleLinear, matching eg3's
  // FIXED yScale behaviour.
  yMax?: number
  yMin?: number

  // BigWig display mode: 'bar' draws histogram bars, 'heatmap' draws
  // full-height opacity-mapped bars, 'auto' switches to heatmap when
  // track height < AUTO_HEATMAP_THRESHOLD (21px) — mirroring eg3.
  bigwigDisplayMode?: BigWigDisplayMode

  // Color for values exceeding yMax (eg3 default: "red").
  colorAboveMax?: string
  // Color for values below yMin (eg3 default: "darkgreen").
  color2BelowMin?: string

  // Strip leading "chr" from BigWig chromosome names before matching
  // against the file's header refs (eg3 ensemblStyle).
  ensemblStyle?: boolean
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
