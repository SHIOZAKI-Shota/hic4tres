import { describe, expect, it } from 'vitest'
import { Mesh, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Vector3 } from 'three'
import type { Camera, Object3D } from 'three'
import { elementToCanvasMatrix, projectPoint } from '../src/geometry'

const canvas = { width: 800, height: 600 }

function screenOf(local: Vector3, object: Object3D, camera: Camera) {
  const p = local.clone().applyMatrix4(object.matrixWorld).project(camera)
  return { x: (p.x + 1) / 2 * canvas.width, y: (1 - p.y) / 2 * canvas.height }
}

function check(object: Object3D, camera: Camera, plane: { width: number, height: number }, element: { width: number, height: number }) {
  object.updateMatrixWorld(true)
  camera.updateMatrixWorld(true)
  const m = elementToCanvasMatrix(object, camera, plane, element, canvas)
  const samples: [number, number][] = [[0, 0], [element.width, 0], [0, element.height], [element.width, element.height], [element.width / 2, element.height / 2], [element.width * 0.2, element.height * 0.7]]
  for (const [ex, ey] of samples) {
    const local = new Vector3((ex / element.width - 0.5) * plane.width, (0.5 - ey / element.height) * plane.height, 0)
    const expected = screenOf(local, object, camera)
    const got = projectPoint(m, ex, ey)
    expect(got.x).toBeCloseTo(expected.x, 3)
    expect(got.y).toBeCloseTo(expected.y, 3)
  }
}

describe('elementToCanvasMatrix', () => {
  it('matches a pixel-aligned orthographic camera with a rotated, scaled plane', () => {
    const camera = new OrthographicCamera(-400, 400, 300, -300, 0.1, 1000)
    camera.position.set(0, 0, 500)
    const mesh = new Mesh(new PlaneGeometry(1, 1))
    mesh.position.set(-120, 40, 0)
    mesh.rotation.z = 0.4
    mesh.scale.set(240, 160, 1)
    check(mesh, camera, { width: 1, height: 1 }, { width: 240, height: 160 })
  })

  it('reduces to translate · rotate · translate(-w/2, -h/2) for that 2D case', () => {
    const camera = new OrthographicCamera(-400, 400, 300, -300, 0.1, 1000)
    camera.position.set(0, 0, 500)
    const mesh = new Mesh(new PlaneGeometry(240, 160))
    const a = 0.3
    mesh.position.set(100, 100, 0)
    mesh.rotation.z = -a
    mesh.updateMatrixWorld(true)
    camera.updateMatrixWorld(true)
    const m = elementToCanvasMatrix(mesh, camera, { width: 240, height: 160 }, { width: 240, height: 160 }, canvas)
    const p = projectPoint(m, 30, 20)
    const lx = 30 - 120
    const ly = 20 - 80
    expect(p.x).toBeCloseTo(500 + lx * Math.cos(a) - ly * Math.sin(a), 3)
    expect(p.y).toBeCloseTo(200 + lx * Math.sin(a) + ly * Math.cos(a), 3)
  })

  it('handles a perspective camera looking at a tilted plane', () => {
    const camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 100)
    camera.position.set(1.5, 1, 4)
    camera.lookAt(0, 0, 0)
    const mesh = new Mesh(new PlaneGeometry(2, 1.25))
    mesh.rotation.set(-0.5, 0.7, 0.1)
    check(mesh, camera, { width: 2, height: 1.25 }, { width: 320, height: 200 })
  })
})

describe('elementToCanvasMatrix with a WebGPU projection', () => {
  it('maps x/y the same way when the camera uses WebGPU clip space (z in 0..1)', async () => {
    const { WebGPUCoordinateSystem } = await import('three')
    const camera = new PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100)
    camera.coordinateSystem = WebGPUCoordinateSystem
    camera.updateProjectionMatrix()
    camera.position.set(-1, 0.6, 3.5)
    camera.lookAt(0, 0, 0)
    const mesh = new Mesh(new PlaneGeometry(1.6, 1.6))
    mesh.rotation.set(0.3, -0.8, 0)
    check(mesh, camera, { width: 1.6, height: 1.6 }, { width: 300, height: 300 })
  })
})
