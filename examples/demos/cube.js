import * as THREE from "three"
import { createHtmlCanvas } from "hic4tres"
import { buildCube, demoFaces, wireDemoFaces } from "../cube.js"
import { dragRotate } from "../drag-rotate.js"

const UP = new THREE.Vector3(0, 1, 0)
const LABELS = { webgl: "WebGL", webgpu: "WebGPU", css3d: "CSS3DRenderer" }

export async function mountCube(root, { webgpu = false, still = false, css3d = false } = {}) {
	root.innerHTML = `
    <div style="position: relative; width: 800px">
      <canvas></canvas>
      <div class="badge" style="left: 12px; top: 12px; z-index: 1"></div>
    </div>`
	const stage = root.firstElementChild
	const canvas = stage.querySelector("canvas")

	let renderer
	if (webgpu) {
		const { WebGPURenderer } = await import("three/webgpu")
		renderer = new WebGPURenderer({ canvas, antialias: true })
		await renderer.init()
	} else {
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
	}
	renderer.setPixelRatio(devicePixelRatio)
	renderer.setSize(800, 500, false)
	renderer.toneMapping = THREE.NoToneMapping

	const scene = new THREE.Scene()
	scene.background = new THREE.Color("#f4f4f4")
	const camera = new THREE.PerspectiveCamera(28, 800 / 500, 0.1, 100)
	camera.position.set(0, 0.2, 6.2)

	const hic = createHtmlCanvas(renderer, { fallback: "css3d", forceFallback: css3d })
	root.querySelector(".badge").textContent = `${LABELS[hic.backend]} · three r${THREE.REVISION}`

	const cube = buildCube(THREE, 1.7, demoFaces, (el, mesh) => hic.add(el, { object: mesh }))
	cube.group.rotation.set(0.42, -0.62, 0)
	scene.add(cube.group)
	const demo = wireDemoFaces(cube)

	let spin = !still
	dragRotate(stage, () => cube.group, {
		onStart: () => {
			spin = false
		},
	})

	let last = performance.now()
	renderer.setAnimationLoop((t) => {
		const dt = (t - last) / 1000
		last = t
		if (spin) cube.group.rotateOnWorldAxis(UP, dt * 0.25)
		cube.tick()
		hic.update(camera)
		renderer.render(scene, camera)
	})

	return { cube, demo, hic }
}
