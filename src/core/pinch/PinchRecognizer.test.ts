import { beforeEach, describe, expect, it } from "vitest";
import { createContainer, eventsFor, sendPointer, waitFor } from "../testing";
import { PinchRecognizer } from "./PinchRecognizer";

describe("PinchRecognizer", () => {
	let container = createContainer();

	beforeEach(() => {
		container = createContainer();
	});

	/**
	 * A finger pressed at x 100 and another at the first of `xs`, which then
	 * moves through the others. Both are released, the moving one first.
	 */
	const pinch = async (xs: number[]) => {
		const [start = 200, ...moves] = xs;

		sendPointer(container, "pointerdown", { x: 100, y: 0 }, 1);
		await waitFor(5);
		sendPointer(container, "pointerdown", { x: start, y: 0 }, 2);

		for (const x of moves) {
			await waitFor(5);
			sendPointer(container, "pointermove", { x, y: 0 }, 2);
		}

		await waitFor(5);
		const end = moves[moves.length - 1] ?? start;

		sendPointer(container, "pointerup", { x: end, y: 0 }, 2);
		await waitFor(5);
		sendPointer(container, "pointerup", { x: 100, y: 0 }, 1);
	};

	it("needs two fingers", async () => {
		const recognizer = new PinchRecognizer({ container });

		const events = await eventsFor(recognizer.events$, async () => {
			sendPointer(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 100, y: 0 });
			await waitFor(5);
			sendPointer(container, "pointerup", { x: 100, y: 0 });
		});

		expect(events).toEqual([]);
	});

	it("recognizes two fingers moving as a pinchStart, pinchMoves and a pinchEnd", async () => {
		const recognizer = new PinchRecognizer({ container });

		const events = await eventsFor(recognizer.events$, () =>
			pinch([200, 250, 300]),
		);

		expect(events.map(({ type }) => type)).toEqual([
			"pinchStart",
			"pinchMove",
			"pinchMove",
			"pinchEnd",
		]);
	});

	it("scales from the distance between the fingers when it started", async () => {
		const recognizer = new PinchRecognizer({ container });

		// the fingers go from 100 to 150 then 200px apart
		const events = await eventsFor(recognizer.events$, () =>
			pinch([200, 250, 300]),
		);

		expect(events).toMatchObject([
			{ type: "pinchStart", scale: 1, distance: 0 },
			{ type: "pinchMove", scale: 1.5, distance: 50 },
			{ type: "pinchMove", scale: 2, distance: 100 },
			{ type: "pinchEnd" },
		]);
	});

	it("reports the change since the previous event in the deltas", async () => {
		const recognizer = new PinchRecognizer({ container });

		const events = await eventsFor(recognizer.events$, () =>
			pinch([200, 250, 300]),
		);

		expect(events).toMatchObject([
			{ type: "pinchStart", deltaDistance: 0, deltaDistanceScale: 1 },
			{ type: "pinchMove", deltaDistance: 50, deltaDistanceScale: 1.5 },
			{ type: "pinchMove", deltaDistance: 50, deltaDistanceScale: 200 / 150 },
			// lifting a finger changes nothing
			{ type: "pinchEnd", deltaDistance: 0, deltaDistanceScale: 1 },
		]);
	});

	it.each([
		["spreading", [200, 250, 300], 2],
		["closing", [200, 175, 150], 0.5],
	])(
		"compounds deltaDistanceScale into the scale when %s",
		async (_, xs, scale) => {
			const recognizer = new PinchRecognizer({ container });

			const events = await eventsFor(recognizer.events$, () => pinch(xs));

			const compounded = events.reduce(
				(value, { deltaDistanceScale }) => value * deltaDistanceScale,
				1,
			);

			expect(compounded).toBeCloseTo(scale);
		},
	);

	it("starts after moving posThreshold", async () => {
		const recognizer = new PinchRecognizer({
			container,
			options: { posThreshold: 20 },
		});

		const events = await eventsFor(recognizer.events$, async () => {
			await pinch([200, 210]);
			await pinch([200, 220]);
		});

		// only the second pinch moved far enough
		expect(events.map(({ type }) => type)).toEqual(["pinchStart", "pinchEnd"]);
	});
});
