import { beforeEach, describe, expect, it } from "vitest";
import {
	createContainer,
	eventsFor,
	type Point,
	sendMouse,
	waitFor,
} from "../../tests/utils";
import { HoldRecognizer } from "../hold/HoldRecognizer";
import { PanRecognizer } from "../pan/PanRecognizer";
import { SwipeRecognizer } from "../swipe/SwipeRecognizer";
import { TapRecognizer } from "../tap/TapRecognizer";

let container = createContainer();
let outside = createContainer();

beforeEach(() => {
	container = createContainer();
	outside = createContainer();
});

/** Each event as its type, the pointer event type and the center's x. */
const summaryOf = (
	events: { type: string; event: PointerEvent; center: Point }[],
) => events.map(({ type, event, center }) => [type, event.type, center.x]);

/**
 * A mouse that presses at x 50 in the container, drags out of it to x 300,
 * comes back in at x 120, then goes out again and releases at x 250.
 */
const dragOutAndBack = async () => {
	sendMouse(container, "pointerdown", { x: 50, y: 0 });
	await waitFor(5);
	sendMouse(container, "pointermove", { x: 180, y: 0 });
	await waitFor(5);
	sendMouse(container, "pointerleave", { x: 220, y: 0 });
	sendMouse(outside, "pointermove", { x: 220, y: 0 });
	await waitFor(5);
	sendMouse(outside, "pointermove", { x: 300, y: 0 });
	await waitFor(5);
	sendMouse(container, "pointermove", { x: 120, y: 0 });
	await waitFor(5);
	sendMouse(container, "pointerleave", { x: 250, y: 0 });
	sendMouse(outside, "pointermove", { x: 250, y: 0 });
	await waitFor(5);
	sendMouse(outside, "pointerup", { x: 250, y: 0 });
	await waitFor(5);
};

/** The pan of `dragOutAndBack`, as `summaryOf` gives it. */
const panOfDragOutAndBack = [
	["panStart", "pointermove", 180],
	["panMove", "pointermove", 220],
	["panMove", "pointermove", 300],
	["panMove", "pointermove", 120],
	["panMove", "pointermove", 250],
	["panEnd", "pointerup", 250],
];

describe("Given a mouse drag that leaves the container", () => {
	it("PanRecognizer pans until the release outside", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, dragOutAndBack);

		expect(summaryOf(events)).toEqual(panOfDragOutAndBack);
	});

	it("HoldRecognizer holds until the release outside", async () => {
		const recognizer = new HoldRecognizer({ container });

		const events = await eventsFor(recognizer.events$, dragOutAndBack);

		expect(summaryOf(events)).toEqual([
			["holdStart", "pointerdown", 50],
			["holdEnd", "pointerup", 250],
		]);
	});

	it("SwipeRecognizer swipes at the release outside", async () => {
		const recognizer = new SwipeRecognizer({ container });

		const events = await eventsFor(recognizer.events$, async () => {
			sendMouse(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendMouse(container, "pointerleave", { x: 100, y: 0 });
			sendMouse(outside, "pointermove", { x: 100, y: 0 });
			await waitFor(5);
			sendMouse(outside, "pointerup", { x: 200, y: 0 });
		});

		expect(summaryOf(events)).toEqual([["swipe", "pointerup", 200]]);
	});

	it("TapRecognizer taps when released just outside", async () => {
		const recognizer = new TapRecognizer({ container });

		const events = await eventsFor(recognizer.events$, async () => {
			sendMouse(container, "pointerdown", { x: 195, y: 0 });
			await waitFor(5);
			sendMouse(container, "pointerleave", { x: 200, y: 0 });
			sendMouse(outside, "pointerup", { x: 202, y: 0 });
			await waitFor(150);
		});

		expect(events.map(({ type }) => type)).toEqual(["tap"]);
	});

	it("follows it over an element that stops the propagation of its events", async () => {
		const recognizer = new PanRecognizer({ container });

		for (const type of ["pointermove", "pointerup"]) {
			outside.addEventListener(type, (event) => event.stopPropagation());
		}

		const events = await eventsFor(recognizer.events$, dragOutAndBack);

		expect(summaryOf(events)).toEqual(panOfDragOutAndBack);
	});

	it("follows it when afterEventReceived makes new events", async () => {
		const recognizer = new PanRecognizer({
			container,
			// a copy that keeps neither the pointerId nor the pointerType
			afterEventReceived: (event) =>
				Object.assign(new PointerEvent(event.type), {
					x: event.x,
					y: event.y,
				}),
		});

		const events = await eventsFor(recognizer.events$, dragOutAndBack);

		expect(summaryOf(events)).toEqual(panOfDragOutAndBack);
	});

	it("follows the mouse in the document of the container", async () => {
		const frameDocument = document.implementation.createHTMLDocument();

		container = frameDocument.createElement("div");
		outside = frameDocument.createElement("div");
		frameDocument.body.append(container, outside);

		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, dragOutAndBack);

		expect(summaryOf(events)).toEqual(panOfDragOutAndBack);
	});
});

describe("Given a mouse drag that ends without a pointerup", () => {
	it.each<[string, () => void, string]>([
		[
			"a pointercancel",
			() => sendMouse(outside, "pointercancel", { x: 300, y: 0 }),
			"pointercancel",
		],
		[
			"a contextmenu",
			() => sendMouse(outside, "contextmenu", { x: 300, y: 0 }),
			"contextmenu",
		],
		[
			"a move with no button pressed",
			() => sendMouse(outside, "pointermove", { x: 300, y: 0 }, { buttons: 0 }),
			"pointermove",
		],
	])(
		"PanRecognizer ends at %s, and pans the next drag once",
		async (_, release, type) => {
			const recognizer = new PanRecognizer({ container });

			const events = await eventsFor(recognizer.events$, async () => {
				sendMouse(container, "pointerdown", { x: 50, y: 0 });
				await waitFor(5);
				sendMouse(container, "pointermove", { x: 180, y: 0 });
				await waitFor(5);
				release();
				await waitFor(5);

				sendMouse(container, "pointerdown", { x: 50, y: 0 });
				await waitFor(5);
				sendMouse(container, "pointermove", { x: 100, y: 0 });
				await waitFor(5);
				sendMouse(container, "pointermove", { x: 150, y: 0 });
				await waitFor(5);
				sendMouse(container, "pointerup", { x: 150, y: 0 });
			});

			expect(summaryOf(events)).toEqual([
				["panStart", "pointermove", 180],
				["panEnd", type, 300],
				["panStart", "pointermove", 100],
				["panMove", "pointermove", 150],
				["panEnd", "pointerup", 150],
			]);
		},
	);
});
