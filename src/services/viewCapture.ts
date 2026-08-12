import { Track } from '../types/track'
import { GenomicRegion, formatGenomicRegion } from '../types/region'

const EXPORT_WIDTH = 1600
const EXPORT_SCALE = 2
const GAP = 6
const HEADER_H = 40
const TRACK_HEADER_H = 22

export interface ViewSnapshot {
  region: GenomicRegion
  genomeName: string
  chrSize: number
  tracks: Track[]
  isDarkMode: boolean
  // canvases in DOM order: [cytoband, ruler, ...trackCanvases(visible tracks)]
  canvases: HTMLCanvasElement[]
}

export interface CompositeResult {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

/**
 * Composite the current browser view into a single high-resolution offscreen
 * canvas: title bar + cytoband bar + ruler + one row per visible track
 * (track-name label row + track canvas).
 *
 * @param snapshot  the current state + live canvas elements
 * @param width     target export width in CSS px (default 1600).  When
 *                  omitted the width of the first visible track canvas is
 *                  used (the export matches what the user actually sees).
 */
export function compositeView(
  snapshot: ViewSnapshot,
  width: number = EXPORT_WIDTH
): CompositeResult {
  const { region, genomeName, chrSize, isDarkMode, tracks, canvases } = snapshot

  const [cytoband, ruler, ...trackCanvases] = canvases as HTMLCanvasElement[]
  const visibleTracks = tracks.filter(t => t.visible !== false)

  // Fallback to first track canvas width so the export matches the on-screen
  // layout; never smaller than 800 (avoids a degenerate export).
  if (width === EXPORT_WIDTH && trackCanvases[0]) {
    width = Math.max(800, trackCanvases[0].clientWidth || EXPORT_WIDTH)
  }

  // --- compute total height ---
  let totalH = HEADER_H
  if (cytoband) totalH += (cytoband.clientHeight || 24) + GAP + 4
  if (ruler) totalH += (ruler.clientHeight || 28) + GAP + 4

  for (let i = 0; i < visibleTracks.length; i++) {
    const t = visibleTracks[i]
    const c = trackCanvases[i]
    const canvasH = c ? (c.clientHeight || (t.options.height || 60)) : (t.options.height || 60)
    totalH += TRACK_HEADER_H + canvasH + GAP
  }

  const scale = EXPORT_SCALE
  const cvs = document.createElement('canvas')
  cvs.width = Math.round(width * scale)
  cvs.height = Math.round(totalH * scale)
  const ctx = cvs.getContext('2d')!
  ctx.scale(scale, scale)

  const bg = isDarkMode ? '#090d16' : '#ffffff'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, totalH)

  let y = 0

  drawHeader(ctx, width, genomeName, region, chrSize, isDarkMode)
  y += HEADER_H + 2

  if (cytoband) {
    const cytobandH = cytoband.clientHeight || 24
    drawCanvasScaled(ctx, cytoband, 0, y, width, cytobandH)
    // Re-draw the view-range red overlay (CytobandView renders it as an
    // HTML div on top of the canvas, so it would otherwise be invisible
    // in the export).
    drawViewRangeOverlay(ctx, y, width, cytobandH, region, chrSize)
    y += cytobandH + GAP + 4
  }

  if (ruler) {
    drawCanvasScaled(ctx, ruler, 0, y, width, ruler.clientHeight || 28)
    y += (ruler.clientHeight || 28) + GAP + 4
  }

  for (let i = 0; i < visibleTracks.length; i++) {
    const t = visibleTracks[i]
    const c = trackCanvases[i]
    const canvasH = c ? (c.clientHeight || (t.options.height || 60)) : (t.options.height || 60)

    // track-name label row
    const color = t.options.color || '#38bdf8'
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(14, y + TRACK_HEADER_H / 2 + 1, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = isDarkMode ? '#e2e8f0' : '#0f172a'
    ctx.font = 'bold 12px Inter, sans-serif'
    ctx.fillText(`${i + 1}. ${t.name}  (${t.type})`, 24, y + TRACK_HEADER_H / 2 + 9)

    y += TRACK_HEADER_H

    if (c) {
      drawCanvasScaled(ctx, c, 0, y, width, canvasH)
      y += canvasH
    }
    y += GAP
  }

  return { canvas: cvs, width, height: totalH }
}

function drawCanvasScaled(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // The source canvas backing store is dpr-scaled, but its drawn content was
  // scaled back to its displayed (client) size.  drawImage with the full
  // backing-store source rect scaled to the requested displayed size reproduces
  // it 1:1, then we stretch to the export width.
  ctx.drawImage(src, 0, 0, src.width, src.height, x, y, w, h)
}

/**
 * Re-draw the cytoband view-range overlay (the red box) onto the composite.
 *
 * In the live UI this is an absolutely-positioned HTML div over the canvas;
 * in the export composite it has to be painted directly.
 */
function drawViewRangeOverlay(
  ctx: CanvasRenderingContext2D,
  y: number,
  width: number,
  height: number,
  region: GenomicRegion,
  chrSize: number
) {
  const total = Math.max(1, chrSize)
  const left = Math.max(0, (region.start / total) * width)
  const raw = ((region.end - region.start) / total) * width
  const w = Math.max(2, raw)
  const clampedRight = Math.min(width, left + w)

  ctx.save()
  ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'
  ctx.fillRect(left, 2, clampedRight - left, height - 4)

  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.strokeRect(left + 1, 3, clampedRight - left - 2, height - 6)

  // tiny center tick like the live overlay
  ctx.fillStyle = '#f87171'
  const cx = left + (clampedRight - left) / 2
  ctx.fillRect(cx - 0.5, height / 2 - 2, 1, 4)
  ctx.restore()
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  genomeName: string,
  region: GenomicRegion,
  chrSize: number,
  _isDarkMode: boolean
) {
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, width, HEADER_H)

  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 16px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`WashU Epigenome Browser — ${genomeName.toUpperCase()}`, 14, 18)

  ctx.fillStyle = '#cbd5e1'
  ctx.font = '11px Inter, sans-serif'
  ctx.fillText(
    `${formatGenomicRegion(region)}   ·   chr ${(chrSize / 1_000_000).toFixed(1)} Mb   ·   ${new Date().toLocaleString()}`,
    14,
    33
  )

  // footer credit on the right
  ctx.textAlign = 'right'
  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px Inter, sans-serif'
  ctx.fillText('epigenomebrowser.wustl.edu', width - 14, 33)
  ctx.textAlign = 'left'
}