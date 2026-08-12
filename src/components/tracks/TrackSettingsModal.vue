<template>
  <Modal :is-open="isOpen" title="Track Configuration & Styling" @close="$emit('close')">
    <div v-if="track" class="flex flex-col gap-5 text-xs">
      <!-- Track Header Title Info -->
      <div class="flex items-center gap-3 p-3 bg-slate-800/80 rounded-lg border border-slate-700">
        <div
          class="w-4 h-4 rounded-full border border-white/20"
          :style="{ backgroundColor: track.options.color || '#38bdf8' }"
        ></div>
        <div>
          <div class="font-bold text-slate-100 text-sm">{{ track.name }}</div>
          <div class="text-slate-400 font-mono text-[11px] uppercase">Type: {{ track.type }}</div>
        </div>
      </div>

      <!-- Color Selector -->
      <div class="flex flex-col gap-2">
        <label class="font-semibold text-slate-300">Track Color</label>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="track.options.color || '#38bdf8'"
            @input="updateColor"
            class="w-9 h-9 rounded bg-slate-800 border border-slate-700 cursor-pointer outline-none p-0.5"
          />
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="c in colorPresets"
              :key="c"
              @click="trackStore.updateTrackOptions(track.id, { color: c })"
              class="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
              :style="{ backgroundColor: c }"
            ></button>
          </div>
        </div>
      </div>

      <!-- Height Adjustment Slider -->
      <div class="flex flex-col gap-2">
        <div class="flex justify-between font-semibold text-slate-300">
          <span>Track Height</span>
          <span class="font-mono text-cyan-400">{{ track.options.height || 60 }} px</span>
        </div>
        <input
          type="range"
          min="30"
          max="250"
          step="5"
          :value="track.options.height || 60"
          @input="updateHeight"
          class="w-full accent-cyan-500 bg-slate-800 h-2 rounded cursor-pointer"
        />
      </div>

      <!-- Scale Mode (BigWig) -->
      <div v-if="track.type === 'bigwig'" class="flex flex-col gap-2">
        <label class="font-semibold text-slate-300">Y-Axis Scale Mode</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            @click="trackStore.updateTrackOptions(track.id, { scaleType: 'auto' })"
            class="px-3 py-2 rounded-lg border text-left font-medium transition-colors"
            :class="track.options.scaleType !== 'fixed' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'"
          >
            Auto Scale (Dynamic Peak)
          </button>
          <button
            @click="trackStore.updateTrackOptions(track.id, { scaleType: 'fixed', max: 50 })"
            class="px-3 py-2 rounded-lg border text-left font-medium transition-colors"
            :class="track.options.scaleType === 'fixed' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'"
          >
            Fixed Max Scale
          </button>
        </div>

        <div v-if="track.options.scaleType === 'fixed'" class="mt-2 flex items-center gap-3">
          <span class="text-slate-400">Fixed Y-Max:</span>
          <input
            type="number"
            :value="track.options.max || 50"
            @input="updateMaxScale"
            class="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
          />
        </div>
      </div>

      <!-- Display Mode -->
      <div class="flex flex-col gap-2">
        <label class="font-semibold text-slate-300">Display Density Mode</label>
        <select
          :value="track.options.displayMode || 'full'"
          @change="updateDisplayMode"
          class="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg p-2 font-mono"
        >
          <option value="full">Full (Expanded isoform/features)</option>
          <option value="dense">Dense (Collapsed single-line summary)</option>
          <option value="squish">Squish (Compressed micro view)</option>
          <option value="pack">Pack (Optimized stack spacing)</option>
        </select>
      </div>
    </div>

    <template #footer>
      <button
        @click="$emit('close')"
        class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
      >
        Done
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '../ui/Modal.vue'
import { Track, DisplayMode } from '../../types/track'
import { useTrackStore } from '../../stores/trackStore'

const props = defineProps<{
  isOpen: boolean
  track: Track | null
}>()

defineEmits(['close'])

const trackStore = useTrackStore()

const colorPresets = [
  '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#ef4444', '#06b6d4', '#84cc16', '#6366f1', '#d946ef'
]

function updateColor(e: Event) {
  if (!props.track) return
  const val = (e.target as HTMLInputElement).value
  trackStore.updateTrackOptions(props.track.id, { color: val })
}

function updateHeight(e: Event) {
  if (!props.track) return
  const val = parseInt((e.target as HTMLInputElement).value, 10)
  trackStore.updateTrackOptions(props.track.id, { height: val })
}

function updateMaxScale(e: Event) {
  if (!props.track) return
  const val = parseFloat((e.target as HTMLInputElement).value)
  trackStore.updateTrackOptions(props.track.id, { max: val })
}

function updateDisplayMode(e: Event) {
  if (!props.track) return
  const val = (e.target as HTMLSelectElement).value as DisplayMode
  trackStore.updateTrackOptions(props.track.id, { displayMode: val })
}
</script>
