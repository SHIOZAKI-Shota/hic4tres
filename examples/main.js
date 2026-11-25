import { createApp } from 'vue'
import { mountCube } from './demos/cube.js'
import { mountOcclusion } from './demos/occlusion.js'
import { mountCompare } from './demos/compare.js'
import { mountPitfalls } from './demos/pitfalls.js'
import App from './tres/App.vue'

const $ = id => document.getElementById(id)
$('build-note').remove()

mountCube($('cube'))
mountCube($('cube-webgpu'), { webgpu: true })
mountCube($('cube-css3d'), { css3d: true })
mountOcclusion($('occlusion'))
mountCompare($('compare'))
mountPitfalls($('pitfalls'))
createApp(App, { webgpu: false }).mount($('tres'))
createApp(App, { webgpu: true }).mount($('tres-webgpu'))
createApp(App, { css3d: true }).mount($('tres-css3d'))
