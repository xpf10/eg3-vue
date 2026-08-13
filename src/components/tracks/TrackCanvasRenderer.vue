<template>
  <div
    ref="containerRef"
    class="relative w-full overflow-hidden group transition-colors duration-150"
    :class="trackClasses"
    :style="{ height: `${track.options.height || 60}px` }"
    @mousemove="handleMouseMove"
    @mousedown="handleMouseDown"
    @mouseleave="handleMouseLeave"
  >
    <canvas
      ref="canvasRef"
      role="img"
      :aria-label="`${track.name} genomic track on ${genomeStore.viewRegion.chr}:${genomeStore.viewRegion.start.toLocaleString()}-${genomeStore.viewRegion.end.toLocaleString()}`"
      class="w-full h-full block"
    ></canvas>

    <div
      v-if="hoverInfo && !isPanning"
      class="absolute top-0 bottom-0 border-l border-cyan-400/80 pointer-events-none z-10"
      :style="{ left: `${hoverInfo.x}px` }"
    >
      <div
        class="absolute top-1 left-2 px-2 py-0.5 rounded text-[10px] font-mono shadow-md backdrop-blur-sm pointer-events-none whitespace-nowrap border"
        :class="themeStore.isDarkMode ? 'bg-slate-900/90 text-cyan-300 border-slate-700/80' : 'bg-white/95 text-cyan-700 border-slate-300'"
      >
        {{ genomeStore.viewRegion.chr }}:{{ hoverInfo.base.toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { Track } from '../../types/track'
import { useGenomeStore } from '../../stores/genomeStore'
import { useThemeStore } from '../../stores/themeStore'
import { CanvasTrackRenderer } from '../../services/canvasRenderer'

const props = defineProps<{
  track: Track
}>()

const genomeStore = useGenomeStore()
const themeStore = useThemeStore()
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const hoverInfo = ref<{ x: number; base: number } | null>(null)

const isPanning = ref(false)
const panStartX = ref(0)
const panStartRegion = ref<{ start: number; end: number } | null>(null)


const isGeneAnnotation = computed(() => props.track.type === 'geneAnnotation')

const trackClasses = computed(() => {
  const base = themeStore.isDarkMode ? 'bg-slate-950/80' : 'bg-white'
  if (isGeneAnnotation.value) {
    return [base, isPanning.value ? 'cursor-grabbing' : 'cursor-grab']
  }
  return [base, 'cursor-crosshair']
})


let resizeObserver: ResizeObserver | null = null
let disposed = false
let rafPending = false

function renderCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = container.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1

  // Only resize the backing store when the CSS size actually changed;
  // re-setting canvas.width every render clears the canvas and resets
  // the transform for no reason on hot paths (e.g. every pan frame).
  const targetW = Math.max(1, Math.round(rect.width * dpr))
  const targetH = Math.max(1, Math.round(rect.height * dpr))
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  CanvasTrackRenderer.render({
    ctx,
    width: rect.width,
    height: rect.height,
    region: genomeStore.viewRegion,
    track: props.track,
    genome: genomeStore.currentGenome.name,
    isDarkMode: themeStore.isDarkMode,
    onAsyncUpdate: () => { scheduleRender() }
  })
}

/**
 * Coalesce re-render requests into one paint per animation frame.  Without
 * this, a pan drag fires one `setRegion` per mousemove and every visible
 * track re-renders synchronously, which janks with many tracks.
 */
function scheduleRender() {
  if (rafPending || disposed) return
  rafPending = true
  requestAnimationFrame(() => {
    rafPending = false
    if (!disposed) renderCanvas()
  })
}

function handleMouseMove(e: MouseEvent) {
  if (isPanning.value) return
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const ratio = x / rect.width
  const span = genomeStore.regionSpan
  const base = Math.floor(genomeStore.viewRegion.start + ratio * span)
  hoverInfo.value = { x, base }
}

function handleMouseDown(e: MouseEvent) {
  if (!isGeneAnnotation.value) return
  if (!containerRef.value) return
  isPanning.value = true
  panStartX.value = e.clientX
  panStartRegion.value = {
    start: genomeStore.viewRegion.start,
    end: genomeStore.viewRegion.end
  }
  window.addEventListener('mousemove', handlePanMove)
  window.addEventListener('mouseup', handlePanEnd)
}

function handlePanMove(e: MouseEvent) {
  if (!isPanning.value) return
  if (!containerRef.value) return
  if (!panStartRegion.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const dx = e.clientX - panStartX.value
  const span = Math.max(1, panStartRegion.value.end - panStartRegion.value.start)
  const dxRatio = dx / rect.width
  const shiftBp = Math.round(-dxRatio * span)

  // Shift the region by shiftBp, clamped to [1, chrSize]
  const chrSize = genomeStore.getChrSize(genomeStore.viewRegion.chr)
  let newStart = Math.max(1, panStartRegion.value.start + shiftBp)
  let newEnd = Math.min(chrSize, panStartRegion.value.end + shiftBp)

  // Ensure minimum span is preserved
  if (newEnd - newStart < 50) {
    const mid = Math.floor((newStart + newEnd) / 2)
    newStart = Math.max(1, mid - 25)
    newEnd = Math.min(chrSize, mid + 25)
  }

  genomeStore.setRegion({
    chr: genomeStore.viewRegion.chr,
    start: newStart,
    end: newEnd
  }, false) // false = don't record history during pan
}

function handlePanEnd() {
  if (!isPanning.value) return
  isPanning.value = false
  window.removeEventListener('mousemove', handlePanMove)
  window.removeEventListener('mouseup', handlePanEnd)
}

function handleMouseLeave() {
  hoverInfo.value = null
}

onMounted(() => {
  renderCanvas()
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => { scheduleRender() })
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  disposed = true
  if (resizeObserver) resizeObserver.disconnect()
  // If the component unmounts mid-pan, the window listeners would otherwise
  // leak (and keep calling setRegion on a dead track).
  if (isPanning.value) {
    window.removeEventListener('mousemove', handlePanMove)
    window.removeEventListener('mouseup', handlePanEnd)
    isPanning.value = false
  }
})

watch(
  [
    () => genomeStore.viewRegion,
    () => props.track,
    () => props.track.options,
    () => props.track.items,
    () => props.track.visible,
    () => themeStore.isDarkMode
  ],
  () => { scheduleRender() },
  { deep: true }
)
</script>