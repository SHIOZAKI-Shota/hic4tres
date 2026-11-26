<script setup lang="ts">
import { onBeforeUnmount, ref, toValue } from "vue"
import { WebGPURenderer } from "three/webgpu"
import type { TresRendererSetupContext } from "@tresjs/core"
import { HicCanvas } from "hic4tres/vue"
import Scene from "./Scene.vue"

const props = defineProps<{ webgpu?: boolean; css3d?: boolean }>()
const gpu = props.webgpu
const renderer = gpu
	? (ctx: TresRendererSetupContext) =>
			new WebGPURenderer({ canvas: toValue(ctx.canvas), antialias: true, alpha: true })
	: undefined
const hicOptions = { fallback: "css3d" as const, forceFallback: props.css3d }

const front = ref<HTMLElement | null>(null)
const right = ref<HTMLElement | null>(null)
const top = ref<HTMLElement | null>(null)

const name = ref("")
const sent = ref<string[]>([])
const time = ref("")
const timer = setInterval(() => {
	time.value = new Date().toLocaleTimeString("en-GB")
}, 1000)
onBeforeUnmount(() => clearInterval(timer))

;(window as unknown as { __tres: unknown }).__tres = { sent, name }

function send() {
	sent.value = [...sent.value, name.value || "(empty)"]
}
</script>

<template>
	<HicCanvas clear-color="#f4f4f4" :renderer="renderer" :hic-options="hicOptions">
		<Scene :faces="{ front, right, top }" />

		<template #html>
			<form ref="front" class="face" @submit.prevent="send">
				<header>Vue form</header>
				<label>Name<input v-model="name" placeholder="type here" /></label>
				<button>send</button>
				<p>sent: <b>{{ sent.join(", ") || "—" }}</b></p>
			</form>
			<div ref="right" class="face">
				<header>Reactive</header>
				<p>name: <b>{{ name || "—" }}</b></p>
				<p>clock: <b>{{ time }}</b></p>
			</div>
			<div ref="top" class="face face-top">
				<p class="logo">TresJS</p>
				<p class="sub">+ hic4tres</p>
			</div>
		</template>
	</HicCanvas>
</template>
