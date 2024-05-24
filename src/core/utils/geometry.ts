export function calculateRadianAngleBetweenPoints(
  pointerA: { x: number; y: number },
  pointerB: { x: number; y: number },
): number {
  // Calculate the differences in coordinates
  const deltaX = pointerB.x - pointerA.x
  const deltaY = pointerB.y - pointerA.y

  // Calculate the angle in radians
  const angleInRadians = Math.atan2(deltaY, deltaX)

  // Return the angle in degrees
  return angleInRadians
}

export function calculateDegreeAngleBetweenPoints(
  pointerA: { x: number; y: number },
  pointerB: { x: number; y: number },
): number {
  // Calculate the angle in radians
  const angleInRadians = calculateRadianAngleBetweenPoints(pointerA, pointerB)

  // Convert the angle to degrees (optional)
  const angleInDegrees = angleInRadians * (180 / Math.PI)

  // Return the angle in degrees
  return angleInDegrees
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

export function calculateAngleDelta(
  initialPoints: PointerEvent[],
  newPoints: PointerEvent[],
) {
  if (initialPoints.length !== newPoints.length) {
    throw new Error("Initial and new points arrays must have the same length.")
  }

  const initialCentroid = calculateCentroid(initialPoints)
  const newCentroid = calculateCentroid(newPoints)

  let totalAngleDelta = 0

  for (let i = 0; i < initialPoints.length; i++) {
    const initialAngle = calculateRadianAngleBetweenPoints(
      initialCentroid,
      initialPoints[i]!,
    )
    const newAngle = calculateRadianAngleBetweenPoints(
      newCentroid,
      newPoints[i]!,
    )

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
