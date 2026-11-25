import { Raycaster, Vector2 } from 'three'
import type { Camera, Intersection, Object3D } from 'three'

export interface OcclusionOptions {
  objects?: () => Object3D[]
  redispatch?: boolean
  onBlocked?: (event: Event, hit: Intersection) => void
}

interface Target {
  element: HTMLElement
  object: Object3D | null
}

const EVENTS = [
  'pointerdown', 'pointerup', 'pointermove', 'pointercancel',
  'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'auxclick', 'contextmenu', 'wheel'
] as const

const CANCEL = new Set(['mousedown', 'click', 'dblclick', 'auxclick'])

const _raycaster = new Raycaster()
const _ndc = new Vector2()

function isVisible(object: Object3D) {
  for (let o: Object3D | null = object; o; o = o.parent) if (!o.visible) return false
  return true
}

function sceneOf(object: Object3D) {
  let o = object
  while (o.parent) o = o.parent
  return o
}

function belongsTo(object: Object3D, ancestor: Object3D) {
  for (let o: Object3D | null = object; o; o = o.parent) if (o === ancestor) return true
  return false
}

export function installOcclusion(
  canvas: HTMLCanvasElement,
  layerOf: (element: Element) => Target | null,
  allTargets: () => Iterable<Target>,
  camera: () => Camera | null,
  options: OcclusionOptions = {}
) {
  const redispatch = options.redispatch ?? true
  const transparent = new Map<HTMLElement, string>()

  function firstHit(e: MouseEvent, cam: Camera, roots: Object3D[]) {
    const r = canvas.getBoundingClientRect()
    _ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    _raycaster.setFromCamera(_ndc, cam)
    const hits = _raycaster.intersectObjects(roots, true)
    return hits.find(h => isVisible(h.object)) ?? null
  }

  function blocker(e: MouseEvent, target: Target) {
    const cam = camera()
    if (!cam || !target.object) return null
    const roots = options.objects?.() ?? [sceneOf(target.object)]
    const hit = firstHit(e, cam, roots)
    if (!hit) return null
    for (const t of allTargets()) if (t.object && belongsTo(hit.object, t.object)) return null
    return hit
  }

  function restore() {
    for (const [element, value] of transparent) element.style.pointerEvents = value
    transparent.clear()
  }

  function onEvent(e: Event) {
    if (!(e instanceof MouseEvent)) return

    if (e.target === canvas) {
      if (!e.isTrusted || transparent.size === 0) return
      let hit: Intersection | null = null
      for (const element of transparent.keys()) {
        const target = layerOf(element)
        hit = target && blocker(e, target)
        if (hit) break
      }
      if (hit) options.onBlocked?.(e, hit)
      else restore()
      return
    }

    const target = layerOf(e.target as Element)
    if (!target?.object) return
    const hit = blocker(e, target)
    if (!hit) return

    e.stopPropagation()
    if (CANCEL.has(e.type)) e.preventDefault()
    if ((e.type === 'pointermove' || e.type === 'mousemove') && !transparent.has(target.element)) {
      transparent.set(target.element, target.element.style.pointerEvents)
      target.element.style.pointerEvents = 'none'
    }
    options.onBlocked?.(e, hit)
    if (redispatch) {
      const Ctor = e.constructor as new (type: string, init: MouseEventInit) => MouseEvent
      canvas.dispatchEvent(new Ctor(e.type, e as unknown as MouseEventInit))
    }
  }

  function onLeave() {
    restore()
  }

  for (const type of EVENTS) canvas.addEventListener(type, onEvent, { capture: true })
  canvas.addEventListener('pointerleave', onLeave)
  return () => {
    for (const type of EVENTS) canvas.removeEventListener(type, onEvent, { capture: true })
    canvas.removeEventListener('pointerleave', onLeave)
    restore()
  }
}
