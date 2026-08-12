<template>
  <Modal :is-open="isOpen" title="Add Track to Epigenome Browser" @close="$emit('close')">
    <div class="flex flex-col gap-4">
      <!-- Tabs Header -->
      <div class="flex border-b text-xs font-semibold" :class="themeStore.isDarkMode ? 'border-slate-800' : 'border-slate-200'">
        <button
          @click="activeTab = 'catalog'"
          class="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          :class="activeTab === 'catalog' ? 'border-cyan-500 text-cyan-500 font-bold' : (themeStore.isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800')"
        >
          <Compass :size="14" />
          <span>Predefined Catalog</span>
        </button>

        <button
          @click="activeTab = 'local'"
          class="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          :class="activeTab === 'local' ? 'border-cyan-500 text-cyan-500 font-bold' : (themeStore.isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800')"
        >
          <UploadCloud :size="14" />
          <span>Upload Local File</span>
        </button>

        <button
          @click="activeTab = 'custom'"
          class="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          :class="activeTab === 'custom' ? 'border-cyan-500 text-cyan-500 font-bold' : (themeStore.isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800')"
        >
          <Link :size="14" />
          <span>Custom Track URL</span>
        </button>
      </div>

      <!-- Tab 1: Catalog -->
      <div v-if="activeTab === 'catalog'" class="flex flex-col gap-3">
        <p class="text-xs" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
          Select standard ENCODE and Epigenome Roadmap tracks to load into your browser view:
        </p>

        <div class="max-h-80 overflow-y-auto flex flex-col gap-2">
          <div
            v-for="catTrack in trackStore.catalogTracks"
            :key="catTrack.id"
            class="p-3 border rounded-lg flex items-center justify-between transition-colors"
            :class="themeStore.isDarkMode ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-3.5 h-3.5 rounded-full shrink-0"
                :style="{ backgroundColor: catTrack.options?.color || '#38bdf8' }"
              ></div>
              <div>
                <div class="font-bold text-xs" :class="themeStore.isDarkMode ? 'text-slate-100' : 'text-slate-900'">{{ catTrack.name }}</div>
                <div class="text-[11px] flex items-center gap-2 mt-0.5" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
                  <span class="font-mono text-cyan-500 uppercase font-semibold">{{ catTrack.type }}</span>
                  <span v-if="catTrack.metadata?.assay">• {{ catTrack.metadata.assay }}</span>
                  <span v-if="catTrack.metadata?.cell">• {{ catTrack.metadata.cell }}</span>
                </div>
              </div>
            </div>

            <button
              @click="addCatalogTrack(catTrack)"
              class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-md shadow-sm transition-colors flex items-center gap-1 shrink-0"
            >
              <Plus :size="14" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 2: Upload Local File -->
      <div v-else-if="activeTab === 'local'" class="flex flex-col gap-4 text-xs">
        <p class="text-slate-400" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
          Select or drag-and-drop local genomic files (.bed, .bw, .bigwig, .bam, .vcf, .gff, .gtf, .json):
        </p>

        <!-- Drop Zone Container -->
        <div
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleFileDrop"
          @click="triggerFileInput"
          class="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 gap-2"
          :class="[
            isDragging
              ? 'border-cyan-500 bg-cyan-500/10'
              : (themeStore.isDarkMode ? 'border-slate-700 bg-slate-800/40 hover:border-slate-600' : 'border-slate-300 bg-slate-50 hover:border-slate-400')
          ]"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept=".bed,.bw,.bigwig,.bb,.bigbed,.bam,.vcf,.gff,.gff3,.gtf,.json,.txt,.csv,.tsv"
            class="hidden"
            @change="handleFileSelect"
          />

          <FileCode :size="36" class="text-cyan-500 opacity-80" />
          <div class="font-semibold text-sm" :class="themeStore.isDarkMode ? 'text-slate-200' : 'text-slate-800'">
            Click to Browse or Drag Local File Here
          </div>
          <div class="text-[11px]" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
            Supports .bw, .bed, .bam, .vcf, .gff, .gtf, .json (Max file size: unlimited in browser memory)
          </div>
        </div>

        <!-- Selected Local File Summary -->
        <div
          v-if="localResult"
          class="p-3 border rounded-lg flex flex-col gap-3 transition-colors"
          :class="themeStore.isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <CheckCircle :size="16" class="text-emerald-500" />
              <span class="font-bold" :class="themeStore.isDarkMode ? 'text-slate-100' : 'text-slate-900'">
                {{ localResult.trackName }}
              </span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-cyan-500/20 text-cyan-500">
                {{ localResult.trackType }}
              </span>
            </div>
            <span class="text-[11px] font-mono" :class="themeStore.isDarkMode ? 'text-slate-400' : 'text-slate-500'">
              {{ (localResult.fileSizeBytes / 1024).toFixed(1) }} KB
              <span v-if="localResult.itemsCount !== undefined">• {{ localResult.itemsCount }} loci parsed</span>
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="font-semibold" :class="themeStore.isDarkMode ? 'text-slate-300' : 'text-slate-700'">Track Name Label</label>
              <input
                type="text"
                v-model="localCustomName"
                class="border rounded-md p-1.5 outline-none font-mono"
                :class="themeStore.isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="font-semibold" :class="themeStore.isDarkMode ? 'text-slate-300' : 'text-slate-700'">Track Display Color</label>
              <input
                type="color"
                v-model="localCustomColor"
                class="w-full h-8 rounded bg-transparent cursor-pointer p-0.5"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Custom Track URL -->
      <div v-else class="flex flex-col gap-4 text-xs">
        <div class="flex flex-col gap-1">
          <label class="font-semibold" :class="themeStore.isDarkMode ? 'text-slate-300' : 'text-slate-700'">Track Type</label>
          <select
            v-model="customForm.type"
            class="border rounded-lg p-2 outline-none font-mono"
            :class="themeStore.isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'"
          >
            <option value="bigwig">BigWig (Continuous numerical signal)</option>
            <option value="geneAnnotation">Gene Annotation (GFF / GTF / RefGene)</option>
            <option value="bed">BED / Peak Loci</option>
            <option value="bam">BAM Alignment (Short reads)</option>
            <option value="hic">Hi-C (Chromatin interaction)</option>
            <option value="vcf">VCF (Genomic variants / SNVs)</option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold" :class="themeStore.isDarkMode ? 'text-slate-300' : 'text-slate-700'">Track Label Name</label>
          <input
            type="text"
            v-model="customForm.name"
            placeholder="e.g. My Custom RNA-seq Track"
            class="border rounded-lg p-2 outline-none font-mono placeholder-slate-500"
            :class="themeStore.isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold" :class="themeStore.isDarkMode ? 'text-slate-300' : 'text-slate-700'">Data Source URL (.bw, .bed, .bam, .hic, .vcf)</label>
          <input
            type="text"
            v-model="customForm.url"
            placeholder="http://10.1.20.6:8080/chipseq/ENCSR296JFK/ENCFF501MDH.bigWig"
            class="border rounded-lg p-2 outline-none font-mono placeholder-slate-500"
            :class="themeStore.isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'"
          />
        </div>

        <div class="flex items-center gap-3">
          <label class="font-semibold" :class="themeStore.isDarkMode ? 'text-slate-300' : 'text-slate-700'">Initial Color:</label>
          <input
            type="color"
            v-model="customForm.color"
            class="w-8 h-8 rounded bg-transparent cursor-pointer p-0.5"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <button
        @click="$emit('close')"
        class="px-4 py-2 rounded-lg font-medium transition-colors"
        :class="themeStore.isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'"
      >
        Cancel
      </button>

      <button
        v-if="activeTab === 'local' && localResult"
        @click="addLocalTrack"
        class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
      >
        Load Local File Track
      </button>

      <button
        v-if="activeTab === 'custom'"
        @click="submitCustomTrack"
        class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
      >
        Add Custom Track URL
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Compass, UploadCloud, Link, Plus, FileCode, CheckCircle } from 'lucide-vue-next'
import Modal from '../ui/Modal.vue'
import { Track, TrackType } from '../../types/track'
import { useTrackStore } from '../../stores/trackStore'
import { useThemeStore } from '../../stores/themeStore'
import { useSessionStore } from '../../stores/sessionStore'
import { LocalFileLoader, LocalFileParseResult } from '../../services/localFileLoader'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const trackStore = useTrackStore()
const themeStore = useThemeStore()
const sessionStore = useSessionStore()

const activeTab = ref<'catalog' | 'local' | 'custom'>('catalog')
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const localResult = ref<LocalFileParseResult | null>(null)
const localCustomName = ref('')
const localCustomColor = ref('#38bdf8')

const customForm = reactive({
  type: 'bigwig' as TrackType,
  name: '',
  url: '',
  color: '#38bdf8'
})

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

async function handleFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files && files.length > 0) {
    await processFile(files[0])
  }
}

async function handleFileDrop(e: DragEvent) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    await processFile(files[0])
  }
}

async function processFile(file: File) {
  const result = await LocalFileLoader.parseFile(file)
  localResult.value = result
  localCustomName.value = result.trackName
  localCustomColor.value = '#38bdf8'

  if (file.name.toLowerCase().endsWith('.json') && typeof result.rawContent === 'string') {
    const success = sessionStore.importSessionJSON(result.rawContent)
    if (success) {
      emit('close')
    }
  }
}

function addLocalTrack() {
  if (!localResult.value) return
  const track = LocalFileLoader.createTrackFromLocalResult(
    localResult.value,
    localCustomName.value,
    localCustomColor.value
  )
  trackStore.addTrack(track)
  localResult.value = null
  emit('close')
}

function addCatalogTrack(t: Track) {
  trackStore.addTrack(t)
  emit('close')
}

async function submitCustomTrack() {
  if (!customForm.url) return
  const trackName = customForm.name || customForm.url.split('/').pop() || 'Remote Track'
  const track = await LocalFileLoader.createRemoteTrack(
    customForm.url,
    trackName,
    customForm.type,
    customForm.color
  )
  trackStore.addTrack(track)
  customForm.name = ''
  customForm.url = ''
  emit('close')
}
</script>
