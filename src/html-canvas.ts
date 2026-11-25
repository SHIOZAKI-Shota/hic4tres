import {
  ExternalTexture, LinearFilter, LinearSRGBColorSpace, Matrix4, SRGBColorSpace, Vector3
} from 'three'
import type { Camera, Object3D, WebGLRenderer } from 'three'
import { createCss3dCanvas } from './css3d'
import { elementToCanvasMatrix, toDOMMatrix } from './geometry'
import { installOcclusion } from './occlusion'
import type { OcclusionOptions } from './occlusion'
import { facesAway, planeSize } from './shared'
import type { DrawableCanvas, DrawableGL, DrawableGPUDevice, DrawableGPUTexture } from './support'

export interface HtmlLayerOptions {
  object?: Object3D | null
  width?: number
  height?: number
  onReady?: (layer: HtmlLayer) => void
}

export interface HtmlLayer {
  readonly element: HTMLElement
  readonly texture: ExternalTexture
  readonly ready: boolean
  object: Object3D | null
  width: number
  height: number
  dispose: () => void
}

export interface HtmlCanvasOptions {
  colorSpace?: 'srgb' | 'linear'
  occlusion?: boolean | OcclusionOptions
  backfaceHitTest?: boolean
  fallback?: 'css3d'
  forceFallback?: boolean
}

export interface HtmlCanvas {
  readonly canvas: HTMLCanvasElement
  readonly backend: 'webgl' | 'webgpu' | 'css3d'
  readonly layers: ReadonlySet<HtmlLayer>
  add: (element: HTMLElement, options?: HtmlLayerOptions) => HtmlLayer
  update: (camera: Camera) => void
  dispose: () => void
}

export interface WebGPURendererLike {
  isWebGPURenderer: true
  domElement: HTMLCanvasElement
  backend: { isWebGPUBackend?: boolean, isWebGLBackend?: boolean, device?: unknown }
}

export type HtmlCanvasRenderer = WebGLRenderer | WebGPURendererLike

interface LayerState extends HtmlLayer {
  onReady?: (layer: HtmlLayer) => void
  surface: unknown
  textureWidth: number
  textureHeight: number
  isReady: boolean
  facingAway: boolean
}

interface Uploader {
  readonly kind: 'webgl' | 'webgpu'
  allocate: (layer: LayerState, width: number, height: number) => void
  upload: (layer: LayerState) => void
  free: (layer: LayerState) => void
  flush: () => void
}

function webglUploader(renderer: WebGLRenderer, srgb: boolean): Uploader {
  const gl = renderer.getContext() as DrawableGL
  if (typeof gl.texElementSubImage2D !== 'function') {
    throw new TypeError('hic4tres: HTML-in-Canvas for WebGL2 is not available. Check supportsHtmlInCanvas() first.')
  }
  return {
    kind: 'webgl',
    allocate(layer, width, height) {
      if (layer.surface) gl.deleteTexture(layer.surface as WebGLTexture)
      const tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      layer.surface = tex
      layer.texture.sourceTexture = tex
      layer.texture.needsUpdate = true
    },
    upload(layer) {
      gl.bindTexture(gl.TEXTURE_2D, layer.surface as WebGLTexture)
      gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, layer.element)
    },
    free(layer) {
      if (layer.surface) gl.deleteTexture(layer.surface as WebGLTexture)
      layer.surface = null
    },
    flush: () => renderer.resetState()
  }
}

const GPU_USAGE = 0x04 | 0x02 | 0x10

function webgpuUploader(renderer: WebGPURendererLike, srgb: boolean): Uploader {
  if (!renderer.backend.isWebGPUBackend) {
    throw new TypeError('hic4tres: this WebGPURenderer runs on its WebGL fallback backend, which is not supported. Use WebGLRenderer instead.')
  }
  const device = renderer.backend.device as DrawableGPUDevice | undefined
  if (!device) throw new TypeError('hic4tres: the WebGPURenderer is not initialised yet. Call `await renderer.init()` first.')
  if (typeof device.queue.drawElementImageToTexture !== 'function') {
    throw new TypeError('hic4tres: HTML-in-Canvas for WebGPU is not available. Check supportsHtmlInCanvas("webgpu") first.')
  }
  return {
    kind: 'webgpu',
    allocate(layer, width, height) {
      ;(layer.surface as DrawableGPUTexture | null)?.destroy()
      const tex = device.createTexture({ size: [width, height], format: srgb ? 'rgba8unorm-srgb' : 'rgba8unorm', usage: GPU_USAGE })
      layer.surface = tex
      layer.texture.dispose()
      layer.texture.sourceTexture = tex as unknown as WebGLTexture
      layer.texture.needsUpdate = true
    },
    upload(layer) {
      device.queue.drawElementImageToTexture({ source: layer.element }, { texture: layer.surface as DrawableGPUTexture })
    },
    free(layer) {
      ;(layer.surface as DrawableGPUTexture | null)?.destroy()
      layer.surface = null
    },
    flush: () => {}
  }
}

const _matrix = new Matrix4()
const _position = new Vector3()

function createUploader(renderer: HtmlCanvasRenderer, srgb: boolean) {
  return (renderer as WebGPURendererLike).isWebGPURenderer
    ? webgpuUploader(renderer as WebGPURendererLike, srgb)
    : webglUploader(renderer as WebGLRenderer, srgb)
}

export function createHtmlCanvas(renderer: HtmlCanvasRenderer, options: HtmlCanvasOptions = {}): HtmlCanvas {
  const canvas = renderer.domElement as DrawableCanvas
  const srgb = (options.colorSpace ?? 'srgb') === 'srgb'
  if (options.forceFallback) return createCss3dCanvas(canvas, options)
  let uploader: Uploader
  try {
    uploader = createUploader(renderer, srgb)
  } catch (error) {
    if (options.fallback === 'css3d') return createCss3dCanvas(canvas, options)
    throw error
  }

  if (canvas.getAttribute('content') !== 'drawable') canvas.setAttribute('content', 'drawable')

  const layers = new Set<LayerState>()
  const byElement = new Map<Element, LayerState>()
  let lastCamera: Camera | null = null

  function layerOf(node: Element | null) {
    for (let el = node; el && el !== canvas; el = el.parentElement) {
      const layer = byElement.get(el)
      if (layer) return layer
    }
    return null
  }

  const occlusion = options.occlusion ?? true
  const removeOcclusion = occlusion
    ? installOcclusion(canvas, layerOf, () => layers, () => lastCamera, occlusion === true ? {} : occlusion)
    : () => {}

  function upload(layer: LayerState) {
    let size: { width: number, height: number }
    try {
      size = canvas.getElementImageDefaultSize(layer.element)
    } catch {
      return false
    }
    const width = Math.max(1, Math.ceil(size.width))
    const height = Math.max(1, Math.ceil(size.height))
    if (!layer.surface || width !== layer.textureWidth || height !== layer.textureHeight) {
      uploader.allocate(layer, width, height)
      layer.textureWidth = width
      layer.textureHeight = height
    }
    uploader.upload(layer)
    if (!layer.isReady) {
      layer.isReady = true
      layer.onReady?.(layer)
    }
    return true
  }

  function onPaint(event: Event) {
    const changed = (event as Event & { changedElements?: Element[] }).changedElements
    let touched = false
    for (const layer of layers) {
      if (!layer.isReady || !changed || changed.includes(layer.element)) touched = upload(layer) || touched
    }
    if (touched) uploader.flush()
  }
  canvas.addEventListener('paint', onPaint)

  function add(element: HTMLElement, opts: HtmlLayerOptions = {}): HtmlLayer {
    element.setAttribute('drawable', '')
    if (!canvas.contains(element)) canvas.appendChild(element)

    const texture = new ExternalTexture(null)
    texture.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace
    texture.generateMipmaps = false
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.repeat.set(1, -1)
    texture.offset.set(0, 1)

    const fallback = planeSize(opts.object)
    const layer: LayerState = {
      element,
      texture,
      object: opts.object ?? null,
      width: opts.width ?? fallback.width,
      height: opts.height ?? fallback.height,
      onReady: opts.onReady,
      surface: null,
      textureWidth: 0,
      textureHeight: 0,
      isReady: false,
      facingAway: false,
      get ready() {
        return this.isReady
      },
      dispose() {
        layers.delete(layer)
        byElement.delete(element)
        uploader.free(layer)
        texture.dispose()
        canvas.clearElementGeometry?.(element)
      }
    }
    layers.add(layer)
    byElement.set(element, layer)
    canvas.requestPaint()
    return layer
  }

  const ordered: { layer: LayerState, depth: number }[] = []

  function update(camera: Camera) {
    for (const layer of layers) {
      if (!layer.isReady) {
        canvas.requestPaint()
        break
      }
    }

    camera.updateMatrixWorld()
    lastCamera = camera
    const css = { width: canvas.clientWidth || 1, height: canvas.clientHeight || 1 }

    ordered.length = 0
    for (const layer of layers) {
      if (!layer.object) continue
      layer.object.updateWorldMatrix(true, false)
      if (!options.backfaceHitTest && facesAway(layer.object, camera)) {
        if (!layer.facingAway) {
          canvas.clearElementGeometry?.(layer.element)
          layer.facingAway = true
        }
        continue
      }
      layer.facingAway = false
      _position.setFromMatrixPosition(layer.object.matrixWorld).applyMatrix4(camera.matrixWorldInverse)
      ordered.push({ layer, depth: _position.z })
    }
    ordered.sort((a, b) => a.depth - b.depth)

    for (const { layer } of ordered) {
      const el = layer.element
      elementToCanvasMatrix(
        layer.object!,
        camera,
        { width: layer.width, height: layer.height },
        { width: el.offsetWidth, height: el.offsetHeight },
        css,
        _matrix
      )
      canvas.updateElementGeometry(el, { canvasTransform: toDOMMatrix(_matrix) })
    }
  }

  function dispose() {
    canvas.removeEventListener('paint', onPaint)
    removeOcclusion()
    for (const layer of [...layers]) layer.dispose()
  }

  return { canvas, backend: uploader.kind, layers, add, update, dispose }
}
