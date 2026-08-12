<template>
  <footer
    class="border-t px-4 py-2 text-xs flex items-center justify-between select-none transition-colors duration-150"
    :class="themeStore.isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'"
  >
    <div class="flex items-center gap-3">
      <span>WashU Epigenome Browser 3.0 (Vue 3 + Vite)</span>
      <span class="opacity-40">•</span>
      <span class="font-mono text-cyan-500">{{ genomeStore.currentGenome.name }}</span>
      <span class="opacity-40">•</span>
      <span class="font-mono">{{ genomeStore.regionString }}</span>
    </div>

    <div class="flex items-center gap-4">
      <a
        href="https://epigenomegateway.wustl.edu/browser/"
        target="_blank"
        class="hover:text-cyan-500 transition-colors"
      >
        Official Browser
      </a>
      <a
        href="https://github.com/twlab/eg3"
        target="_blank"
        class="hover:text-cyan-500 transition-colors"
      >
        GitHub Repository
      </a>
      <span>© 2025-2026 WashU Lab</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useGenomeStore } from '../../stores/genomeStore'
import { useThemeStore } from '../../stores/themeStore'

const genomeStore = useGenomeStore()
const themeStore = useThemeStore()
</script>
