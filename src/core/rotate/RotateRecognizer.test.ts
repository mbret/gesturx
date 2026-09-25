import { beforeEach, describe, expect, it } from "vitest";
import {
	createContainer,
	eventsFor,
	sendPointer,
	waitFor,
} from "../../tests/utils";
import { RotateRecognizer } from "./RotateRecognizer";

/** A point at `degrees` on a circle of radius 100 around (200, 200). */
const onCircle = (degrees: number) => ({
	x: 200 + 100 * Math.cos((degrees * Math.PI) / 180),
	y: 200 + 100 * Math.sin((degrees * Math.PI) / 180),
});

describe("RotateRecognizer", () => {
	let container = createContainer();

	beforeEach(() => {
		container = createContainer();
	});

	/**
	 * Two fingers facing each other on the circle, turned through `angles`
	 * one finger after the other, then released.
	 */
	const turn = async (angles: number[]) => {
		const [start = 0, ...steps] = angles;
		const end = steps[steps.length - 1] ?? start;

		sendPointer(container, "pointerdown", onCircle(start), 1);
		await waitFor(5);
		sendPointer(container, "pointerdown", onCircle(start + 180), 2);

		for (const angle of steps) {
			await waitFor(5);
			sendPointer(container, "pointermove", onCircle(angle), 1);
			await waitFor(5);
			sendPointer(container, "pointermove", onCircle(angle + 180), 2);
		}

		await waitFor(5);
		sendPointer(container, "pointerup", onCircle(end), 1);
		await waitFor(5);
		sendPointer(container, "pointerup", onCircle(end + 180), 2);
	};

	it("needs two fingers", async () => {
		const recognizer = new RotateRecognizer({ container });

		const events = await eventsFor(recognizer.events$, async () => {
			sendPointer(container, "pointerdown", onCircle(0));

			for (const angle of [30, 60, 90]) {
				await waitFor(5);
				sendPointer(container, "pointermove", onCircle(angle));
			}

			await waitFor(5);
			sendPointer(container, "pointerup", onCircle(90));
		});

		expect(events).toEqual([]);
	});

	it("recognizes two fingers turning as a rotateStart, rotateMoves and a rotateEnd", async () => {
		const recognizer = new RotateRecognizer({ container });

		const events = await eventsFor(recognizer.events$, () =>
			turn([0, 30, 60, 90]),
		);

		const types = events.map(({ type }) => type);

		expect(types[0]).toBe("rotateStart");
		expect(types[types.length - 1]).toBe("rotateEnd");
		expect(types.slice(1, -1)).toContain("rotateMove");
		expect(types.slice(1, -1).every((type) => type === "rotateMove")).toBe(
			true,
		);
	});

	it.each([
		["clockwise", [0, 30, 60, 90], 90],
		["counterclockwise", [0, -30, -60], -60],
	])("accumulates the angle turned %s", async (_, angles, turned) => {
		// without a threshold, it starts before the fingers turn
		const recognizer = new RotateRecognizer({
			container,
			options: { posThreshold: 0 },
		});

		const events = await eventsFor(recognizer.events$, () => turn(angles));

		const start = events[0];
		const end = events[events.length - 1];
		const moves = events.filter(({ type }) => type === "rotateMove");

		expect(start).toMatchObject({ type: "rotateStart", angle: 0 });
		expect(end?.type).toBe("rotateEnd");
		expect(end?.angle).toBeCloseTo(turned);
		// the angle is the sum of the deltas
		expect(
			moves.reduce((angle, { deltaAngle }) => angle + deltaAngle, 0),
		).toBeCloseTo(turned);
	});

	it("does not start before a finger moves 15px", async () => {
		const recognizer = new RotateRecognizer({ container });

		// 4 degrees moves each finger by about 7px
		const events = await eventsFor(recognizer.events$, () => turn([0, 4, 8]));

		expect(events).toEqual([]);
	});

	it("can require more fingers with numInputs", async () => {
		const recognizer = new RotateRecognizer({
			container,
			options: { numInputs: 3 },
		});

		const events = await eventsFor(recognizer.events$, () =>
			turn([0, 30, 60, 90]),
		);

		expect(events).toEqual([]);
	});
});
