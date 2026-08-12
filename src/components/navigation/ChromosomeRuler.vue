<template>
  <div
    class="border-b h-7 relative select-none transition-colors duration-150"
    :class="themeStore.isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-100/95 border-slate-200'"
  >
    <canvas ref="canvasRef" class="w-full h-full block"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useGenomeStore } from '../../stores/genomeStore'
import { useThemeStore } from '../../stores/themeStore'

const genomeStore = useGenomeStore()
const themeStore = useThemeStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

function renderRuler() {
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

  const start = genomeStore.viewRegion.start
  const end = genomeStore.viewRegion.end
  const span = Math.max(1, end - start + 1)

  const targetTicks = Math.floor(w / 120)
  const rawStep = span / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const residual = rawStep / magnitude

  let step = magnitude
  if (residual >= 5) step = magnitude * 5
  else if (residual >= 2) step = magnitude * 2

  const firstTick = Math.ceil(start / step) * step

  const isDark = themeStore.isDarkMode
  ctx.strokeStyle = isDark ? '#475569' : '#94a3b8'
  ctx.fillStyle = isDark ? '#94a3b8' : '#334155'
  ctx.font = '10px Fira Code, monospace'
  ctx.lineWidth = 1

  ctx.beginPath()
  ctx.moveTo(0, h - 1)
  ctx.lineTo(w, h - 1)
  ctx.stroke()

  for (let pos = firstTick; pos <= end; pos += step) {
    const x = ((pos - start) / span) * w

    ctx.beginPath()
    ctx.moveTo(x, h - 8)
    ctx.lineTo(x, h - 1)
    ctx.stroke()

    const label = formatPosition(pos)
    ctx.fillText(label, x + 3, h - 10)

    const minorStep = step / 5
    for (let m = 1; m < 5; m++) {
      const mPos = pos + m * minorStep
      if (mPos > end) break
      const mx = ((mPos - start) / span) * w
      ctx.beginPath()
      ctx.moveTo(mx, h - 4)
      ctx.lineTo(mx, h - 1)
      ctx.stroke()
    }
  }
}

function formatPosition(pos: number): string {
  if (pos >= 1_000_000) return `${(pos / 1_000_000).toFixed(2)}Mb`
  if (pos >= 1_000) return `${(pos / 1_000).toFixed(0)}kb`
  return `${pos}`
}

onMounted(() => {
  renderRuler()
  window.addEventListener('resize', renderRuler)
})

watch([() => genomeStore.viewRegion, () => themeStore.isDarkMode], () => {
  renderRuler()
}, { deep: true })
</script>
