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

/** A recognizer lets go of the pointers a tick after its last unsubscribe. */
const afterTeardown = () => waitFor(5);

type AnyRecognizer = new (config: {
	container: HTMLElement;
	failWith?: FailWith[];
}) => {
	events$: Observable<unknown>;
	update(config: { options?: object }): void;
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
		await afterTeardown();

		expect(listeners.count).toBe(0);
	});

	it("removes them after gestures", async () => {
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

		subscription.unsubscribe();
		await afterTeardown();

		expect(listeners.count).toBe(0);
	});

	it("removes them when unsubscribed during a gesture", async () => {
		const window$ = countListeners(window);

		try {
			const recognizer = new Recognizer({ container });
			const subscription = recognizer.events$.subscribe();

			await waitFor(1);
			await pressTwoFingers();

			// the ones following the pressed fingers
			expect(window$.listeners.count).toBeGreaterThan(0);

			subscription.unsubscribe();
			await afterTeardown();

			expect(listeners.count).toBe(0);
			expect(window$.listeners.count).toBe(0);
		} finally {
			window$.restore();
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
		await afterTeardown();

		expect(listeners.count).toBe(0);
	});

	it("follows a pointer only once after its options were updated", async () => {
		const window$ = countListeners(window);

		try {
			const recognizer = new Recognizer({ container });
			const subscription = recognizer.events$.subscribe();

			await waitFor(1);

			recognizer.update({ options: {} });
			recognizer.update({ options: {} });
			recognizer.update({ options: {} });

			sendPointer(container, "pointerdown", { x: 0, y: 0 });

			// as before any update, not once more per update
			expect(window$.listeners.count).toBe(1);

			sendPointer(container, "pointerup", { x: 0, y: 0 });
			subscription.unsubscribe();
		} finally {
			window$.restore();
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
		const start$ = new Subject<void>();
		const end$ = new Subject<void>();
		const recognizer = new PinchRecognizer({
			container,
			failWith: [{ start$, end$ }],
		});

		const events = await eventsFor(recognizer.events$, async () => {
			start$.next();
			recognizer.update({ options: {} });
			await pinch();

			// once it ended, it pinches again
			end$.next();
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
			const start$ = new Subject<void>();
			const end$ = new Subject<void>();
			const recognizer = new PinchRecognizer({
				container,
				failWith: [{ start$, end$ }],
			});

			const subscription = recognizer.events$.subscribe();
			await waitFor(1);
			if (startsBefore) start$.next();
			subscription.unsubscribe();
			await waitFor(5);
			if (!startsBefore) start$.next();

			const events = await eventsFor(recognizer.events$, async () => {
				await pinch();

				// once it ended, it pinches again
				end$.next();
				await pinch();
			});

			expect(events.map(({ type }) => type)).toEqual([
				"pinchStart",
				"pinchMove",
				"pinchEnd",
			]);
		},
	);

	it("a tap recognizer never tapped leaves its failWith recognizers alone", async () => {
		const otherContainer = createContainer();
		const { listeners } = countListeners(otherContainer);
		const other = new PanRecognizer({ container: otherContainer });
		const recognizer = new TapRecognizer({ container, failWith: [other] });

		const subscription = recognizer.events$.subscribe();
		await waitFor(1);

		// it only follows them from its first tap
		expect(listeners.count).toBe(0);

		subscription.unsubscribe();
		await afterTeardown();

		expect(listeners.count).toBe(0);
	});
});

describe("when resubscribed right away", () => {
	let container = createContainer();

	beforeEach(() => {
		container = createContainer();
	});

	/** Subscribes, presses a finger, then subscribes again in place. */
	const resubscribeWithAFingerPressed = async (recognizer: {
		events$: Observable<unknown>;
	}) => {
		const subscription = recognizer.events$.subscribe();

		await waitFor(1);
		sendPointer(container, "pointerdown", { x: 100, y: 100 }, 1);
		await waitFor(5);

		subscription.unsubscribe();
	};

	it.each<[string, AnyRecognizer, string]>([
		["PinchRecognizer", PinchRecognizer, "pinchStart"],
		["RotateRecognizer", RotateRecognizer, "rotateStart"],
	])(
		"%s still counts the finger pressed before",
		async (_, Recognizer, start) => {
			const recognizer = new Recognizer({ container });

			await resubscribeWithAFingerPressed(recognizer);

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

			expect(events[0]).toMatchObject({ type: start });
		},
	);

	it("PanRecognizer still follows the finger pressed before", async () => {
		const recognizer = new PanRecognizer({ container });

		await resubscribeWithAFingerPressed(recognizer);

		const events = await eventsFor(recognizer.events$, async () => {
			for (const x of [130, 160, 200]) {
				await waitFor(8);
				sendPointer(container, "pointermove", { x, y: 100 }, 1);
			}

			await waitFor(8);
			sendPointer(container, "pointerup", { x: 200, y: 100 }, 1);
		});

		expect(events.map(({ type }) => type)).toEqual([
			"panStart",
			"panMove",
			"panMove",
			"panEnd",
		]);
	});
});
