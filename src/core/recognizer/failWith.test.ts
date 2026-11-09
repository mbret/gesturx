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

/** A hold on the source container, from a press of the finger 9. */
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

describe("failWith", () => {
	it("blocks a recognizer subscribed while its source runs", async () => {
		const expected = await typesFor(
			new PanRecognizer({ container }).events$,
			() => drag(container),
		);
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

	it("keeps blocking a recognizer when another one of the same source leaves", async () => {
		const { source, press, release, unsubscribe } = holdSource();
		const leaving = new PanRecognizer({ container, failWith: [source] });
		const recognizer = new PanRecognizer({ container, failWith: [source] });
		const leavingSubscription = leaving.events$.subscribe();

		const types = await typesFor(recognizer.events$, async () => {
			press();
			await waitFor(5);
			leavingSubscription.unsubscribe();
			await drag(container);
			await release();
		});

		unsubscribe();

		expect(types).toEqual([]);
	});

	it("lets a recognizer run once its source was stopped by its own failWith", async () => {
		const expected = await typesFor(
			new PanRecognizer({ container }).events$,
			() => drag(container),
		);
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
		const expected = await typesFor(
			new PanRecognizer({ container }).events$,
			() => drag(container),
		);
		const recognizer = new PanRecognizer({
			container,
			failWith: [{ running$: new Subject<boolean>() }],
		});

		expect(await typesFor(recognizer.events$, () => drag(container))).toEqual(
			expected,
		);
	});
});

describe("running$", () => {
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
