<script setup lang="ts">
import { shallowRef } from "vue"
import { useHtmlLayer } from "hic4tres/vue"
import type { Mesh } from "three"

const props = defineProps<{
	element: HTMLElement | null
	size: number
	position: [number, number, number]
	rotation: [number, number, number]
}>()

const mesh = shallowRef<Mesh>()
const { texture, ready } = useHtmlLayer(() => props.element, { object: mesh })
</script>

<template>
	<TresMesh ref="mesh" :visible="ready" :position="position" :rotation="rotation">
		<TresPlaneGeometry :args="[size, size]" />
		<TresMeshBasicMaterial :map="texture" />
	</TresMesh>
</template>
