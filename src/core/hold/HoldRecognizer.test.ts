import { NEVER, Subject } from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createContainer,
	eventsFor,
	sendPointer,
	waitFor,
} from "../../tests/utils";
import { HoldRecognizer } from "./HoldRecognizer";

describe("HoldRecognizer", () => {
	let container = createContainer();

	beforeEach(() => {
		container = createContainer();
	});

	/** Fingers `ids` pressed together, released after `duration`. */
	const hold = async (duration: number, ids = [1]) => {
		for (const id of ids) {
			sendPointer(container, "pointerdown", { x: id * 100, y: 0 }, id);
		}

		await waitFor(duration);

		for (const id of ids) {
			sendPointer(container, "pointerup", { x: id * 100, y: 0 }, id);
		}
	};

	it("recognizes a press as a holdStart and its release as a holdEnd", async () => {
		const recognizer = new HoldRecognizer({ container });

		const events = await eventsFor(recognizer.events$, () => hold(20));

		expect(events.map(({ type }) => type)).toEqual(["holdStart", "holdEnd"]);
	});

	describe("with a delay", () => {
		it("does not start if released before it", async () => {
			const recognizer = new HoldRecognizer({
				container,
				options: { delay: 200 },
			});

			const events = await eventsFor(recognizer.events$, () => hold(20));

			expect(events).toEqual([]);
		});

		it("starts once it elapsed", async () => {
			const recognizer = new HoldRecognizer({
				container,
				options: { delay: 50 },
			});

			const events = await eventsFor(recognizer.events$, () => hold(150));

			expect(events.map(({ type }) => type)).toEqual(["holdStart", "holdEnd"]);
		});
	});

	describe("with numInputs", () => {
		it("does not start with fewer fingers", async () => {
			const recognizer = new HoldRecognizer({
				container,
				options: { numInputs: 2 },
			});

			const events = await eventsFor(recognizer.events$, () => hold(20));

			expect(events).toEqual([]);
		});

		it("starts with that many fingers and ends when one is lifted", async () => {
			const recognizer = new HoldRecognizer({
				container,
				options: { numInputs: 2 },
			});

			const events = await eventsFor(recognizer.events$, () =>
				hold(20, [1, 2]),
			);

			expect(events).toMatchObject([
				{ type: "holdStart", pointers: [{}, {}] },
				{ type: "holdEnd", pointers: [{}] },
			]);
		});
	});

	it("can be updated", async () => {
		const recognizer = new HoldRecognizer({ container });

		recognizer.update({ options: { delay: 200 } });

		const events = await eventsFor(recognizer.events$, () => hold(20));

		expect(events).toEqual([]);
	});

	describe("with failWith", () => {
		it("does not start while it is active", async () => {
			const start$ = new Subject<void>();
			const end$ = new Subject<void>();
			const recognizer = new HoldRecognizer({
				container,
				failWith: [{ start$, end$ }],
			});

			const events = await eventsFor(recognizer.events$, async () => {
				start$.next();
				await hold(20);
				end$.next();
				await hold(20);
			});

			// only the hold after it ended
			expect(events.map(({ type }) => type)).toEqual(["holdStart", "holdEnd"]);
		});

		it("ends an ongoing hold once it becomes active", async () => {
			const start$ = new Subject<void>();
			const recognizer = new HoldRecognizer({
				container,
				failWith: [{ start$, end$: NEVER }],
			});
			const types: string[] = [];
			const subscription = recognizer.events$.subscribe(({ type }) =>
				types.push(type),
			);

			await waitFor(1);
			sendPointer(container, "pointerdown", { x: 100, y: 0 });
			await waitFor(10);
			start$.next();

			expect(types).toEqual(["holdStart", "holdEnd"]);

			await waitFor(5);
			sendPointer(container, "pointerup", { x: 100, y: 0 });
			await waitFor(10);

			// not again once released
			expect(types).toEqual(["holdStart", "holdEnd"]);

			subscription.unsubscribe();
		});
	});
});
