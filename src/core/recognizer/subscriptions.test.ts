import { BehaviorSubject, Observable } from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createContainer,
	eventsFor,
	sendMouse,
	sendPointer,
	waitFor,
} from "../../tests/utils";
import { HoldRecognizer } from "../hold/HoldRecognizer";
import { PanRecognizer } from "../pan/PanRecognizer";
import { PinchRecognizer } from "../pinch/PinchRecognizer";
import { RotateRecognizer } from "../rotate/RotateRecognizer";
import { SwipeRecognizer } from "../swipe/SwipeRecognizer";
import { TapRecognizer } from "../tap/TapRecognizer";
import type { FailWith } from "./Recognizer";

/** Counts the listeners added to `target` and not removed since. */
const countListeners = (target: EventTarget) => {
	const listeners = { count: 0 };
	const { addEventListener, removeEventListener } = target;

	target.addEventListener = (...args) => {
		listeners.count++;
		addEventListener.apply(target, args);
	};
	target.removeEventListener = (...args) => {
		listeners.count--;
		removeEventListener.apply(target, args);
	};

	return {
		listeners,
		restore: () => {
			target.addEventListener = addEventListener;
			target.removeEventListener = removeEventListener;
		},
	};
};

/**
 * The listeners that follow a pressed pointer, for `pointermove`, `pointerup`,
 * `pointercancel` and `contextmenu`.
 */
const FOLLOW_LISTENERS = 4;

type AnyRecognizer = new (config: {
	container: HTMLElement;
	failWith?: FailWith[];
}) => {
	events$: Observable<unknown>;
	update(config: { container?: HTMLElement | null; options?: object }): void;
};

const recognizers: [string, AnyRecognizer][] = [
	["PanRecognizer", PanRecognizer],
	["PinchRecognizer", PinchRecognizer],
	["RotateRecognizer", RotateRecognizer],
	["HoldRecognizer", HoldRecognizer],
	["TapRecognizer", TapRecognizer],
	["SwipeRecognizer", SwipeRecognizer],
];

describe.each(recognizers)("%s", (_, Recognizer) => {
	let container = createContainer();
	let listeners = countListeners(container).listeners;

	beforeEach(() => {
		container = createContainer();
		listeners = countListeners(container).listeners;
	});

	/** Two fingers pressed, the second one moving. They stay pressed. */
	const pressTwoFingers = async () => {
		sendPointer(container, "pointerdown", { x: 100, y: 0 }, 1);
		await waitFor(5);
		sendPointer(container, "pointerdown", { x: 200, y: 0 }, 2);
		await waitFor(5);
		sendPointer(container, "pointermove", { x: 250, y: 50 }, 2);
		await waitFor(5);
	};

	it("removes its listeners once unsubscribed", async () => {
		const recognizer = new Recognizer({ container });
		const subscription = recognizer.events$.subscribe();

		await waitFor(1);

		expect(listeners.count).toBeGreaterThan(0);

		subscription.unsubscribe();

		expect(listeners.count).toBe(0);
	});

	it("removes them after gestures", async () => {
		const document$ = countListeners(document);

		try {
			const recognizer = new Recognizer({ container });
			const subscription = recognizer.events$.subscribe();

			await waitFor(1);

			// a press that doesn't move
			sendPointer(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendPointer(container, "pointerup", { x: 0, y: 0 });
			await waitFor(5);

			// a drag
			sendPointer(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 50, y: 0 });
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 100, y: 0 });
			await waitFor(5);
			sendPointer(container, "pointerup", { x: 100, y: 0 });
			await waitFor(5);

			// two fingers
			await pressTwoFingers();
			sendPointer(container, "pointerup", { x: 250, y: 50 }, 2);
			sendPointer(container, "pointerup", { x: 100, y: 0 }, 1);
			await waitFor(20);

			// mouse drags released without a pointerup
			for (const release of [
				() => sendMouse(container, "pointercancel", { x: 100, y: 0 }),
				() => sendMouse(container, "contextmenu", { x: 100, y: 0 }),
				() =>
					sendMouse(container, "pointermove", { x: 150, y: 0 }, { buttons: 0 }),
			]) {
				sendMouse(container, "pointerdown", { x: 0, y: 0 });
				await waitFor(5);
				sendMouse(container, "pointermove", { x: 100, y: 0 });
				await waitFor(5);
				release();
				await waitFor(20);
			}

			// nothing follows the released fingers
			expect(document$.listeners.count).toBe(0);

			subscription.unsubscribe();

			expect(listeners.count).toBe(0);
		} finally {
			document$.restore();
		}
	});

	it("removes them when unsubscribed during a gesture", async () => {
		const document$ = countListeners(document);

		try {
			const recognizer = new Recognizer({ container });
			const subscription = recognizer.events$.subscribe();

			await waitFor(1);
			await pressTwoFingers();

			expect(document$.listeners.count).toBe(2 * FOLLOW_LISTENERS);

			subscription.unsubscribe();

			expect(listeners.count).toBe(0);
			expect(document$.listeners.count).toBe(0);
		} finally {
			document$.restore();
		}
	});

	it("removes them after its options were updated", async () => {
		const recognizer = new Recognizer({ container });
		const subscription = recognizer.events$.subscribe();

		await waitFor(1);

		recognizer.update({ options: {} });
		recognizer.update({ options: {} });
		recognizer.update({ options: {} });

		subscription.unsubscribe();

		expect(listeners.count).toBe(0);
	});

	it("follows a pointer only once after its options were updated", async () => {
		const document$ = countListeners(document);

		try {
			const recognizer = new Recognizer({ container });
			const subscription = recognizer.events$.subscribe();

			await waitFor(1);

			recognizer.update({ options: {} });
			recognizer.update({ options: {} });
			recognizer.update({ options: {} });

			sendPointer(container, "pointerdown", { x: 0, y: 0 });

			// as before any update, not once more per update
			expect(document$.listeners.count).toBe(FOLLOW_LISTENERS);

			sendPointer(container, "pointerup", { x: 0, y: 0 });
			subscription.unsubscribe();
		} finally {
			document$.restore();
		}
	});

	it("removes them once detached", async () => {
		const document$ = countListeners(document);

		try {
			const recognizer = new Recognizer({ container });
			const subscription = recognizer.events$.subscribe();

			await waitFor(1);
			await pressTwoFingers();

			expect(document$.listeners.count).toBe(2 * FOLLOW_LISTENERS);

			recognizer.update({ container: null });

			expect(listeners.count).toBe(0);
			expect(document$.listeners.count).toBe(0);

			subscription.unsubscribe();
		} finally {
			document$.restore();
		}
	});

	it("listens for a new subscriber after update({ container: undefined })", async () => {
		const recognizer = new Recognizer({ container });

		recognizer.update({ container: undefined });

		const subscription = recognizer.events$.subscribe();

		await waitFor(1);

		expect(listeners.count).toBeGreaterThan(0);

		subscription.unsubscribe();
	});

	it("moves them when its container is updated during a gesture", async () => {
		const document$ = countListeners(document);
		const other = createContainer();
		const otherListeners = countListeners(other).listeners;

		try {
			const recognizer = new Recognizer({ container });
			const subscription = recognizer.events$.subscribe();

			await waitFor(1);
			await pressTwoFingers();

			recognizer.update({ container: other });

			// nothing follows the fingers pressed on the previous container
			expect(listeners.count).toBe(0);
			expect(document$.listeners.count).toBe(0);
			expect(otherListeners.count).toBeGreaterThan(0);

			sendPointer(other, "pointerdown", { x: 0, y: 0 });

			expect(document$.listeners.count).toBe(FOLLOW_LISTENERS);

			sendPointer(other, "pointerup", { x: 0, y: 0 });
			subscription.unsubscribe();
		} finally {
			document$.restore();
		}
	});
});

describe("with failWith", () => {
	let container = createContainer();

	beforeEach(() => {
		container = createContainer();
	});

	const pinch = async () => {
		sendPointer(container, "pointerdown", { x: 100, y: 0 }, 1);
		await waitFor(5);
		sendPointer(container, "pointerdown", { x: 200, y: 0 }, 2);
		await waitFor(5);
		sendPointer(container, "pointermove", { x: 250, y: 0 }, 2);
		await waitFor(5);
		sendPointer(container, "pointerup", { x: 250, y: 0 }, 2);
		sendPointer(container, "pointerup", { x: 100, y: 0 }, 1);
	};

	it("still knows a failWith recognizer runs after an update", async () => {
		const running$ = new BehaviorSubject(false);
		const recognizer = new PinchRecognizer({
			container,
			failWith: [{ running$ }],
		});

		const events = await eventsFor(recognizer.events$, async () => {
			running$.next(true);
			recognizer.update({ options: {} });
			await pinch();

			// once it ended, it pinches again
			running$.next(false);
			await pinch();
		});

		expect(events.map(({ type }) => type)).toEqual([
			"pinchStart",
			"pinchMove",
			"pinchEnd",
		]);
	});

	it.each([
		["before", true],
		["after", false],
	])(
		"still knows a failWith recognizer runs once resubscribed, if it started %s unsubscribing",
		async (_, startsBefore) => {
			const running$ = new BehaviorSubject(false);
			const recognizer = new PinchRecognizer({
				container,
				failWith: [{ running$ }],
			});

			const subscription = recognizer.events$.subscribe();
			await waitFor(1);
			if (startsBefore) running$.next(true);
			subscription.unsubscribe();
			await waitFor(5);
			if (!startsBefore) running$.next(true);

			const events = await eventsFor(recognizer.events$, async () => {
				await pinch();

				// once it ended, it pinches again
				running$.next(false);
				await pinch();
			});

			expect(events.map(({ type }) => type)).toEqual([
				"pinchStart",
				"pinchMove",
				"pinchEnd",
			]);
		},
	);

	it("reads its failWith sources without a container", async () => {
		let subscribers = 0;
		const running$ = new Observable<boolean>((subscriber) => {
			subscribers++;
			subscriber.next(false);

			return () => {
				subscribers--;
			};
		});
		const recognizer = new PinchRecognizer({ failWith: [{ running$ }] });

		const subscription = recognizer.events$.subscribe();
		await waitFor(1);

		expect(subscribers).toBe(1);

		subscription.unsubscribe();
	});

	it("releases two recognizers that fail with each other", async () => {
		const panContainer = createContainer();
		const holdContainer = createContainer();
		const panListeners = countListeners(panContainer).listeners;
		const holdListeners = countListeners(holdContainer).listeners;
		const pan = new PanRecognizer({ container: panContainer });
		const hold = new HoldRecognizer({
			container: holdContainer,
			failWith: [pan],
		});

		pan.update({ failWith: [hold] });

		const subscriptions = [pan.events$.subscribe(), hold.events$.subscribe()];

		await waitFor(1);

		for (const subscription of subscriptions) {
			subscription.unsubscribe();
		}

		expect(panListeners.count).toBe(0);
		expect(holdListeners.count).toBe(0);
	});
});

describe.each(recognizers)("%s with failWith", (_, Recognizer) => {
	let container = createContainer();
	let sourceContainer = createContainer();
	let sourceListeners = countListeners(sourceContainer).listeners;

	beforeEach(() => {
		container = createContainer();
		sourceContainer = createContainer();
		sourceListeners = countListeners(sourceContainer).listeners;
	});

	// a tap recognizer reads its failWith sources while a finger is down
	const press = async () => {
		sendPointer(container, "pointerdown", { x: 0, y: 0 });
		await waitFor(5);
	};

	const release = () => sendPointer(container, "pointerup", { x: 0, y: 0 });

	it("doesn't run a recognizer source", async () => {
		const source = new PanRecognizer({ container: sourceContainer });
		const recognizer = new Recognizer({ container, failWith: [source] });
		const subscription = recognizer.events$.subscribe();

		await waitFor(1);
		await press();

		expect(sourceListeners.count).toBe(0);

		release();
		subscription.unsubscribe();
	});

	it("unsubscribes from its sources once unsubscribed", async () => {
		let subscribers = 0;
		const running$ = new Observable<boolean>((subscriber) => {
			subscribers++;
			subscriber.next(false);

			return () => {
				subscribers--;
			};
		});
		const recognizer = new Recognizer({ container, failWith: [{ running$ }] });

		const subscription = recognizer.events$.subscribe();
		await waitFor(1);
		await press();

		expect(subscribers).toBe(1);

		subscription.unsubscribe();

		expect(subscribers).toBe(0);

		release();
	});
});

describe("when subscribed again right after an unsubscribe", () => {
	let container = createContainer();

	beforeEach(() => {
		container = createContainer();
	});

	/**
	 * Subscribes, presses a finger, then unsubscribes. The caller subscribes
	 * again right away, as a React effect does when its dependencies change.
	 */
	const unsubscribeWithAFingerPressed = async (recognizer: {
		events$: Observable<unknown>;
	}) => {
		const subscription = recognizer.events$.subscribe();

		await waitFor(1);
		sendPointer(container, "pointerdown", { x: 100, y: 100 }, 1);
		await waitFor(5);

		subscription.unsubscribe();
	};

	it.each<[string, AnyRecognizer]>([
		["PinchRecognizer", PinchRecognizer],
		["RotateRecognizer", RotateRecognizer],
	])("%s doesn't count the finger pressed before", async (_, Recognizer) => {
		const recognizer = new Recognizer({ container });

		await unsubscribeWithAFingerPressed(recognizer);

		const events = await eventsFor(recognizer.events$, async () => {
			sendPointer(container, "pointerdown", { x: 200, y: 100 }, 2);

			for (const x of [230, 260, 290]) {
				await waitFor(8);
				sendPointer(container, "pointermove", { x, y: x - 100 }, 2);
			}

			await waitFor(8);
			sendPointer(container, "pointerup", { x: 290, y: 190 }, 2);
			sendPointer(container, "pointerup", { x: 100, y: 100 }, 1);
		});

		// it only knows the second finger, and needs two
		expect(events).toEqual([]);
	});

	it("PanRecognizer doesn't follow the finger pressed before", async () => {
		const recognizer = new PanRecognizer({ container });

		await unsubscribeWithAFingerPressed(recognizer);

		const events = await eventsFor(recognizer.events$, async () => {
			for (const x of [130, 160, 200]) {
				await waitFor(8);
				sendPointer(container, "pointermove", { x, y: 100 }, 1);
			}

			await waitFor(8);
			sendPointer(container, "pointerup", { x: 200, y: 100 }, 1);
		});

		expect(events).toEqual([]);
	});
});
