import * as THREE from "three"
import { createHtmlCanvas } from "hic4tres"

export function mountPitfalls(root) {
	const cell = (label) =>
		`<div style="position: relative"><canvas style="width: 300px; height: 230px"></canvas><div class="caption" style="left: 8px; top: 8px">${label}</div></div>`
	root.innerHTML = `<div class="row">${cell("1. raw upload")}${cell("2. + flip")}${cell("3. hic4tres")}</div>`
	const [raw, flip, hic] = root.querySelectorAll("canvas")
	setup(raw, "raw")
	setup(flip, "flip")
	setup(hic, "hic")
}

function card() {
	const el = document.createElement("div")
	el.className = "card"
	el.style.width = "230px"
	el.innerHTML = "<header>#0038ff header</header><button>button</button>"
	return el
}

function setup(canvas, kind) {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
	renderer.setPixelRatio(devicePixelRatio)
	renderer.setSize(300, 230, false)
	renderer.toneMapping = THREE.NoToneMapping
	const scene = new THREE.Scene()
	scene.background = new THREE.Color("#f4f4f4")
	const camera = new THREE.OrthographicCamera(-150, 150, 115, -115, -10, 10)
	const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial())
	mesh.position.set(0, -10, 0)
	scene.add(mesh)
	const ref = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ color: "#0038ff" }))
	ref.position.set(125, -90, 1)
	scene.add(ref)
	const el = card()

	let tick
	if (kind === "hic") {
		const hic = createHtmlCanvas(renderer)
		const layer = hic.add(el, { object: mesh, width: 1, height: 1 })
		mesh.material.map = layer.texture
		tick = () => {
			mesh.visible = layer.ready
			mesh.scale.set(el.offsetWidth, el.offsetHeight, 1)
			hic.update(camera)
		}
	} else {
		canvas.setAttribute("content", "drawable")
		el.setAttribute("drawable", "")
		canvas.appendChild(el)
		const gl = renderer.getContext()
		const tex = new THREE.ExternalTexture(null)
		if (kind === "flip") {
			tex.repeat.set(1, -1)
			tex.offset.set(0, 1)
		}
		mesh.material.map = tex
		mesh.visible = false
		let glTex = null
		canvas.addEventListener("paint", () => {
			let size
			try {
				size = canvas.getElementImageDefaultSize(el)
			} catch {
				return
			}
			if (!glTex) {
				glTex = gl.createTexture()
				gl.bindTexture(gl.TEXTURE_2D, glTex)
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA8,
					Math.ceil(size.width),
					Math.ceil(size.height),
					0,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					null
				)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
				tex.sourceTexture = glTex
				tex.needsUpdate = true
			}
			gl.bindTexture(gl.TEXTURE_2D, glTex)
			gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, el)
			renderer.resetState()
			mesh.visible = true
		})
		tick = () => {
			mesh.scale.set(el.offsetWidth, el.offsetHeight, 1)
			if (!glTex) canvas.requestPaint()
		}
	}

	renderer.setAnimationLoop(() => {
		tick()
		renderer.render(scene, camera)
	})
}
