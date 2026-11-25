import { createApp } from 'vue'
import App from './App.vue'

const params = new URLSearchParams(location.search)
createApp(App, {
  webgpu: params.get('renderer') === 'webgpu',
  css3d: params.has('css3d')
}).mount('#app')
