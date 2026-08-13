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
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          :aria-label="title || 'Dialog'"
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
              ref="closeBtnRef"
              type="button"
              aria-label="Close dialog"
              class="p-1 rounded-lg transition-colors"
              :class="themeStore.isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'"
              @click="$emit('close')"
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
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import { useThemeStore } from '../../stores/themeStore'

const props = defineProps<{
  isOpen: boolean
  title?: string
}>()

const emit = defineEmits(['close'])
const themeStore = useThemeStore()

const dialogRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLButtonElement | null>(null)

function handleKeydown(e: KeyboardEvent) {
  if (!props.isOpen) return
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key !== 'Tab') return

  // Simple focus trap: keep Tab cycling inside the dialog.
  const el = dialogRef.value
  if (!el) return
  const focusables = Array.from(
    el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter(f => !f.hasAttribute('disabled'))
  if (focusables.length === 0) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement
  if (e.shiftKey && (active === first || active === el || !el.contains(active))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || !el.contains(active))) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.isOpen,
  async open => {
    if (open) {
      document.addEventListener('keydown', handleKeydown)
      await nextTick()
      closeBtnRef.value?.focus()
    } else {
      document.removeEventListener('keydown', handleKeydown)
    }
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>
