import { Matrix4 } from "three"
import type { Camera, Object3D } from "three"

export interface Size {
	width: number
	height: number
}

const _element = new Matrix4()
const _viewport = new Matrix4()

export function elementToCanvasMatrix(
	object: Object3D,
	camera: Camera,
	plane: Size,
	element: Size,
	canvas: Size,
	target = new Matrix4()
): Matrix4 {
	const ew = Math.max(element.width, 1e-6)
	const eh = Math.max(element.height, 1e-6)

	_element.set(
		plane.width / ew,
		0,
		0,
		-plane.width / 2,
		0,
		-plane.height / eh,
		0,
		plane.height / 2,
		0,
		0,
		1,
		0,
		0,
		0,
		0,
		1
	)

	_viewport.set(
		canvas.width / 2,
		0,
		0,
		canvas.width / 2,
		0,
		-canvas.height / 2,
		0,
		canvas.height / 2,
		0,
		0,
		1,
		0,
		0,
		0,
		0,
		1
	)

	return target
		.copy(_viewport)
		.multiply(camera.projectionMatrix)
		.multiply(camera.matrixWorldInverse)
		.multiply(object.matrixWorld)
		.multiply(_element)
}

export function toDOMMatrix(m: Matrix4): DOMMatrix {
	return DOMMatrix.fromFloat64Array(Float64Array.from(m.elements))
}

export function projectPoint(m: Matrix4, x: number, y: number): { x: number; y: number } {
	const e = m.elements
	const w = e[3]! * x + e[7]! * y + e[15]!
	return {
		x: (e[0]! * x + e[4]! * y + e[12]!) / w,
		y: (e[1]! * x + e[5]! * y + e[13]!) / w,
	}
}
