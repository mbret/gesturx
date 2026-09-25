import { firstValueFrom, type Observable } from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import { createContainer, sendPointer, waitFor } from "../../tests/utils";
import { HoldRecognizer } from "../hold/HoldRecognizer";
import { PanRecognizer } from "../pan/PanRecognizer";
import { PinchRecognizer } from "../pinch/PinchRecognizer";
import { Recognizable } from "../recognizable/Recognizable";
import { RotateRecognizer } from "../rotate/RotateRecognizer";
import { SwipeRecognizer } from "../swipe/SwipeRecognizer";
import { TapRecognizer } from "../tap/TapRecognizer";

type AnyRecognizer = new (config: {
	container: HTMLElement;
}) => {
	events$: Observable<unknown>;
	state$: Observable<{ fingers: number }>;
};

/** Every count `state$` reports while it's subscribed. */
const fingersOf = (state$: Observable<{ fingers: number }>) => {
	const fingers: number[] = [];
	const subscription = state$.subscribe((state) => fingers.push(state.fingers));

	return { fingers, unsubscribe: () => subscription.unsubscribe() };
};

describe("state$", () => {
	let container = createContainer();

	beforeEach(() => {
		container = createContainer();
	});

	/** Two fingers pressed, the second one moving. */
	const pressTwoFingers = async () => {
		sendPointer(container, "pointerdown", { x: 100, y: 0 }, 1);
		await waitFor(5);
		sendPointer(container, "pointerdown", { x: 200, y: 0 }, 2);
		await waitFor(5);
		sendPointer(container, "pointermove", { x: 250, y: 50 }, 2);
		await waitFor(5);
	};

	/** Then lifted one after the other. */
	const pinch = async () => {
		await pressTwoFingers();
		sendPointer(container, "pointerup", { x: 250, y: 50 }, 2);
		await waitFor(5);
		sendPointer(container, "pointerup", { x: 100, y: 0 }, 1);
		await waitFor(5);
	};

	it.each<[string, AnyRecognizer, number[]]>([
		// from its start once a finger moved, until its end with the last one
		["PanRecognizer", PanRecognizer, [0, 2, 1, 0]],
		// from its start with two fingers, until its end when one lifts
		["PinchRecognizer", PinchRecognizer, [0, 2, 0]],
		["RotateRecognizer", RotateRecognizer, [0, 2, 0]],
		// the finger it started with, until its end with the last one
		["HoldRecognizer", HoldRecognizer, [0, 1, 0]],
		// they recognize a gesture once the fingers are lifted
		["TapRecognizer", TapRecognizer, [0]],
		["SwipeRecognizer", SwipeRecognizer, [0]],
	])(
		"of %s reports the fingers of the gesture it recognizes",
		async (_, Recognizer, expected) => {
			const recognizer = new Recognizer({ container });
			const state = fingersOf(recognizer.state$);
			const subscription = recognizer.events$.subscribe();

			await waitFor(1);
			await pinch();

			expect(state.fingers).toEqual(expected);

			subscription.unsubscribe();
			state.unsubscribe();
		},
	);

	it.each<[string, AnyRecognizer]>([
		["PanRecognizer", PanRecognizer],
		["PinchRecognizer", PinchRecognizer],
		["RotateRecognizer", RotateRecognizer],
		["HoldRecognizer", HoldRecognizer],
	])(
		"of %s reports no fingers once it stops listening",
		async (_, Recognizer) => {
			const recognizer = new Recognizer({ container });
			const subscription = recognizer.events$.subscribe();

			await waitFor(1);
			await pressTwoFingers();

			const { fingers } = await firstValueFrom(recognizer.state$);

			expect(fingers).toBeGreaterThan(0);

			subscription.unsubscribe();
			await waitFor(5);

			// the fingers still pressed are no gesture it recognizes anymore
			expect(await firstValueFrom(recognizer.state$)).toEqual({ fingers: 0 });
		},
	);

	it("of a Recognizable reports the most fingers its recognizers recognize", async () => {
		const recognizable = new Recognizable({
			recognizers: [new PanRecognizer(), new PinchRecognizer()],
		});
		recognizable.update({ container });

		const state = fingersOf(recognizable.state$);
		const subscription = recognizable.events$.subscribe();

		await waitFor(1);
		await pinch();

		// the pinch counts both fingers before the pan starts, and the pan the
		// finger left once the pinch ended
		expect(state.fingers).toEqual([0, 2, 1, 0]);

		subscription.unsubscribe();
		state.unsubscribe();
	});
});
