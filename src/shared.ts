import { Vector3 } from 'three'
import type { Camera, Object3D, OrthographicCamera } from 'three'

const _position = new Vector3()
const _normal = new Vector3()
const _toCamera = new Vector3()

export function planeSize(object: Object3D | null | undefined) {
  const params = (object as { geometry?: { type?: string, parameters?: { width?: number, height?: number } } } | null | undefined)?.geometry
  if (params?.type === 'PlaneGeometry' && params.parameters) {
    return { width: params.parameters.width ?? 1, height: params.parameters.height ?? 1 }
  }
  return { width: 1, height: 1 }
}

export function facesAway(object: Object3D, camera: Camera) {
  _normal.set(0, 0, 1).transformDirection(object.matrixWorld)
  if ((camera as OrthographicCamera).isOrthographicCamera) {
    camera.getWorldDirection(_toCamera).negate()
  } else {
    _toCamera.setFromMatrixPosition(camera.matrixWorld).sub(_position.setFromMatrixPosition(object.matrixWorld))
  }
  return _normal.dot(_toCamera) <= 0
}
