import { firstValueFrom, type Observable, Subject } from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createContainer,
	eventsFor,
	sendPointer,
	waitFor,
} from "../../tests/utils";
import { HoldRecognizer } from "../hold/HoldRecognizer";
import { PanRecognizer } from "../pan/PanRecognizer";
import { Recognizable } from "../recognizable/Recognizable";
import { SwipeRecognizer } from "../swipe/SwipeRecognizer";
import { TapRecognizer } from "../tap/TapRecognizer";

let container = createContainer();
let sourceContainer = createContainer();

beforeEach(() => {
	container = createContainer();
	sourceContainer = createContainer();
});

const drag = async (on: HTMLElement) => {
	sendPointer(on, "pointerdown", { x: 0, y: 0 });

	for (const x of [20, 40, 60]) {
		await waitFor(5);
		sendPointer(on, "pointermove", { x, y: 0 });
	}

	await waitFor(5);
	sendPointer(on, "pointerup", { x: 60, y: 0 });
	await waitFor(20);
};

const tap = async (on: HTMLElement) => {
	sendPointer(on, "pointerdown", { x: 0, y: 0 });
	await waitFor(5);
	sendPointer(on, "pointerup", { x: 0, y: 0 });
	await waitFor(20);
};

const holdSource = () => {
	const source = new HoldRecognizer({ container: sourceContainer });
	// a source runs only while it has a subscriber of its own
	const subscription = source.events$.subscribe();

	return {
		source,
		press: () => sendPointer(sourceContainer, "pointerdown", { x: 0, y: 0 }, 9),
		release: async () => {
			sendPointer(sourceContainer, "pointerup", { x: 0, y: 0 }, 9);
			await waitFor(5);
		},
		unsubscribe: () => subscription.unsubscribe(),
	};
};

const typesFor = async (
	events$: Observable<{ type: string }>,
	gesture: () => Promise<void>,
) => (await eventsFor(events$, gesture)).map(({ type }) => type);

/** The events of a drag, for a pan recognizer that nothing blocks. */
const dragTypes = async () => {
	const types = await typesFor(new PanRecognizer({ container }).events$, () =>
		drag(container),
	);

	// so that a blocked drag shows
	expect(types).toContain("panEnd");

	return types;
};

describe("failWith", () => {
	it("blocks a recognizer subscribed while its source runs", async () => {
		const expected = await dragTypes();
		const { source, press, release, unsubscribe } = holdSource();

		await waitFor(1);
		press();
		await waitFor(5);

		const recognizer = new PanRecognizer({ container, failWith: [source] });

		const types = await typesFor(recognizer.events$, async () => {
			await drag(container);
			await release();
			await drag(container);
		});

		unsubscribe();

		// only the drag after the hold ended
		expect(types).toEqual(expected);
	});

	it("blocks a tap from its first press while its source runs", async () => {
		const { source, press, release, unsubscribe } = holdSource();
		const recognizer = new TapRecognizer({ container, failWith: [source] });

		const types = await typesFor(recognizer.events$, async () => {
			press();
			await waitFor(5);
			await tap(container);
			await release();
			await tap(container);
		});

		unsubscribe();

		expect(types).toEqual(["tap"]);
	});

	it("lets a recognizer run once its source was stopped by its own failWith", async () => {
		const expected = await dragTypes();
		const { source: hold, press, release, unsubscribe } = holdSource();
		const panContainer = createContainer();
		const pan = new PanRecognizer({
			container: panContainer,
			failWith: [hold],
		});
		const recognizer = new PanRecognizer({ container, failWith: [pan] });
		const panning = pan.events$.subscribe();

		const types = await typesFor(recognizer.events$, async () => {
			// the pan runs, until the hold stops it
			sendPointer(panContainer, "pointerdown", { x: 0, y: 0 }, 8);
			await waitFor(5);
			sendPointer(panContainer, "pointermove", { x: 40, y: 0 }, 8);
			await waitFor(5);
			press();
			await waitFor(5);
			await drag(container);
			await release();
			sendPointer(panContainer, "pointerup", { x: 40, y: 0 }, 8);
		});

		panning.unsubscribe();
		unsubscribe();

		expect(types).toEqual(expected);
	});

	it("counts a source that emits nothing when subscribed as not running", async () => {
		const expected = await dragTypes();
		const recognizer = new PanRecognizer({
			container,
			failWith: [{ running$: new Subject<boolean>() }],
		});

		expect(await typesFor(recognizer.events$, () => drag(container))).toEqual(
			expected,
		);
	});

	it("ends a gesture before the start event of the source that stops it", async () => {
		const hold = new HoldRecognizer({ container: sourceContainer });
		const pan = new PanRecognizer({ container, failWith: [hold] });
		// the source first: it used to tell its own subscribers before the pan
		const recognizable = new Recognizable({ recognizers: [hold, pan] });

		const events = await eventsFor(recognizable.events$, async () => {
			sendPointer(container, "pointerdown", { x: 0, y: 0 });
			await waitFor(5);
			sendPointer(container, "pointermove", { x: 40, y: 0 });
			await waitFor(5);
			sendPointer(sourceContainer, "pointerdown", { x: 0, y: 0 }, 9);
			await waitFor(5);
			sendPointer(sourceContainer, "pointerup", { x: 0, y: 0 }, 9);
			sendPointer(container, "pointerup", { x: 40, y: 0 });
		});

		expect(events.map(({ event }) => event.type)).toEqual([
			"panStart",
			"panEnd",
			"holdStart",
			"holdEnd",
		]);
	});
});

describe("running$", () => {
	it.each<
		[
			string,
			() => { events$: Observable<unknown>; running$: Observable<boolean> },
			() => Promise<void>,
		]
	>([
		[
			"TapRecognizer",
			() => new TapRecognizer({ container }),
			() => tap(container),
		],
		[
			"SwipeRecognizer",
			() => new SwipeRecognizer({ container }),
			async () => {
				sendPointer(container, "pointerdown", { x: 0, y: 0 });
				await waitFor(5);
				sendPointer(container, "pointermove", { x: 100, y: 0 });
				await waitFor(5);
				sendPointer(container, "pointerup", { x: 200, y: 0 });
				await waitFor(20);
			},
		],
	])("of a %s stays false", async (_, create, gesture) => {
		const recognizer = create();
		const running: boolean[] = [];
		const watching = recognizer.running$.subscribe((value) =>
			running.push(value),
		);
		const events = await eventsFor(recognizer.events$, gesture);

		watching.unsubscribe();

		// it recognized the gesture, so that a running one shows
		expect(events).toHaveLength(1);
		expect(running).toEqual([false]);
	});

	it("stays true when one of two subscribers leaves during a gesture", async () => {
		const pan = new PanRecognizer({ container });
		const staying = pan.events$.subscribe();
		const leaving = pan.events$.subscribe();

		await waitFor(1);
		sendPointer(container, "pointerdown", { x: 0, y: 0 });
		await waitFor(5);
		sendPointer(container, "pointermove", { x: 40, y: 0 });
		await waitFor(5);
		leaving.unsubscribe();

		const running = await firstValueFrom(pan.running$);

		sendPointer(container, "pointerup", { x: 40, y: 0 });
		staying.unsubscribe();

		expect(running).toBe(true);
	});

	it("tells whether a recognizer runs, from its start event to its end event", async () => {
		const pan = new PanRecognizer({ container });
		const subscription = pan.events$.subscribe();
		const running: boolean[] = [];

		await waitFor(1);
		running.push(await firstValueFrom(pan.running$));
		sendPointer(container, "pointerdown", { x: 0, y: 0 });
		await waitFor(5);
		sendPointer(container, "pointermove", { x: 40, y: 0 });
		await waitFor(5);
		running.push(await firstValueFrom(pan.running$));
		sendPointer(container, "pointerup", { x: 40, y: 0 });
		await waitFor(5);
		running.push(await firstValueFrom(pan.running$));

		subscription.unsubscribe();

		expect(running).toEqual([false, true, false]);
	});
});
