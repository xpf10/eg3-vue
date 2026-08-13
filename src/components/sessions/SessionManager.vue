<template>
  <Modal :is-open="isOpen" title="Session Manager & Workspace Bookmarks" @close="$emit('close')">
    <div class="flex flex-col gap-4 text-xs">
      <!-- Tabs -->
      <div class="flex border-b border-slate-800 font-semibold">
        <button
          class="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          :class="activeTab === 'sessions' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
          @click="activeTab = 'sessions'"
        >
          <Save :size="14" />
          <span>Saved Sessions</span>
        </button>
        <button
          class="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          :class="activeTab === 'bookmarks' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
          @click="activeTab = 'bookmarks'"
        >
          <BookmarkIcon :size="14" />
          <span>Bookmarks</span>
        </button>
        <button
          class="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          :class="activeTab === 'import-export' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
          @click="activeTab = 'import-export'"
        >
          <FileJson :size="14" />
          <span>Import / Export JSON</span>
        </button>
      </div>

      <!-- Tab 1: Saved Sessions -->
      <div v-if="activeTab === 'sessions'" class="flex flex-col gap-3">
        <div
          v-if="sessionStore.persistError"
          role="alert"
          class="px-3 py-2 rounded-lg border text-xs font-medium bg-red-950/60 border-red-800 text-red-300"
        >
          {{ sessionStore.persistError }}
        </div>

        <div class="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
          <input
            v-model="newSessionName"
            type="text"
            placeholder="Enter session name..."
            class="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 outline-none font-mono"
          />
          <button
            class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded shadow-sm transition-colors flex items-center gap-1 shrink-0"
            @click="handleSaveSession"
          >
            <Plus :size="14" />
            <span>Save Current Session</span>
          </button>
        </div>

        <div class="max-h-64 overflow-y-auto flex flex-col gap-2">
          <div
            v-for="s in sessionStore.sessions"
            :key="s.id"
            class="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors"
          >
            <div>
              <div class="font-bold text-slate-100 text-sm">{{ s.name }}</div>
              <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                {{ s.genomeName }} • {{ s.viewRegion.chr }}:{{ s.viewRegion.start }}-{{ s.viewRegion.end }} • {{ s.tracks.length }} tracks
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-semibold rounded transition-colors"
                @click="sessionStore.loadSession(s.id); $emit('close')"
              >
                Load
              </button>
              <button
                class="p-1 text-slate-500 hover:text-red-400 transition-colors"
                @click="sessionStore.deleteSession(s.id)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>

          <div v-if="sessionStore.sessions.length === 0" class="text-center py-6 text-slate-500 italic">
            No saved sessions yet.
          </div>
        </div>
      </div>

      <!-- Tab 2: Bookmarks -->
      <div v-else-if="activeTab === 'bookmarks'" class="flex flex-col gap-3">
        <button
          class="self-start px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded shadow-sm transition-colors flex items-center gap-1"
          @click="sessionStore.addBookmark()"
        >
          <Plus :size="14" />
          <span>Bookmark Current Locus</span>
        </button>

        <div class="max-h-64 overflow-y-auto flex flex-col gap-2">
          <div
            v-for="bm in sessionStore.bookmarks"
            :key="bm.id"
            class="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between"
          >
            <div>
              <div class="font-bold text-cyan-400 font-mono">{{ bm.name }}</div>
              <div class="text-[10px] text-slate-500">{{ new Date(bm.createdAt).toLocaleString() }}</div>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded transition-colors"
                @click="jumpToBookmark(bm); $emit('close')"
              >
                Jump
              </button>
              <button
                class="p-1 text-slate-500 hover:text-red-400 transition-colors"
                @click="sessionStore.removeBookmark(bm.id)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>

          <div v-if="sessionStore.bookmarks.length === 0" class="text-center py-6 text-slate-500 italic">
            No bookmarked genomic regions.
          </div>
        </div>
      </div>

      <!-- Tab 3: Import / Export -->
      <div v-else class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-slate-300">Export Session JSON</label>
          <textarea
            readonly
            :value="sessionStore.exportSessionJSON()"
            rows="5"
            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 font-mono text-[11px]"
          ></textarea>
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold text-slate-300">Import Session JSON</label>
          <textarea
            v-model="importInput"
            placeholder="Paste JSON session structure here..."
            rows="4"
            class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 font-mono text-[11px] placeholder-slate-600"
          ></textarea>
          <button
            class="mt-1 self-end px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded transition-colors"
            @click="handleImport"
          >
            Import Session Data
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
        @click="$emit('close')"
      >
        Close
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Save, Bookmark as BookmarkIcon, FileJson, Plus, Trash2 } from 'lucide-vue-next'
import Modal from '../ui/Modal.vue'
import { useSessionStore } from '../../stores/sessionStore'
import { useGenomeStore } from '../../stores/genomeStore'
import { Bookmark } from '../../types/session'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const sessionStore = useSessionStore()
const genomeStore = useGenomeStore()

const activeTab = ref<'sessions' | 'bookmarks' | 'import-export'>('sessions')
const newSessionName = ref('')
const importInput = ref('')

function handleSaveSession() {
  if (!newSessionName.value) return
  const saved = sessionStore.saveCurrentSession(newSessionName.value)
  if (saved) {
    newSessionName.value = ''
  }
}

function jumpToBookmark(bm: Bookmark) {
  genomeStore.setGenome(bm.genome)
  genomeStore.setRegion(bm.region)
}

function handleImport() {
  if (!importInput.value) return
  const success = sessionStore.importSessionJSON(importInput.value)
  if (success) {
    importInput.value = ''
    emit('close')
  }
}
</script>
