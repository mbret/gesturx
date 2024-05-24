export const calculateAngle = (deltaX: number, deltaY: number) => {
  const radians = Math.atan2(deltaY, deltaX)
  const angle = (radians * 180) / Math.PI

  return {
    angle,
  }
}

export function calculateAngleDelta(
  initialPoints: PointerEvent[],
  newPoints: PointerEvent[],
) {
  if (initialPoints.length !== newPoints.length) {
    throw new Error("Initial and new points arrays must have the same length.")
  }

  function calculateAngle(
    point: PointerEvent,
    centroid: { x: number; y: number },
  ) {
    return Math.atan2(point.y - centroid.y, point.x - centroid.x)
  }

  function calculateCentroid(points: PointerEvent[]) {
    let Cx = 0,
      Cy = 0
    points.forEach((point) => {
      Cx += point.x
      Cy += point.y
    })
    return { x: Cx / points.length, y: Cy / points.length }
  }

  const initialCentroid = calculateCentroid(initialPoints)
  const newCentroid = calculateCentroid(newPoints)

  let totalAngleDelta = 0

  for (let i = 0; i < initialPoints.length; i++) {
    const initialAngle = calculateAngle(initialPoints[i]!, initialCentroid)
    const newAngle = calculateAngle(newPoints[i]!, newCentroid)

    let angleDelta = newAngle - initialAngle

    // Normalize the angle delta to be within [-PI, PI]
    if (angleDelta > Math.PI) {
      angleDelta -= 2 * Math.PI
    } else if (angleDelta < -Math.PI) {
      angleDelta += 2 * Math.PI
    }

    totalAngleDelta += angleDelta
  }

  // Return the average angle delta
  const radianDelta = totalAngleDelta / initialPoints.length
  const degreesDelta = radianDelta * (180 / Math.PI)

  return { radianDelta, degreesDelta }
}
