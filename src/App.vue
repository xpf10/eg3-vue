<template>
  <div
    class="min-h-screen flex flex-col font-sans transition-colors duration-150"
    :class="themeStore.isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'"
  >
    <!-- Main Top Navigation -->
    <HeaderNav
      @open-add-tracks="isAddModalOpen = true"
      @open-facets="isFacetModalOpen = true"
      @open-sessions="isSessionModalOpen = true"
      @export:summary="doExportSummary"
      @export:view-pdf="doExportViewPdf"
      @export:view-svg="doExportViewSvg"
      @export:view-png="doExportViewPng"
    />

    <!-- Genome Navigation Bars + Track Canvas Container — all canvases
         live under this id so the export services can locate them. -->
    <div id="browser-view">
      <CytobandView />
      <ChromosomeRuler />

      <main class="flex-1 overflow-y-auto" :class="themeStore.isDarkMode ? 'bg-slate-950' : 'bg-slate-100'">
        <div class="max-w-[1600px] mx-auto">
          <TrackContainer
            @open-settings="handleOpenSettings"
            @open-add-modal="isAddModalOpen = true"
          />
        </div>
      </main>
    </div>

    <!-- App Footer -->
    <AppFooter />

    <!-- Modals -->
    <AddTrackModal
      :is-open="isAddModalOpen"
      @close="isAddModalOpen = false"
    />

    <TrackSettingsModal
      :is-open="isSettingsModalOpen"
      :track="selectedTrackForConfig"
      @close="isSettingsModalOpen = false"
    />

    <TrackFacetTable
      :is-open="isFacetModalOpen"
      @close="isFacetModalOpen = false"
    />

    <SessionManager
      :is-open="isSessionModalOpen"
      @close="isSessionModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HeaderNav from './components/layout/HeaderNav.vue'
import CytobandView from './components/navigation/CytobandView.vue'
import ChromosomeRuler from './components/navigation/ChromosomeRuler.vue'
import TrackContainer from './components/tracks/TrackContainer.vue'
import AppFooter from './components/layout/AppFooter.vue'

import AddTrackModal from './components/tracks/AddTrackModal.vue'
import TrackSettingsModal from './components/tracks/TrackSettingsModal.vue'
import TrackFacetTable from './components/tracks/TrackFacetTable.vue'
import SessionManager from './components/sessions/SessionManager.vue'
import { useGenomeStore } from './stores/genomeStore'
import { useTrackStore } from './stores/trackStore'
import { useThemeStore } from './stores/themeStore'
import { PDFExporter } from './services/pdfExport'
import { downloadSvg, buildSvg, downloadPng } from './services/svgExport'
import { compositeView } from './services/viewCapture'
import { Track } from './types/track'
import { formatGenomicRegion } from './types/region'

const genomeStore = useGenomeStore()
const trackStore = useTrackStore()
const themeStore = useThemeStore()

const isAddModalOpen = ref(false)
const isSettingsModalOpen = ref(false)
const isFacetModalOpen = ref(false)
const isSessionModalOpen = ref(false)

const selectedTrackForConfig = ref<Track | null>(null)

function handleOpenSettings(track: Track) {
  selectedTrackForConfig.value = track
  isSettingsModalOpen.value = true
}

/* ---------------------- export helpers ---------------------- */

/** Grab all the canvases that participate in the export snapshot.
 *
 * Order matters: the composite service expects [cytoband, ruler, ...tracks].
 * Because we render CytobandView → ChromosomeRuler → TrackContainer (with
 * each visible track rendering exactly one canvas), the DOM order is stable
 * and we can simply take all `<canvas>` elements under `#browser-view` in
 * order.
 */
function gatherCanvases(): HTMLCanvasElement[] {
  const container = document.getElementById('browser-view')
  if (!container) return []
  return Array.from(container.querySelectorAll('canvas')).slice(0, 200)
}

function buildSnapshot() {
  return {
    region: genomeStore.viewRegion,
    genomeName: genomeStore.currentGenome.name,
    chrSize: genomeStore.currentChromosomeSize,
    tracks: trackStore.tracks,
    isDarkMode: themeStore.isDarkMode,
    canvases: gatherCanvases()
  }
}

function doExportSummary() {
  PDFExporter.exportBrowserReport(
    genomeStore.currentGenome.name,
    genomeStore.viewRegion,
    trackStore.tracks
  )
}

function doExportViewPdf() {
  const snap = buildSnapshot()
  const { canvas } = compositeView(snap)
  canvas.toBlob(blob => {
    if (!blob) return
    PDFExporter.exportViewAsPdf(blob, {
      genomeName: genomeStore.currentGenome.name,
      region: genomeStore.viewRegion,
      trackCount: snap.tracks.filter(t => t.visible !== false).length
    })
  }, 'image/png')
}

function doExportViewSvg() {
  const snap = buildSnapshot()
  const { canvas, width, height } = compositeView(snap)
  const dataUrl = canvas.toDataURL('image/png')
  const svg = buildSvg({
    subtitle: `${formatGenomicRegion(genomeStore.viewRegion)}  ·  ${snap.tracks.filter(t => t.visible !== false).length} track(s)  ·  ${new Date().toLocaleString()}`,
    footer: 'epigenomebrowser.wustl.edu',
    dataUrl,
    width,
    height
  })
  const { chr, start } = genomeStore.viewRegion
  downloadSvg(svg, `epigenome_browser_${genomeStore.currentGenome.name}_${chr}_${start}_view.svg`)
}

function doExportViewPng() {
  const snap = buildSnapshot()
  const { canvas } = compositeView(snap)
  const dataUrl = canvas.toDataURL('image/png')
  const { chr, start } = genomeStore.viewRegion
  downloadPng(dataUrl, `epigenome_browser_${genomeStore.currentGenome.name}_${chr}_${start}_view.png`)
}
</script>
