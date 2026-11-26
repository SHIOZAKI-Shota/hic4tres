import { Vector3 } from "three"

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const EDITABLE = "input, textarea, select, [contenteditable]"
const THRESHOLD = 4
const FRICTION = 4

export function dragRotate(canvas, getObject, { speed = 0.01, onStart } = {}) {
	let press = null
	let rotating = false
	let suppressClick = false
	let velocity = { x: 0, y: 0 }
	let inertia = 0

	canvas.style.cursor = "grab"

	const turn = (dx, dy) => {
		const object = getObject()
		if (!object) return
		object.rotateOnWorldAxis(Y, dx * speed)
		object.rotateOnWorldAxis(X, dy * speed)
	}

	const stopInertia = () => {
		cancelAnimationFrame(inertia)
		inertia = 0
	}

	canvas.addEventListener("pointerdown", (e) => {
		if (e.button !== 0 || !getObject() || e.target.closest?.(EDITABLE)) return
		stopInertia()
		press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp }
		rotating = false
		velocity = { x: 0, y: 0 }
	})

	canvas.addEventListener("pointermove", (e) => {
		if (!press || e.pointerId !== press.id) return
		const dx = e.clientX - press.x
		const dy = e.clientY - press.y
		if (!rotating) {
			if (Math.hypot(dx, dy) < THRESHOLD) return
			rotating = true
			try {
				canvas.setPointerCapture(e.pointerId)
			} catch {}
			canvas.style.cursor = "grabbing"
			onStart?.()
		}
		const dt = Math.max(1, e.timeStamp - press.t)
		velocity = { x: dx / dt, y: dy / dt }
		turn(dx, dy)
		getSelection()?.removeAllRanges()
		press = { id: press.id, x: e.clientX, y: e.clientY, t: e.timeStamp }
	})

	const release = (e) => {
		if (!press || e.pointerId !== press.id) return
		const wasRotating = rotating
		const idle = e.timeStamp - press.t
		press = null
		rotating = false
		canvas.style.cursor = "grab"
		if (!wasRotating) return
		suppressClick = true
		setTimeout(() => {
			suppressClick = false
		}, 0)
		if (idle > 80) return
		let last = performance.now()
		const step = (now) => {
			const dt = now - last
			last = now
			const decay = Math.exp((-FRICTION * dt) / 1000)
			velocity = { x: velocity.x * decay, y: velocity.y * decay }
			turn(velocity.x * dt, velocity.y * dt)
			inertia = Math.hypot(velocity.x, velocity.y) > 0.005 ? requestAnimationFrame(step) : 0
		}
		inertia = requestAnimationFrame(step)
	}
	canvas.addEventListener("pointerup", release)
	canvas.addEventListener("pointercancel", release)

	canvas.addEventListener(
		"click",
		(e) => {
			if (!suppressClick) return
			e.stopPropagation()
			e.preventDefault()
			suppressClick = false
		},
		{ capture: true }
	)
}
