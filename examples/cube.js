export const FACES = [
	{ name: "front", position: [0, 0, 1], rotation: [0, 0, 0] },
	{ name: "right", position: [1, 0, 0], rotation: [0, Math.PI / 2, 0] },
	{ name: "top", position: [0, 1, 0], rotation: [-Math.PI / 2, 0, 0] },
	{ name: "back", position: [0, 0, -1], rotation: [0, Math.PI, 0] },
	{ name: "left", position: [-1, 0, 0], rotation: [0, -Math.PI / 2, 0] },
	{ name: "bottom", position: [0, -1, 0], rotation: [Math.PI / 2, 0, 0] },
]

export function buildCube(THREE, size, html, attach) {
	const group = new THREE.Group()
	const faces = []
	for (const f of FACES) {
		const mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(size, size),
			new THREE.MeshBasicMaterial({ color: "#0038ff" })
		)
		mesh.name = f.name
		mesh.position.set(...f.position.map((v) => (v * size) / 2))
		mesh.rotation.set(...f.rotation)
		group.add(mesh)

		const inner = html(f.name)
		if (inner == null) {
			faces.push({ name: f.name, mesh, el: null, layer: null })
			continue
		}
		const el = document.createElement("div")
		el.className = `face face-${f.name}`
		el.innerHTML = inner
		const layer = attach(el, mesh)
		mesh.material.color.set("#ffffff")
		mesh.material.map = layer.texture
		mesh.material.needsUpdate = true
		faces.push({ name: f.name, mesh, el, layer })
	}

	function tick() {
		for (const face of faces) if (face.layer) face.mesh.visible = face.layer.ready
	}

	return { group, faces, tick, face: (name) => faces.find((f) => f.name === name) }
}

export function demoFaces(name) {
	switch (name) {
		case "front":
			return `<header>Real form</header>
        <label>Name<input value="type here"></label>
        <button>press me</button>
        <p class="out">clicks: <b>0</b></p>`
		case "top":
			return `<p class="logo">hic4tres</p><p class="sub">HTML-in-Canvas<br>for three.js / TresJS</p>`
		case "right":
			return `<header>Live DOM</header>
        <ul>
          <li>selectable text</li>
          <li>a <a href="https://threejs.org" target="_blank">link</a></li>
          <li>clock <b class="clock">--:--:--</b></li>
        </ul>`
		default:
			return `<p class="side">${name}</p>`
	}
}

export function wireDemoFaces(cube) {
	const front = cube.face("front").el
	let clicks = 0
	front.querySelector("button").addEventListener("click", () => {
		clicks++
		front.querySelector(".out b").textContent = String(clicks)
	})
	const clock = cube.face("right").el.querySelector(".clock")
	const tick = () => {
		clock.textContent = new Date().toLocaleTimeString("en-GB")
	}
	tick()
	setInterval(tick, 1000)
	return { clicks: () => clicks }
}
