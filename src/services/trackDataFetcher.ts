import { GenomicRegion } from '../types/region'
import { SAMPLE_GENES, GeneInfo } from '../data/sampleGenes'

export interface RefGeneItem {
  _id: string
  chrom: string
  txStart: number
  txEnd: number
  cdsStart: number
  cdsEnd: number
  strand: '+' | '-'
  name: string
  id: string
  exonStarts: string
  exonEnds: string
  transcriptionClass?: string
  description?: string
}

/**
 * Split each refGene exon into CDS vs UTR pieces (eg3 approach).
 *
 * The WashU refGene export carries `cdsStart` / `cdsEnd` as *transcript-level*
 * boundaries (not per-exon).  For each exon we intersect it with the CDS
 * interval; the intersection is drawn as a thick CDS block, the exon's
 * remaining parts as thinner UTR blocks.  When cdsStart === cdsEnd the
 * transcript has no CDS (lncRNA / pseudogene) and the whole exon is UTR.
 */
export function parseRefGeneExons(
  item: RefGeneItem
): { start: number; end: number; cdsStart?: number; cdsEnd?: number }[] {
  const starts = item.exonStarts ? item.exonStarts.split(',').filter(Boolean).map(Number) : []
  const ends = item.exonEnds ? item.exonEnds.split(',').filter(Boolean).map(Number) : []
  if (starts.length === 0) return []

  const cdsActive = item.cdsStart !== item.cdsEnd
  const exons: { start: number; end: number; cdsStart?: number; cdsEnd?: number }[] = []
  for (let i = 0; i < starts.length; i++) {
    const st = starts[i] ?? 0
    const en = ends[i] ?? st + 100
    let ecs: number | undefined
    let ece: number | undefined
    if (cdsActive) {
      ecs = Math.max(item.cdsStart, st)
      ece = Math.min(item.cdsEnd, en)
      if (ecs >= ece) { ecs = undefined; ece = undefined }
    }
    exons.push({ start: st, end: en, ...(ecs !== undefined ? { cdsStart: ecs, cdsEnd: ece } : {}) })
  }
  return exons
}

export interface ParsedGeneFeature {
  name: string
  id: string
  chr: string
  start: number
  end: number
  strand: '+' | '-'
  description: string
  transcriptionClass?: string
  exons: Array<{ start: number; end: number; cdsStart?: number; cdsEnd?: number }>
}

const geneCache = new Map<string, ParsedGeneFeature[]>()

export function normalizeGeneTrackName(name: string): string {
  if (!name) return 'refGene'
  const lower = name.toLowerCase()
  if (lower.includes('refgene')) return 'refGene'
  if (lower.includes('gencode')) return 'gencode'
  if (lower.includes('ncbi')) return 'ncbiRefSeq'
  return 'refGene'
}

// ---------------------------------------------------------------------------
// Primary-chromosome sets (shared by search + annotation paths).
//
// MyGene.info and the WashU Epigenome API both may report genes on
// alt/patch assemblies (FNWR*, QGOO*, GL*, UN*).  For a canonical
// genome browser we only want the primary assembly so the user never
// lands on `chrFNWR01000165.1:...`.
// ---------------------------------------------------------------------------
const PRIMARY_CHR_HUMAN = new Set(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','X','Y','M'])
const PRIMARY_CHR_MOUSE = new Set(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','X','Y','M'])

function normalizeChr(raw: string): string {
  const s = String(raw).trim()
  return s.startsWith('chr') ? s : `chr${s}`
}

/**
 * Strip the optional `chr` prefix and return the bare name so we can
 * test it against the primary-chromosome sets.
 */
function bareChr(raw: string): string {
  return normalizeChr(raw).replace(/^chr/i, '')
}

function getPrimarySet(genome: string): Set<string> {
  return genome.toLowerCase().includes('mm') ? PRIMARY_CHR_MOUSE : PRIMARY_CHR_HUMAN
}

export function isPrimaryChromosome(chr: string, genome: string): boolean {
  return getPrimarySet(genome).has(bareChr(chr))
}

/**
 * Pick the best genomic_pos entry from a (possibly multi-entry) result.
 * Prefers a primary-chromosome entry; falls back to the first entry.
 */
export function pickBestPos(rawPos: any, genome = 'hg38'): any | null {
  if (rawPos && !Array.isArray(rawPos)) {
    return rawPos
  }
  if (!Array.isArray(rawPos) || rawPos.length === 0) return null

  const primarySet = getPrimarySet(genome)

  const primary = rawPos.find(
    (p: any) => p?.chr && primarySet.has(bareChr(String(p.chr)))
  )
  if (primary) return primary

  // Fallback: first entry (matches old behaviour for single-position genes).
  return rawPos[0] ?? null
}

// ---------------------------------------------------------------------------
// refGene annotation
// ---------------------------------------------------------------------------

/**
 * Fetches real RefGene annotation from WashU Epigenome API.
 *
 * Filters results to primary chromosomes only — alt/patch assemblies are
 * rejected so the view never lands on something like `chrFNWR01000165.1`.
 */
export async function fetchRealRefGeneData(
  genome: string,
  region: GenomicRegion,
  geneTrackName = 'refGene'
): Promise<ParsedGeneFeature[]> {
  const cleanTrackName = normalizeGeneTrackName(geneTrackName)

  // If the requested region is itself on a non-primary chromosome, don't
  // even hit the network — nothing canonical lives there.
  if (!isPrimaryChromosome(region.chr, genome)) {
    console.warn(`RefGene query skipped: ${region.chr} is not a primary chromosome for ${genome}`)
    return []
  }

  const cacheKey = `${genome}:${cleanTrackName}:${region.chr}:${region.start}-${region.end}`
  if (geneCache.has(cacheKey)) {
    return geneCache.get(cacheKey)!
  }

  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const baseUrl = isDev ? '/api-washu/v3' : 'https://lambda.epigenomegateway.org/v3'
  const queryPath = `${genome}/genes/${cleanTrackName}/queryRegion?chr=${region.chr}&start=${region.start}&end=${region.end}`

  try {
    let res = await fetch(`${baseUrl}/${queryPath}`)
    if (!res.ok && isDev) {
      res = await fetch(`https://lambda.epigenomegateway.org/v3/${queryPath}`)
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const rawData: RefGeneItem[] = await res.json()

    // Defence: drop any feature that landed on a non-primary chromosome
    // (the API normally scopes by the requested chr, but be defensive).
    const filtered = rawData.filter(item => isPrimaryChromosome(item.chrom, genome))

    const parsed: ParsedGeneFeature[] = filtered.map(item => {
      const exons = parseRefGeneExons(item)

      return {
        name: item.name || item.id,
        id: item.id,
        chr: item.chrom,
        start: item.txStart,
        end: item.txEnd,
        strand: item.strand,
        description: item.description || '',
        transcriptionClass: item.transcriptionClass || '',
        exons: exons.length > 0 ? exons : [{ start: item.txStart, end: item.txEnd }]
      }
    })

    geneCache.set(cacheKey, parsed)
    return parsed
  } catch (err) {
    console.warn('Real refGene API fetch failed, falling back to local simulation:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// transcript variants for a gene
// ---------------------------------------------------------------------------

export interface TranscriptVariant {
  name: string
  chr: string
  start: number
  end: number
  strand: '+' | '-'
  description: string
  id?: string
  transcriptionClass?: string
  exons: Array<{ start: number; end: number; cdsStart?: number; cdsEnd?: number }>
}

/**
 * Fetch all transcript variants of a gene from refGene.
 *
 * refGene stores one row per gene entry; genes with multiple transcripts
 * appear as multiple rows sharing the same `name` (gene symbol) but with
 * different exon structures.  We query a wide region centred on the gene
 * locus and filter by symbol.
 */
export async function fetchGeneTranscripts(
  genome: string,
  symbol: string,
  locus: { chr: string; start: number; end: number }
): Promise<GeneInfo[]> {
  const span = Math.max(1, locus.end - locus.start)
  // At least 5 Mb each side, or 10× the gene span — whichever is larger —
  // to capture distant alternative promoters / transcripts.
  const halfExpand = Math.max(5_000_000, Math.floor(span * 10))
  const center = Math.floor((locus.start + locus.end) / 2)
  const region: GenomicRegion = {
    chr: locus.chr,
    start: Math.max(1, center - halfExpand),
    end: center + halfExpand
  }

  const features = await fetchRealRefGeneData(genome, region, 'refGene')
  const norm = symbol.toUpperCase()

  return features
    .filter(f => f.name.toUpperCase() === norm)
    .sort((a, b) => a.start - b.start)
    .map((f, i) => ({
      name: f.name,
      chr: f.chr,
      start: f.start,
      end: f.end,
      strand: f.strand,
      description: `Transcript ${i + 1}`,
      exons: f.exons
    }))
}

// ---------------------------------------------------------------------------
// gene-name search
// ---------------------------------------------------------------------------

export async function searchGeneByName(
  query: string,
  species = 'human'
): Promise<GeneInfo[]> {
  if (!query || query.trim().length === 0) return []
  const clean = query.trim().toUpperCase()

  const localMatches = SAMPLE_GENES.filter(
    g => g.name.toUpperCase().startsWith(clean) || g.name.toUpperCase().includes(clean)
  )
  if (localMatches.length > 0) return localMatches

  try {
    const speciesParam = species.toLowerCase().includes('mouse') ? 'mouse' : 'human'
    const url = `https://mygene.info/v3/query?q=symbol:${encodeURIComponent(clean)}*&species=${speciesParam}&fields=symbol,name,genomic_pos&size=8`
    const res = await fetch(url)
    if (!res.ok) return []

    const data = await res.json()
    const hits = data.hits || []
    // Derive a genome hint for primary-chromosome filtering.
    const genome = species.toLowerCase().includes('mouse') ? 'mm10' : 'hg38'

    const remoteResults: GeneInfo[] = []
    hits.forEach((hit: any) => {
      const pos = pickBestPos(hit.genomic_pos, genome)

      if (hit.symbol && pos && pos.chr && pos.start !== undefined && pos.end !== undefined) {
        const chr = normalizeChr(String(pos.chr))
        remoteResults.push({
          name: hit.symbol,
          chr,
          start: pos.start,
          end: pos.end,
          strand: pos.strand === 1 ? '+' : '-',
          description: hit.name || 'Genomic Gene Locus'
        })
      }
    })

    return remoteResults
  } catch (err) {
    console.warn('MyGene search failed:', err)
    return []
  }
}