import { EMPTY } from "rxjs";
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
import { Recognizer } from "./Recognizer";

let container = createContainer();
let outside = createContainer();

beforeEach(() => {
	container = createContainer();
	outside = createContainer();
});

const summaryOf = (
	events: { type: string; event: PointerEvent; center: Point }[],
) => events.map(({ type, event, center }) => [type, event.type, center.x]);

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

const panOfDragOutAndBack = [
	["panStart", "pointermove", 180],
	["panMove", "pointermove", 220],
	["panMove", "pointermove", 300],
	["panMove", "pointermove", 120],
	["panMove", "pointermove", 250],
	["panEnd", "pointerup", 250],
];

/** Each `afterEventReceived` that makes new events, which lose fields. */
const copies: [string, (event: PointerEvent) => PointerEvent][] = [
	[
		"copies without pointerId, pointerType and buttons",
		(event) =>
			Object.assign(new PointerEvent(event.type), { x: event.x, y: event.y }),
	],
	[
		"copies without buttons",
		(event) =>
			Object.assign(
				new PointerEvent(event.type, {
					pointerId: event.pointerId,
					pointerType: event.pointerType,
				}),
				{ x: event.x, y: event.y },
			),
	],
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

	it.each(copies)(
		"follows it when afterEventReceived makes %s",
		async (_, afterEventReceived) => {
			const recognizer = new PanRecognizer({ container, afterEventReceived });

			const events = await eventsFor(recognizer.events$, dragOutAndBack);

			expect(summaryOf(events)).toEqual(panOfDragOutAndBack);
		},
	);

	it("keeps it over an element that stops the propagation of a contextmenu", async () => {
		const recognizer = new PanRecognizer({ container });

		outside.addEventListener("contextmenu", (event) => event.stopPropagation());

		const events = await eventsFor(recognizer.events$, async () => {
			sendMouse(container, "pointerdown", { x: 50, y: 0 });
			await waitFor(5);
			sendMouse(container, "pointermove", { x: 180, y: 0 });
			await waitFor(5);
			sendMouse(outside, "contextmenu", { x: 180, y: 0 });
			sendMouse(outside, "pointermove", { x: 300, y: 0 });
			await waitFor(5);
			sendMouse(outside, "pointerup", { x: 300, y: 0 });
		});

		expect(summaryOf(events)).toEqual([
			["panStart", "pointermove", 180],
			["panMove", "pointermove", 300],
			["panEnd", "pointerup", 300],
		]);
	});

	it("ignores a press whose pointerdown an element of the container stops", async () => {
		const recognizer = new PanRecognizer({ container });
		const child = document.createElement("div");

		container.append(child);
		child.addEventListener("pointerdown", (event) => event.stopPropagation());

		const events = await eventsFor(recognizer.events$, async () => {
			sendMouse(child, "pointerdown", { x: 50, y: 0 });
			await waitFor(5);
			sendMouse(child, "pointermove", { x: 180, y: 0 });
			await waitFor(5);
			sendMouse(child, "pointerup", { x: 180, y: 0 });
		});

		expect(events).toEqual([]);
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

/** The releases that are not a `pointerup`, and where they leave `deltaX`. */
const otherReleases: [string, () => void, string, number][] = [
	[
		"a pointercancel",
		() => sendMouse(outside, "pointercancel", { x: 300, y: 0 }),
		"pointercancel",
		// the coordinates of a pointercancel can be far from the pointer
		0,
	],
	[
		"a contextmenu",
		() => sendMouse(outside, "contextmenu", { x: 300, y: 0 }),
		"contextmenu",
		120,
	],
	[
		"a move with no button pressed",
		() => sendMouse(outside, "pointermove", { x: 300, y: 0 }, { buttons: 0 }),
		"pointermove",
		// the button was released earlier, somewhere else
		0,
	],
];

describe.each<[string, ((event: PointerEvent) => PointerEvent) | undefined]>([
	["Given a mouse drag", undefined],
	...copies.map(([name, copy]): [string, typeof copy] => [
		`Given a mouse drag, and afterEventReceived that makes ${name}`,
		copy,
	]),
])("%s", (_, afterEventReceived) => {
	it.each(otherReleases)(
		"PanRecognizer ends at %s, and pans the next drag once",
		async (_, release, type, deltaX) => {
			const recognizer = new PanRecognizer({ container, afterEventReceived });

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
			expect(events.map((event) => event.deltaX)).toEqual([
				0,
				deltaX,
				0,
				50,
				50,
			]);
		},
	);
});

describe("Given a mouse press that ends without a pointerup", () => {
	it.each<[string, () => void]>([
		[
			"a pointercancel",
			() => sendMouse(container, "pointercancel", { x: 0, y: 0 }),
		],
		[
			"a Ctrl+click on macOS: a contextmenu, then the pointerup",
			() => {
				sendMouse(container, "contextmenu", { x: 0, y: 0 });
				sendMouse(container, "pointerup", { x: 0, y: 0 });
			},
		],
		[
			"a move with no button pressed",
			() => sendMouse(container, "pointermove", { x: 0, y: 0 }, { buttons: 0 }),
		],
	])(
		"TapRecognizer drops it at %s, and taps the next click",
		async (_, release) => {
			const recognizer = new TapRecognizer({ container });

			const events = await eventsFor(recognizer.events$, async () => {
				sendMouse(container, "pointerdown", { x: 0, y: 0 });
				await waitFor(5);
				release();
				await waitFor(200);

				sendMouse(container, "pointerdown", { x: 0, y: 0 });
				await waitFor(5);
				sendMouse(container, "pointerup", { x: 0, y: 0 });
				await waitFor(150);
			});

			expect(events.map(({ type, taps }) => [type, taps])).toEqual([
				["tap", 1],
			]);
		},
	);

	it("leaves a move with no button pressed out of pointerMove$", async () => {
		class MoveRecognizer extends Recognizer {
			public events$ = EMPTY;
			public moves$ = this.pointerMove$;
		}

		const recognizer = new MoveRecognizer({ container });

		const moves = await eventsFor(recognizer.moves$, async () => {
			sendMouse(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendMouse(container, "pointermove", { x: 5, y: 0 });
			await waitFor(5);
			sendMouse(outside, "pointermove", { x: 400, y: 0 }, { buttons: 0 });
		});

		expect(moves.map(({ x }) => x)).toEqual([5]);
	});

	it("SwipeRecognizer doesn't swipe at a move with no button pressed", async () => {
		const recognizer = new SwipeRecognizer({ container });

		const events = await eventsFor(recognizer.events$, async () => {
			sendMouse(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendMouse(container, "pointermove", { x: 5, y: 0 });
			await waitFor(5);
			sendMouse(outside, "pointermove", { x: 400, y: 0 }, { buttons: 0 });
		});

		expect(events).toEqual([]);
	});
});

describe("Given a drag whose pointerup the page missed", () => {
	const dragWithoutRelease = async (pointerType?: "pen") => {
		sendMouse(container, "pointerdown", { x: 50, y: 0 }, { pointerType });
		await waitFor(5);
		sendMouse(container, "pointermove", { x: 180, y: 0 }, { pointerType });
		await waitFor(5);
	};

	// happy-dom gives no x to an event made from another, so no center or delta
	const typesOf = (events: { type: string; event: PointerEvent }[]) =>
		events.map(({ type, event }) => [type, event.type]);

	it("PanRecognizer ends it at the next press, then pans the new drag", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, async () => {
			await dragWithoutRelease();
			sendMouse(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendMouse(container, "pointermove", { x: 40, y: 0 });
			await waitFor(5);
			sendMouse(container, "pointerup", { x: 40, y: 0 });
		});

		expect(typesOf(events)).toEqual([
			["panStart", "pointermove"],
			["panEnd", "pointercancel"],
			["panStart", "pointermove"],
			["panEnd", "pointerup"],
		]);
	});

	it("PanRecognizer ends it at the next press outside the container", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, async () => {
			await dragWithoutRelease();
			sendMouse(outside, "pointerdown", { x: 400, y: 0 });
			await waitFor(5);
			sendMouse(outside, "pointerup", { x: 400, y: 0 });
		});

		expect(typesOf(events)).toEqual([
			["panStart", "pointermove"],
			["panEnd", "pointercancel"],
		]);
	});

	it("TapRecognizer taps the next click", async () => {
		const recognizer = new TapRecognizer({ container });

		const events = await eventsFor(recognizer.events$, async () => {
			sendMouse(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendMouse(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendMouse(container, "pointerup", { x: 0, y: 0 });
			await waitFor(150);
		});

		expect(events.map(({ type, taps }) => [type, taps])).toEqual([["tap", 1]]);
	});

	it("PanRecognizer ends a pen drag at its next move with no button pressed", async () => {
		const recognizer = new PanRecognizer({ container });

		const events = await eventsFor(recognizer.events$, async () => {
			await dragWithoutRelease("pen");
			sendMouse(
				outside,
				"pointermove",
				{ x: 400, y: 0 },
				{ buttons: 0, pointerType: "pen" },
			);
			await waitFor(5);
			sendMouse(
				outside,
				"pointermove",
				{ x: 600, y: 0 },
				{ buttons: 0, pointerType: "pen" },
			);
		});

		expect(summaryOf(events)).toEqual([
			["panStart", "pointermove", 180],
			["panEnd", "pointermove", 400],
		]);
		expect(events.map(({ deltaX }) => deltaX)).toEqual([0, 0]);
	});
});
