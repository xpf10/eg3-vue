<template>
  <div
    class="flex items-center gap-1 border rounded-lg p-1 transition-colors duration-150"
    :class="themeStore.isDarkMode ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white border-slate-300 shadow-sm'"
  >
    <!-- Zoom In buttons -->
    <button
      title="Zoom In 2x"
      class="p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
      :class="themeStore.isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-cyan-400' : 'text-slate-700 hover:bg-slate-100 hover:text-cyan-700'"
      @click="genomeStore.zoomIn(2)"
    >
      <ZoomIn :size="14" />
      <span>2x</span>
    </button>
    <button
      title="Zoom In 5x"
      class="px-1.5 py-1 rounded text-[11px] font-mono transition-colors"
      :class="themeStore.isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-cyan-400' : 'text-slate-500 hover:bg-slate-100 hover:text-cyan-700'"
      @click="genomeStore.zoomIn(5)"
    >
      5x
    </button>

    <div class="h-4 w-px mx-0.5" :class="themeStore.isDarkMode ? 'bg-slate-700' : 'bg-slate-200'"></div>

    <!-- Zoom Out buttons -->
    <button
      title="Zoom Out 2x"
      class="p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
      :class="themeStore.isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-cyan-400' : 'text-slate-700 hover:bg-slate-100 hover:text-cyan-700'"
      @click="genomeStore.zoomOut(2)"
    >
      <ZoomOut :size="14" />
      <span>2x</span>
    </button>
    <button
      title="Zoom Out 5x"
      class="px-1.5 py-1 rounded text-[11px] font-mono transition-colors"
      :class="themeStore.isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-cyan-400' : 'text-slate-500 hover:bg-slate-100 hover:text-cyan-700'"
      @click="genomeStore.zoomOut(5)"
    >
      5x
    </button>

    <div class="h-4 w-px mx-0.5" :class="themeStore.isDarkMode ? 'bg-slate-700' : 'bg-slate-200'"></div>

    <!-- Pan Left / Right -->
    <button
      title="Shift Left (25%)"
      class="p-1.5 rounded transition-colors"
      :class="themeStore.isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-cyan-400' : 'text-slate-700 hover:bg-slate-100 hover:text-cyan-700'"
      @click="genomeStore.panLeft(0.25)"
    >
      <ArrowLeft :size="14" />
    </button>
    <button
      title="Shift Right (25%)"
      class="p-1.5 rounded transition-colors"
      :class="themeStore.isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-cyan-400' : 'text-slate-700 hover:bg-slate-100 hover:text-cyan-700'"
      @click="genomeStore.panRight(0.25)"
    >
      <ArrowRight :size="14" />
    </button>

    <div class="h-4 w-px mx-0.5" :class="themeStore.isDarkMode ? 'bg-slate-700' : 'bg-slate-200'"></div>

    <!-- Undo / Redo -->
    <button
      :disabled="!genomeStore.canUndo()"
      title="Undo Navigation"
      class="p-1.5 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
      :class="themeStore.isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'"
      @click="genomeStore.undo()"
    >
      <Undo2 :size="14" />
    </button>
    <button
      :disabled="!genomeStore.canRedo()"
      title="Redo Navigation"
      class="p-1.5 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
      :class="themeStore.isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'"
      @click="genomeStore.redo()"
    >
      <Redo2 :size="14" />
    </button>

    <div class="h-4 w-px mx-0.5" :class="themeStore.isDarkMode ? 'bg-slate-700' : 'bg-slate-200'"></div>

    <!-- Region span indicator badge -->
    <span
      class="px-2 py-0.5 text-[11px] font-mono font-medium border rounded transition-colors"
      :class="themeStore.isDarkMode
        ? 'bg-cyan-950/60 border-cyan-800/50 text-cyan-400'
        : 'bg-cyan-50 border-cyan-200 text-cyan-700'"
    >
      {{ formatBp(genomeStore.regionSpan) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ZoomIn, ZoomOut, ArrowLeft, ArrowRight, Undo2, Redo2 } from 'lucide-vue-next'
import { useGenomeStore } from '../../stores/genomeStore'
import { useThemeStore } from '../../stores/themeStore'

const genomeStore = useGenomeStore()
const themeStore = useThemeStore()

function formatBp(bp: number): string {
  if (bp >= 1_000_000) return `${(bp / 1_000_000).toFixed(2)} Mb`
  if (bp >= 1_000) return `${(bp / 1_000).toFixed(1)} kb`
  return `${bp} bp`
}
</script>
