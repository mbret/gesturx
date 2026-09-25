import { describe, expect, it } from "vitest";
import {
	calculateAngleDelta,
	calculateAverageDistance,
	calculateCentroid,
	calculateDegreeAngleBetweenPoints,
	calculateDistance,
	calculateRadianAngleBetweenPoints,
} from "./geometry";

/** A point at `degrees` on a circle of `radius` around the origin. */
const onCircle = (degrees: number, radius = 10) => ({
	x: radius * Math.cos((degrees * Math.PI) / 180),
	y: radius * Math.sin((degrees * Math.PI) / 180),
});

describe("calculateDistance", () => {
	it("is the euclidean distance", () => {
		expect(calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
	});
});

describe("calculateAverageDistance", () => {
	it("is 0 for fewer than two points", () => {
		expect(calculateAverageDistance([])).toBe(0);
		expect(calculateAverageDistance([{ x: 5, y: 5 }])).toBe(0);
	});

	it("is the distance between two points", () => {
		expect(
			calculateAverageDistance([
				{ x: 0, y: 0 },
				{ x: 0, y: 10 },
			]),
		).toBe(10);
	});

	it("averages the distance of every pair", () => {
		// the pairs are 3, 4 and 5 apart
		expect(
			calculateAverageDistance([
				{ x: 0, y: 0 },
				{ x: 3, y: 0 },
				{ x: 0, y: 4 },
			]),
		).toBe(4);
	});
});

describe("calculateCentroid", () => {
	it("averages the points", () => {
		expect(
			calculateCentroid([
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 5, y: 15 },
			]),
		).toEqual({ x: 5, y: 5 });
	});

	it("is the origin without points", () => {
		expect(calculateCentroid([])).toEqual({ x: 0, y: 0 });
	});
});

describe("the angle between two points", () => {
	// y points down on screen, so a positive angle turns clockwise
	it.each([
		[{ x: 1, y: 0 }, 0],
		[{ x: 0, y: 1 }, 90],
		[{ x: -1, y: 0 }, 180],
		[{ x: 0, y: -1 }, -90],
	])("to %o is %i degrees", (point, degrees) => {
		const origin = { x: 0, y: 0 };

		expect(calculateDegreeAngleBetweenPoints(origin, point)).toBeCloseTo(
			degrees,
		);
		expect(calculateRadianAngleBetweenPoints(origin, point)).toBeCloseTo(
			(degrees * Math.PI) / 180,
		);
	});
});

describe("calculateAngleDelta", () => {
	it("is how far the points turned around their centroid", () => {
		const { degreesDelta, radianDelta } = calculateAngleDelta(
			[onCircle(180), onCircle(0)],
			[onCircle(270), onCircle(90)],
		);

		expect(degreesDelta).toBeCloseTo(90);
		expect(radianDelta).toBeCloseTo(Math.PI / 2);
	});

	it("is negative when turning counterclockwise", () => {
		const { degreesDelta } = calculateAngleDelta(
			[onCircle(0), onCircle(180)],
			[onCircle(-30), onCircle(150)],
		);

		expect(degreesDelta).toBeCloseTo(-30);
	});

	it("is 0 when the points only move together", () => {
		const { degreesDelta } = calculateAngleDelta(
			[
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			],
			[
				{ x: 50, y: 50 },
				{ x: 60, y: 50 },
			],
		);

		expect(degreesDelta).toBeCloseTo(0);
	});

	it("turns the short way across 180 degrees", () => {
		// 170° to 190° is 20°, not -340°
		const { degreesDelta } = calculateAngleDelta(
			[onCircle(170), onCircle(-10)],
			[onCircle(190), onCircle(10)],
		);

		expect(degreesDelta).toBeCloseTo(20);
	});

	it("needs as many points before and after", () => {
		expect(() =>
			calculateAngleDelta(
				[{ x: 0, y: 0 }],
				[
					{ x: 0, y: 0 },
					{ x: 1, y: 1 },
				],
			),
		).toThrow();
	});
});
