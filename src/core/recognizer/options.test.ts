import { type Observable, Subject } from "rxjs";
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
import { Recognizable } from "../recognizable/Recognizable";
import { RotateRecognizer } from "../rotate/RotateRecognizer";
import { SwipeRecognizer } from "../swipe/SwipeRecognizer";
import { TapRecognizer } from "../tap/TapRecognizer";

let container = createContainer();

beforeEach(() => {
	container = createContainer();
});

/** A finger pressing at (0, 0), moving right through `xs`, then lifting. */
const drag = async (xs: number[]) => {
	sendPointer(container, "pointerdown", { x: 0, y: 0 });

	for (const x of xs) {
		await waitFor(5);
		sendPointer(container, "pointermove", { x, y: 0 });
	}

	await waitFor(5);
	sendPointer(container, "pointerup", { x: xs[xs.length - 1] ?? 0, y: 0 });
	await waitFor(20);
};

/** A point at `degrees` on a circle of radius 100 around (200, 200). */
const onCircle = (degrees: number) => ({
	x: 200 + 100 * Math.cos((degrees * Math.PI) / 180),
	y: 200 + 100 * Math.sin((degrees * Math.PI) / 180),
});

/** Two fingers facing each other on the circle, turned through `angles`. */
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
	sendPointer(container, "pointerup", onCircle(end + 180), 2);
	await waitFor(20);
};

/** Two fingers 100px apart spreading to 200px. */
const spread = async () => {
	sendPointer(container, "pointerdown", { x: 100, y: 0 }, 1);
	await waitFor(5);
	sendPointer(container, "pointerdown", { x: 200, y: 0 }, 2);

	for (const x of [250, 300]) {
		await waitFor(5);
		sendPointer(container, "pointermove", { x, y: 0 }, 2);
	}

	await waitFor(5);
	sendPointer(container, "pointerup", { x: 300, y: 0 }, 2);
	sendPointer(container, "pointerup", { x: 100, y: 0 }, 1);
	await waitFor(20);
};

/** A finger pressing without moving for 20ms. */
const press = async () => {
	sendPointer(container, "pointerdown", { x: 0, y: 0 });
	await waitFor(20);
	sendPointer(container, "pointerup", { x: 0, y: 0 });
	await waitFor(20);
};

/** A finger pressing at (x, 0), sliding `slide` px right, then lifting. */
const tap = async ({ x = 0, slide = 0 } = {}) => {
	sendPointer(container, "pointerdown", { x, y: 0 });
	await waitFor(5);

	if (slide) {
		sendPointer(container, "pointermove", { x: x + slide, y: 0 });
		await waitFor(5);
	}

	sendPointer(container, "pointerup", { x: x + slide, y: 0 });
};

/** A tap, then a press sliding 100px, farther than a tap allows. */
const tapThenSlide = async () => {
	await tap();
	await waitFor(50);
	await tap({ x: 300, slide: 100 });
	await waitFor(50);
};

/** Two taps 10ms apart. */
const doubleTap = async () => {
	await tap();
	await waitFor(10);
	await tap();
	await waitFor(150);
};

/** A finger moving 200px in about 10ms. */
const swipe = async () => {
	sendPointer(container, "pointerdown", { x: 0, y: 0 });
	await waitFor(5);
	sendPointer(container, "pointermove", { x: 100, y: 0 });
	await waitFor(5);
	sendPointer(container, "pointerup", { x: 200, y: 0 });
	await waitFor(20);
};

type AnyRecognizer = new (config: {
	container?: HTMLElement;
	options?: object;
}) => {
	events$: Observable<unknown>;
	update(config: { options?: object }): void;
};

/**
 * Each recognizer, the options it's created with, the options to leave
 * unset, and a gesture their defaults recognize but other values don't.
 */
const recognizers: [string, AnyRecognizer, object, string[], () => unknown][] =
	[
		[
			"PanRecognizer",
			PanRecognizer,
			{},
			["posThreshold", "numInputs", "delay"],
			() => drag([10, 40]),
		],
		[
			"RotateRecognizer",
			RotateRecognizer,
			{},
			["posThreshold", "numInputs"],
			async () => {
				await drag([10, 40]);
				await turn([0, 5, 30, 60]);
			},
		],
		["PinchRecognizer", PinchRecognizer, {}, ["posThreshold"], spread],
		[
			"HoldRecognizer",
			HoldRecognizer,
			{},
			["numInputs", "delay", "posThreshold"],
			press,
		],
		[
			"TapRecognizer",
			TapRecognizer,
			{},
			["maxTaps", "maximumPressTime", "tolerance"],
			tapThenSlide,
		],
		[
			"TapRecognizer with maxTaps 2",
			TapRecognizer,
			{ maxTaps: 2 },
			["multiTapThreshold"],
			doubleTap,
		],
		["SwipeRecognizer", SwipeRecognizer, {}, ["escapeVelocity"], swipe],
	];

describe.each(recognizers)("%s", (_, Recognizer, options, unset, gesture) => {
	const recognize = async (recognizer: InstanceType<AnyRecognizer>) => {
		const events = await eventsFor(recognizer.events$, async () => {
			await gesture();
		});

		return events.map((event) => {
			const { type, taps } = event as { type: string; taps?: number };

			return { type, taps };
		});
	};

	it.each(unset)(
		"treats %s set to undefined or NaN as unset",
		async (option) => {
			const expected = await recognize(new Recognizer({ container, options }));

			// the gesture is recognized, so that turning it off shows
			expect(expected).not.toEqual([]);

			for (const value of [undefined, Number.NaN]) {
				const created = new Recognizer({
					container,
					options: { ...options, [option]: value },
				});

				expect(await recognize(created), `created with ${value}`).toEqual(
					expected,
				);

				const updated = new Recognizer({ container, options });

				updated.update({ options: { [option]: value } });

				expect(await recognize(updated), `updated with ${value}`).toEqual(
					expected,
				);
			}
		},
	);
});

describe("update()", () => {
	it("keeps the options it doesn't mention", async () => {
		const recognizer = new PanRecognizer({
			container,
			options: { numInputs: 2 },
		});

		recognizer.update({ options: { delay: 0 } });

		const events = await eventsFor(recognizer.events$, () => drag([20, 40]));

		// it still needs two fingers
		expect(events).toEqual([]);
	});

	describe("with failWith", () => {
		/** A recognizer to fail with, running. */
		const running = () => {
			const other = { start$: new Subject<void>(), end$: new Subject<void>() };

			return { other, start: () => other.start$.next() };
		};

		it("keeps it when passed undefined", async () => {
			const { other, start } = running();
			const recognizer = new PanRecognizer({ container, failWith: [other] });

			const events = await eventsFor(recognizer.events$, async () => {
				start();
				recognizer.update({ failWith: undefined });
				await drag([20, 40]);
			});

			expect(events).toEqual([]);
		});

		it("keeps each recognizer's when a Recognizable passes undefined", async () => {
			const { other, start } = running();
			const pan = new PanRecognizer({ failWith: [other] });
			const recognizable = new Recognizable({ recognizers: [pan], container });

			const events = await eventsFor(recognizable.events$, async () => {
				start();
				recognizable.update({ container, failWith: undefined });
				await drag([20, 40]);
			});

			expect(events).toEqual([]);
		});

		it("replaces it with a new one", async () => {
			const { other, start } = running();
			const recognizer = new PanRecognizer({ container, failWith: [other] });

			const events = await eventsFor(recognizer.events$, async () => {
				start();
				recognizer.update({ failWith: [] });
				await drag([20, 40]);
			});

			expect(events).not.toEqual([]);
		});
	});

	it("keeps afterEventReceived when passed undefined", async () => {
		const received: string[] = [];
		const recognizer = new PanRecognizer({
			container,
			afterEventReceived: (event) => {
				received.push(event.type);

				return event;
			},
		});

		await eventsFor(recognizer.events$, async () => {
			recognizer.update({ afterEventReceived: undefined });
			await drag([20, 40]);
		});

		expect(received).toContain("pointerdown");
	});
});
