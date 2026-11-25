<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { useLoop } from '@tresjs/core'
import type { Group } from 'three'
import { useHic } from 'hic4tres/vue'
import FaceMesh from './FaceMesh.vue'
// @ts-ignore
import { dragRotate } from '../drag-rotate.js'

const props = defineProps<{
  faces: { front: HTMLElement | null, right: HTMLElement | null, top: HTMLElement | null }
}>()

const SIZE = 1.7
const H = SIZE / 2
const cube = shallowRef<Group>()

let sway = true
const { onBeforeRender } = useLoop()
onBeforeRender(({ elapsed }) => {
  if (sway && cube.value) cube.value.rotation.y = -0.62 + Math.sin(elapsed * 0.5) * 0.12
})

const hic = useHic()
const stop = watch(hic, (h) => {
  if (!h) return
  dragRotate(h.canvas.parentElement ?? h.canvas, () => cube.value, { onStart: () => { sway = false } })
  queueMicrotask(() => stop())
}, { immediate: true })
</script>

<template>
  <TresPerspectiveCamera
    :position="[0, 0.2, 6.2]"
    :fov="28"
    :look-at="[0, 0, 0]"
  />
  <TresGroup
    ref="cube"
    :rotation="[0.42, -0.62, 0]"
  >
    <FaceMesh
      :element="props.faces.front"
      :size="SIZE"
      :position="[0, 0, H]"
      :rotation="[0, 0, 0]"
    />
    <FaceMesh
      :element="props.faces.right"
      :size="SIZE"
      :position="[H, 0, 0]"
      :rotation="[0, Math.PI / 2, 0]"
    />
    <FaceMesh
      :element="props.faces.top"
      :size="SIZE"
      :position="[0, H, 0]"
      :rotation="[-Math.PI / 2, 0, 0]"
    />
    <TresMesh
      v-for="(f, i) in [
        { p: [0, 0, -H], r: [0, Math.PI, 0] },
        { p: [-H, 0, 0], r: [0, -Math.PI / 2, 0] },
        { p: [0, -H, 0], r: [Math.PI / 2, 0, 0] }
      ]"
      :key="i"
      :position="f.p"
      :rotation="f.r"
    >
      <TresPlaneGeometry :args="[SIZE, SIZE]" />
      <TresMeshBasicMaterial color="#0038ff" />
    </TresMesh>
  </TresGroup>
</template>
