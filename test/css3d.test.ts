import { describe, expect, it } from 'vitest'
import { Mesh, PlaneGeometry, Vector3 } from 'three'
import { cssObjectMatrix } from '../src/css3d'

describe('cssObjectMatrix', () => {
  it('puts the corners of the element on the corners of the plane', () => {
    const plane = { width: 2.2, height: 1.6 }
    const element = { width: 340, height: 248 }
    const mesh = new Mesh(new PlaneGeometry(plane.width, plane.height))
    mesh.position.set(0.4, -0.3, 1.2)
    mesh.rotation.set(0.3, -0.7, 0.2)
    mesh.scale.set(1.5, 0.8, 1)
    mesh.updateMatrixWorld(true)

    const m = cssObjectMatrix(mesh.matrixWorld, plane, element)
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1], [0, 0], [0.3, -0.6]] as const) {
      const fromElement = new Vector3(sx * element.width / 2, sy * element.height / 2, 0).applyMatrix4(m)
      const onPlane = new Vector3(sx * plane.width / 2, sy * plane.height / 2, 0).applyMatrix4(mesh.matrixWorld)
      expect(fromElement.x).toBeCloseTo(onPlane.x, 6)
      expect(fromElement.y).toBeCloseTo(onPlane.y, 6)
      expect(fromElement.z).toBeCloseTo(onPlane.z, 6)
    }
  })
})
