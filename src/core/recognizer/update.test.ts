import type { Observable } from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createContainer,
	eventsFor,
	sendPointer,
	waitFor,
} from "../../tests/utils";
import { HoldRecognizer } from "../hold/HoldRecognizer";
import { PanRecognizer } from "../pan/PanRecognizer";
import { PinchRecognizer } from "../pinch/PinchRecognizer";
import { RotateRecognizer } from "../rotate/RotateRecognizer";
import { SwipeRecognizer } from "../swipe/SwipeRecognizer";
import { TapRecognizer } from "../tap/TapRecognizer";

let container = createContainer();
let other = createContainer();

beforeEach(() => {
	container = createContainer();
	other = createContainer();
});

/** A gesture on `on`, which calls `during` halfway through. */
type Gesture = (on: HTMLElement, during?: () => void) => Promise<void>;

/** A finger pressing at (0, 0), moving 80px right, then lifting. */
const drag: Gesture = async (on, during) => {
	sendPointer(on, "pointerdown", { x: 0, y: 0 });

	for (const x of [20, 40, 60, 80]) {
		await waitFor(5);

		if (x === 60) during?.();

		sendPointer(on, "pointermove", { x, y: 0 });
	}

	await waitFor(5);
	sendPointer(on, "pointerup", { x: 80, y: 0 });
	await waitFor(20);
};

/** Two fingers 100px apart spreading to 300px. */
const spread: Gesture = async (on, during) => {
	sendPointer(on, "pointerdown", { x: 100, y: 0 }, 1);
	await waitFor(5);
	sendPointer(on, "pointerdown", { x: 200, y: 0 }, 2);

	for (const x of [250, 300, 350, 400]) {
		await waitFor(5);

		if (x === 350) during?.();

		sendPointer(on, "pointermove", { x, y: 0 }, 2);
	}

	await waitFor(5);
	sendPointer(on, "pointerup", { x: 400, y: 0 }, 2);
	sendPointer(on, "pointerup", { x: 100, y: 0 }, 1);
	await waitFor(20);
};

/** A point at `degrees` on a circle of radius 100 around (200, 200). */
const onCircle = (degrees: number) => ({
	x: 200 + 100 * Math.cos((degrees * Math.PI) / 180),
	y: 200 + 100 * Math.sin((degrees * Math.PI) / 180),
});

/** Two fingers facing each other on a circle, turning 90 degrees. */
const turn: Gesture = async (on, during) => {
	sendPointer(on, "pointerdown", onCircle(0), 1);
	await waitFor(5);
	sendPointer(on, "pointerdown", onCircle(180), 2);

	for (const angle of [5, 30, 60, 90]) {
		await waitFor(5);

		if (angle === 60) during?.();

		sendPointer(on, "pointermove", onCircle(angle), 1);
		await waitFor(5);
		sendPointer(on, "pointermove", onCircle(angle + 180), 2);
	}

	await waitFor(5);
	sendPointer(on, "pointerup", onCircle(90), 1);
	sendPointer(on, "pointerup", onCircle(270), 2);
	await waitFor(20);
};

/** A finger pressing without moving for 20ms. */
const press: Gesture = async (on, during) => {
	sendPointer(on, "pointerdown", { x: 0, y: 0 });
	await waitFor(10);
	during?.();
	await waitFor(10);
	sendPointer(on, "pointerup", { x: 0, y: 0 });
	await waitFor(20);
};

/** A finger moving 200px in about 10ms. */
const swipe: Gesture = async (on, during) => {
	sendPointer(on, "pointerdown", { x: 0, y: 0 });
	await waitFor(5);
	sendPointer(on, "pointermove", { x: 100, y: 0 });
	during?.();
	await waitFor(5);
	sendPointer(on, "pointerup", { x: 200, y: 0 });
	await waitFor(20);
};

/** A finger pressing for 5ms without moving. */
const tap: Gesture = async (on, during) => {
	sendPointer(on, "pointerdown", { x: 0, y: 0 });
	await waitFor(2);
	during?.();
	await waitFor(3);
	sendPointer(on, "pointerup", { x: 0, y: 0 });
	await waitFor(20);
};

type AnyRecognizer = new (config: {
	container?: HTMLElement;
	options?: object;
}) => {
	events$: Observable<{ type: string }>;
	state$: Observable<{ fingers: number }>;
	update(config: { container?: HTMLElement; options?: object }): void;
};

/** The type of each event of `recognizer` while `gesture` runs. */
const typesFor = async (
	recognizer: InstanceType<AnyRecognizer>,
	gesture: () => Promise<void>,
) => (await eventsFor(recognizer.events$, gesture)).map(({ type }) => type);

/**
 * Each recognizer with a gesture, options that would stop that gesture if
 * it used them, and its end event.
 */
const gestures: [string, AnyRecognizer, Gesture, object, string][] = [
	["PanRecognizer", PanRecognizer, drag, { numInputs: 2 }, "panEnd"],
	[
		"PinchRecognizer",
		PinchRecognizer,
		spread,
		{ posThreshold: 1000 },
		"pinchEnd",
	],
	["RotateRecognizer", RotateRecognizer, turn, { numInputs: 3 }, "rotateEnd"],
	["HoldRecognizer", HoldRecognizer, press, { delay: 1000 }, "holdEnd"],
];

describe.each(gestures)("%s", (_, Recognizer, gesture, options, end) => {
	it("keeps a running gesture when its options are updated", async () => {
		const expected = await typesFor(new Recognizer({ container }), () =>
			gesture(container),
		);

		expect(expected).toContain(end);

		const recognizer = new Recognizer({ container });

		expect(
			await typesFor(recognizer, () =>
				gesture(container, () => recognizer.update({ options })),
			),
		).toEqual(expected);
	});

	it("applies the updated options from the next gesture", async () => {
		const expected = await typesFor(new Recognizer({ container }), () =>
			gesture(container),
		);
		const recognizer = new Recognizer({ container });

		expect(
			await typesFor(recognizer, async () => {
				await gesture(container, () => recognizer.update({ options }));
				await gesture(container);
			}),
		).toEqual(expected);
	});

	it("ends a running gesture when its container is updated", async () => {
		const recognizer = new Recognizer({ container });
		const fingers: number[] = [];
		const state = recognizer.state$.subscribe((state) =>
			fingers.push(state.fingers),
		);

		const types = await typesFor(recognizer, () =>
			gesture(container, () => recognizer.update({ container: other })),
		);

		state.unsubscribe();

		expect(types.filter((type) => type === end)).toEqual([end]);
		expect(types[types.length - 1]).toBe(end);
		expect(fingers[fingers.length - 1]).toBe(0);
	});

	it("follows the gestures on the updated container", async () => {
		const expected = await typesFor(new Recognizer({ container }), () =>
			gesture(container),
		);
		const recognizer = new Recognizer({ container });

		const types = await typesFor(recognizer, async () => {
			await gesture(container, () => recognizer.update({ container: other }));
			await gesture(container);
			await gesture(other);
		});

		// the first gesture ends with the update, the second one isn't followed
		expect(types.slice(types.indexOf(end) + 1)).toEqual(expected);
	});
});

describe("PanRecognizer", () => {
	it("ends at the latest position when its container is updated", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, () =>
			drag(container, () => recognizer.update({ container: other })),
		);
		const [last, beforeLast] = [...events].reverse();

		expect(last?.type).toBe("panEnd");
		expect(last?.deltaX).toBe(beforeLast?.deltaX);
	});
});

describe("SwipeRecognizer", () => {
	it("recognizes a running swipe with the options it started with", async () => {
		const recognizer = new SwipeRecognizer({ container });

		expect(
			await typesFor(recognizer, async () => {
				await swipe(container, () =>
					recognizer.update({ options: { escapeVelocity: 1000 } }),
				);
				await swipe(container);
			}),
		).toEqual(["swipe"]);
	});

	it("drops a running swipe when its container is updated", async () => {
		const recognizer = new SwipeRecognizer({ container });

		expect(
			await typesFor(recognizer, async () => {
				await swipe(container, () => recognizer.update({ container: other }));
				await swipe(other);
			}),
		).toEqual(["swipe"]);
	});
});

describe("TapRecognizer", () => {
	it("recognizes a running tap with the options it started with", async () => {
		const recognizer = new TapRecognizer({ container });

		expect(
			await typesFor(recognizer, async () => {
				await tap(container, () =>
					recognizer.update({ options: { maximumPressTime: 1 } }),
				);
				await tap(container);
			}),
		).toEqual(["tap"]);
	});

	it("still taps after a pan in its failWith is updated during a drag", async () => {
		const pan = new PanRecognizer({ container });
		const recognizer = new TapRecognizer({ container, failWith: [pan] });
		const panning = pan.events$.subscribe();

		const types = await typesFor(recognizer, async () => {
			await drag(container, () =>
				pan.update({ options: { posThreshold: 20 } }),
			);
			await tap(container);
		});

		panning.unsubscribe();

		expect(types).toEqual(["tap"]);
	});
});
