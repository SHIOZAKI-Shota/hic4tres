import { ExternalTexture, Matrix4, Scene } from "three"
import type { Camera, Object3D } from "three"
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js"
import type { HtmlCanvas, HtmlCanvasOptions, HtmlLayer, HtmlLayerOptions } from "./html-canvas"
import { facesAway, planeSize } from "./shared"

const _scale = new Matrix4()

export function cssObjectMatrix(
	objectMatrixWorld: Matrix4,
	plane: { width: number; height: number },
	element: { width: number; height: number },
	target = new Matrix4()
): Matrix4 {
	_scale.makeScale(plane.width / Math.max(element.width, 1e-6), plane.height / Math.max(element.height, 1e-6), 1)
	return target.copy(objectMatrixWorld).multiply(_scale)
}

interface CssLayer extends HtmlLayer {
	cssObject: CSS3DObject
}

export function createCss3dCanvas(canvas: HTMLCanvasElement, options: HtmlCanvasOptions = {}): HtmlCanvas {
	const renderer = new CSS3DRenderer()
	const root = renderer.domElement
	root.style.position = "absolute"
	root.style.left = "0px"
	root.style.top = "0px"
	root.style.pointerEvents = "none"
	canvas.after(root)

	const scene = new Scene()
	const layers = new Set<CssLayer>()
	let size = { width: -1, height: -1 }

	function add(element: HTMLElement, opts: HtmlLayerOptions = {}): HtmlLayer {
		const cssObject = new CSS3DObject(element)
		cssObject.matrixAutoUpdate = false
		element.style.userSelect = ""
		scene.add(cssObject)

		const fallback = planeSize(opts.object)
		const texture = new ExternalTexture(null)
		const layer: CssLayer = {
			element,
			texture,
			cssObject,
			object: opts.object ?? null,
			width: opts.width ?? fallback.width,
			height: opts.height ?? fallback.height,
			ready: false,
			dispose() {
				layers.delete(layer)
				scene.remove(cssObject)
				texture.dispose()
			},
		}
		layers.add(layer)
		return layer
	}

	let left = 0
	let top = 0

	function place() {
		const c = canvas.getBoundingClientRect()
		const r = root.getBoundingClientRect()
		const dx = c.left + canvas.clientLeft - r.left
		const dy = c.top + canvas.clientTop - r.top
		if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
			left += dx
			top += dy
			root.style.left = `${left}px`
			root.style.top = `${top}px`
		}
		const width = canvas.clientWidth || 1
		const height = canvas.clientHeight || 1
		if (width !== size.width || height !== size.height) {
			renderer.setSize(width, height)
			size = { width, height }
		}
	}

	function update(camera: Camera) {
		place()
		camera.updateMatrixWorld()
		for (const layer of layers) {
			const object: Object3D | null = layer.object
			if (!object) {
				layer.cssObject.visible = false
				continue
			}
			object.updateWorldMatrix(true, false)
			layer.cssObject.visible = options.backfaceHitTest || !facesAway(object, camera)
			cssObjectMatrix(
				object.matrixWorld,
				{ width: layer.width, height: layer.height },
				{ width: layer.element.offsetWidth, height: layer.element.offsetHeight },
				layer.cssObject.matrix
			)
			layer.cssObject.matrixWorldNeedsUpdate = true
		}
		renderer.render(scene, camera)
	}

	function dispose() {
		for (const layer of Array.from(layers)) layer.dispose()
		root.remove()
	}

	return { canvas, backend: "css3d", layers, add, update, dispose }
}
