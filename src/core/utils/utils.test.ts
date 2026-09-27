import { describe, expect, it } from "vitest";
import { calculateCentroid, type Point } from "./geometry";
import { omitUnset } from "./utils";

describe("calculateCentroid", () => {
	it("calculates the correct center for a list of pointer events", () => {
		const events = [
			{ x: 0, y: 0 },
			{ x: 2, y: 2 },
			{ x: 4, y: 6 },
		];
		const center = calculateCentroid(events);
		expect(center).toEqual({ x: 2, y: 2.6666666666666665 });
	});

	it("returns origin when no events are present", () => {
		const events: Point[] = [];
		const center = calculateCentroid(events);
		expect(center).toEqual({ x: 0, y: 0 });
	});

	it("handles single point correctly", () => {
		const events = [{ x: 5, y: 5 }];
		const center = calculateCentroid(events);
		expect(center).toEqual({ x: 5, y: 5 });
	});
});

describe("omitUnset", () => {
	it("leaves out undefined and NaN, and keeps the rest", () => {
		expect(
			omitUnset({ a: undefined, b: Number.NaN, c: 0, d: false, e: 15 }),
		).toEqual({ c: 0, d: false, e: 15 });
	});

	it("gives an empty object for undefined", () => {
		expect(omitUnset(undefined)).toEqual({});
	});
});
