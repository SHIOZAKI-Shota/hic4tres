import { TresCanvas, useLoop, useTres } from "@tresjs/core"
import { NoToneMapping } from "three"
import {
	Teleport,
	computed,
	defineComponent,
	h,
	inject,
	onBeforeUnmount,
	provide,
	ref,
	shallowRef,
	toValue,
	watch,
} from "vue"
import type { ComputedRef, InjectionKey, MaybeRefOrGetter, PropType, Ref, ShallowRef } from "vue"
import { createHtmlCanvas } from "./html-canvas"
import type {
	HtmlCanvas,
	HtmlCanvasOptions,
	HtmlCanvasRenderer,
	HtmlLayer,
	HtmlLayerOptions,
	WebGPURendererLike,
} from "./html-canvas"

export * from "./index"

const HIC: InjectionKey<ShallowRef<HtmlCanvas | null>> = Symbol("hic4tres")
const byRenderer = new WeakMap<object, ShallowRef<HtmlCanvas | null>>()

const HicInit = defineComponent({
	name: "HicInit",
	props: {
		target: { type: Object as PropType<ShallowRef<HtmlCanvas | null>>, required: true },
		options: { type: Object as PropType<HtmlCanvasOptions>, default: undefined },
	},
	setup(props) {
		const { renderer, camera } = useTres()
		const r = renderer as unknown as HtmlCanvasRenderer & { isWebGLRenderer?: boolean }
		let hic: HtmlCanvas | null = null
		let failed = false

		function ensure() {
			if (hic || failed) return hic
			const backend = (r as WebGPURendererLike).backend
			const ready =
				r.isWebGLRenderer ||
				((r as WebGPURendererLike).isWebGPURenderer && (backend?.device || backend?.isWebGLBackend))
			if (!ready) return null
			try {
				hic = createHtmlCanvas(r, props.options)
			} catch (error) {
				failed = true
				console.warn(error)
				return null
			}
			props.target.value = hic
			byRenderer.set(renderer, props.target)
			return hic
		}
		ensure()

		const { onBeforeRender } = useLoop()
		onBeforeRender(() => {
			const instance = ensure()
			if (instance && camera.value) instance.update(camera.value)
		})

		onBeforeUnmount(() => {
			hic?.dispose()
			props.target.value = null
			byRenderer.delete(renderer)
		})
		return () => null
	},
})

export const HicCanvas = defineComponent({
	name: "HicCanvas",
	inheritAttrs: false,
	props: {
		hicOptions: { type: Object as PropType<HtmlCanvasOptions>, default: undefined },
	},
	setup(props, { attrs, slots, expose }) {
		const hic = shallowRef<HtmlCanvas | null>(null)
		provide(HIC, hic)
		expose({ hic })
		return () => [
			h(
				TresCanvas as never,
				{ toneMapping: NoToneMapping, ...attrs },
				{
					default: () => [h(HicInit, { target: hic, options: props.hicOptions }), slots.default?.()],
				}
			),
			hic.value && slots.html ? h(Teleport, { to: hic.value.canvas }, slots.html()) : null,
		]
	},
})

export function useHic(): ShallowRef<HtmlCanvas | null> {
	const injected = inject(HIC, null)
	if (injected) return injected
	try {
		const { renderer } = useTres()
		const found = byRenderer.get(renderer)
		if (found) return found
	} catch {}
	return shallowRef(null)
}

export function useHtmlLayer(
	element: MaybeRefOrGetter<HTMLElement | null | undefined>,
	options: { object?: MaybeRefOrGetter<HtmlLayerOptions["object"]>; width?: number; height?: number } = {}
): { layer: ShallowRef<HtmlLayer | null>; texture: ComputedRef<HtmlLayer["texture"] | null>; ready: Ref<boolean> } {
	const hic = useHic()
	const layer = shallowRef<HtmlLayer | null>(null)
	const ready = ref(false)

	watch(
		[hic, () => toValue(element)],
		([canvas, el]) => {
			layer.value?.dispose()
			ready.value = false
			layer.value =
				canvas && el
					? canvas.add(el, {
							object: toValue(options.object) ?? null,
							width: options.width,
							height: options.height,
							onReady: () => {
								ready.value = true
							},
						})
					: null
		},
		{ immediate: true, flush: "post" }
	)

	watch(
		() => toValue(options.object),
		(object) => {
			if (layer.value) layer.value.object = object ?? null
		}
	)

	onBeforeUnmount(() => {
		layer.value?.dispose()
		layer.value = null
		ready.value = false
	})
	return { layer, texture: computed(() => layer.value?.texture ?? null), ready }
}
