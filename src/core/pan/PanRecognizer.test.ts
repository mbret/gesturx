import { NEVER, Subject } from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createContainer,
	eventsFor,
	type Point,
	sendPointer,
	waitFor,
} from "../testing";
import { PanRecognizer } from "./PanRecognizer";

describe("PanRecognizer", () => {
	let container = createContainer();

	beforeEach(() => {
		container = createContainer();
	});

	/**
	 * One finger pressed on the first point, moved through the others, and
	 * released on the last. A pan starts in a later task, so the steps wait.
	 */
	const drag = async (points: Point[], id = 1) => {
		const [start = { x: 0, y: 0 }, ...moves] = points;

		sendPointer(container, "pointerdown", start, id);

		for (const point of moves) {
			await waitFor(5);
			sendPointer(container, "pointermove", point, id);
		}

		await waitFor(5);
		sendPointer(container, "pointerup", moves[moves.length - 1] ?? start, id);
	};

	const along = (...xs: number[]) => xs.map((x) => ({ x, y: 0 }));

	it("recognizes a drag as a panStart, panMoves and a panEnd", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, () =>
			drag(along(0, 50, 100)),
		);

		expect(events.map(({ type }) => type)).toEqual([
			"panStart",
			"panMove",
			"panEnd",
		]);
	});

	it("measures the deltas from where the pan started", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, () =>
			drag([
				{ x: 0, y: 0 },
				{ x: 30, y: 20 },
				{ x: 50, y: 60 },
			]),
		);

		expect(events).toMatchObject([
			{ type: "panStart", center: { x: 30, y: 20 }, deltaX: 0, deltaY: 0 },
			{ type: "panMove", center: { x: 50, y: 60 }, deltaX: 20, deltaY: 40 },
			{ type: "panEnd", deltaX: 20, deltaY: 40 },
		]);
	});

	it("does not start before moving 15px", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, () =>
			drag(along(0, 10, 14)),
		);

		expect(events).toEqual([]);
	});

	it("starts after moving posThreshold", async () => {
		const recognizer = new PanRecognizer({
			container,
			options: { posThreshold: 5 },
		});

		const events = await eventsFor(recognizer.events$, () => drag(along(0, 5)));

		expect(events.map(({ type }) => type)).toEqual(["panStart", "panEnd"]);
	});

	it("follows the center of the fingers without jumping when one is added", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, async () => {
			sendPointer(container, "pointerdown", { x: 0, y: 0 }, 1);
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 50, y: 0 }, 1);
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 60, y: 0 }, 1);
			await waitFor(5);
			sendPointer(container, "pointerdown", { x: 200, y: 0 }, 2);
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 210, y: 0 }, 2);
			await waitFor(5);
			sendPointer(container, "pointerup", { x: 60, y: 0 }, 1);
			await waitFor(5);
			sendPointer(container, "pointerup", { x: 210, y: 0 }, 2);
		});

		expect(events).toMatchObject([
			{ type: "panStart", center: { x: 50 }, deltaX: 0 },
			{ type: "panMove", center: { x: 60 }, deltaX: 10 },
			// the center jumps to (60 + 200) / 2, the delta does not
			{ type: "panMove", center: { x: 130 }, deltaX: 10 },
			// then follows it: (60 + 210) / 2 is 5px further
			{ type: "panMove", center: { x: 135 }, deltaX: 15 },
			// lifting a finger does not jump either
			{ type: "panMove", center: { x: 210 }, deltaX: 15 },
			{ type: "panEnd", deltaX: 15 },
		]);
	});

	describe("with numInputs", () => {
		const twoFingerDrag = async () => {
			sendPointer(container, "pointerdown", { x: 0, y: 0 }, 1);
			sendPointer(container, "pointerdown", { x: 100, y: 0 }, 2);
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 50, y: 0 }, 1);
			await waitFor(5);
			sendPointer(container, "pointerup", { x: 50, y: 0 }, 1);
			sendPointer(container, "pointerup", { x: 100, y: 0 }, 2);
		};

		it("does not start with fewer fingers", async () => {
			const recognizer = new PanRecognizer({
				container,
				options: { numInputs: 2 },
			});

			const events = await eventsFor(recognizer.events$, () =>
				drag(along(0, 50, 100)),
			);

			expect(events).toEqual([]);
		});

		it("starts with that many fingers", async () => {
			const recognizer = new PanRecognizer({
				container,
				options: { numInputs: 2 },
			});

			const events = await eventsFor(recognizer.events$, twoFingerDrag);

			expect(events).toMatchObject([
				{ type: "panStart", pointers: [{}, {}] },
				{ type: "panEnd" },
			]);
		});

		it("can be set with update()", async () => {
			const recognizer = new PanRecognizer({ container });

			recognizer.update({ options: { numInputs: 2 } });

			const events = await eventsFor(recognizer.events$, () =>
				drag(along(0, 50, 100)),
			);

			expect(events).toEqual([]);
		});
	});

	describe("with a delay", () => {
		it("does not start if released before it", async () => {
			const recognizer = new PanRecognizer({
				container,
				options: { delay: 200 },
			});

			const events = await eventsFor(recognizer.events$, async () => {
				sendPointer(container, "pointerdown", { x: 0, y: 0 });
				await waitFor(5);
				sendPointer(container, "pointermove", { x: 50, y: 0 });
				await waitFor(20);
				sendPointer(container, "pointerup", { x: 50, y: 0 });
			});

			expect(events).toEqual([]);
		});

		it("starts once it elapsed", async () => {
			const recognizer = new PanRecognizer({
				container,
				options: { delay: 50 },
			});

			const events = await eventsFor(recognizer.events$, async () => {
				sendPointer(container, "pointerdown", { x: 0, y: 0 });
				await waitFor(5);
				sendPointer(container, "pointermove", { x: 50, y: 0 });
				await waitFor(150);
				sendPointer(container, "pointerup", { x: 50, y: 0 });
			});

			expect(events.map(({ type }) => type)).toEqual(["panStart", "panEnd"]);
		});
	});

	describe("with failWith", () => {
		it("does not start while it is active", async () => {
			const start$ = new Subject<void>();
			const end$ = new Subject<void>();
			const recognizer = new PanRecognizer({
				container,
				failWith: [{ start$, end$ }],
			});

			const events = await eventsFor(recognizer.events$, async () => {
				start$.next();
				await drag(along(0, 50));
				end$.next();
				await drag(along(0, 50));
			});

			// only the drag after it ended
			expect(events.map(({ type }) => type)).toEqual(["panStart", "panEnd"]);
		});

		it("ends an ongoing pan once it becomes active", async () => {
			const start$ = new Subject<void>();
			const recognizer = new PanRecognizer({
				container,
				failWith: [{ start$, end$: NEVER }],
			});

			const events = await eventsFor(recognizer.events$, async () => {
				sendPointer(container, "pointerdown", { x: 0, y: 0 });
				await waitFor(5);
				sendPointer(container, "pointermove", { x: 50, y: 0 });
				await waitFor(5);
				sendPointer(container, "pointermove", { x: 60, y: 0 });
				await waitFor(5);
				start$.next();
				sendPointer(container, "pointermove", { x: 80, y: 0 });
				await waitFor(5);
				sendPointer(container, "pointerup", { x: 80, y: 0 });
			});

			expect(events).toMatchObject([
				{ type: "panStart" },
				{ type: "panMove", deltaX: 10 },
				// repeats the latest event, then nothing more
				{ type: "panEnd", deltaX: 10 },
			]);
		});
	});
});
