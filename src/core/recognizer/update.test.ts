import { BehaviorSubject, merge, type Observable } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import {
	Recognizer,
	type RecognizerConfig,
	type RecognizerPanEvent,
} from "./Recognizer";

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
	update(config: { container?: HTMLElement | null; options?: object }): void;
};

/** Every count `state$` reports while it's subscribed. */
const fingersOf = (state$: Observable<{ fingers: number }>) => {
	const fingers: number[] = [];
	const subscription = state$.subscribe((state) => fingers.push(state.fingers));

	return { fingers, unsubscribe: () => subscription.unsubscribe() };
};

/** The type of each event of `recognizer` while `gesture` runs. */
const typesFor = async (
	recognizer: InstanceType<AnyRecognizer>,
	gesture: () => Promise<void>,
) => (await eventsFor(recognizer.events$, gesture)).map(({ type }) => type);

/**
 * Each recognizer with a gesture, options that would stop that gesture if
 * it used them, and its start, move and end events. A hold has no move.
 */
const gestures: [
	string,
	AnyRecognizer,
	Gesture,
	object,
	string,
	string | undefined,
	string,
][] = [
	[
		"PanRecognizer",
		PanRecognizer,
		drag,
		{ numInputs: 2 },
		"panStart",
		"panMove",
		"panEnd",
	],
	[
		"PinchRecognizer",
		PinchRecognizer,
		spread,
		{ posThreshold: 1000 },
		"pinchStart",
		"pinchMove",
		"pinchEnd",
	],
	[
		"RotateRecognizer",
		RotateRecognizer,
		turn,
		{ numInputs: 3 },
		"rotateStart",
		"rotateMove",
		"rotateEnd",
	],
	[
		"HoldRecognizer",
		HoldRecognizer,
		press,
		{ delay: 1000 },
		"holdStart",
		undefined,
		"holdEnd",
	],
];

describe.each(gestures)(
	"%s",
	(_, Recognizer, gesture, options, start, move, end) => {
		it("keeps a running gesture when its options are updated", async () => {
			const expected = await typesFor(new Recognizer({ container }), () =>
				gesture(container),
			);

			expect(expected).toContain(end);

			const recognizer = new Recognizer({ container });
			const state = fingersOf(recognizer.state$);
			let fingers: number | undefined;

			expect(
				await typesFor(recognizer, async () => {
					await gesture(container, () => recognizer.update({ options }));
					// before typesFor unsubscribes from events$, which sets them to 0
					fingers = state.fingers[state.fingers.length - 1];
				}),
			).toEqual(expected);

			state.unsubscribe();

			expect(fingers).toBe(0);
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
			const state = fingersOf(recognizer.state$);
			let fingers: number | undefined;

			const types = await typesFor(recognizer, async () => {
				await gesture(container, () => recognizer.update({ container: other }));
				// before typesFor unsubscribes from events$, which sets them to 0
				fingers = state.fingers[state.fingers.length - 1];
			});

			state.unsubscribe();

			expect(types.filter((type) => type === end)).toEqual([end]);
			expect(types[types.length - 1]).toBe(end);
			expect(fingers).toBe(0);
		});

		it("ends its gesture when a start handler sets a new container", async () => {
			const recognizer = new Recognizer({ container });
			const state = fingersOf(recognizer.state$);
			const started = recognizer.events$.subscribe(({ type }) => {
				if (type === start) recognizer.update({ container: other });
			});
			let fingers: number | undefined;

			const types = await typesFor(recognizer, async () => {
				await gesture(container);
				// before typesFor unsubscribes from events$, which sets them to 0
				fingers = state.fingers[state.fingers.length - 1];
			});

			started.unsubscribe();
			state.unsubscribe();

			expect(types).toEqual([start, end]);
			expect(fingers).toBe(0);
		});

		it("ends its gesture when a state$ handler sets a new container at its start", async () => {
			const recognizer = new Recognizer({ container });
			const started = recognizer.state$.subscribe(({ fingers }) => {
				if (fingers) recognizer.update({ container: other });
			});

			const types = await typesFor(recognizer, () => gesture(container));

			started.unsubscribe();

			expect(types).toEqual([start, end]);
		});

		it.skipIf(!move)(
			"ends its gesture after the move whose handler sets a new container",
			async () => {
				const recognizer = new Recognizer({ container });
				const moved = recognizer.events$.subscribe(({ type }) => {
					if (type === move) recognizer.update({ container: other });
				});

				const types = await typesFor(recognizer, () => gesture(container));

				moved.unsubscribe();

				expect(types).toEqual([start, move, end]);
			},
		);

		it("ends a running gesture when it's detached", async () => {
			const recognizer = new Recognizer({ container });
			const state = fingersOf(recognizer.state$);
			let fingers: number | undefined;

			const types = await typesFor(recognizer, async () => {
				await gesture(container, () => recognizer.update({ container: null }));
				// before typesFor unsubscribes from events$, which sets them to 0
				fingers = state.fingers[state.fingers.length - 1];
				// detached, it follows nothing
				await gesture(container);
			});

			state.unsubscribe();

			expect(types.filter((type) => type === end)).toEqual([end]);
			expect(types[types.length - 1]).toBe(end);
			expect(fingers).toBe(0);
		});

		it("follows the gestures once attached again", async () => {
			const expected = await typesFor(new Recognizer({ container }), () =>
				gesture(container),
			);
			const recognizer = new Recognizer({ container });

			const types = await typesFor(recognizer, async () => {
				recognizer.update({ container: null });
				await gesture(container);
				recognizer.update({ container });
				await gesture(container);
			});

			expect(types).toEqual(expected);
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
	},
);

describe("PanRecognizer", () => {
	it("ends where the finger is when its container is updated", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, () =>
			drag(container, () => recognizer.update({ container: other })),
		);
		const [last, beforeLast] = [...events].reverse();

		expect(last?.type).toBe("panEnd");
		expect(last?.deltaX).toBe(beforeLast?.deltaX);
		expect(last?.event.type).toBe("pointermove");
		expect(last?.pointers).toHaveLength(1);
	});

	it("ends a running pan when its container changes through undefined", async () => {
		const recognizer = new PanRecognizer({ container });

		const types = await typesFor(recognizer, () =>
			drag(container, () => {
				recognizer.update({ container: undefined });
				recognizer.update({ container: other });
			}),
		);

		expect(types[types.length - 1]).toBe("panEnd");
	});

	it.each<[string, (recognizer: PanRecognizer) => void]>([
		[
			"afterEventReceived",
			(pan) => pan.update({ afterEventReceived: (e) => e }),
		],
		["failWith", (pan) => pan.update({ failWith: [] })],
		["the same container", (pan) => pan.update({ container })],
		["no container", (pan) => pan.update({ container: undefined })],
	])("keeps a running pan when updated with %s", async (_, update) => {
		const expected = await typesFor(new PanRecognizer({ container }), () =>
			drag(container),
		);
		const recognizer = new PanRecognizer({ container });

		expect(
			await typesFor(recognizer, () =>
				drag(container, () => update(recognizer)),
			),
		).toEqual(expected);
	});

	it("applies a new afterEventReceived during a pan", async () => {
		const received: string[] = [];
		const recognizer = new PanRecognizer({ container });

		await eventsFor(recognizer.events$, () =>
			drag(container, () =>
				recognizer.update({
					afterEventReceived: (event) => {
						received.push(event.type);

						return event;
					},
				}),
			),
		);

		expect(received).toEqual(["pointermove", "pointermove", "pointerup"]);
	});

	it("keeps options set from the end event of a container change", async () => {
		const recognizer = new PanRecognizer({ container });
		const ended = recognizer.events$.subscribe((event) => {
			if (event.type === "panEnd") {
				recognizer.update({ options: { numInputs: 2 } });
			}
		});

		const types = await typesFor(recognizer, async () => {
			await drag(container, () =>
				recognizer.update({ container: other, options: { numInputs: 1 } }),
			);
			// the options from the end handler come later, so one finger doesn't pan
			await drag(other);
		});

		ended.unsubscribe();

		expect(types).toEqual(["panStart", "panMove", "panEnd"]);
	});

	it("keeps a container set from the end event of a container change", async () => {
		const expected = await typesFor(new PanRecognizer({ container }), () =>
			drag(container),
		);
		const third = createContainer();
		const recognizer = new PanRecognizer({ container });
		const ended = recognizer.events$.subscribe((event) => {
			if (event.type === "panEnd") {
				recognizer.update({ container: third });
			}
		});

		const types = await typesFor(recognizer, async () => {
			await drag(container, () => recognizer.update({ container: other }));
			await drag(third);
		});

		ended.unsubscribe();

		expect(types).toEqual(["panStart", "panMove", "panEnd", ...expected]);
	});

	it("stays detached when an end handler detaches it", async () => {
		const recognizer = new PanRecognizer({ container });
		const ended = recognizer.events$.subscribe((event) => {
			if (event.type === "panEnd") {
				recognizer.update({ container: null });
			}
		});

		const types = await typesFor(recognizer, async () => {
			await drag(container, () => recognizer.update({ container: other }));
			await drag(other);
			await drag(container);
		});

		ended.unsubscribe();

		expect(types).toEqual(["panStart", "panMove", "panEnd"]);
	});

	it("attaches to a container set by an end handler of a detach", async () => {
		const expected = await typesFor(new PanRecognizer({ container }), () =>
			drag(container),
		);
		const recognizer = new PanRecognizer({ container });
		const ended = recognizer.events$.subscribe((event) => {
			if (event.type === "panEnd") {
				recognizer.update({ container: other });
			}
		});

		const types = await typesFor(recognizer, async () => {
			await drag(container, () => recognizer.update({ container: null }));
			await drag(other);
		});

		ended.unsubscribe();

		expect(types).toEqual(["panStart", "panMove", "panEnd", ...expected]);
	});

	it("doesn't restart its gesture when an end handler sets the previous container back", async () => {
		const expected = await typesFor(new PanRecognizer({ container }), () =>
			drag(container),
		);
		const recognizer = new PanRecognizer({ container });
		const ended = recognizer.events$.subscribe(({ type }) => {
			if (type === "panEnd") recognizer.update({ container });
		});

		const types = await typesFor(recognizer, () =>
			drag(container, () => recognizer.update({ container: other })),
		);

		ended.unsubscribe();

		expect(types).toEqual(["panStart", "panMove", "panEnd"]);
		// the container of the end handler stays
		expect(await typesFor(recognizer, () => drag(container))).toEqual(expected);
	});

	it("applies an update from a handler before a later one", async () => {
		const expected = await typesFor(new PanRecognizer({ container }), () =>
			drag(container),
		);
		const third = createContainer();
		const recognizer = new PanRecognizer({ container });
		const moved = recognizer.events$.subscribe(({ type }) => {
			if (type === "panMove") recognizer.update({ container: other });
		});

		await typesFor(recognizer, async () => {
			sendPointer(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 20, y: 0 });
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 40, y: 0 });
			// while the update of the move handler waits
			recognizer.update({ container: third });
			await waitFor(5);
			sendPointer(container, "pointerup", { x: 40, y: 0 });
		});

		moved.unsubscribe();

		expect(await typesFor(recognizer, () => drag(other))).toEqual([]);
		expect(await typesFor(recognizer, () => drag(third))).toEqual(expected);
	});
});

describe("A recognizer without reportFingers", () => {
	/** A custom recognizer whose events are the ones of pan$. */
	class PanOnly extends Recognizer {
		public events$ = this.pan$;
	}

	const typesOf = (recognizer: PanOnly, gesture: () => Promise<void>) =>
		eventsFor(recognizer.events$, gesture).then((events) =>
			events.map(({ type }) => type),
		);

	it("ends its gesture after the move whose handler sets a new container", async () => {
		const recognizer = new PanOnly({ container });
		const moved = recognizer.events$.subscribe(({ type }) => {
			if (type === "move") recognizer.update({ container: other });
		});

		const types = await typesOf(recognizer, () => drag(container));

		moved.unsubscribe();

		expect(types).toEqual(["start", "move", "end"]);
	});

	it("keeps a container set from the end event of a container change", async () => {
		const third = createContainer();
		const moved = new PanOnly({ container });
		const ending = await typesOf(moved, () =>
			drag(container, () => moved.update({ container: other })),
		);
		const expected = await typesOf(new PanOnly({ container: third }), () =>
			drag(third),
		);
		const recognizer = new PanOnly({ container });
		const ended = recognizer.events$.subscribe(({ type }) => {
			if (type === "end") recognizer.update({ container: third });
		});

		const types = await typesOf(recognizer, async () => {
			await drag(container, () => recognizer.update({ container: other }));
			await drag(third);
		});

		ended.unsubscribe();

		expect(ending[ending.length - 1]).toBe("end");
		expect(types).toEqual([...ending, ...expected]);
	});
});

describe("A recognizer with reportFingers", () => {
	it("sends an error of isEnd to its subscribers", async () => {
		class Throwing extends Recognizer<never, RecognizerPanEvent> {
			public events$ = this.pan$.pipe(
				this.reportFingers(({ type }) => {
					if (type === "move") throw new Error("boom");

					return type === "end";
				}),
			);
		}
		const recognizer = new Throwing({ container });
		const log: string[] = [];
		const subscription = recognizer.events$.subscribe({
			next: ({ type }) => log.push(type),
			error: (error: Error) => log.push(`error: ${error.message}`),
		});

		await drag(container);

		subscription.unsubscribe();

		expect(log).toEqual(["start", "error: boom"]);
	});
});

describe("An update from a handler of another recognizer", () => {
	it("ends a hold whose start stops a pan that moves the hold", async () => {
		const hold = new HoldRecognizer({ container, options: { numInputs: 2 } });
		const pan = new PanRecognizer({ container, failWith: [hold] });
		const holdTypes: string[] = [];
		const holds = hold.events$.subscribe(({ type }) => holdTypes.push(type));
		const ended = pan.events$.subscribe(({ type }) => {
			if (type === "panEnd") hold.update({ container: other });
		});

		const panTypes = await typesFor(pan, async () => {
			sendPointer(container, "pointerdown", { x: 0, y: 0 }, 1);

			for (const x of [20, 40]) {
				await waitFor(5);
				sendPointer(container, "pointermove", { x, y: 0 }, 1);
			}

			// the second finger starts the hold, whose start stops the pan
			await waitFor(5);
			sendPointer(container, "pointerdown", { x: 200, y: 0 }, 2);
			await waitFor(20);
			sendPointer(container, "pointerup", { x: 200, y: 0 }, 2);
			sendPointer(container, "pointerup", { x: 40, y: 0 }, 1);
		});

		ended.unsubscribe();
		holds.unsubscribe();

		expect(panTypes.filter((type) => type === "panEnd")).toEqual(["panEnd"]);
		expect(holdTypes).toEqual(["holdStart", "holdEnd"]);
		// the hold no longer runs, so it doesn't block the pan
		expect(await typesFor(pan, () => drag(container))).toContain("panEnd");
	});
});

describe.each([
	["outside the handlers", false],
	["from a handler", true],
])("Given update() calls made %s", (_, fromHandler) => {
	it("applies the update of an end handler right after the update that ended the gesture", async () => {
		const third = createContainer();
		const trigger = createContainer();
		const expected = await typesFor(
			new PanRecognizer({ container: third }),
			() => drag(third),
		);
		const recognizer = new PanRecognizer({ container });
		// another recognizer, whose move handler makes the update() calls
		const helper = new PanRecognizer({ container: trigger });
		const updates = () => {
			recognizer.update({ container: other });
			recognizer.update({ container: third });
		};
		let updateOnMove = false;
		const moved = helper.events$.subscribe(({ type }) => {
			if (type === "panMove" && updateOnMove) {
				updateOnMove = false;
				updates();
			}
		});
		const ended = recognizer.events$.subscribe(({ type }) => {
			if (type === "panEnd") recognizer.update({ container });
		});

		await typesFor(recognizer, async () => {
			sendPointer(trigger, "pointerdown", { x: 0, y: 0 }, 7);
			await waitFor(5);
			sendPointer(trigger, "pointermove", { x: 30, y: 0 }, 7);
			await drag(container, () => {
				if (fromHandler) {
					updateOnMove = true;
					sendPointer(trigger, "pointermove", { x: 60, y: 0 }, 7);
				} else {
					updates();
				}
			});
			sendPointer(trigger, "pointerup", { x: 60, y: 0 }, 7);
		});

		moved.unsubscribe();
		ended.unsubscribe();

		// the last update() wins, after the one of the end handler
		expect(await typesFor(recognizer, () => drag(container))).toEqual([]);
		expect(await typesFor(recognizer, () => drag(third))).toEqual(expected);
	});
});

describe("Updates held from a handler", () => {
	it("apply the update that each one causes right after it", async () => {
		const third = createContainer();
		const trigger = createContainer();
		const expected = await typesFor(
			new PanRecognizer({ container: third }),
			() => drag(third),
		);
		const first = new PanRecognizer({ container });
		const second = new PanRecognizer({ container });
		// another recognizer, whose move handler makes the update() calls
		const helper = new PanRecognizer({ container: trigger });
		let updateOnMove = false;
		const moved = helper.events$.subscribe(({ type }) => {
			if (type === "panMove" && updateOnMove) {
				updateOnMove = false;
				first.update({ container: other });
				second.update({ container: other });
				second.update({ container: third });
			}
		});
		// each end handler sets its recognizer back on the container
		const firstEnded = first.events$.subscribe(({ type }) => {
			if (type === "panEnd") first.update({ container });
		});
		const secondEnded = second.events$.subscribe(({ type }) => {
			if (type === "panEnd") second.update({ container });
		});

		await eventsFor(merge(first.events$, second.events$), async () => {
			sendPointer(trigger, "pointerdown", { x: 0, y: 0 }, 7);
			await waitFor(5);
			sendPointer(trigger, "pointermove", { x: 30, y: 0 }, 7);
			await drag(container, () => {
				updateOnMove = true;
				sendPointer(trigger, "pointermove", { x: 60, y: 0 }, 7);
			});
			sendPointer(trigger, "pointerup", { x: 60, y: 0 }, 7);
		});

		moved.unsubscribe();
		firstEnded.unsubscribe();
		secondEnded.unsubscribe();

		// the second recognizer's end handler applied before its last update()
		expect(await typesFor(second, () => drag(third))).toEqual(expected);
	});
});

describe("A held update() that throws", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("doesn't stop the other held updates, and is reported", async () => {
		/** A custom recognizer that rejects an option. */
		class Strict extends Recognizer<{ size?: number }> {
			public events$ = this.pan$;

			public update(config: RecognizerConfig<{ size?: number }>) {
				if (config.options?.size === 0)
					throw new Error("size must be positive");

				super.update(config);
			}
		}
		const reportError = vi.fn();

		vi.stubGlobal("reportError", reportError);

		const widget = new Recognizable({
			recognizers: [new Strict()],
			container: createContainer(),
		});
		const recognizer = new PanRecognizer({ container });
		const started = recognizer.events$.subscribe(({ type }) => {
			if (type === "panStart") {
				widget.update({ options: { size: 0 } });
				recognizer.update({ container: other });
			}
		});

		const types = await typesFor(recognizer, () => drag(container));

		started.unsubscribe();

		// the update after the one that throws moved the recognizer
		expect(types).toEqual(["panStart", "panEnd"]);
		expect(reportError).toHaveBeenCalledWith(
			new Error("size must be positive"),
		);
	});
});

describe("Recognizable", () => {
	it("waits with all its recognizers for an update from a start handler", async () => {
		const pan = new PanRecognizer();
		const hold = new HoldRecognizer();
		const recognizable = new Recognizable({
			recognizers: [pan, hold],
			container,
		});
		const started = pan.events$.subscribe(({ type }) => {
			if (type === "panStart") recognizable.update({ container: other });
		});

		const events = await eventsFor(recognizable.events$, () => drag(container));

		started.unsubscribe();

		// every recognizer ends its gesture after the start that moved them
		expect(events.map(({ event }) => event.type)).toEqual([
			"holdStart",
			"panStart",
			"panEnd",
			"holdEnd",
		]);
		// the update moved them to the other container
		expect(
			(await eventsFor(recognizable.events$, () => press(other))).map(
				({ event }) => event.type,
			),
		).toEqual(["holdStart", "holdEnd"]);
	});

	it("updates all its recognizers at once while an end handler's update waits", async () => {
		const pan = new PanRecognizer();
		const hold = new HoldRecognizer();
		const recognizable = new Recognizable({
			recognizers: [pan, hold],
			container,
		});
		const ended = pan.events$.subscribe(({ type }) => {
			if (type === "panEnd") recognizable.update({ container });
		});
		const holdFingers = fingersOf(hold.state$);
		let fingersAfterUpdate: number | undefined;

		await eventsFor(recognizable.events$, () =>
			drag(container, () => {
				recognizable.update({ container: other });
				fingersAfterUpdate =
					holdFingers.fingers[holdFingers.fingers.length - 1];
			}),
		);

		ended.unsubscribe();
		holdFingers.unsubscribe();

		// the hold ended with the update, before the update of the end handler
		expect(fingersAfterUpdate).toBe(0);
	});

	it("detaches all its recognizers", async () => {
		const typesOf = (
			recognizable: Recognizable<(PanRecognizer | HoldRecognizer)[]>,
			gesture: () => Promise<void>,
		) =>
			eventsFor(recognizable.events$, gesture).then((events) =>
				events.map(({ event }) => event.type),
			);
		const expected = await typesOf(
			new Recognizable({
				recognizers: [new PanRecognizer(), new HoldRecognizer()],
				container,
			}),
			() => drag(container),
		);
		const recognizable = new Recognizable({
			recognizers: [new PanRecognizer(), new HoldRecognizer()],
			container,
		});

		expect(expected).toContain("panEnd");
		expect(
			await typesOf(recognizable, async () => {
				await drag(container);
				recognizable.update({ container: null });
				await drag(container);
			}),
		).toEqual(expected);
	});

	it("leaves a recognizer moved on its own where it is", async () => {
		const expected = await typesFor(new PanRecognizer({ container }), () =>
			drag(container),
		);
		const pan = new PanRecognizer();
		const recognizable = new Recognizable({ recognizers: [pan], container });

		pan.update({ container: other });
		recognizable.update({ afterEventReceived: (event) => event });

		expect(await typesFor(pan, () => drag(other))).toEqual(expected);
	});

	it("gives the fields an end handler sets to all its recognizers", async () => {
		const third = createContainer();
		const pan = new PanRecognizer();
		const hold = new HoldRecognizer();
		const recognizable = new Recognizable({
			recognizers: [pan, hold],
			container,
		});
		const received: string[] = [];
		const receivedBy =
			(name: string) =>
			(event: PointerEvent): PointerEvent => {
				if (event.target === third) received.push(name);

				return event;
			};
		const ended = pan.events$.subscribe((event) => {
			if (event.type === "panEnd") {
				recognizable.update({
					container: third,
					afterEventReceived: receivedBy("handler"),
				});
			}
		});

		await eventsFor(recognizable.events$, async () => {
			await drag(container, () =>
				recognizable.update({
					container: other,
					afterEventReceived: receivedBy("outer"),
				}),
			);
			sendPointer(third, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendPointer(third, "pointerup", { x: 0, y: 0 });
		});

		ended.unsubscribe();

		// both recognizers read the press with the function of the end handler
		// the press and the release, read by each of the two recognizers
		expect(received).toEqual(["handler", "handler", "handler", "handler"]);
	});

	it("sets no style on the containers it gets", () => {
		const recognizable = new Recognizable({
			recognizers: [new PanRecognizer()],
			container,
		});

		expect(container.getAttribute("style")).toBeNull();

		recognizable.update({ container: other });

		expect(other.getAttribute("style")).toBeNull();
	});

	it("keeps a container set from an end handler for all its recognizers", async () => {
		const third = createContainer();
		const pan = new PanRecognizer();
		const hold = new HoldRecognizer();
		const recognizable = new Recognizable({
			recognizers: [pan, hold],
			container,
		});
		const ended = pan.events$.subscribe((event) => {
			if (event.type === "panEnd") {
				recognizable.update({ container: third });
			}
		});

		const events = await eventsFor(recognizable.events$, async () => {
			await drag(container, () => recognizable.update({ container: other }));
			await press(third);
		});

		ended.unsubscribe();

		// the hold of the drag, ended by the update, then the one on the third
		expect(
			events
				.filter(({ recognizer }) => recognizer === hold)
				.map(({ event }) => event.type),
		).toEqual(["holdStart", "holdEnd", "holdStart", "holdEnd"]);
	});

	it("gives the fields of an end handler that the other fields run to all its recognizers", async () => {
		const pan = new PanRecognizer();
		const hold = new HoldRecognizer();
		const recognizable = new Recognizable({
			recognizers: [pan, hold],
			container,
		});
		const ended = pan.events$.subscribe((event) => {
			if (event.type === "panEnd") {
				recognizable.update({ failWith: [] });
			}
		});

		const events = await eventsFor(recognizable.events$, async () => {
			// a failWith source that runs stops the pan, whose end handler removes it
			await drag(container, () =>
				recognizable.update({
					failWith: [{ running$: new BehaviorSubject(true) }],
				}),
			);
			await press(container);
		});

		ended.unsubscribe();

		// the hold of the drag, stopped by the source, then the one of the press
		expect(
			events
				.filter(({ recognizer }) => recognizer === hold)
				.map(({ event }) => event.type),
		).toEqual(["holdStart", "holdEnd", "holdStart", "holdEnd"]);
	});

	it("keeps a running pan when updated with the same container", async () => {
		const expected = await typesFor(new PanRecognizer({ container }), () =>
			drag(container),
		);
		const pan = new PanRecognizer();
		const recognizable = new Recognizable({ recognizers: [pan], container });

		const events = await eventsFor(recognizable.events$, () =>
			drag(container, () => recognizable.update({ container })),
		);

		expect(events.map(({ event }) => event.type)).toEqual(expected);
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

	it("drops a running swipe when it's detached", async () => {
		const recognizer = new SwipeRecognizer({ container });

		expect(
			await typesFor(recognizer, async () => {
				await swipe(container, () => recognizer.update({ container: null }));
				recognizer.update({ container });
				await swipe(container);
			}),
		).toEqual(["swipe"]);
	});

	it("still swipes when a contextmenu ends the move", async () => {
		const recognizer = new SwipeRecognizer({ container });

		expect(
			await typesFor(recognizer, async () => {
				sendPointer(container, "pointerdown", { x: 0, y: 0 });
				await waitFor(5);
				sendPointer(container, "pointermove", { x: 100, y: 0 });
				await waitFor(5);
				sendPointer(container, "pointermove", { x: 200, y: 0 });
				sendPointer(container, "contextmenu", { x: 200, y: 0 });
				await waitFor(20);
			}),
		).toEqual(["swipe"]);
	});
});

describe("SwipeRecognizer from a handler", () => {
	it("gives the swipe to every subscriber when the first one moves it", async () => {
		const recognizer = new SwipeRecognizer({ container });
		const got: string[] = [];
		const first = recognizer.events$.subscribe(() => {
			got.push("first");
			recognizer.update({ container: other });
		});
		const second = recognizer.events$.subscribe(() => got.push("second"));

		await swipe(container);

		first.unsubscribe();
		second.unsubscribe();

		expect(got).toEqual(["first", "second"]);
	});
});

describe("TapRecognizer", () => {
	it("applies an update from a tap handler after every subscriber got the tap", async () => {
		const recognizable = new Recognizable({
			recognizers: [new TapRecognizer()],
			container,
		});
		const listenOnOther = vi.spyOn(other, "addEventListener");
		const listenersOnOtherAtTap: number[] = [];
		const first = recognizable.events$.subscribe(() =>
			recognizable.update({ container: other }),
		);
		const second = recognizable.events$.subscribe(() =>
			listenersOnOtherAtTap.push(listenOnOther.mock.calls.length),
		);

		await tap(container);

		first.unsubscribe();
		second.unsubscribe();

		// the second subscriber got the tap before the recognizer moved
		expect(listenersOnOtherAtTap).toEqual([0]);
		expect(listenOnOther).toHaveBeenCalled();
	});

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

	it("drops a running tap when its container is updated", async () => {
		const recognizer = new TapRecognizer({ container });

		expect(
			await typesFor(recognizer, async () => {
				await tap(container, () => recognizer.update({ container: other }));
				await tap(other);
			}),
		).toEqual(["tap"]);
	});

	it("drops a running tap when it's detached", async () => {
		const recognizer = new TapRecognizer({ container });

		expect(
			await typesFor(recognizer, async () => {
				await tap(container, () => recognizer.update({ container: null }));
				recognizer.update({ container });
				await tap(container);
			}),
		).toEqual(["tap"]);
	});

	it.each<[string, (pan: PanRecognizer) => void]>([
		["options", (pan) => pan.update({ options: { posThreshold: 20 } })],
		["a container", (pan) => pan.update({ container: other })],
		["a null container", (pan) => pan.update({ container: null })],
	])(
		"still taps after a pan in its failWith gets %s during a drag",
		async (_, update) => {
			const pan = new PanRecognizer({ container });
			const recognizer = new TapRecognizer({ container, failWith: [pan] });
			const panning = pan.events$.subscribe();

			const types = await typesFor(recognizer, async () => {
				await drag(container, () => update(pan));
				await tap(container);
			});

			panning.unsubscribe();

			expect(types).toEqual(["tap"]);
		},
	);
});
