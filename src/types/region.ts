export interface GenomicRegion {
  chr: string
  start: number
  end: number
}

export function parseGenomicRegion(str: string, defaultChr = 'chr7', defaultSize = 1000000): GenomicRegion | null {
  if (!str) return null
  const cleaned = str.trim().replace(/,/g, '')
  
  // Format: chr7:27053397-27373765 or chr7:27053397
  const match = cleaned.match(/^([a-zA-Z0-9_]+)(?::(\d+)(?:-(\d+))?)?$/)
  if (!match) return null

  const chr = match[1]
  const start = match[2] ? parseInt(match[2], 10) : 1
  const end = match[3] ? parseInt(match[3], 10) : start + defaultSize - 1

  return {
    chr: chr.startsWith('chr') ? chr : `chr${chr}`,
    start: Math.max(1, Math.min(start, end)),
    end: Math.max(start, end)
  }
}

export function formatGenomicRegion(region: GenomicRegion): string {
  return `${region.chr}:${region.start.toLocaleString()}-${region.end.toLocaleString()}`
}

export function formatRegionCompact(region: GenomicRegion): string {
  return `${region.chr}:${region.start}-${region.end}`
}
