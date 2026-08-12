<template>
  <header
    class="border-b px-4 py-2.5 flex items-center justify-between shadow-md z-30 select-none transition-colors duration-150"
    :class="themeStore.isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 text-slate-900'"
  >
    <!-- Left: Brand Logo & Genome Picker -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Dna :size="20" class="text-white animate-pulse" />
        </div>
        <div>
          <div class="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500 text-base tracking-tight leading-tight">
            WashU Epigenome
          </div>
          <div class="text-[10px] font-mono flex items-center gap-1.5" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
            <span>Browser v3</span>
            <span class="px-1 py-0.2 bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 rounded font-semibold text-[9px]">VUE</span>
          </div>
        </div>
      </div>

      <div class="h-6 w-px hidden sm:block" :class="themeStore.isDarkMode ? 'bg-slate-800' : 'bg-slate-200'"></div>

      <!-- Genome Assembly Selector Dropdown -->
      <GenomePicker />
    </div>

    <!-- Center: Search Locus & Navigation Toolbar -->
    <div class="hidden lg:flex items-center gap-3 flex-1 justify-center max-w-2xl px-4">
      <CoordinateSearch />
      <NavToolbar />
    </div>

    <!-- Right: Action Buttons & Theme Toggle -->
    <div class="flex items-center gap-2">
      <!-- Daytime / Dark Mode Toggle Button -->
      <button
        @click="themeStore.toggleTheme()"
        :title="themeStore.isDarkMode ? 'Switch to Daytime Light Mode' : 'Switch to Dark Mode'"
        class="p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-medium"
        :class="themeStore.isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-indigo-600 hover:bg-slate-200'"
      >
        <Sun v-if="themeStore.isDarkMode" :size="16" />
        <Moon v-else :size="16" />
        <span class="hidden md:inline">{{ themeStore.isDarkMode ? 'Day' : 'Night' }}</span>
      </button>

      <!-- Add Tracks Button -->
      <button
        @click="$emit('open-add-tracks')"
        class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
      >
        <Plus :size="15" />
        <span class="hidden sm:inline">Add Tracks</span>
      </button>

      <!-- Metadata Matrix Facets -->
      <button
        @click="$emit('open-facets')"
        title="Metadata Matrix"
        class="p-1.5 rounded-lg border transition-colors"
        :class="themeStore.isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'"
      >
        <SlidersHorizontal :size="16" />
      </button>

      <!-- Session Manager -->
      <button
        @click="$emit('open-sessions')"
        title="Sessions & Bookmarks"
        class="p-1.5 rounded-lg border transition-colors"
        :class="themeStore.isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'"
      >
        <FolderOpen :size="16" />
      </button>

      <!-- Export Dropdown -->
      <div ref="exportMenuRef" class="relative">
        <button
          @click="toggleExportMenu"
          @keydown.escape="closeExportMenu"
          :aria-expanded="showExportMenu"
          title="Export"
          class="p-1.5 rounded-lg border transition-colors flex items-center gap-1"
          :class="[
            themeStore.isDarkMode
              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200',
            showExportMenu ? 'ring-2 ring-cyan-500/50' : ''
          ]"
        >
          <Download :size="16" />
          <ChevronDown :size="12" />
        </button>

        <Teleport to="body">
          <div
            v-if="showExportMenu"
            ref="exportMenuEl"
            @click="closeExportMenu"
            class="fixed z-[60] mt-1 mr-1 w-56 rounded-xl border shadow-2xl overflow-hidden backdrop-blur-sm"
            :class="themeStore.isDarkMode
              ? 'bg-slate-800/95 border-slate-700 text-slate-200'
              : 'bg-white/98 border-slate-200 text-slate-800'"
            :style="{ left: `${menuX}px`, top: `${menuY}px` }"
          >
            <div
              class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
              :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'"
            >
              Export
            </div>
            <button
              @click="$emit('export:summary')"
              class="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-cyan-600/10"
            >
              <FileText :size="14" class="text-cyan-500" />
              <span>PDF Summary</span>
              <span class="ml-auto text-[9px] opacity-60 font-mono">.pdf</span>
            </button>
            <button
              @click="$emit('export:view-pdf')"
              class="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-cyan-600/10"
            >
              <Camera :size="14" class="text-teal-500" />
              <span>PDF View</span>
              <span class="ml-auto text-[9px] opacity-60 font-mono">.pdf</span>
            </button>
            <button
              @click="$emit('export:view-svg')"
              class="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-cyan-600/10"
            >
              <Image :size="14" class="text-indigo-500" />
              <span>SVG View</span>
              <span class="ml-auto text-[9px] opacity-60 font-mono">.svg</span>
            </button>
            <button
              @click="$emit('export:view-png')"
              class="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-cyan-600/10 border-t"
              :class="themeStore.isDarkMode ? 'border-slate-700' : 'border-slate-200'"
            >
              <Image :size="14" class="text-emerald-500" />
              <span>PNG View</span>
              <span class="ml-auto text-[9px] opacity-60 font-mono">.png</span>
            </button>
          </div>
        </Teleport>
      </div>
    </div>
  </header>

  <!-- Mobile / Tablet Search & Nav Bar -->
  <div
    class="lg:hidden border-b p-2 flex items-center gap-2 transition-colors duration-150"
    :class="themeStore.isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'"
  >
    <CoordinateSearch />
    <NavToolbar />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  Dna,
  Plus,
  SlidersHorizontal,
  FolderOpen,
  Download,
  Sun,
  Moon,
  ChevronDown,
  FileText,
  Camera,
  Image
} from 'lucide-vue-next'
import GenomePicker from '../navigation/GenomePicker.vue'
import CoordinateSearch from '../navigation/CoordinateSearch.vue'
import NavToolbar from '../navigation/NavToolbar.vue'
import { useThemeStore } from '../../stores/themeStore'

defineEmits([
  'open-add-tracks',
  'open-facets',
  'open-sessions',
  'export:summary',
  'export:view-pdf',
  'export:view-svg',
  'export:view-png'
])

const themeStore = useThemeStore()

const showExportMenu = ref(false)
const exportMenuRef = ref<HTMLDivElement | null>(null)
const exportMenuEl = ref<HTMLDivElement | null>(null)
const menuX = ref(0)
const menuY = ref(0)

const MENU_WIDTH = 224 // w-56

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value
  if (showExportMenu.value) {
    nextTick(() => positionMenu())
  }
}

function closeExportMenu() {
  showExportMenu.value = false
}

function positionMenu() {
  const btn = exportMenuRef.value
  if (!btn) return
  const r = btn.getBoundingClientRect()

  // Menu is `position: fixed` (via Teleport to body), so coordinates must
  // be viewport-relative (scroll offsets excluded).
  let left = r.right - MENU_WIDTH
  if (left < 4) left = 4
  const maxLeft = window.innerWidth - MENU_WIDTH - 4
  if (left > maxLeft) left = maxLeft
  menuX.value = left
  menuY.value = r.bottom + 4
}

function onGlobalClick(e: MouseEvent) {
  if (!showExportMenu.value) return
  const target = e.target as Node
  if (exportMenuRef.value?.contains(target)) return
  if (exportMenuEl.value?.contains(target)) return
  closeExportMenu()
}

function onResize() {
  if (showExportMenu.value) positionMenu()
}

onMounted(() => {
  document.addEventListener('mousedown', onGlobalClick)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onGlobalClick)
  window.removeEventListener('resize', onResize)
})
</script>
