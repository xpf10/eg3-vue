<template>
  <div class="relative">
    <button
      class="flex items-center gap-2 px-3 py-1.5 font-semibold rounded-lg border text-sm transition-all shadow-sm"
      :class="themeStore.isDarkMode ? 'bg-slate-800/90 hover:bg-slate-700/90 text-cyan-400 border-slate-700' : 'bg-white hover:bg-slate-50 text-cyan-700 border-slate-300'"
      @click="isOpen = !isOpen"
    >
      <Dna :size="16" class="text-cyan-500" />
      <span>{{ genomeStore.currentGenome.name }}</span>
      <span class="text-xs font-normal" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
        ({{ genomeStore.currentGenome.species.split(' ')[0] }})
      </span>
      <ChevronDown
        :size="14"
        class="transition-transform duration-200"
        :class="[isOpen ? 'rotate-180' : '', themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500']"
      />
    </button>

    <div
      v-if="isOpen"
      class="absolute left-0 mt-2 w-72 border rounded-xl shadow-2xl z-50 overflow-hidden py-1 transition-colors duration-150"
      :class="themeStore.isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 text-slate-900'"
    >
      <div
        class="px-3 py-2 text-xs font-medium uppercase tracking-wider border-b"
        :class="themeStore.isDarkMode ? 'text-slate-400 border-slate-800 bg-slate-900' : 'text-slate-500 border-slate-100 bg-slate-50'"
      >
        Select Genome Assembly
      </div>
      <div class="max-h-64 overflow-y-auto">
        <button
          v-for="g in genomeStore.allGenomes"
          :key="g.name"
          class="w-full text-left px-3 py-2.5 flex flex-col transition-colors border-b last:border-0"
          :class="[
            g.name === genomeStore.currentGenome.name
              ? (themeStore.isDarkMode ? 'bg-cyan-500/20 text-cyan-400 font-medium' : 'bg-cyan-50 text-cyan-700 font-medium')
              : (themeStore.isDarkMode ? 'text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-300 border-slate-800/50' : 'text-slate-800 hover:bg-slate-50 hover:text-cyan-700 border-slate-100')
          ]"
          @click="selectGenome(g.name)"
        >
          <div class="flex items-center justify-between">
            <span class="font-mono text-sm font-semibold">{{ g.name }}</span>
            <span class="text-xs font-normal" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
              {{ g.species }}
            </span>
          </div>
          <span class="text-[11px] truncate mt-0.5" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
            {{ g.description }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Dna, ChevronDown } from 'lucide-vue-next'
import { useGenomeStore } from '../../stores/genomeStore'
import { useThemeStore } from '../../stores/themeStore'

const genomeStore = useGenomeStore()
const themeStore = useThemeStore()
const isOpen = ref(false)

function selectGenome(name: string) {
  genomeStore.setGenome(name)
  isOpen.value = false
}
</script>
