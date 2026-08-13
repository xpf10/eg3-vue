<template>
  <Modal :is-open="isOpen" title="Track Metadata Matrix & Facet Filter" @close="$emit('close')">
    <div class="flex flex-col gap-4 text-xs">
      <p class="text-slate-400">Filter and organize browser tracks by assay type, cell line/tissue, and laboratory metadata:</p>

      <!-- Matrix summary table -->
      <div class="border border-slate-800 rounded-lg overflow-hidden">
        <table class="w-full text-left">
          <thead class="bg-slate-800/80 text-slate-300 border-b border-slate-700 font-semibold">
            <tr>
              <th class="p-2.5">Track Name</th>
              <th class="p-2.5">Type</th>
              <th class="p-2.5">Assay</th>
              <th class="p-2.5">Cell / Tissue</th>
              <th class="p-2.5">Laboratory</th>
              <th class="p-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 bg-slate-900/60 font-mono">
            <tr
              v-for="t in trackStore.tracks"
              :key="t.id"
              class="hover:bg-slate-800/40 transition-colors"
            >
              <td class="p-2.5 font-bold text-slate-100 flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: t.options.color || '#38bdf8' }"></div>
                <span>{{ t.name }}</span>
              </td>
              <td class="p-2.5 text-cyan-400 uppercase font-semibold">{{ t.type }}</td>
              <td class="p-2.5 text-slate-300">{{ t.metadata?.assay || 'N/A' }}</td>
              <td class="p-2.5 text-slate-300">{{ t.metadata?.cell || 'N/A' }}</td>
              <td class="p-2.5 text-slate-400">{{ t.metadata?.lab || 'N/A' }}</td>
              <td class="p-2.5 text-right">
                <button
                  class="px-2 py-0.5 rounded text-[10px] font-sans font-semibold transition-colors"
                  :class="t.visible !== false ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800 text-slate-500'"
                  @click="trackStore.toggleTrackVisibility(t.id)"
                >
                  {{ t.visible !== false ? 'Active' : 'Hidden' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template #footer>
      <button
        class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
        @click="$emit('close')"
      >
        Done
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '../ui/Modal.vue'
import { useTrackStore } from '../../stores/trackStore'

defineProps<{
  isOpen: boolean
}>()

defineEmits(['close'])
const trackStore = useTrackStore()
</script>
