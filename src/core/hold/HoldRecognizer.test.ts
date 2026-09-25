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
});
