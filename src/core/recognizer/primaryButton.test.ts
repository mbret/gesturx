import {
	buffer,
	first,
	lastValueFrom,
	type Observable,
	tap,
	timer,
} from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import { PanRecognizer } from "../pan/PanRecognizer";
import { TapRecognizer } from "../tap/TapRecognizer";

/**
 * A gesture starts on a press of the primary button: a left click, a finger
 * or a pen's tip. `button` says which button a `pointerdown` pressed, and is
 * -1 on a `pointermove`, which presses none.
 *
 * @see https://w3c.github.io/pointerevents/#the-button-property
 */
const PRIMARY = 0;
const MIDDLE = 1;
const SECONDARY = 2;
const PEN_ERASER = 5;

const waitFor = (time: number) =>
	new Promise((resolve) => setTimeout(resolve, time));

describe("Given a press of a button other than the primary one", () => {
	let container = document.createElement("div");

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	const send = ({
		type,
		x = 0,
		identifier = 1,
		button,
	}: {
		type: "pointerdown" | "pointermove" | "pointerup";
		x?: number;
		identifier?: number;
		button: number;
	}) => {
		const event = new PointerEvent(type, {
			clientX: x,
			clientY: 0,
			pointerId: identifier,
			pointerType: button === PEN_ERASER ? "pen" : "mouse",
			button: type === "pointermove" ? -1 : button,
			bubbles: true,
		});

		// @ts-expect-error
		event.x = x;
		// @ts-expect-error
		event.y = 0;

		container.dispatchEvent(event);
	};

	const press = (button: number, identifier = 1) => {
		send({ type: "pointerdown", button, identifier });
		send({ type: "pointerup", button, identifier });
	};

	/** A pan starts a task after it passes its threshold, so the steps wait. */
	const drag = async (button: number) => {
		send({ type: "pointerdown", button });
		await waitFor(5);
		send({ type: "pointermove", button, x: 50 });
		await waitFor(5);
		send({ type: "pointermove", button, x: 100 });
		await waitFor(5);
		send({ type: "pointerup", button, x: 100 });
	};

	/** Everything `events$` emits for `gesture`, within a window long enough. */
	const eventsFor = <T>(
		events$: Observable<T>,
		gesture: () => void | Promise<void>,
	) =>
		lastValueFrom(
			events$.pipe(
				tap({
					subscribe: async () => {
						await waitFor(1);

						await gesture();
					},
				}),
				buffer(timer(50)),
				first(),
			),
		);

	it.each([
		["a right click", SECONDARY],
		["a middle click", MIDDLE],
		["a pen's eraser", PEN_ERASER],
	])("%s is not a tap", async (_, button) => {
		const recognizer = new TapRecognizer({ container });

		expect(await eventsFor(recognizer.events$, () => press(button))).toEqual(
			[],
		);
	});

	it("while a primary press is a tap", async () => {
		const recognizer = new TapRecognizer({ container });

		expect(
			await eventsFor(recognizer.events$, () => press(PRIMARY)),
		).toMatchObject([{ type: "tap", taps: 1 }]);
	});

	it("does not count towards a multi tap", async () => {
		const recognizer = new TapRecognizer({
			container,
			options: { maxTaps: 2, multiTapThreshold: 5 },
		});

		const events = await eventsFor(recognizer.events$, () => {
			press(SECONDARY, 1);
			press(PRIMARY, 2);
		});

		expect(events).toMatchObject([{ type: "tap", taps: 1 }]);
	});

	it("a drag with it is not a pan", async () => {
		const recognizer = new PanRecognizer({ container });

		expect(await eventsFor(recognizer.events$, () => drag(SECONDARY))).toEqual(
			[],
		);
	});

	it("while a drag with the primary button is", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, () => drag(PRIMARY));

		expect(events.map(({ type }) => type)).toEqual([
			"panStart",
			"panMove",
			"panEnd",
		]);
	});
});
