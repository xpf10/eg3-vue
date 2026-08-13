<template>
  <div
    class="border-b px-4 py-2 flex flex-col gap-1 select-none transition-colors duration-150"
    :class="themeStore.isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'"
  >
    <div class="flex items-center justify-between text-xs font-mono">
      <span class="font-bold" :class="themeStore.isDarkMode ? 'text-slate-200' : 'text-slate-800'">
        {{ genomeStore.viewRegion.chr }} Cytobands
      </span>
      <span :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
        Size: {{ (genomeStore.currentChromosomeSize / 1_000_000).toFixed(1) }} Mb
      </span>
    </div>

    <!-- Interactive Cytoband Canvas bar -->
    <div
      ref="containerRef"
      class="relative h-6 rounded-md border cursor-pointer overflow-hidden shadow-inner group transition-colors duration-150"
      :class="themeStore.isDarkMode ? 'bg-slate-950 border-slate-700/80' : 'bg-slate-200 border-slate-300'"
      @click="handleCytobandClick"
    >
      <canvas ref="canvasRef" role="img" :aria-label="`Cytoband diagram of ${genomeStore.viewRegion.chr}`" class="w-full h-full block"></canvas>

      <!-- View Range Red Box Overlay -->
      <div
        class="absolute top-0 bottom-0 border-2 border-red-500 bg-red-500/20 rounded pointer-events-none transition-all duration-75 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
        :style="overlayStyle"
      >
        <div class="w-full h-full flex items-center justify-center">
          <div class="w-1 h-3 bg-red-400 rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useGenomeStore } from '../../stores/genomeStore'
import { useThemeStore } from '../../stores/themeStore'
import { CytobandStain } from '../../types/genome'

const genomeStore = useGenomeStore()
const themeStore = useThemeStore()
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const overlayStyle = computed(() => {
  const total = genomeStore.currentChromosomeSize
  const left = (genomeStore.viewRegion.start / total) * 100
  const width = Math.max(0.5, ((genomeStore.viewRegion.end - genomeStore.viewRegion.start) / total) * 100)
  return {
    left: `${left}%`,
    width: `${width}%`
  }
})

function renderCytobands() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const w = rect.width
  const h = rect.height

  ctx.clearRect(0, 0, w, h)

  const chrName = genomeStore.viewRegion.chr
  const bands = genomeStore.currentGenome.cytobands[chrName] || []
  const chrSize = genomeStore.currentChromosomeSize

  const isDark = themeStore.isDarkMode

  // ISCN G-banding palette.  Positive (gpos*) bands are drawn in a purple
  // ramp (darker = higher value, tighter heterochromatin); negative (gneg)
  // bands are light pink (gene-rich euchromatin); gvar is a mid transition;
  // stalk/acen use near-black / crimson for centromeric regions.
  const stainColors: Record<CytobandStain, string> = {
    gpos100: isDark ? '#5b2c8a' : '#7c2d92',
    gpos75:  isDark ? '#7d3c98' : '#9b59b6',
    gpos50:  isDark ? '#9b59b6' : '#bb8fce',
    gpos25:  isDark ? '#bb8fce' : '#d7bde2',
    gneg:    isDark ? '#f5b7b1' : '#fadbd8',
    gvar:    isDark ? '#d2b4de' : '#e8daef',
    stalk:   isDark ? '#1a252f' : '#2c3e50',
    acen:    isDark ? '#922b21' : '#c0392b'
  }

  if (bands.length > 0) {
    bands.forEach(band => {
      const x1 = (band.start / chrSize) * w
      const x2 = (band.end / chrSize) * w
      const bandW = Math.max(1, x2 - x1)

      ctx.fillStyle = stainColors[band.gStain] || (isDark ? '#475569' : '#cbd5e1')
      ctx.fillRect(x1, 2, bandW, h - 4)

      ctx.strokeStyle = isDark ? '#0b1220' : '#ffffff'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x1, 2, bandW, h - 4)
    })
  } else {
    // No cytoband data for this chromosome.  Draw a distinct placeholder
    // (diagonal hatch) so the user can tell this is "no data", not a real
    // (and very boring) uniform bar.
    ctx.save()
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc'
    ctx.fillRect(0, 2, w, h - 4)

    const step = 8
    ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = -h; i < w + h; i += step) {
      ctx.moveTo(i, 2)
      ctx.lineTo(i + h, h - 2)
    }
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = isDark ? '#64748b' : '#64748b'
    ctx.font = '10px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('no cytoband data', w / 2, h / 2 + 3)
    ctx.textAlign = 'left'
  }
}

function handleCytobandClick(e: MouseEvent) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const ratio = clickX / rect.width
  const centerBp = Math.floor(ratio * genomeStore.currentChromosomeSize)
  const span = genomeStore.regionSpan
  const half = Math.floor(span / 2)

  genomeStore.setRegion({
    chr: genomeStore.viewRegion.chr,
    start: Math.max(1, centerBp - half),
    end: Math.min(genomeStore.currentChromosomeSize, centerBp + half)
  })
}

onMounted(() => {
  renderCytobands()
})

watch([() => genomeStore.viewRegion.chr, () => genomeStore.currentGenome, () => themeStore.isDarkMode], () => {
  renderCytobands()
})
</script>
