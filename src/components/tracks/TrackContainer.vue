<template>
  <div class="flex flex-col gap-3 p-3">
    <!-- Visible Tracks List -->
    <div
      v-for="(track, idx) in trackStore.tracks"
      :key="track.id"
      class="border rounded-lg overflow-hidden transition-all duration-150"
      :class="[
        themeStore.isDarkMode ? 'bg-slate-900 border-slate-800 shadow-lg' : 'bg-white border-slate-200 shadow-sm',
        track.pinned ? 'ring-1 ring-cyan-500/50' : ''
      ]"
    >
      <TrackHeader
        :track="track"
        :index="idx"
        :total="trackStore.tracks.length"
        @move-up="trackStore.moveTrack(idx, idx - 1)"
        @move-down="trackStore.moveTrack(idx, idx + 1)"
        @open-settings="$emit('open-settings', track)"
      />

      <div v-if="track.visible !== false">
        <TrackCanvasRenderer :track="track" />
      </div>
      <div
        v-else
        class="py-2 px-4 text-xs italic flex items-center justify-between transition-colors"
        :class="themeStore.isDarkMode ? 'bg-slate-950 text-slate-500' : 'bg-slate-50 text-slate-400'"
      >
        <span>Track hidden</span>
        <button
          class="text-cyan-500 hover:underline text-[11px]"
          @click="trackStore.toggleTrackVisibility(track.id)"
        >
          Show Track
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="trackStore.tracks.length === 0"
      class="p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center gap-3 transition-colors"
      :class="themeStore.isDarkMode ? 'border-slate-800 text-slate-400 bg-slate-900/40' : 'border-slate-300 text-slate-500 bg-slate-50'"
    >
      <Layers :size="40" class="opacity-40" />
      <div>
        <h4 class="text-base font-semibold" :class="themeStore.isDarkMode ? 'text-slate-200' : 'text-slate-800'">
          No Tracks Added
        </h4>
        <p class="text-xs max-w-sm mt-1" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
          Add sample tracks from our catalog or import custom BigWig, BED, BAM, and Hi-C track URLs.
        </p>
      </div>
      <button
        class="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors flex items-center gap-2"
        @click="$emit('open-add-modal')"
      >
        <Plus :size="16" />
        <span>Add Genomic Track</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Layers, Plus } from 'lucide-vue-next'
import { useTrackStore } from '../../stores/trackStore'
import { useThemeStore } from '../../stores/themeStore'
import TrackHeader from './TrackHeader.vue'
import TrackCanvasRenderer from './TrackCanvasRenderer.vue'

const trackStore = useTrackStore()
const themeStore = useThemeStore()
defineEmits(['open-settings', 'open-add-modal'])
</script>
