import { GenomicRegion } from '../types/region'

/**
 * Which sides of the target region to flank.
 *
 * Mirrors the reference eg3 `FlankingStrategy` types (SURROUND_ALL /
 * SURROUND_START / SURROUND_END).  Here they operate on the visible
 * viewport rather than a single gene locus, so there is no strand
 * awareness — "upstream" always means left (smaller coordinate) and
 * "downstream" always means right (larger coordinate).
 */
export type FlankingStrategyType = 'all' | 'start' | 'end'

export interface IFlankingStrategy {
  type: FlankingStrategyType
  upstream: number
  downstream: number
  maxFetchSpan: number
}

/**
 * Expands a target region by a fixed number of bases on one or both
 * sides, regardless of the current zoom level.
 *
 * This is the reference eg3 loading strategy.  Compared with a
 * span-proportional expansion (N× the visible width), fixed-base
 * flanking behaves correctly at both zoom extremes:
 *
 *   - Zoomed very far in (e.g. 100 bp viewport): 2.5 Mb flank gives
 *     wide neighbouring context so the user sees surrounding genes.
 *   - Zoomed very far out (e.g. 250 Mb viewport): the viewport is
 *     already larger than the flank, so no expansion happens — we
 *     avoid loading the whole chromosome.
 *
 * @author adapted from eg3 `models/FlankingStrategy.ts`
 */
export class FlankingStrategy {
  static readonly SURROUND_ALL: FlankingStrategyType = 'all'
  static readonly SURROUND_START: FlankingStrategyType = 'start'
  static readonly SURROUND_END: FlankingStrategyType = 'end'

  constructor(
    public type: FlankingStrategyType = FlankingStrategy.SURROUND_ALL,
    public upstream: number = 2_500_000,
    public downstream: number = 2_500_000,
    public maxFetchSpan: number = 5_000_000
  ) {
    this.upstream = Math.max(0, Math.round(Number(upstream)))
    this.downstream = Math.max(0, Math.round(Number(downstream)))
    this.maxFetchSpan = Math.max(1, Math.round(Number(maxFetchSpan)))
  }

  /**
   * Returns a new region that contains the input region plus up to
   * `upstream` / `downstream` bases of flank, capped at `maxFetchSpan`
   * total.  The visible region is always fully included.
   */
  apply(region: GenomicRegion): GenomicRegion {
    const span = Math.max(1, region.end - region.start + 1)
    const center = Math.floor((region.start + region.end) / 2)
    const halfVisible = Math.floor(span / 2)
    const totalFlank = this.upstream + this.downstream

    // If the viewport is already at least as wide as the total flank,
    // flanking would not add any useful context — return the viewport
    // unchanged (clamped to valid bounds).
    if (span >= totalFlank) {
      return { chr: region.chr, start: region.start, end: region.end }
    }

    let newStart: number
    let newEnd: number

    switch (this.type) {
      case FlankingStrategy.SURROUND_ALL:
        // Expand on both sides, but never shrink below the visible region.
        newStart = Math.max(1, center - Math.max(this.upstream, halfVisible))
        newEnd = center + Math.max(this.downstream, halfVisible)
        break

      case FlankingStrategy.SURROUND_START:
        // Only expand left (upstream context).
        newStart = Math.max(1, region.start - this.upstream)
        newEnd = region.end
        break

      case FlankingStrategy.SURROUND_END:
        // Only expand right (downstream context).
        newStart = region.start
        newEnd = region.end + this.downstream
        break

      default:
        newStart = Math.max(1, center - Math.max(this.upstream, halfVisible))
        newEnd = center + Math.max(this.downstream, halfVisible)
    }

    // Cap the total fetch span to avoid pulling the whole chromosome.
    const totalFetchSpan = newEnd - newStart + 1
    if (totalFetchSpan > this.maxFetchSpan) {
      const excess = Math.floor((totalFetchSpan - this.maxFetchSpan) / 2)
      newStart = Math.max(1, newStart + excess)
      newEnd = Math.min(newEnd, newStart + this.maxFetchSpan - 1)
    }

    return { chr: region.chr, start: newStart, end: newEnd }
  }
}

export const DEFAULT_FLANKING_STRATEGY = new FlankingStrategy(
  FlankingStrategy.SURROUND_ALL,
  2_500_000, // upstream
  2_500_000  // downstream
)