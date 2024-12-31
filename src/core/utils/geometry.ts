export type Point = { x: number; y: number };

export function calculateDistance(pointA: Point, pointB: Point): number {
	return Math.sqrt((pointB.x - pointA.x) ** 2 + (pointB.y - pointA.y) ** 2);
}

export function calculateAverageDistance(pointerEvents: Point[]): number {
	const n = pointerEvents.length;
	if (n < 2) return 0; // No distance if fewer than 2 pointers

	const totalDistance = pointerEvents.reduce((sum, event1, i) => {
		return (
			sum +
			pointerEvents.slice(i + 1).reduce((innerSum, event2) => {
				return innerSum + calculateDistance(event1, event2);
			}, 0)
		);
	}, 0);

	// Number of pairs is n choose 2: n * (n - 1) / 2
	const numberOfPairs = (n * (n - 1)) / 2;
	return totalDistance / numberOfPairs;
}

export function calculateRadianAngleBetweenPoints(
	pointerA: Point,
	pointerB: Point,
): number {
	// Calculate the differences in coordinates
	const deltaX = pointerB.x - pointerA.x;
	const deltaY = pointerB.y - pointerA.y;

	// Calculate the angle in radians
	const angleInRadians = Math.atan2(deltaY, deltaX);

	// Return the angle in degrees
	return angleInRadians;
}

export function calculateDegreeAngleBetweenPoints(
	pointerA: Point,
	pointerB: Point,
): number {
	// Calculate the angle in radians
	const angleInRadians = calculateRadianAngleBetweenPoints(pointerA, pointerB);

	// Convert the angle to degrees (optional)
	const angleInDegrees = angleInRadians * (180 / Math.PI);

	// Return the angle in degrees
	return angleInDegrees;
}

export function calculateCentroid(points: Point[]) {
	const sum = points.reduce(
		(acc, point) => {
			acc.x += point.x;
			acc.y += point.y;

			return acc;
		},
		{ x: 0, y: 0 },
	);

	const numPoints = points.length || 1;

	return {
		x: sum.x / numPoints,
		y: sum.y / numPoints,
	};
}

export function calculateAngleDelta(
	initialPoints: Point[],
	newPoints: Point[],
) {
	if (initialPoints.length !== newPoints.length) {
		throw new Error("Initial and new points arrays must have the same length.");
	}

	const initialCentroid = calculateCentroid(initialPoints);
	const newCentroid = calculateCentroid(newPoints);

	let totalAngleDelta = 0;

	initialPoints.forEach((initialPoint, index) => {
		const initialAngle = calculateRadianAngleBetweenPoints(
			initialCentroid,
			initialPoint,
		);
		const newAngle = calculateRadianAngleBetweenPoints(
			newCentroid,
			newPoints[index] ?? initialPoint,
		);

		let angleDelta = newAngle - initialAngle;

		// Normalize the angle delta to be within [-PI, PI]
		if (angleDelta > Math.PI) {
			angleDelta -= 2 * Math.PI;
		} else if (angleDelta < -Math.PI) {
			angleDelta += 2 * Math.PI;
		}

		totalAngleDelta += angleDelta;
	});

	// Return the average angle delta
	const radianDelta = totalAngleDelta / initialPoints.length;
	const degreesDelta = radianDelta * (180 / Math.PI);

	return { radianDelta, degreesDelta };
}
