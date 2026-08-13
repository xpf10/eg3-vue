import { Track, AggregateMethod, BigWigDisplayMode } from '../types/track'
import { GenomicRegion } from '../types/region'
import { SAMPLE_GENES, GeneInfo } from '../data/sampleGenes'
import { fetchRealRefGeneData, normalizeGeneTrackName, ParsedGeneFeature } from './trackDataFetcher'
import { LocalFileLoader, ParsedLocalBedItem } from './localFileLoader'
import { FlankingStrategy, DEFAULT_FLANKING_STRATEGY } from '../models/FlankingStrategy'

export interface RenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  region: GenomicRegion
  track: Track
  genome?: string            // active genome name (overrides track.genome for genome-scoped lookups)
  devicePixelRatio?: number
  isDarkMode?: boolean
  onAsyncUpdate?: () => void
}

// Pseudo-random deterministic generator based on genomic coordinate
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function getTrackSeed(track: Track): number {
  const str = (track.id || '') + ':' + (track.name || '') + ':' + (track.url || '')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) || 101
}

/**
 * Simple moving-average smoothing of a Float64Array in place.
 * Equivalent to eg3's `array-smooth` utility, using a centred window of size
 * `window` and zero-padding at the edges.
 */
function smoothMovingAverage(arr: Float64Array, window: number): void {
  const n = arr.length
  if (n === 0 || window < 1) return
  if (window === 1) return
  const half = Math.floor(window / 2)
  const out = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let sum = 0
    let count = 0
    for (let k = -half; k <= half; k++) {
      const idx = i + k
      if (idx >= 0 && idx < n) {
        sum += arr[idx]
        count++
      }
    }
    out[i] = sum / count
  }
  arr.set(out)
}

/**
 * Convert a hex color string (#rgb, #rrggbb, or rrggbb) to an RGBA string
 * with the given alpha (0–1).  Used for heatmap-style opacity-mapped bars.
 */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.substring(0, 2), 16)
  const g = parseInt(full.substring(2, 4), 16)
  const b = parseInt(full.substring(4, 6), 16)
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${r},${g},${b},${a})`
}

export const realGeneCache = new Map<string, ParsedGeneFeature[]>()
const bwSignalCache = new Map<string, { start: number; end: number; score: number }[]>()
// Per-cacheKey in-flight guard + debounce timer: prevents overlapping fetches
// and rate-limits fetch spawning during rapid region changes (zoom/pan).
// Matches eg3 reference's throttleViewRegion pattern on the fetch layer.
const inFlightFetches = new Set<string>()
const fetchTimers = new Map<string, number>()
const FETCH_DEBOUNCE_MS = 200

/**
 * Resolve the flanking strategy for a track.
 *
 * Tracks can override their own strategy via `track.options.flankingStrategy`.
 * Otherwise the built-in default is used (2.5 Mb upstream + 2.5 Mb downstream,
 * SURROUND_ALL, 5 Mb cap) — the same behaviour the reference eg3 `FlankingStrategy`
 * applies to gene annotations.
 */
function getFlankingStrategy(track: Track): FlankingStrategy {
  if (track.options.flankingStrategy) {
    return new FlankingStrategy(
      track.options.flankingStrategy.type ?? FlankingStrategy.SURROUND_ALL,
      track.options.flankingStrategy.upstream ?? 2_500_000,
      track.options.flankingStrategy.downstream ?? 2_500_000,
      track.options.flankingStrategy.maxFetchSpan ?? 5_000_000
    )
  }
  return DEFAULT_FLANKING_STRATEGY
}

/**
 * Compute the fetch region using a fixed-base flanking strategy (eg3 reference
 * pattern).  Unlike the old span-proportional approach, the fetched width is
 * bounded by fixed upstream/downstream bases regardless of zoom level:
 *
 *   - Zoomed far in  → fetch = viewport + 2×2.5 Mb flank (gives neighbours).
 *   - Zoomed far out → fetch = viewport itself (already wider than the flank).
 *
 * @param region  the currently visible viewport
 * @param track   used to look up any per-track flanking override
 */
export function getFetchRegion(region: GenomicRegion, track?: Track): GenomicRegion {
  const strategy = track ? getFlankingStrategy(track) : DEFAULT_FLANKING_STRATEGY
  return strategy.apply(region)
}

/**
 * Decide whether to downsample the BigWig signal at the current zoom level.
 *
 * Reference eg3 uses `DownsamplingChoices` (ALL vs SAMPLE) to avoid rendering
 * millions of raw values when the user has zoomed way out.  Here the threshold
 * is expressed as a minimum bases-per-pixel ratio: when signal is far below
 * the resolution of the canvas we sample instead of drawing every value.
 */
export enum DownsamplingChoices {
  ALL = 'all',
  SAMPLE = 'sample'
}

const BASES_PER_PIXEL_SAMPLE_THRESHOLD = 1000

export function getDownsamplingChoice(
  region: GenomicRegion,
  containerWidth: number
): DownsamplingChoices {
  const span = Math.max(1, region.end - region.start + 1)
  const bpp = span / Math.max(1, containerWidth)
  return bpp > BASES_PER_PIXEL_SAMPLE_THRESHOLD ? DownsamplingChoices.SAMPLE : DownsamplingChoices.ALL
}

/**
 * Return the (possibly downsampled) BigWig fetch region.  When zoomed far
 * out we request a coarser region centred on the viewport so the BigWig
 * header resolves fewer spans, then let `renderRealBigWigFeatures` bucket
 * the results by canvas width.
 */
export function getBigWigFetchRegion(
  region: GenomicRegion,
  track: Track,
  containerWidth: number
): GenomicRegion {
  const choice = getDownsamplingChoice(region, containerWidth)
  if (choice === DownsamplingChoices.SAMPLE) {
    // When far zoomed out, just fetch the visible region itself — no flank
    // needed, and the per-span aggregation in localFileLoader handles
    // the resolution (basesPerSpan fallback).
    return { chr: region.chr, start: region.start, end: region.end }
  }
  return getFetchRegion(region, track)
}

/**
 * High-performance 2D Canvas renderer for all genomic track types.
 */
export class CanvasTrackRenderer {
  static render(rc: RenderContext) {
    const { ctx, width, height, track, isDarkMode = true } = rc
    ctx.clearRect(0, 0, width, height)

    // Fill track canvas background
    ctx.fillStyle = isDarkMode ? '#090d16' : '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Draw track background grid lines
    ctx.strokeStyle = isDarkMode ? '#1e293b' : '#f1f5f9'
    ctx.lineWidth = 0.5
    for (let x = 0; x < width; x += width / 10) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    switch (track.type) {
      case 'bigwig':
        this.renderBigWig(rc)
        break
      case 'geneAnnotation':
        this.renderGeneAnnotation(rc)
        break
      case 'bed':
        this.renderBed(rc)
        break
      case 'bam':
        this.renderBam(rc)
        break
      case 'hic':
        this.renderHiC(rc)
        break
      case 'genomealign':
        this.renderSynteny(rc)
        break
      case 'methylc':
        this.renderMethylC(rc)
        break
      case 'vcf':
        this.renderVcf(rc)
        break
      default:
        this.renderBigWig(rc)
        break
    }
  }

  private static renderBigWig({ ctx, width, height, region, track, isDarkMode = true, onAsyncUpdate }: RenderContext) {
    const mainColor = track.options.color || (isDarkMode ? '#10b981' : '#059669')
    const span = Math.max(1, region.end - region.start + 1)

    // 1. If local or remote BigWig instance is present, render real binary features!
    if (track.bwInstance && typeof track.bwInstance.getFeatures === 'function') {
      const fetchRegion = getBigWigFetchRegion(region, track, width)
      const downsample = getDownsamplingChoice(region, width)
      const cacheKey = `bw:${track.id}:${fetchRegion.chr}:${fetchRegion.start}-${fetchRegion.end}:${track.options.height || 60}:${downsample}`
      if (bwSignalCache.has(cacheKey)) {
        const features = bwSignalCache.get(cacheKey)!
        this.renderRealBigWigFeatures(ctx, width, height, region, features, mainColor, track.options, isDarkMode, track, downsample)
        return
      } else {
        LocalFileLoader.getBigWigSignalFeatures(track.bwInstance, fetchRegion, width, downsample).then(features => {
          bwSignalCache.set(cacheKey, features || [])
          if (onAsyncUpdate) onAsyncUpdate()
        })
      }
    }

    // 2. Default unique seed-based BigWig rendering
    const points: { x: number; y: number; val: number }[] = []
    const seed = getTrackSeed(track)
    const phaseShift = (seed % 1000) * 123.45
    const freqMult = 0.6 + (seed % 7) * 0.25
    const ampMult = 0.5 + (seed % 5) * 0.3

    let maxVal = 1
    const steps = Math.min(width, 600)
    const stepBases = span / steps

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width
      const basePos = region.start + i * stepBases + phaseShift

      let signal = Math.abs(
        Math.sin(basePos / (20000 / freqMult)) * 18 * ampMult +
        Math.cos(basePos / (4000 * freqMult)) * 10
      )

      const peakInterval = 35000 + (seed % 25000)
      const peakOffset = (seed * 17) % peakInterval
      if (Math.abs(((basePos + peakOffset) % peakInterval) - peakInterval / 2) < 2500) {
        signal += (30 + (seed % 35)) * Math.exp(-Math.pow(((basePos + peakOffset) % peakInterval) - peakInterval / 2, 2) / (2 * 800 * 800))
      }
      signal += pseudoRandom(Math.floor(basePos / 80) + seed) * 4

      if (signal > maxVal) maxVal = signal
      points.push({ x, y: 0, val: signal })
    }

    const maxScale = track.options.scaleType === 'fixed' && track.options.max ? track.options.max : maxVal

    ctx.fillStyle = mainColor + (isDarkMode ? '33' : '22')
    ctx.strokeStyle = mainColor
    ctx.lineWidth = 1.5

    ctx.beginPath()
    ctx.moveTo(0, height)

    points.forEach(pt => {
      const h = Math.min(height - 2, (pt.val / maxScale) * (height - 6))
      const y = height - h
      pt.y = y
      ctx.lineTo(pt.x, y)
    })

    ctx.lineTo(width, height)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y)
      else ctx.lineTo(pt.x, pt.y)
    })
    ctx.stroke()

    ctx.fillStyle = isDarkMode ? '#94a3b8' : '#475569'
    ctx.font = '10px Fira Code, monospace'
    ctx.fillText(`${maxScale.toFixed(1)} RPKM`, 6, 12)
    ctx.fillText('0', 6, height - 4)
  }

  private static renderRealBigWigFeatures(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    region: GenomicRegion,
    features: { start: number; end: number; score: number }[],
    mainColor: string,
    options: any,
    isDarkMode: boolean,
    track: Track,
    downsample = DownsamplingChoices.ALL
  ) {
    const span = Math.max(1, region.end - region.start + 1)

    // --- Configuration defaults (mirroring eg3 NumericalTrack DEFAULT_OPTIONS) ---
    const aggregateMethod: AggregateMethod = options.aggregateMethod || 'mean'
    const smoothStrength = typeof options.smooth === 'number' ? options.smooth : (options.smooth ? 2 : 0)
    const yMax = options.yMax
    const yMin = options.yMin
    const colorAboveMax = options.colorAboveMax || '#ef4444'
    const color2BelowMin = options.color2BelowMin || '#16a34a'
    const displayMode: BigWigDisplayMode = options.bigwigDisplayMode || 'auto'
    const AUTO_HEATMAP_THRESHOLD = 21

    let effectiveDisplayMode = displayMode
    if (displayMode === 'auto' && height < AUTO_HEATMAP_THRESHOLD) {
      effectiveDisplayMode = 'heatmap'
    }

    // --- Compute value range across all features ---
    let maxScore = -Infinity
    let minScore = Infinity
    features.forEach(f => {
      if (f.score > maxScore) maxScore = f.score
      if (f.score < minScore) minScore = f.score
    })
    if (!isFinite(maxScore)) maxScore = 1
    if (!isFinite(minScore)) minScore = 0

    // --- D3-style scaleLinear: value → pixel Y ---
    // FIXED scale uses [yMin, yMax]; AUTO uses the natural data range.
    // Range maps domainMin → bottom (height-2), domainMax → top (2).
    const useFixedScale = options.scaleType === 'fixed' && yMax !== undefined && yMin !== undefined
    const scaleDomainMin = useFixedScale ? yMin : Math.min(0, minScore)
    const scaleDomainMax = useFixedScale ? yMax : Math.max(0, maxScore)
    const scaleRange = Math.max(0.001, scaleDomainMax - scaleDomainMin)

    const yForValue = (val: number): number => {
      const t = Math.max(0, Math.min(1, (val - scaleDomainMin) / scaleRange))
      return (height - 2) - t * (height - 4)
    }
    const isAboveMax = (val: number): boolean => val > scaleDomainMax
    const isBelowMin = (val: number): boolean => val < scaleDomainMin
    const zeroY = yForValue(0)

    // --- Split features by sign: positive = forward (above zero),
    // negative = reverse (below zero) — matching eg3 NumericalTrack's
    // xToFeaturesForward / xToFeaturesReverse separation. ---
    const forwardFeatures = features.filter(f => f.score >= 0)
    const reverseFeatures = features.filter(f => f.score < 0)

    // --- Aggregation helpers (eg3 DefaultAggregators) ---
    const aggregate = (scores: number[]): number => {
      if (scores.length === 0) return 0
      switch (aggregateMethod) {
        case 'sum':   return scores.reduce((s, v) => s + v, 0)
        case 'count': return scores.length
        case 'min':   return Math.min(...scores)
        case 'max':   return Math.max(...scores)
        case 'mean':
        default:      return scores.reduce((s, v) => s + v, 0) / scores.length
      }
    }

    // --- Compute per-pixel value arrays (forward and reverse) ---
    const fwdPixels = new Float64Array(width)
    const revPixels = new Float64Array(width)

    if (features.length > 0) {
      if (downsample === DownsamplingChoices.SAMPLE) {
        // Bucket features by canvas column, then aggregate per bucket.
        // Eg3 DownsamplingChoices.SAMPLE behaviour: one aggregated value
        // per pixel, using the configured AggregateMethod.
        const fwdBuckets: number[][] = []
        const revBuckets: number[][] = []
        for (let i = 0; i < width; i++) { fwdBuckets.push([]); revBuckets.push([]) }

        const processBucket = (feat: { start: number; end: number; score: number }, buckets: number[][]) => {
          if (feat.end < region.start || feat.start > region.end) return
          const fStart = Math.max(region.start, feat.start)
          const fEnd = Math.min(region.end, feat.end)
          const x1 = Math.max(0, Math.floor(((fStart - region.start) / span) * width))
          const x2 = Math.min(width - 1, Math.floor(((fEnd - region.start) / span) * width))
          for (let x = x1; x <= x2; x++) buckets[x].push(feat.score)
        }

        forwardFeatures.forEach(f => processBucket(f, fwdBuckets))
        reverseFeatures.forEach(f => processBucket(f, revBuckets))

        for (let x = 0; x < width; x++) {
          if (fwdBuckets[x].length > 0) fwdPixels[x] = aggregate(fwdBuckets[x])
          if (revBuckets[x].length > 0) revPixels[x] = aggregate(revBuckets[x])
        }
      } else {
        // DownsamplingChoices.ALL — each feature maps directly to its pixel range.
        // For overlapping features the last one wins (matches eg3 behaviour).
        const mapFeatureToPixels = (feat: { start: number; end: number; score: number }, out: Float64Array) => {
          if (feat.end < region.start || feat.start > region.end) return
          const fStart = Math.max(region.start, feat.start)
          const fEnd = Math.min(region.end, feat.end)
          const x1 = Math.max(0, Math.floor(((fStart - region.start) / span) * width))
          const x2 = Math.min(width - 1, Math.floor(((fEnd - region.start) / span) * width))
          for (let x = x1; x <= x2; x++) out[x] = feat.score
        }
        forwardFeatures.forEach(f => mapFeatureToPixels(f, fwdPixels))
        reverseFeatures.forEach(f => mapFeatureToPixels(f, revPixels))
      }

      // --- Smoothing: simple moving average (eg3 uses array-smooth) ---
      if (smoothStrength > 0) {
        smoothMovingAverage(fwdPixels, Math.max(1, Math.round(smoothStrength)))
        smoothMovingAverage(revPixels, Math.max(1, Math.round(smoothStrength)))
      }

      // --- Render ---
      if (effectiveDisplayMode === 'heatmap') {
        // Heatmap: full-height bars with opacity mapped to |value|/scaleRange.
        // Eg3 AUTO_HEATMAP_THRESHOLD behaviour for small track heights.
        for (let x = 0; x < width; x++) {
          if (fwdPixels[x] !== 0) {
            const val = fwdPixels[x]
            const t = Math.min(1, Math.abs(val) / scaleRange)
            const opacity = 0.15 + t * 0.85
            const color = isAboveMax(val) ? colorAboveMax : mainColor
            ctx.fillStyle = hexToRgba(color, opacity)
            ctx.fillRect(x, 2, 1, height - 4)
          }
          if (revPixels[x] !== 0) {
            const val = revPixels[x]
            const t = Math.min(1, Math.abs(val) / scaleRange)
            const opacity = 0.15 + t * 0.85
            const color = isBelowMin(val) ? color2BelowMin : mainColor
            ctx.fillStyle = hexToRgba(color, opacity)
            ctx.fillRect(x, 2, 1, height - 4)
          }
        }
      } else {
        // Bar mode: histogram bars. Forward bars extend upward from zero
        // line; reverse bars extend downward from zero line. Eg3 NumericalTrack
        // draws xToValue (forward) above zero and xToValue2 (reverse) below.
        ctx.fillStyle = mainColor
        for (let x = 0; x < width; x++) {
          if (fwdPixels[x] !== 0) {
            const val = fwdPixels[x]
            const barY = yForValue(val)
            const barH = Math.max(1, zeroY - barY)
            if (barH > 0) {
              ctx.fillStyle = isAboveMax(val) ? colorAboveMax : mainColor
              ctx.fillRect(x, barY, 1, barH)
            }
          }
          if (revPixels[x] !== 0) {
            const val = revPixels[x]
            const barY = yForValue(val)
            const barH = Math.max(1, barY - zeroY)
            if (barH > 0) {
              ctx.fillStyle = isBelowMin(val) ? color2BelowMin : mainColor
              ctx.fillRect(x, zeroY, 1, barH)
            }
          }
        }
      }

      // Zero-line reference
      ctx.strokeStyle = isDarkMode ? 'rgba(148,163,184,0.25)' : 'rgba(71,85,105,0.25)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(0, zeroY)
      ctx.lineTo(width, zeroY)
      ctx.stroke()
    }

    // --- Labels ---
    const isRemote = track.url && !track.url.startsWith('local://')
    const dsLabel = downsample === DownsamplingChoices.SAMPLE ? ' (downsampled)' : ''
    ctx.fillStyle = isDarkMode ? '#34d399' : '#059669'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText(
      `${isRemote ? '🌐 HTTP Byte-Range Streamed' : '📁 Parsed Local BigWig'} (${features.length} features, max: ${scaleDomainMax.toFixed(1)})${dsLabel}`,
      6,
      12
    )
    if (useFixedScale) {
      ctx.fillStyle = isDarkMode ? '#94a3b8' : '#475569'
      ctx.fillText(`[fixed ${yMin}–${yMax}]`, width - 120, 12)
    }
  }

  private static renderGeneAnnotation(rc: RenderContext) {
    const { ctx, width, height, region, track, isDarkMode = true, onAsyncUpdate } = rc
    const color = track.options.color || (isDarkMode ? '#38bdf8' : '#0284c7')
    const span = Math.max(1, region.end - region.start + 1)

    // Pre-populated transcript variants (multi-transcript track).  The
    // search flow fills `track.items` with a sorted list of transcript
    // objects { start, end, strand, exons, description } for a single
    // gene; we render one row per transcript and skip the refGene fetch.
    const transcriptItems = (track.items || []).filter(
      (it: any) => it?.start !== undefined && it?.end !== undefined
    )
    if (transcriptItems.length > 0) {
      this.renderTranscriptVariants(ctx, width, height, region, transcriptItems, color, isDarkMode, track)
      return
    }

    this.renderRefGeneAnnotation(rc, color, span)
  }

  /**
   * Render a stack of transcript variants for one gene (eg3 transcript view).
   *
   * Key eg3 behaviours we mimic:
   * - Overlap-avoiding row assignment: two transcripts that overlap on
   *   the genome cannot share a row; the first free row is found, or a new
   *   row is created (just like FeatureArranger._assignRows).
   * - CDS vs UTR rendering: each exon is split into a thick CDS block and
   *   thin UTR blocks, matching eg3 GeneAnnotation (CDS height 9, UTR height 5).
   * - Backbone line running through all exons.
   * - Eg3-style label placement: left of start if there's room, right of end
   *   otherwise, falling back to on-top with a background rect for contrast.
   */
  private static renderTranscriptVariants(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    region: GenomicRegion,
    items: any[],
    color: string,
    isDarkMode: boolean,
    track: Track
  ) {
    const span = Math.max(1, region.end - region.start + 1)
    const visible = items.filter((it: any) => it.end >= region.start && it.start <= region.end)

    if (visible.length === 0) {
      ctx.fillStyle = isDarkMode ? '#64748b' : '#94a3b8'
      ctx.font = '11px Inter, sans-serif'
      ctx.fillText('No transcripts in this region', 8, Math.max(height / 2, 14))
      return
    }

    const geneSymbol = track.name || items[0]?.name || 'Gene'
    const displayMode = track.options.displayMode || 'full'

    // --- Mode 1: DENSE (Collapsed single-line view) ---
    if (displayMode === 'dense') {
      const yMid = height / 2 + 2
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, yMid)
      ctx.lineTo(width, yMid)
      ctx.stroke()

      visible.forEach(it => {
        const exons = it.exons || [{ start: it.start, end: it.end }]
        exons.forEach((ex: any) => {
          const ex1 = ((ex.start - region.start) / span) * width
          const ex2 = ((ex.end - region.start) / span) * width
          ctx.fillStyle = color
          ctx.fillRect(ex1, yMid - 4, Math.max(2, ex2 - ex1), 8)
        })
      })

      ctx.fillStyle = isDarkMode ? '#34d399' : '#059669'
      ctx.font = 'bold 10px Inter, sans-serif'
      ctx.fillText(`Transcripts · ${geneSymbol} [Dense Mode: ${visible.length} variants merged]`, 6, 13)
      return
    }

    let cdsHeight = 10
    let utrHeight = 4
    let rowH = 22

    if (displayMode === 'squish') {
      cdsHeight = 4
      utrHeight = 2
      rowH = 10
    } else if (displayMode === 'pack') {
      cdsHeight = 7
      utrHeight = 3
      rowH = 15
    }

    const BLOCK_MIN_W = 3
    const rowsBudget = Math.min(visible.length, Math.max(1, Math.floor((height - 18) / rowH)))

    interface Placed {
      it: any
      xStart: number
      xEnd: number
      row?: number
    }
    const placed: Placed[] = visible.map((it: any) => ({
      it,
      xStart: Math.max(0, ((it.start - region.start) / span) * width),
      xEnd: Math.min(width, ((it.end - region.start) / span) * width)
    }))

    const rowMaxX: number[] = []
    for (const p of placed) {
      const row = rowMaxX.findIndex(mx => mx < p.xStart)
      if (row !== -1) {
        rowMaxX[row] = p.xEnd
        p.row = row
      } else {
        rowMaxX.push(p.xEnd)
        p.row = rowMaxX.length - 1
      }
    }

    const rendered = placed.filter(p => p.row !== undefined && p.row < rowsBudget)
    const rowsUsed = Math.min(rowsBudget, rowMaxX.length)
    const usableWidth = width - 4

    ctx.strokeStyle = isDarkMode ? '#1e293b66' : '#f1f5f9'
    ctx.lineWidth = 0.5
    for (let r = 0; r < rowsUsed; r++) {
      const y = 16 + r * rowH
      ctx.beginPath()
      ctx.moveTo(0, y + rowH / 2 + cdsHeight / 2 + 1)
      ctx.lineTo(usableWidth, y + rowH / 2 + cdsHeight / 2 + 1)
      ctx.stroke()
    }

    for (const p of rendered) {
      const row = p.row!
      const yTop = 16 + row * rowH + (rowH - cdsHeight) / 2
      const yMid = yTop + cdsHeight / 2
      const tColor = this.hashColor(row, isDarkMode)
      const x1 = Math.max(0, Math.min(usableWidth, p.xStart))
      const x2 = Math.max(0, Math.min(usableWidth, p.xEnd))
      const range = x2 - x1

      if (range > 0) {
        ctx.strokeStyle = tColor
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x1, yMid)
        ctx.lineTo(x2, yMid)
        ctx.stroke()
      }

      const exons = p.it.exons || [{ start: p.it.start, end: p.it.end }]
      for (const ex of exons) {
        const exX1 = Math.max(0, Math.min(usableWidth, ((ex.start - region.start) / span) * width))
        const exX2 = Math.max(0, Math.min(usableWidth, ((ex.end - region.start) / span) * width))
        const exW = Math.max(BLOCK_MIN_W, exX2 - exX1)
        if (exW <= 0) continue

        if (ex.cdsStart !== undefined && ex.cdsEnd !== undefined && ex.cdsStart < ex.cdsEnd) {
          const cdsX1 = Math.max(0, Math.min(usableWidth, ((ex.cdsStart - region.start) / span) * width))
          const cdsX2 = Math.max(0, Math.min(usableWidth, ((ex.cdsEnd - region.start) / span) * width))

          if (exX1 < cdsX1) {
            ctx.fillStyle = tColor + (isDarkMode ? 'cc' : 'aa')
            ctx.fillRect(exX1, yTop + (cdsHeight - utrHeight) / 2, Math.max(BLOCK_MIN_W, cdsX1 - exX1), utrHeight)
          }
          if (cdsX2 > cdsX1) {
            ctx.fillStyle = tColor
            ctx.fillRect(cdsX1, yTop, Math.max(BLOCK_MIN_W, cdsX2 - cdsX1), cdsHeight)
          }
          if (cdsX2 < exX2) {
            ctx.fillStyle = tColor + (isDarkMode ? 'cc' : 'aa')
            ctx.fillRect(cdsX2, yTop + (cdsHeight - utrHeight) / 2, Math.max(BLOCK_MIN_W, exX2 - cdsX2), utrHeight)
          }
        } else {
          ctx.fillStyle = tColor + (isDarkMode ? 'cc' : 'aa')
          ctx.fillRect(exX1, yTop + (cdsHeight - utrHeight) / 2, exW, utrHeight)
        }
      }

      if (range > 16 && displayMode !== 'squish') {
        const termX = p.it.strand === '-' ? x1 : x2
        const dir = p.it.strand === '+' ? 1 : -1
        ctx.beginPath()
        ctx.moveTo(termX, yMid)
        ctx.lineTo(termX - 7 * dir, yMid - 4)
        ctx.lineTo(termX - 7 * dir, yMid + 4)
        ctx.closePath()
        ctx.fillStyle = tColor
        ctx.fill()
      }

      if (displayMode !== 'squish') {
        this.drawTranscriptLabel(ctx, geneSymbol, p.it.id || `T${placed.indexOf(p) + 1}`, p.it.strand, x1, x2, yMid, isDarkMode, usableWidth)
      }
    }

    ctx.fillStyle = isDarkMode ? '#34d399' : '#059669'
    ctx.font = 'bold 10px Inter, sans-serif'
    ctx.fillText(`Transcripts · ${geneSymbol} [${displayMode.toUpperCase()}: ${rendered.length}/${visible.length} variants]`, 6, 13)
  }

  private static drawTranscriptLabel(
    ctx: CanvasRenderingContext2D,
    gene: string,
    txId: string,
    strand: '+' | '-',
    xStart: number,
    xEnd: number,
    yMid: number,
    isDarkMode: boolean,
    usableWidth: number
  ) {
    const labelText = gene
    ctx.font = 'bold 10px Inter, sans-serif'
    const leftText = `${gene} ${strand}`
    const labelW = ctx.measureText(leftText).width + 6

    const textColor = isDarkMode ? '#f8fafc' : '#0f172a'
    ctx.fillStyle = textColor

    const canPlaceLeft = xStart - labelW >= 0
    const canPlaceRight = xEnd + labelW <= usableWidth

    if (canPlaceLeft) {
      ctx.textAlign = 'right'
      ctx.fillText(leftText, xStart - 3, yMid + 3)
      ctx.textAlign = 'left'
    } else if (canPlaceRight) {
      ctx.textAlign = 'left'
      ctx.fillText(leftText, xEnd + 3, yMid + 3)
      ctx.textAlign = 'left'
    } else {
      const w = ctx.measureText(leftText).width + 6
      ctx.fillStyle = isDarkMode ? '#0b1220cc' : '#ffffffcc'
      ctx.fillRect(xStart, yMid - 9, w, 12)
      ctx.strokeStyle = isDarkMode ? '#ffffff44' : '#00000022'
      ctx.lineWidth = 0.5
      ctx.strokeRect(xStart, yMid - 9, w, 12)
      ctx.fillStyle = textColor
      ctx.textAlign = 'left'
      ctx.fillText(leftText, xStart + 3, yMid - 1)
      ctx.textAlign = 'left'
    }

    ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b'
    ctx.font = '10px Fira Code, monospace'
    ctx.textAlign = 'right'
    ctx.fillText(txId, usableWidth, yMid + 12)
    ctx.textAlign = 'left'
  }

  private static hashColor(idx: number, isDarkMode: boolean): string {
    const dark = [
      '#38bdf8', // Cyan/Sky
      '#a78bfa', // Purple/Violet
      '#f472b6', // Pink
      '#34d399', // Emerald/Green
      '#fbbf24', // Amber/Yellow
      '#60a5fa', // Blue
      '#f87171', // Red
      '#fb923c', // Orange
      '#4ade80', // Light Green
      '#c084fc'  // Lavender
    ]
    const light = [
      '#0284c7', // Cyan/Sky
      '#7c3aed', // Purple
      '#be185d', // Pink
      '#059669', // Emerald
      '#d97706', // Amber
      '#2563eb', // Blue
      '#dc2626', // Red
      '#ea580c', // Orange
      '#16a34a', // Green
      '#9333ea'  // Violet
    ]
    const set = isDarkMode ? dark : light
    return set[Math.abs(idx) % set.length]
  }

  private static getGeneColor(geneName: string, geneIdx: number, isDarkMode: boolean): string {
    let hash = 0
    for (let i = 0; i < geneName.length; i++) {
      hash = (hash << 5) - hash + geneName.charCodeAt(i)
      hash |= 0
    }
    return this.hashColor(Math.abs(hash) + geneIdx, isDarkMode)
  }

  private static renderRefGeneAnnotation(
    rc: RenderContext,
    color: string,
    span: number
  ) {
    const { ctx, width, height, region, track, isDarkMode = true, onAsyncUpdate } = rc
    const genomeName = rc.genome ?? track.genome ?? 'hg38'
    const rawTrackNameKey = track.name || track.id || 'refGene'
    const trackNameKey = normalizeGeneTrackName(rawTrackNameKey)

    const fetchRegion = getFetchRegion(region, track)
    const chunk0 = { chr: region.chr, start: fetchRegion.start, end: region.start }
    const chunk1 = { chr: region.chr, start: region.start, end: region.end }
    const chunk2 = { chr: region.chr, start: region.end, end: fetchRegion.end }
    const chunks: GenomicRegion[] = [chunk0, chunk1, chunk2].filter(c => c.start < c.end)
    const allChunkKeys = chunks.map(c => `${genomeName}:${trackNameKey}:${c.chr}:${c.start}-${c.end}`)

    const cachedGenes: GeneInfo[] = []
    let allChunksFetched = true
    for (const chunkKey of allChunkKeys) {
      const cached = realGeneCache.get(chunkKey)
      if (cached) cachedGenes.push(...cached)
      else allChunksFetched = false
    }
    const deduped = new Map<string, GeneInfo>()
    for (const g of cachedGenes) deduped.set(`${g.name}:${g.start}`, g)
    const genes = Array.from(deduped.values()).filter(
      g => g.end >= region.start && g.start <= region.end
    )

    if (!allChunksFetched) {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const chunkKey = allChunkKeys[i]
        if (realGeneCache.has(chunkKey) || inFlightFetches.has(chunkKey)) continue
        const existingTimer = fetchTimers.get(chunkKey)
        if (existingTimer !== undefined) clearTimeout(existingTimer)
        fetchTimers.set(chunkKey, window.setTimeout(() => {
          fetchTimers.delete(chunkKey)
          if (realGeneCache.has(chunkKey)) return
          inFlightFetches.add(chunkKey)
          fetchRealRefGeneData(genomeName, chunk, trackNameKey).then(realGenes => {
            inFlightFetches.delete(chunkKey)
            realGeneCache.set(chunkKey, realGenes)
            if (onAsyncUpdate) onAsyncUpdate()
          })
        }, FETCH_DEBOUNCE_MS))
      }
      if (genes.length === 0) {
        genes.push(...SAMPLE_GENES.filter(
          g => g.chr === region.chr && g.end >= region.start && g.start <= region.end
        ))
      }
    }

    if (genes.length === 0) {
      ctx.fillStyle = isDarkMode ? '#64748b' : '#94a3b8'
      ctx.font = '11px Inter, sans-serif'
      ctx.fillText('Loading gene annotations...', 8, Math.max(height / 2, 14))
      return
    }

    const displayMode = track.options.displayMode || 'full'

    // --- Mode 1: DENSE (Single collapsed line) ---
    if (displayMode === 'dense') {
      const yMid = height / 2 + 2
      ctx.strokeStyle = isDarkMode ? '#334155' : '#cbd5e1'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, yMid)
      ctx.lineTo(width, yMid)
      ctx.stroke()

      genes.forEach((gene, gIdx) => {
        const geneColor = this.getGeneColor(gene.name, gIdx, isDarkMode)
        const exons = gene.exons || [{ start: gene.start, end: gene.end }]
        exons.forEach(exon => {
          const ex1 = ((exon.start - region.start) / span) * width
          const ex2 = ((exon.end - region.start) / span) * width
          const exW = Math.max(2, ex2 - ex1)
          ctx.fillStyle = geneColor
          ctx.fillRect(ex1, yMid - 5, exW, 10)
        })
      })

      ctx.fillStyle = isDarkMode ? '#34d399' : '#059669'
      ctx.font = 'bold 10px Inter, sans-serif'
      ctx.fillText(`Dense Gene View (${genes.length} Genes Collapsed)`, width - 210, 13)
      return
    }

    // --- Modes: FULL, PACK, SQUISH ---
    let rowHeight = 24
    let exonHalfH = 5
    let topMargin = 18
    let showLabels = true
    let fontStr = 'bold 11px Inter, sans-serif'

    if (displayMode === 'squish') {
      rowHeight = 10
      exonHalfH = 2
      topMargin = 14
      showLabels = false
      fontStr = '9px Inter, sans-serif'
    } else if (displayMode === 'pack') {
      rowHeight = 15
      exonHalfH = 3.5
      topMargin = 16
      showLabels = true
      fontStr = '10px Inter, sans-serif'
    }

    interface PlacedGene {
      gene: GeneInfo
      xStart: number
      xEnd: number
      row: number
    }
    const placedGenes: PlacedGene[] = []
    const rowRightmostX: number[] = []

    genes.forEach(gene => {
      const x1 = ((gene.start - region.start) / span) * width
      const x2 = ((gene.end - region.start) / span) * width
      ctx.font = fontStr
      const labelW = showLabels ? ctx.measureText(`${gene.name} (${gene.strand})`).width + 12 : 6
      const xEndWithLabel = x2 + labelW

      let row = rowRightmostX.findIndex(maxX => maxX < x1)
      if (row !== -1) {
        rowRightmostX[row] = xEndWithLabel
      } else {
        row = rowRightmostX.length
        rowRightmostX.push(xEndWithLabel)
      }
      placedGenes.push({ gene, xStart: x1, xEnd: x2, row })
    })

    const maxRows = Math.max(1, Math.floor((height - topMargin) / rowHeight))
    const visiblePlaced = placedGenes.filter(p => p.row < maxRows)

    visiblePlaced.forEach((p, geneIdx) => {
      const { gene, xStart: x1, xEnd: x2, row } = p
      const yMid = topMargin + row * rowHeight + rowHeight / 2
      const geneColor = this.getGeneColor(gene.name, geneIdx, isDarkMode)

      ctx.strokeStyle = geneColor
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(Math.max(0, x1), yMid)
      ctx.lineTo(Math.min(width, x2), yMid)
      ctx.stroke()

      if (displayMode !== 'squish') {
        ctx.fillStyle = geneColor
        for (let ax = Math.max(0, x1) + 15; ax < Math.min(width, x2); ax += 35) {
          ctx.beginPath()
          if (gene.strand === '+') {
            ctx.moveTo(ax - 3, yMid - 3)
            ctx.lineTo(ax + 3, yMid)
            ctx.lineTo(ax - 3, yMid + 3)
          } else {
            ctx.moveTo(ax + 3, yMid - 3)
            ctx.lineTo(ax - 3, yMid)
            ctx.lineTo(ax + 3, yMid + 3)
          }
          ctx.stroke()
        }
      }

      const exons = gene.exons || [{ start: gene.start, end: gene.end }]
      exons.forEach(exon => {
        const ex1 = ((exon.start - region.start) / span) * width
        const ex2 = ((exon.end - region.start) / span) * width
        const exW = Math.max(2, ex2 - ex1)
        ctx.fillStyle = geneColor
        ctx.fillRect(ex1, yMid - exonHalfH, exW, exonHalfH * 2)
        if (displayMode === 'full') {
          ctx.strokeStyle = isDarkMode ? '#ffffff44' : '#00000022'
          ctx.lineWidth = 0.5
          ctx.strokeRect(ex1, yMid - exonHalfH, exW, exonHalfH * 2)
        }
      })

      if (showLabels) {
        ctx.fillStyle = isDarkMode ? '#f8fafc' : '#0f172a'
        ctx.font = fontStr
        const labelX = Math.max(8, Math.min(width - 90, x1))
        ctx.fillText(`${gene.name} (${gene.strand})`, labelX, yMid - exonHalfH - 2)
      }
    })

    if (displayMode !== 'full') {
      ctx.fillStyle = isDarkMode ? '#34d399' : '#059669'
      ctx.font = '10px Inter, sans-serif'
      ctx.fillText(`${displayMode.toUpperCase()} Mode (${visiblePlaced.length}/${genes.length} Genes)`, width - 180, 13)
    }
  }

  private static renderBed({ ctx, width, height, region, track, isDarkMode = true }: RenderContext) {
    const color = track.options.color || (isDarkMode ? '#06b6d4' : '#0891b2')
    const span = Math.max(1, region.end - region.start + 1)
    const seed = getTrackSeed(track)
    const displayMode = track.options.displayMode || 'full'

    if (displayMode === 'dense') {
      const yMid = height / 2
      ctx.fillStyle = color

      const localItems = track.items as ParsedLocalBedItem[] | undefined
      if (localItems && Array.isArray(localItems) && localItems.length > 0) {
        const normChr = region.chr.toLowerCase()
        const overlapping = localItems.filter(item =>
          item.chr.toLowerCase() === normChr && item.end >= region.start && item.start <= region.end
        )
        overlapping.forEach(item => {
          const x1 = ((item.start - region.start) / span) * width
          const x2 = ((item.end - region.start) / span) * width
          ctx.fillStyle = item.color || color
          ctx.fillRect(x1, yMid - 4, Math.max(2, x2 - x1), 8)
        })
        ctx.fillStyle = isDarkMode ? '#34d399' : '#059669'
        ctx.font = '10px Inter, sans-serif'
        ctx.fillText(`Dense Bed View (${overlapping.length} Loci)`, width - 160, 14)
        return
      }

      const blockCount = 6 + (seed % 5)
      const blockSize = Math.floor(span / blockCount)
      for (let i = 0; i < blockCount; i++) {
        const bStart = region.start + i * blockSize + ((i + seed) % 2 === 0 ? 5000 : 18000)
        const bEnd = bStart + Math.floor(blockSize * 0.35)
        const x1 = ((bStart - region.start) / span) * width
        const x2 = ((bEnd - region.start) / span) * width
        ctx.fillRect(x1, yMid - 4, Math.max(2, x2 - x1), 8)
      }
      return
    }

    const localItems = track.items as ParsedLocalBedItem[] | undefined
    if (localItems && Array.isArray(localItems) && localItems.length > 0) {
      const normChr = region.chr.toLowerCase()
      const overlapping = localItems.filter(item =>
        item.chr.toLowerCase() === normChr && item.end >= region.start && item.start <= region.end
      )

      if (overlapping.length > 0) {
        overlapping.forEach((item, idx) => {
          const x1 = ((item.start - region.start) / span) * width
          const x2 = ((item.end - region.start) / span) * width
          const w = Math.max(4, x2 - x1)
          const y = height / 2 - 8

          ctx.fillStyle = item.color || color
          ctx.fillRect(x1, y, w, 16)
          ctx.strokeStyle = isDarkMode ? '#ffffff33' : '#00000022'
          ctx.strokeRect(x1, y, w, 16)

          if (w > 30) {
            ctx.fillStyle = isDarkMode ? '#cbd5e1' : '#334155'
            ctx.font = '10px Fira Code, monospace'
            ctx.fillText(item.name || `Loc_${idx + 1}`, x1 + 3, y + 12)
          }
        })

        ctx.fillStyle = isDarkMode ? '#34d399' : '#059669'
        ctx.font = '10px Inter, sans-serif'
        ctx.fillText(`📁 Local Track (${overlapping.length} Loci Visible)`, width - 180, 14)
        return
      }
    }

    const blockCount = 6 + (seed % 5)
    const blockSize = Math.floor(span / blockCount)

    for (let i = 0; i < blockCount; i++) {
      const bStart = region.start + i * blockSize + ((i + seed) % 2 === 0 ? 5000 : 18000)
      const bEnd = bStart + Math.floor(blockSize * 0.35)

      const x1 = ((bStart - region.start) / span) * width
      const x2 = ((bEnd - region.start) / span) * width
      const w = Math.max(4, x2 - x1)
      const y = height / 2 - 8

      ctx.fillStyle = color
      ctx.fillRect(x1, y, w, 16)
      ctx.strokeStyle = isDarkMode ? '#ffffff33' : '#00000022'
      ctx.strokeRect(x1, y, w, 16)

      ctx.fillStyle = isDarkMode ? '#cbd5e1' : '#334155'
      ctx.font = '10px Fira Code, monospace'
      ctx.fillText(`Peak_${(seed % 10) + i + 1}`, x1 + 2, y + 12)
    }

    if (track.url?.startsWith('local://')) {
      ctx.fillStyle = isDarkMode ? '#34d399' : '#059669'
      ctx.font = '10px Inter, sans-serif'
      ctx.fillText('📁 Local Track File', width - 130, 14)
    }
  }

  private static renderBam({ ctx, width, height, region, track, isDarkMode = true }: RenderContext) {
    const span = Math.max(1, region.end - region.start + 1)
    const seed = getTrackSeed(track)

    const covHeight = 25
    ctx.fillStyle = isDarkMode ? '#475569' : '#cbd5e1'
    ctx.fillRect(0, 0, width, covHeight)

    const readLength = Math.max(150, Math.floor(span / 80))
    const rowCount = Math.floor((height - covHeight - 10) / 12)

    const baseColors: Record<string, string> = {
      A: '#22c55e',
      C: '#3b82f6',
      G: '#eab308',
      T: '#ef4444',
      N: '#64748b'
    }

    for (let row = 0; row < rowCount; row++) {
      const y = covHeight + 10 + row * 12
      const readCount = 5 + (seed % 3)

      for (let r = 0; r < readCount; r++) {
        const rStart = region.start + r * Math.floor(span / readCount) + row * 700 + (seed % 400)
        const rEnd = rStart + readLength
        const x1 = ((rStart - region.start) / span) * width
        const x2 = ((rEnd - region.start) / span) * width
        const w = Math.max(6, x2 - x1)

        ctx.fillStyle = isDarkMode
          ? (row % 2 === 0 ? '#475569' : '#334155')
          : (row % 2 === 0 ? '#94a3b8' : '#cbd5e1')
        ctx.fillRect(x1, y, w, 8)

        if (span < 50000) {
          const mismatchX = x1 + w * 0.4
          const base = ['A', 'C', 'G', 'T'][(row + seed) % 4]
          ctx.fillStyle = baseColors[base]
          ctx.fillRect(mismatchX, y, Math.max(2, w * 0.1), 8)
        }
      }
    }

    ctx.fillStyle = isDarkMode ? '#94a3b8' : '#475569'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText(track.url?.startsWith('local://') ? '📁 Local BAM Coverage & Alignments' : 'Coverage & Read Alignments', 6, 16)
  }

  private static renderHiC({ ctx, width, height, region, track, isDarkMode = true }: RenderContext) {
    const color = track.options.color || (isDarkMode ? '#8b5cf6' : '#7c3aed')
    const span = Math.max(1, region.end - region.start + 1)
    const seed = getTrackSeed(track)
    const arcCount = 8 + (seed % 6)

    ctx.strokeStyle = color
    ctx.lineWidth = 1.5

    for (let i = 0; i < arcCount; i++) {
      const p1 = region.start + (((i + seed * 0.1) * 0.09 + 0.05) % 1) * span
      const p2 = p1 + (((i + seed * 0.2) * 0.12 + 0.1) % 0.5) * span

      const x1 = ((p1 - region.start) / span) * width
      const x2 = ((p2 - region.start) / span) * width
      const midX = (x1 + x2) / 2
      const arcHeight = Math.min(height - 10, Math.abs(x2 - x1) * 0.4)

      ctx.beginPath()
      ctx.moveTo(x1, height)
      ctx.quadraticCurveTo(midX, height - arcHeight * 2, x2, height)
      ctx.globalAlpha = 0.6
      ctx.stroke()
      ctx.globalAlpha = 1.0
    }

    ctx.fillStyle = isDarkMode ? '#a78bfa' : '#6d28d9'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText('Chromatin Conformation Arc View', 6, 14)
  }

  private static renderSynteny({ ctx, width, height, region, track, isDarkMode = true }: RenderContext) {
    const color1 = track.options.color || (isDarkMode ? '#38bdf8' : '#0284c7')
    const color2 = track.options.secondaryColor || '#f97316'
    const span = Math.max(1, region.end - region.start + 1)
    const seed = getTrackSeed(track)

    ctx.fillStyle = color1
    ctx.fillRect(0, 5, width, 12)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 9px Inter, sans-serif'
    ctx.fillText(`Target: ${region.chr}`, 6, 14)

    ctx.fillStyle = color2
    ctx.fillRect(0, height - 17, width, 12)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`Query: ${track.querygenome || 'mm10'}`, 6, height - 8)

    const blockCount = 4 + (seed % 4)
    for (let i = 0; i < blockCount; i++) {
      const s1 = (i / blockCount) * width + 20 + (seed % 30)
      const e1 = s1 + (width / blockCount) * 0.6
      const s2 = s1 + (i % 2 === 0 ? 15 : -10)
      const e2 = s2 + (width / blockCount) * 0.6

      ctx.beginPath()
      ctx.moveTo(s1, 17)
      ctx.lineTo(e1, 17)
      ctx.lineTo(e2, height - 17)
      ctx.lineTo(s2, height - 17)
      ctx.closePath()

      ctx.fillStyle = i % 2 === 0 ? color1 + '44' : color2 + '44'
      ctx.fill()
      ctx.strokeStyle = color1
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }

  private static renderMethylC({ ctx, width, height, region, track, isDarkMode = true }: RenderContext) {
    const color = track.options.color || (isDarkMode ? '#ef4444' : '#dc2626')
    const span = Math.max(1, region.end - region.start + 1)
    const seed = getTrackSeed(track)
    const siteCount = Math.min(width / 6, 120)

    for (let i = 0; i < siteCount; i++) {
      const x = (i / siteCount) * width
      const pct = pseudoRandom(region.start + i * 77 + seed)
      const barH = pct * (height - 15)

      ctx.fillStyle = pct > 0.6 ? color : (isDarkMode ? '#38bdf8' : '#0284c7')
      ctx.fillRect(x, height - barH, 3, barH)
    }

    ctx.fillStyle = isDarkMode ? '#f87171' : '#b91c1c'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText('CpG Methylation Ratio (0% - 100%)', 6, 14)
  }

  private static renderVcf({ ctx, width, height, region, track, isDarkMode = true }: RenderContext) {
    const color = track.options.color || (isDarkMode ? '#10b981' : '#059669')
    const span = Math.max(1, region.end - region.start + 1)
    const seed = getTrackSeed(track)
    const varCount = 10 + (seed % 8)

    for (let i = 0; i < varCount; i++) {
      const pos = region.start + pseudoRandom(i * 999 + seed) * span
      const x = ((pos - region.start) / span) * width

      ctx.fillStyle = i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#38bdf8' : color
      ctx.beginPath()
      ctx.arc(x, height / 2, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = isDarkMode ? '#ffffffaa' : '#00000044'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, height / 2 + 4)
      ctx.lineTo(x, height - 5)
      ctx.stroke()
    }

    ctx.fillStyle = isDarkMode ? '#34d399' : '#047857'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText(track.url?.startsWith('local://') ? '📁 Local VCF Variants' : 'SNVs & Indels (1000 Genomes)', 6, 14)
  }
}
