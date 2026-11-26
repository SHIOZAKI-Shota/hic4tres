export interface DrawableCanvas extends HTMLCanvasElement {
	content: string
	requestPaint: () => void
	getElementImageDefaultSize: (element: Element) => { width: number; height: number }
	updateElementGeometry: (
		element: Element,
		options: { canvasTransform?: DOMMatrix; preserveHitTestOrder?: boolean }
	) => void
	clearElementGeometry?: (element: Element) => void
}

export interface DrawableGL extends WebGL2RenderingContext {
	texElementSubImage2D: (target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, element: Element) => void
}

export interface DrawableGPUTexture {
	destroy: () => void
}

export interface DrawableGPUDevice {
	createTexture: (descriptor: { size: [number, number]; format: string; usage: number }) => DrawableGPUTexture
	queue: {
		drawElementImageToTexture: (source: { source: Element }, destination: { texture: DrawableGPUTexture }) => void
	}
}

export type HtmlInCanvasBackend = "webgl" | "webgpu"

export function supportsHtmlInCanvas(backend: HtmlInCanvasBackend = "webgl"): boolean {
	if (typeof document === "undefined") return false
	const canvas = document.createElement("canvas") as Partial<DrawableCanvas> & HTMLCanvasElement
	canvas.setAttribute("content", "drawable")
	if (canvas.content !== "drawable" || typeof canvas.updateElementGeometry !== "function") return false
	if (backend === "webgpu") {
		const queue = (globalThis as { GPUQueue?: { prototype: object } }).GPUQueue
		return !!queue && "drawElementImageToTexture" in queue.prototype && "gpu" in navigator
	}
	return typeof WebGL2RenderingContext !== "undefined" && "texElementSubImage2D" in WebGL2RenderingContext.prototype
}
