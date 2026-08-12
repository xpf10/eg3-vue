<template>
  <div
    class="flex items-center justify-between px-3 py-1.5 border-b text-xs select-none transition-colors duration-150"
    :class="themeStore.isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'"
  >
    <div class="flex items-center gap-2 overflow-hidden">
      <!-- Move buttons -->
      <div class="flex items-center gap-0.5" :class="themeStore.isDarkMode ? 'text-slate-500' : 'text-slate-400'">
        <button
          @click="$emit('move-up')"
          title="Move Up"
          class="hover:text-cyan-500 p-0.5 rounded transition-colors"
        >
          <ChevronUp :size="14" />
        </button>
        <button
          @click="$emit('move-down')"
          title="Move Down"
          class="hover:text-cyan-500 p-0.5 rounded transition-colors"
        >
          <ChevronDown :size="14" />
        </button>
      </div>

      <!-- Track Pin toggle -->
      <button
        @click="trackStore.togglePinTrack(track.id)"
        :title="track.pinned ? 'Unpin Track' : 'Pin Track to Top'"
        class="transition-colors"
        :class="track.pinned ? 'text-cyan-500 font-bold' : (themeStore.isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')"
      >
        <Pin :size="13" />
      </button>

      <!-- Track Color Badge -->
      <div
        class="w-3 h-3 rounded-full border border-black/10 shrink-0"
        :style="{ backgroundColor: track.options.color || '#38bdf8' }"
      ></div>

      <!-- Track Title & Type Badge -->
      <span class="font-semibold truncate max-w-xs" :class="themeStore.isDarkMode ? 'text-slate-100' : 'text-slate-900'">
        {{ track.name }}
      </span>
      <span
        class="px-1.5 py-0.5 text-[10px] font-mono rounded font-medium uppercase border"
        :class="themeStore.isDarkMode ? 'bg-slate-800 text-cyan-400 border-slate-700' : 'bg-slate-200 text-cyan-700 border-slate-300'"
      >
        {{ track.type }}
      </span>

      <!-- Metadata summary badge -->
      <span v-if="track.metadata?.assay" class="text-[10px] hidden md:inline truncate max-w-[150px]" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
        {{ track.metadata.assay }}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <!-- Display Mode Select -->
      <select
        :value="track.options.displayMode || 'full'"
        @change="handleDisplayModeChange"
        class="border rounded px-1.5 py-0.5 text-[11px] outline-none font-mono transition-colors"
        :class="themeStore.isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300'"
      >
        <option value="full">Full</option>
        <option value="dense">Dense</option>
        <option value="squish">Squish</option>
        <option value="pack">Pack</option>
      </select>

      <!-- Settings button -->
      <button
        @click="$emit('open-settings')"
        title="Track Settings & Color"
        class="p-1 rounded transition-colors"
        :class="themeStore.isDarkMode ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800' : 'text-slate-500 hover:text-cyan-600 hover:bg-slate-200'"
      >
        <Settings :size="14" />
      </button>

      <!-- Toggle Visibility -->
      <button
        @click="trackStore.toggleTrackVisibility(track.id)"
        title="Toggle Hide/Show"
        class="p-1 rounded transition-colors"
        :class="themeStore.isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'"
      >
        <Eye v-if="track.visible !== false" :size="14" />
        <EyeOff v-else :size="14" class="opacity-50" />
      </button>

      <!-- Remove Track button -->
      <button
        @click="trackStore.removeTrack(track.id)"
        title="Remove Track"
        class="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
      >
        <Trash2 :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronUp, ChevronDown, Pin, Settings, Eye, EyeOff, Trash2 } from 'lucide-vue-next'
import { Track, DisplayMode } from '../../types/track'
import { useTrackStore } from '../../stores/trackStore'
import { useThemeStore } from '../../stores/themeStore'

const props = defineProps<{
  track: Track
  index: number
  total: number
}>()

defineEmits(['move-up', 'move-down', 'open-settings'])

const trackStore = useTrackStore()
const themeStore = useThemeStore()

function handleDisplayModeChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value as DisplayMode
  trackStore.updateTrackOptions(props.track.id, { displayMode: val })
}
</script>
