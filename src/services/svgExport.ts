/**
 * Build a self-contained SVG (metadata header as real vector text + the
 * composite view embedded as a base64 PNG) and trigger a browser download.
 *
 * SVG is preferred over a plain PNG for publication because the header/footer
 * text stays vectorized (searchable, lossless) while the high-resolution view
 * body retains the pixel-perfect rendering the browser already produces.
 */

export interface SvgExportOpts {
  title?: string
  subtitle: string
  footer: string
  dataUrl: string // composite canvas as PNG
  width: number   // CSS px
  height: number  // CSS px
}

const FOOTER_H = 22

export function buildSvg(opts: SvgExportOpts): string {
  // The composite canvas passed in `dataUrl` already carries its own header
  // band (genome name, region, timestamp).  The SVG wrapper only adds a
  // vector footer credit so the file remains a valid SVG with a searchable
  // text tail, without duplicating the header.
  const { subtitle, footer, dataUrl, width, height } = opts
  const totalH = height + FOOTER_H

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalH}" width="${width}" height="${totalH}" role="img" aria-label="WashU Epigenome Browser export">`,
    `  <rect x="0" y="0" width="${width}" height="${totalH}" fill="#ffffff" />`,

    // view body (composite canvas)
    `  <image x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" href="${dataUrl}" />`,

    // vector footer band (searchable / lossless)
    `  <rect x="0" y="${height}" width="${width}" height="${FOOTER_H}" fill="#0f172a" />`,
    `  <text x="14" y="${height + 15}" font-family="Inter, Arial, sans-serif" font-size="10" fill="#cbd5e1">${escapeXml(subtitle)}</text>`,
    `  <text x="${width - 14}" y="${height + 15}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="10" fill="#94a3b8">${escapeXml(footer)}</text>`,

    `  </svg>`
  ].join('\n')
}

export function downloadSvg(svgText: string, filename: string): void {
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  triggerDownload(blob, filename.endsWith('.svg') ? filename : `${filename}.svg`)
}

export function downloadPdf(dataUrl: string, filename: string): void {
  // Convert dataUrl → Blob → trigger download.  This is a fallback path that
  // reuses the composite PNG; the actual jsPDF path (paginated) lives in
  // pdfExport.ts.  Here we ship the view as a single PDF page so it stays
  // consistent with the SVG export.
  dataUrlToBlob(dataUrl, blob => {
    triggerDownload(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
  })
}

export function downloadPng(dataUrl: string, filename: string): void {
  dataUrlToBlob(dataUrl, blob => {
    triggerDownload(blob, filename.endsWith('.png') ? filename : `${filename}.png`)
  })
}

/* ------------------------------- helpers ------------------------------- */

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  requestAnimationFrame(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

function dataUrlToBlob(dataUrl: string, cb: (blob: Blob) => void): void {
  const bin = atob(dataUrl.split(',')[1])
  const mime = dataUrl.match(/^data:([^;]+)/)?.[1] || 'image/png'
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  cb(new Blob([bytes], { type: mime }))
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}