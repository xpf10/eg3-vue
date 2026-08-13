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
            class="w-9 h-9 rounded bg-slate-800 border border-slate-700 cursor-pointer outline-none p-0.5"
            @input="updateColor"
          />
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="c in colorPresets"
              :key="c"
              class="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
              :style="{ backgroundColor: c }"
              @click="trackStore.updateTrackOptions(track.id, { color: c })"
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
          class="w-full accent-cyan-500 bg-slate-800 h-2 rounded cursor-pointer"
          @input="updateHeight"
        />
      </div>

      <!-- Scale Mode (BigWig) -->
      <div v-if="track.type === 'bigwig'" class="flex flex-col gap-2">
        <label class="font-semibold text-slate-300">Y-Axis Scale Mode</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="px-3 py-2 rounded-lg border text-left font-medium transition-colors"
            :class="track.options.scaleType !== 'fixed' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'"
            @click="trackStore.updateTrackOptions(track.id, { scaleType: 'auto' })"
          >
            Auto Scale (Dynamic Peak)
          </button>
          <button
            class="px-3 py-2 rounded-lg border text-left font-medium transition-colors"
            :class="track.options.scaleType === 'fixed' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'"
            @click="trackStore.updateTrackOptions(track.id, { scaleType: 'fixed', yMax: 10, yMin: 0 })"
          >
            Fixed Scale
          </button>
        </div>

        <div v-if="track.options.scaleType === 'fixed'" class="mt-2 flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Y-Min:</span>
            <input
              type="number"
              :value="track.options.yMin ?? 0"
              class="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
              @input="updateYMin"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Y-Max:</span>
            <input
              type="number"
              :value="track.options.yMax ?? 10"
              class="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
              @input="updateYMax"
            />
          </div>
        </div>
      </div>

      <!-- Aggregation Method (BigWig) -->
      <div v-if="track.type === 'bigwig'" class="flex flex-col gap-2">
        <label class="font-semibold text-slate-300">Aggregation Method</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="m in aggregateMethodOptions"
            :key="m"
            class="px-2 py-1.5 rounded-lg border text-left font-medium transition-colors text-[11px] uppercase"
            :class="track.options.aggregateMethod === m || (!track.options.aggregateMethod && m === 'mean')
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'"
            @click="trackStore.updateTrackOptions(track.id, { aggregateMethod: m })"
          >
            {{ m }}
          </button>
        </div>
      </div>

      <!-- Smoothing (BigWig) -->
      <div v-if="track.type === 'bigwig'" class="flex flex-col gap-2">
        <div class="flex justify-between font-semibold text-slate-300">
          <span>Smoothing</span>
          <span class="font-mono text-cyan-400">{{ Math.round(track.options.smooth || 0) }}</span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          :value="track.options.smooth || 0"
          class="w-full accent-cyan-500 bg-slate-800 h-2 rounded cursor-pointer"
          @input="updateSmooth"
        />
        <span class="text-[10px] text-slate-500">0 = off, higher = more blur (moving average window)</span>
      </div>

      <!-- BigWig Display Mode -->
      <div v-if="track.type === 'bigwig'" class="flex flex-col gap-2">
        <label class="font-semibold text-slate-300">BigWig Display Mode</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="m in bigwigDisplayModeOptions"
            :key="m"
            class="px-2 py-1.5 rounded-lg border text-left font-medium transition-colors text-[11px]"
            :class="track.options.bigwigDisplayMode === m || (!track.options.bigwigDisplayMode && m === 'auto')
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'"
            @click="trackStore.updateTrackOptions(track.id, { bigwigDisplayMode: m })"
          >
            {{ m === 'auto' ? 'Auto (bar + heatmap)' : m }}
          </button>
        </div>
      </div>

      <!-- Out-of-Range Colors (BigWig) -->
      <div v-if="track.type === 'bigwig'" class="flex flex-col gap-2">
        <label class="font-semibold text-slate-300">Out-of-Range Colors</label>
        <div class="flex items-center gap-4 flex-wrap">
          <div class="flex items-center gap-2">
            <input
              type="color"
              :value="track.options.colorAboveMax || '#ef4444'"
              class="w-7 h-7 rounded bg-slate-800 border border-slate-700 cursor-pointer outline-none p-0.5"
              @input="updateColorAboveMax"
            />
            <span class="text-[11px] text-slate-400">Above Y-Max</span>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="color"
              :value="track.options.color2BelowMin || '#16a34a'"
              class="w-7 h-7 rounded bg-slate-800 border border-slate-700 cursor-pointer outline-none p-0.5"
              @input="updateColorBelowMin"
            />
            <span class="text-[11px] text-slate-400">Below Y-Min</span>
          </div>
        </div>
      </div>

      <!-- Display Mode -->
      <div class="flex flex-col gap-2">
        <label class="font-semibold text-slate-300">Display Density Mode</label>
        <select
          :value="track.options.displayMode || 'full'"
          class="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg p-2 font-mono"
          @change="updateDisplayMode"
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
        class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
        @click="$emit('close')"
      >
        Done
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '../ui/Modal.vue'
import { Track, DisplayMode, AggregateMethod, BigWigDisplayMode } from '../../types/track'
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

const aggregateMethodOptions: AggregateMethod[] = ['mean', 'sum', 'count', 'min', 'max']
const bigwigDisplayModeOptions: BigWigDisplayMode[] = ['auto', 'bar', 'heatmap']

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

function updateDisplayMode(e: Event) {
  if (!props.track) return
  const val = (e.target as HTMLSelectElement).value as DisplayMode
  trackStore.updateTrackOptions(props.track.id, { displayMode: val })
}

function updateYMin(e: Event) {
  if (!props.track) return
  const val = parseFloat((e.target as HTMLInputElement).value)
  trackStore.updateTrackOptions(props.track.id, { yMin: val })
}

function updateYMax(e: Event) {
  if (!props.track) return
  const val = parseFloat((e.target as HTMLInputElement).value)
  trackStore.updateTrackOptions(props.track.id, { yMax: val })
}

function updateSmooth(e: Event) {
  if (!props.track) return
  const val = parseInt((e.target as HTMLInputElement).value, 10)
  trackStore.updateTrackOptions(props.track.id, { smooth: val })
}

function updateColorAboveMax(e: Event) {
  if (!props.track) return
  const val = (e.target as HTMLInputElement).value as string
  trackStore.updateTrackOptions(props.track.id, { colorAboveMax: val })
}

function updateColorBelowMin(e: Event) {
  if (!props.track) return
  const val = (e.target as HTMLInputElement).value as string
  trackStore.updateTrackOptions(props.track.id, { color2BelowMin: val })
}
</script>
