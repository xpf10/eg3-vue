<template>
  <div ref="searchContainerRef" class="relative flex-1 max-w-md">
    <div class="relative flex items-center">
      <Search :size="16" class="absolute left-3 text-slate-400" />
      <input
        v-model="inputQuery"
        type="text"
        placeholder="Search gene (e.g. TP53, BRCA1, HOXA1) or locus (e.g. chr7:27053397-27373765)"
        class="w-full border focus:ring-1 focus:ring-cyan-500 rounded-lg pl-9 pr-20 py-1.5 text-xs font-mono transition-all shadow-sm"
        :class="themeStore.isDarkMode
          ? 'bg-slate-900/90 border-slate-700/80 focus:border-cyan-500 text-slate-100 placeholder-slate-500'
          : 'bg-white border-slate-300 focus:border-cyan-600 text-slate-900 placeholder-slate-400'"
        @keydown.enter="handleSearch"
        @focus="handleFocus"
      />
      <button
        class="absolute right-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1 shadow-sm"
        @click="handleSearch"
      >
        <span v-if="isLoading" class="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
        <span v-else>Go</span>
      </button>
    </div>

    <!-- Autocomplete dropdown for genes -->
    <div
      v-if="isOpen && suggestions.length > 0"
      class="absolute left-0 right-0 mt-1.5 border rounded-lg shadow-2xl z-50 overflow-hidden transition-colors duration-150"
      :class="themeStore.isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xl'"
    >
      <div
        class="px-3 py-1.5 text-[11px] font-semibold border-b uppercase flex items-center justify-between"
        :class="themeStore.isDarkMode ? 'text-slate-400 border-slate-800 bg-slate-900' : 'text-slate-500 border-slate-100 bg-slate-50'"
      >
        <span>Matching Genes</span>
        <span class="text-[10px] font-normal" :class="themeStore.isDarkMode ? 'text-cyan-400' : 'text-cyan-600'">Click to Jump</span>
      </div>
      <div class="max-h-56 overflow-y-auto">
        <div
          v-for="gene in suggestions"
          :key="`${gene.name}-${gene.chr}-${gene.start}`"
          class="w-full text-left px-3 py-2 flex items-center justify-between cursor-pointer text-xs transition-colors border-b last:border-0"
          :class="themeStore.isDarkMode
            ? 'hover:bg-cyan-500/10 border-slate-800/50'
            : 'hover:bg-slate-50 border-slate-100'"
          @mousedown.stop.prevent="selectGene(gene)"
        >
          <div>
            <span class="font-bold font-mono" :class="themeStore.isDarkMode ? 'text-cyan-400' : 'text-cyan-700'">{{ gene.name }}</span>
            <span class="text-[11px] ml-2" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">({{ gene.chr }}:{{ gene.start.toLocaleString() }}-{{ gene.end.toLocaleString() }})</span>
          </div>
          <span class="text-[10px] truncate max-w-[150px]" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">{{ gene.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Search } from 'lucide-vue-next'
import { useGenomeStore } from '../../stores/genomeStore'
import { useThemeStore } from '../../stores/themeStore'
import { useTrackStore } from '../../stores/trackStore'
import { searchGeneByName, fetchGeneTranscripts } from '../../services/trackDataFetcher'
import { GeneInfo } from '../../data/sampleGenes'

const genomeStore = useGenomeStore()
const themeStore = useThemeStore()
const trackStore = useTrackStore()
const searchContainerRef = ref<HTMLDivElement | null>(null)
const inputQuery = ref(genomeStore.regionString)
const isOpen = ref(false)
const isLoading = ref(false)
const isSelecting = ref(false)
const suggestions = ref<GeneInfo[]>([])

let searchTimer: any = null

watch(() => genomeStore.regionString, (newVal) => {
  inputQuery.value = newVal
})

watch(inputQuery, (newVal) => {
  if (!newVal || newVal.includes(':')) {
    suggestions.value = []
    isOpen.value = false
    return
  }

  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    isLoading.value = true
    const results = await searchGeneByName(newVal, genomeStore.currentGenome.species)
    suggestions.value = results
    isLoading.value = false
    if (results.length > 0) {
      isOpen.value = true
    }
  }, 200)
})

function handleFocus() {
  if (inputQuery.value && !inputQuery.value.includes(':')) {
    searchGeneByName(inputQuery.value, genomeStore.currentGenome.species).then(res => {
      suggestions.value = res
      if (res.length > 0) isOpen.value = true
    })
  }
}

/**
 * Ensure there is a transcript-variants track for `geneSymbol`.  On repeated
 * searches of the same (or different) gene, remove the previous transcript
 * track first so the panel doesn't accumulate one per search.
 */
async function ensureTranscriptTrack(geneSymbol: string, locus: { chr: string; start: number; end: number }) {
  // 1. Remove any prior transcript track for this gene (id convention: `transcript-<name>`).
  const prior = trackStore.tracks.find(t => t.id === `transcript-${geneSymbol}`)
  if (prior) trackStore.removeTrack(prior.id)

  // 2. Fetch all transcript variants of the gene.
  const genome = genomeStore.currentGenome.name
  const variants = await fetchGeneTranscripts(genome, geneSymbol, locus)
  if (variants.length === 0) return

  // 3. If there's only one variant, the canonical refGene track already shows it — skip.
  if (variants.length === 1) return

  // 4. Add a dedicated transcript-variants track.  The renderer detects
  //    `track.items` populated with transcript objects and draws one row
  //    per variant with full splice-exon structure.
  const track = trackStore.addTrack({
    id: `transcript-${geneSymbol}`,
    name: `${geneSymbol}`,
    type: 'geneAnnotation',
    genome,
    visible: true,
    options: {
      color: '#a78bfa',
      displayMode: 'full',
      // Row budget: ~18 px per row; cap at 12 rows (~220px) or 300px.
      height: Math.min(300, Math.round(18 * Math.max(2, Math.min(variants.length, 12))))
    },
    metadata: { assay: 'Transcript Variants', cell: geneSymbol, lab: 'refGene' },
    items: variants
  })
  // Push the new track to the top so it sits with the other annotation tracks.
  const idx = trackStore.tracks.indexOf(track)
  if (idx > 0) trackStore.moveTrack(idx, 0)
}

async function handleSearch() {
  if (!inputQuery.value) return
  const query = inputQuery.value.trim()
  isLoading.value = true
  isOpen.value = false

  if (query.includes(':') || query.startsWith('chr')) {
    genomeStore.setRegion(query)
    isLoading.value = false
    return
  }

  const found = await genomeStore.jumpToGene(query)
  if (!found) {
    genomeStore.setRegion(query)
    isLoading.value = false
    return
  }

  // Best-effort: load transcript variants for the symbol the user typed.
  try {
    await ensureTranscriptTrack(query, {
      chr: genomeStore.viewRegion.chr,
      start: genomeStore.viewRegion.start,
      end: genomeStore.viewRegion.end
    })
  } catch (err) {
    console.warn('Failed to load transcript variants:', err)
  }

  inputQuery.value = genomeStore.regionString
  isLoading.value = false
}

async function selectGene(gene: GeneInfo) {
  if (isSelecting.value) return
  if (!gene || (typeof Event !== 'undefined' && gene instanceof Event)) return

  isSelecting.value = true
  isOpen.value = false
  suggestions.value = []
  isLoading.value = true

  try {
    let locus = { chr: gene.chr, start: Number(gene.start), end: Number(gene.end) }
    if (gene && gene.chr && gene.start !== undefined && gene.end !== undefined) {
      await genomeStore.jumpToGene(locus)
    } else if (gene && gene.name) {
      await genomeStore.jumpToGene(String(gene.name))
      locus = { chr: genomeStore.viewRegion.chr, start: genomeStore.viewRegion.start, end: genomeStore.viewRegion.end }
    }

    // Best-effort: load transcript variants for the selected gene.
    try {
      await ensureTranscriptTrack(gene.name, locus)
    } catch (err) {
      console.warn('Failed to load transcript variants:', err)
    }

    inputQuery.value = genomeStore.regionString
  } catch (err) {
    console.error('Error selecting gene:', err)
  } finally {
    isLoading.value = false
    isSelecting.value = false
  }
}

function handleClickOutside(e: MouseEvent) {
  if (searchContainerRef.value && !searchContainerRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
