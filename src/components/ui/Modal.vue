<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
        :class="themeStore.isDarkMode ? 'bg-slate-950/80' : 'bg-slate-900/40'"
        @click.self="$emit('close')"
      >
        <div
          class="relative w-full max-w-2xl border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-150"
          :class="themeStore.isDarkMode ? 'bg-slate-900 border-slate-700/80 text-slate-200' : 'bg-white border-slate-200 text-slate-900'"
        >
          <!-- Modal Header -->
          <div
            class="flex items-center justify-between px-6 py-4 border-b"
            :class="themeStore.isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'"
          >
            <h3 class="text-lg font-semibold flex items-center gap-2" :class="themeStore.isDarkMode ? 'text-slate-100' : 'text-slate-900'">
              <slot name="title">{{ title }}</slot>
            </h3>
            <button
              @click="$emit('close')"
              class="p-1 rounded-lg transition-colors"
              :class="themeStore.isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'"
            >
              <X :size="20" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 overflow-y-auto flex-1">
            <slot />
          </div>

          <!-- Modal Footer -->
          <div
            v-if="$slots.footer"
            class="flex items-center justify-end gap-3 px-6 py-4 border-t"
            :class="themeStore.isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useThemeStore } from '../../stores/themeStore'

defineProps<{
  isOpen: boolean
  title?: string
}>()

defineEmits(['close'])
const themeStore = useThemeStore()
</script>
