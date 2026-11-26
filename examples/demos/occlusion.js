import * as THREE from "three"
import { createHtmlCanvas, elementToCanvasMatrix, projectPoint } from "hic4tres"
import { buildCube } from "../cube.js"
import { dragRotate } from "../drag-rotate.js"

export function mountOcclusion(root) {
	root.innerHTML = '<div style="position: relative; width: 800px"><canvas></canvas></div>'
	const stage = root.firstElementChild
	const canvas = stage.querySelector("canvas")

	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
	renderer.setPixelRatio(devicePixelRatio)
	renderer.setSize(800, 500, false)
	renderer.toneMapping = THREE.NoToneMapping

	const scene = new THREE.Scene()
	scene.background = new THREE.Color("#f4f4f4")
	scene.add(new THREE.AmbientLight("#ffffff", 1.5))
	const sun = new THREE.DirectionalLight("#ffffff", 2)
	sun.position.set(2, 3, 4)
	scene.add(sun)

	const camera = new THREE.PerspectiveCamera(28, 800 / 500, 0.1, 100)
	camera.position.set(0, 0.2, 6.2)

	const status = { A: "", B: "", C: "", D: "" }
	let current = null
	let pillar = null
	const PILLAR = "#ff5a1f"
	const hic = createHtmlCanvas(renderer, {
		occlusion: {
			onBlocked: (e, hit) => {
				if (current && e.type === "click") status[current] = "blocked → canvas"
				if (e.type === "pointerdown" && hit.object === pillar) pillar.material.color.set("#0a0a0a")
			},
		},
	})
	addEventListener("pointerup", () => pillar?.material.color.set(PILLAR))

	const SIZE = 1.7
	const cube = buildCube(
		THREE,
		SIZE,
		(name) => {
			if (name === "front") return '<header>Behind a pillar</header><button>button</button><input value="input">'
			if (name === "top") return '<p class="logo">hic4tres</p>'
			if (name === "right") return '<p class="side">right</p>'
			return null
		},
		(el, mesh) => hic.add(el, { object: mesh })
	)
	cube.group.rotation.set(0.42, -0.62, 0)
	scene.add(cube.group)
	dragRotate(canvas, () => cube.group)

	const front = cube.face("front")
	const el = front.el
	el.querySelector("button").addEventListener("click", () => {
		if (current) status[current] = "button clicked"
	})
	el.querySelector("input").addEventListener("focus", () => {
		if (current) status[current] = "input focused"
	})

	function drawnAt(selector, fx) {
		const t = el.querySelector(selector)
		cube.group.updateMatrixWorld(true)
		camera.updateMatrixWorld()
		const m = elementToCanvasMatrix(
			front.mesh,
			camera,
			{ width: SIZE, height: SIZE },
			{ width: el.offsetWidth, height: el.offsetHeight },
			{ width: 800, height: 500 }
		)
		return projectPoint(m, t.offsetLeft + t.offsetWidth * fx, t.offsetTop + t.offsetHeight / 2)
	}

	function placePillar() {
		const b = el.querySelector("button")
		const i = el.querySelector("input")
		const ex = b.offsetLeft + b.offsetWidth * 0.78
		const ey = (b.offsetTop + i.offsetTop + i.offsetHeight) / 2
		const local = new THREE.Vector3((ex / el.offsetWidth - 0.5) * SIZE, (0.5 - ey / el.offsetHeight) * SIZE, 0)
		const world = front.mesh.localToWorld(local)
		pillar = new THREE.Mesh(
			new THREE.BoxGeometry(0.28, 0.95, 0.28),
			new THREE.MeshStandardMaterial({ color: PILLAR })
		)
		pillar.position.copy(world.lerp(camera.position, 0.28))
		pillar.rotation.y = 0.4
		scene.add(pillar)
	}

	const points = {
		A: () => drawnAt("button", 0.85),
		B: () => drawnAt("button", 0.15),
		C: () => drawnAt("input", 0.85),
		D: () => drawnAt("input", 0.15),
	}

	function drawMarkers() {
		stage.querySelectorAll(".marker, .caption").forEach((n) => n.remove())
		for (const [k, at] of Object.entries(points)) {
			const p = at()
			const m = document.createElement("div")
			m.className = "marker"
			m.textContent = k
			m.style.left = `${p.x}px`
			m.style.top = `${p.y}px`
			stage.append(m)
			if (status[k]) {
				const c = document.createElement("div")
				c.className = "caption"
				c.textContent = `${k}: ${status[k]}`
				const right = k === "A" || k === "C"
				c.style.left = `${right ? 560 : 18}px`
				c.style.top = `${p.y - 11}px`
				stage.append(c)
			}
		}
	}

	let placed = false
	renderer.setAnimationLoop(() => {
		cube.tick()
		if (front.layer.ready && !placed && el.offsetWidth) {
			placePillar()
			placed = true
		}
		hic.update(camera)
		renderer.render(scene, camera)
	})

	return {
		points: () => Object.fromEntries(Object.entries(points).map(([k, f]) => [k, f()])),
		begin: (k) => {
			current = k
		},
		status,
		drawMarkers,
	}
}
