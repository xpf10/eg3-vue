import { Buffer } from 'buffer'

if (typeof window !== 'undefined') {
  ;(window as any).Buffer = Buffer
}

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
