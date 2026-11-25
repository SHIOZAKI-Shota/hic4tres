import * as THREE from 'three'
import { createHtmlCanvas } from 'hic4tres'
import { buildCube, demoFaces } from '../cube.js'
import { dragRotate } from '../drag-rotate.js'

export function mountCompare(root) {
  root.innerHTML = `
    <div class="row">
      <div style="position: relative">
        <canvas></canvas>
        <div class="caption" style="left: 10px; top: 10px">THREE.HTMLTexture (r187)</div>
      </div>
      <div style="position: relative">
        <canvas></canvas>
        <div class="caption" style="left: 10px; top: 10px">hic4tres</div>
      </div>
    </div>`
  const [threeCanvas, hicCanvas] = root.querySelectorAll('canvas')

  function scene(canvas, attachFor) {
    canvas.setAttribute('content', 'drawable')
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(devicePixelRatio)
    renderer.setSize(400, 300, false)
    renderer.toneMapping = THREE.NoToneMapping
    const s = new THREE.Scene()
    s.background = new THREE.Color('#f4f4f4')
    const camera = new THREE.PerspectiveCamera(28, 400 / 300, 0.1, 100)
    camera.position.set(0, 0.2, 6.4)
    const { attach, update } = attachFor(renderer, canvas)
    const cube = buildCube(THREE, 1.7, demoFaces, attach)
    cube.group.rotation.set(0.42, -0.62, 0)
    s.add(cube.group)
    dragRotate(canvas, () => cube.group)
    renderer.setAnimationLoop(() => {
      cube.tick()
      update?.(camera)
      renderer.render(s, camera)
    })
  }

  scene(threeCanvas, (renderer, canvas) => ({
    attach: (el) => {
      canvas.appendChild(el)
      return { texture: new THREE.HTMLTexture(el), ready: true }
    }
  }))

  scene(hicCanvas, (renderer) => {
    const hic = createHtmlCanvas(renderer)
    return {
      attach: (el, mesh) => hic.add(el, { object: mesh }),
      update: camera => hic.update(camera)
    }
  })
}
