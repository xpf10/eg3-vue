import { BigWig } from '@gmod/bbi'
import { BlobFile, RemoteFile } from 'generic-filehandle2'
import { Track, TrackType } from '../types/track'
import { GenomicRegion } from '../types/region'

export interface ParsedLocalBedItem {
  chr: string
  start: number
  end: number
  name?: string
  score?: number
  strand?: '+' | '-'
  color?: string
}

export interface LocalFileParseResult {
  trackName: string
  trackType: TrackType
  fileSize: number
  fileSizeBytes: number
  itemsCount?: number
  items?: ParsedLocalBedItem[]
  bwInstance?: any
  bwHeader?: any
  rawContent?: string | ArrayBuffer
}

/**
 * Parses user local files (.bed, .bw, .bigwig, .bb, .bigbed, .bam, .vcf, .gff, .gtf, .json)
 * and handles remote network HTTP BigWig Byte-Range streaming tracks using eg3 GMOD architecture.
 */
export class LocalFileLoader {
  static async parseFile(file: File): Promise<LocalFileParseResult> {
    const fileName = file.name
    const fileSize = file.size
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    if (ext === 'json') {
      const text = await file.text()
      return {
        trackName: fileName.replace(/\.json$/i, ''),
        trackType: 'bed',
        fileSize: fileSize,
        fileSizeBytes: fileSize,
        rawContent: text
      }
    }

    if (ext === 'bw' || ext === 'bigwig' || ext === 'bb' || ext === 'bigbed') {
      try {
        const filehandle = new BlobFile(file)
        const bw = new BigWig({ filehandle })
        const header = await bw.getHeader()

        return {
          trackName: fileName.replace(/\.(bw|bigwig|bb|bigbed)$/i, ''),
          trackType: 'bigwig',
          fileSize: fileSize,
          fileSizeBytes: fileSize,
          bwInstance: bw,
          bwHeader: header
        }
      } catch (err) {
        console.warn('BigWig binary header parse warning, falling back to raw buffer:', err)
        const buffer = await file.arrayBuffer()
        return {
          trackName: fileName.replace(/\.(bw|bigwig|bb|bigbed)$/i, ''),
          trackType: 'bigwig',
          fileSize: fileSize,
          fileSizeBytes: fileSize,
          rawContent: buffer
        }
      }
    }

    if (ext === 'bam') {
      const buffer = await file.arrayBuffer()
      return {
        trackName: fileName.replace(/\.bam$/i, ''),
        trackType: 'bam',
        fileSize: fileSize,
        fileSizeBytes: fileSize,
        rawContent: buffer
      }
    }

    if (ext === 'vcf') {
      const text = await file.text()
      return {
        trackName: fileName.replace(/\.vcf$/i, ''),
        trackType: 'vcf',
        fileSize: fileSize,
        fileSizeBytes: fileSize,
        rawContent: text
      }
    }

    // Default text line parser for BED / GFF / GTF / TSV / CSV
    const text = await file.text()
    const lines = text.split(/\r?\n/)
    const parsedItems: ParsedLocalBedItem[] = []

    let detectedType: TrackType = 'bed'
    if (ext === 'gff' || ext === 'gff3' || ext === 'gtf') {
      detectedType = 'geneAnnotation'
    }

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('track') || trimmed.startsWith('browser')) {
        continue
      }

      const cols = trimmed.split(/\s+|\t+/)
      if (cols.length >= 3) {
        const rawChr = cols[0]
        const start = parseInt(cols[1], 10)
        const end = parseInt(cols[2], 10)

        if (!isNaN(start) && !isNaN(end)) {
          const chr = rawChr.startsWith('chr') ? rawChr : `chr${rawChr}`
          parsedItems.push({
            chr,
            start: Math.min(start, end),
            end: Math.max(start, end),
            name: cols[3] || `Item_${parsedItems.length + 1}`,
            score: cols[4] ? parseFloat(cols[4]) : undefined,
            strand: cols[5] === '-' ? '-' : '+'
          })
        }
      }
    }

    return {
      trackName: fileName.replace(/\.[^/.]+$/, ''),
      trackType: detectedType,
      fileSize: fileSize,
      fileSizeBytes: fileSize,
      itemsCount: parsedItems.length,
      items: parsedItems,
      rawContent: text
    }
  }

  static createTrackFromLocalResult(
    result: LocalFileParseResult,
    customName?: string,
    customColor?: string
  ): Track {
    const uniqueId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    return {
      id: uniqueId,
      name: customName || result.trackName,
      type: result.trackType,
      url: `local://${uniqueId}`,
      showOnHubLoad: true,
      visible: true,
      options: {
        color: customColor || '#38bdf8',
        height: 60,
        displayMode: 'full'
      },
      metadata: {
        assay: 'Local File Track',
        cell: 'User Upload',
        lab: 'Local Storage',
        fileSize: `${(result.fileSizeBytes / 1024).toFixed(1)} KB`,
        itemCount: result.itemsCount
      },
      items: result.items,
      bwInstance: result.bwInstance,
      rawContent: result.rawContent
    }
  }

  /**
   * Creates a remote streaming HTTP BigWig track using RemoteFile Byte-Range requests.
   * Includes multi-level fallbacks (Local Dev Proxy -> Direct URL -> ENCODE Official CDN).
   */
  static async createRemoteTrack(
    url: string,
    name: string,
    type: TrackType,
    color?: string
  ): Promise<Track> {
    const uniqueId = `remote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    let bwInstance: any = null

    // Extract ENCODE file ID (e.g. ENCFF501MDH) for public CDN fallback
    const encodeMatch = url.match(/ENCFF[0-9A-Z]+/i)
    const encodeId = encodeMatch ? encodeMatch[0].toUpperCase() : null
    const encodeCdnUrl = encodeId ? `https://www.encodeproject.org/files/${encodeId}/@@download/${encodeId}.bigWig` : null

    const requestUrls: string[] = []

    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      if (url.includes('10.1.20.6:8080')) {
        requestUrls.push(url.replace(/https?:\/\/10\.1\.20\.6:8080/, '/api-chipseq'))
      }
    }
    requestUrls.push(url)
    if (encodeCdnUrl && !requestUrls.includes(encodeCdnUrl)) {
      requestUrls.push(encodeCdnUrl)
    }

    if (type === 'bigwig' || url.toLowerCase().includes('.bw') || url.toLowerCase().includes('.bigwig')) {
      for (const reqUrl of requestUrls) {
        try {
          const filehandle = new RemoteFile(reqUrl)
          const bw = new BigWig({ filehandle })
          await bw.getHeader()
          bwInstance = bw
          console.log('Successfully connected BigWig stream from:', reqUrl)
          break
        } catch (err) {
          console.warn(`BigWig stream header attempt failed for [${reqUrl}]:`, err)
        }
      }
    }

    return {
      id: uniqueId,
      name: name || 'Remote BigWig Stream Track',
      type: type,
      url: url,
      showOnHubLoad: true,
      visible: true,
      options: {
        color: color || '#38bdf8',
        height: 60,
        displayMode: 'full'
      },
      metadata: {
        assay: 'HTTP Byte-Range Stream',
        cell: 'Network URL',
        lab: 'Remote Server'
      },
      bwInstance
    }
  }

  /**
   * Reads real BigWig signal features for a given chromosome and range.
   * Uses eg3 zoom scale pyramid selection (basesPerPixel) and auto-resolves
   * chromosome name aliases (e.g. 'chr5' vs '5').
   *
   * The `downsample` parameter mirrors reference eg3's `DownsamplingChoices`:
   * when SAMPLE is requested (user zoomed far out) we ask the BigWig header
   * for a coarser, pre-aggregated resolution instead of raw values, which is
   * both faster and prevents returning millions of spans.
   */
  static async getBigWigSignalFeatures(
    bw: any,
    region: GenomicRegion,
    containerWidth: number = 800,
    downsample: 'all' | 'sample' = 'all'
  ): Promise<{ start: number; end: number; score: number }[]> {
    if (!bw || typeof bw.getFeatures !== 'function') {
      return []
    }

    const featureSpan = Math.max(1, region.end - region.start + 1)

    try {
      let targetChr = region.chr
      let header: any = null

      try {
        header = await bw.getHeader()
      } catch (e) {}

      if (header && header.refsByName) {
        const refs = header.refsByName
        const norm = region.chr.toLowerCase()
        const stripped = norm.replace(/^chr/, '')

        if (refs[region.chr]) {
          targetChr = region.chr
        } else if (refs[stripped]) {
          targetChr = stripped
        } else if (refs[`chr${stripped}`]) {
          targetChr = `chr${stripped}`
        } else {
          const found = Object.keys(refs).find(
            k => k.toLowerCase() === norm || k.toLowerCase() === stripped || k.toLowerCase() === `chr${stripped}`
          )
          if (found) targetChr = found
        }
      }

      // When downsampled (zoomed far out), request a coarse, pre-aggregated
      // resolution straight from the BigWig header — one span per canvas
      // column.  This is the eg3 DownsamplingChoices.SAMPLE behaviour.
      if (downsample === 'sample') {
        const basesPerSpan = featureSpan / Math.max(1, containerWidth)
        try {
          let features = await bw.getFeatures(targetChr, region.start, region.end, {
            basesPerSpan
          })
          // Fallback: alternative chr name with scale opts.
          if (!features || features.length === 0) {
            const alt = targetChr.startsWith('chr') ? targetChr.replace(/^chr/, '') : `chr${targetChr}`
            try {
              features = await bw.getFeatures(alt, region.start, region.end, {
                basesPerSpan
              })
            } catch (e) {}
          }
          if (features && features.length > 0) {
            return features.map((f: any) => ({
              start: f.start,
              end: f.end,
              score: f.score !== undefined ? f.score : (f.maxScore !== undefined ? f.maxScore : (f.minScore || 0))
            }))
          }
        } catch (e) {
          // Fall through to base-pair attempt below.
        }
      }

      // Try base-pair resolution first (most reliable, matches reference eg3 project).
      let features = await bw.getFeatures(targetChr, region.start, region.end)

      // Fallback 1: Try alternative chromosome naming without opts.
      if (!features || features.length === 0) {
        const alt = targetChr.startsWith('chr') ? targetChr.replace(/^chr/, '') : `chr${targetChr}`
        try {
          features = await bw.getFeatures(alt, region.start, region.end)
        } catch (e) {}
      }

      // Fallback 2: With scale opts for very large spans (base-pair resolution
      // can return excessive data). Reference project handles zoom selection
      // client-side; this is a rough approximation.
      if (!features || features.length === 0) {
        try {
          const basesPerSpan = featureSpan / Math.max(100, containerWidth)
          features = await bw.getFeatures(targetChr, region.start, region.end, {
            basesPerSpan
          })
        } catch (e) {}
      }

      return (features || []).map((f: any) => ({
        start: f.start,
        end: f.end,
        score: f.score !== undefined ? f.score : (f.maxScore !== undefined ? f.maxScore : (f.minScore || 0))
      }))
    } catch (err) {
      console.warn('BigWig feature lookup notice:', err)
      return []
    }
  }
}
