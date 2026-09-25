import { NEVER, Subject } from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import { createContainer, eventsFor, sendPointer, waitFor } from "../testing";
import { PinchRecognizer } from "./PinchRecognizer";

describe("PinchRecognizer with failWith", () => {
	let container = createContainer();

	beforeEach(() => {
		container = createContainer();
	});

	/** Two fingers 100px apart, the second moving 50px further, then released. */
	const pinch = async () => {
		sendPointer(container, "pointerdown", { x: 100, y: 0 }, 1);
		await waitFor(5);
		sendPointer(container, "pointerdown", { x: 200, y: 0 }, 2);
		await waitFor(5);
		sendPointer(container, "pointermove", { x: 250, y: 0 }, 2);
		await waitFor(5);
		sendPointer(container, "pointerup", { x: 250, y: 0 }, 2);
		await waitFor(5);
		sendPointer(container, "pointerup", { x: 100, y: 0 }, 1);
	};

	it("does not start while it is active", async () => {
		const start$ = new Subject<void>();
		const recognizer = new PinchRecognizer({
			container,
			failWith: [{ start$, end$: NEVER }],
		});

		const events = await eventsFor(recognizer.events$, async () => {
			start$.next();
			await pinch();
		});

		expect(events).toEqual([]);
	});

	it("pinches again once it ended", async () => {
		const start$ = new Subject<void>();
		const end$ = new Subject<void>();
		const recognizer = new PinchRecognizer({
			container,
			failWith: [{ start$, end$ }],
		});

		const events = await eventsFor(recognizer.events$, async () => {
			start$.next();
			end$.next();
			await pinch();
		});

		expect(events.map(({ type }) => type)).toEqual([
			"pinchStart",
			"pinchMove",
			"pinchEnd",
		]);
	});

	it("ends an ongoing pinch once it becomes active", async () => {
		const start$ = new Subject<void>();
		const recognizer = new PinchRecognizer({
			container,
			failWith: [{ start$, end$: NEVER }],
		});

		const events = await eventsFor(recognizer.events$, async () => {
			sendPointer(container, "pointerdown", { x: 100, y: 0 }, 1);
			await waitFor(5);
			sendPointer(container, "pointerdown", { x: 200, y: 0 }, 2);
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 250, y: 0 }, 2);
			await waitFor(5);
			start$.next();
			sendPointer(container, "pointermove", { x: 300, y: 0 }, 2);
			await waitFor(5);
			sendPointer(container, "pointerup", { x: 300, y: 0 }, 2);
			sendPointer(container, "pointerup", { x: 100, y: 0 }, 1);
		});

		expect(events.map(({ type }) => type)).toEqual([
			"pinchStart",
			"pinchMove",
			"pinchEnd",
		]);
	});
});
