import { buffer, first, lastValueFrom, tap, timer } from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import { createContainer, sendPointer } from "../../tests/utils";
import { TapRecognizer } from "./TapRecognizer";

const waitFor = (time: number) =>
	new Promise((resolve) => setTimeout(resolve, time));

describe("TapGestureRecognizer", () => {
	let container = document.createElement("div");

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	function createPointerEvent({
		type,
		x,
		y,
		identifier,
	}: {
		type: string;
		x: number;
		y: number;
		identifier: number;
	}) {
		const event = new PointerEvent(type, {
			clientX: x,
			clientY: y,
			pointerId: identifier,
			pointerType: "touch",
			bubbles: true,
		});

		// @ts-expect-error
		event.x = x;
		// @ts-expect-error
		event.y = y;

		return event;
	}

	function sendPointerEvent({
		type,
		x,
		y,
		container,
		identifier,
	}: {
		container: HTMLElement;
		type: string;
		x: number;
		y: number;
		identifier: number;
	}) {
		const event = createPointerEvent({
			type,
			x,
			y,
			identifier,
		});

		sendPointerEventFromEvent({ event, container });
	}

	function sendPointerEventFromEvent({
		event,
		container,
	}: {
		event: PointerEvent;
		container: HTMLElement;
	}) {
		container.dispatchEvent(event);
	}

	it("should detect a single tap", async () => {
		const multiTapThreshold = 5;
		const waitLongEnough$ = timer(100);
		const recognizer = new TapRecognizer({
			container,
			options: {
				multiTapThreshold,
			},
		});

		const values = await lastValueFrom(
			recognizer.events$.pipe(
				tap({
					subscribe: async () => {
						await waitFor(1);

						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerdown",
							x: 0,
							y: 0,
						});
						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerup",
							x: 0,
							y: 0,
						});
					},
				}),
				buffer(waitLongEnough$),
				first(),
			),
		);

		expect(values).toMatchObject([{ type: "tap", taps: 1 }]);
	});

	it("should detect a double tap", async () => {
		const multiTapThreshold = 5;
		const waitLongEnough$ = timer(multiTapThreshold * 2);
		const recognizer = new TapRecognizer({
			container,
			options: {
				multiTapThreshold,
				maxTaps: 2,
			},
		});

		const values = await lastValueFrom(
			recognizer.events$.pipe(
				tap({
					subscribe: async () => {
						await waitFor(1);

						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerdown",
							x: 0,
							y: 0,
						});
						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerup",
							x: 0,
							y: 0,
						});
						sendPointerEvent({
							container,
							identifier: 2,
							type: "pointerdown",
							x: 0,
							y: 0,
						});
						sendPointerEvent({
							container,
							identifier: 2,
							type: "pointerup",
							x: 0,
							y: 0,
						});
					},
				}),
				buffer(waitLongEnough$),
				first(),
			),
		);

		expect(values).toMatchObject([{ type: "tap", taps: 2 }]);
	});

	it("should detect a triple tap", async () => {
		const multiTapThreshold = 5;
		const recognizer = new TapRecognizer({
			container,
			options: {
				multiTapThreshold,
				maxTaps: 3,
			},
		});
		const waitLongEnough$ = timer(100);

		const values = await lastValueFrom(
			recognizer.events$.pipe(
				tap({
					subscribe: () => {
						setTimeout(() => {
							sendPointerEvent({
								container,
								identifier: 1,
								type: "pointerdown",
								x: 0,
								y: 0,
							});
							sendPointerEvent({
								container,
								identifier: 1,
								type: "pointerup",
								x: 0,
								y: 0,
							});
							sendPointerEvent({
								container,
								identifier: 1,
								type: "pointerdown",
								x: 0,
								y: 0,
							});
							sendPointerEvent({
								container,
								identifier: 1,
								type: "pointerup",
								x: 0,
								y: 0,
							});
							sendPointerEvent({
								container,
								identifier: 1,
								type: "pointerdown",
								x: 0,
								y: 0,
							});
							sendPointerEvent({
								container,
								identifier: 1,
								type: "pointerup",
								x: 0,
								y: 0,
							});
						});
					},
				}),
				buffer(waitLongEnough$),
				first(),
			),
		);

		expect(values).toMatchObject([{ type: "tap", taps: 3 }]);
	});

	it("should not detect a double tap if the second tap is after threshold", async () => {
		const multiTapThreshold = 5;
		const waitLongEnough$ = timer(100);
		const recognizer = new TapRecognizer({
			container,
			options: {
				multiTapThreshold,
				maxTaps: 2,
			},
		});

		const values = await lastValueFrom(
			recognizer.events$.pipe(
				tap({
					subscribe: async () => {
						await waitFor(1);

						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerdown",
							x: 0,
							y: 0,
						});
						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerup",
							x: 0,
							y: 0,
						});

						await waitFor(multiTapThreshold + 5);

						sendPointerEvent({
							container,
							identifier: 2,
							type: "pointerdown",
							x: 0,
							y: 0,
						});
						sendPointerEvent({
							container,
							identifier: 2,
							type: "pointerup",
							x: 0,
							y: 0,
						});
					},
				}),
				buffer(waitLongEnough$),
				first(),
			),
		);

		expect(values.length).toBe(2);
		expect(values).toMatchObject([
			{ type: "tap", taps: 1, pointers: [{ pointerId: 1 }] },
			{ type: "tap", taps: 1, pointers: [{ pointerId: 2 }] },
		]);
	});

	it("should not trigger tap if moved too much between down and up", async () => {
		const multiTapThreshold = 5;
		const waitLongEnough$ = timer(100);
		const recognizer = new TapRecognizer({
			container,
			options: {
				multiTapThreshold,
				tolerance: 5,
			},
		});

		const values = await lastValueFrom(
			recognizer.events$.pipe(
				tap({
					subscribe: async () => {
						await waitFor(1);

						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerdown",
							x: 0,
							y: 0,
						});

						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerup",
							x: 50,
							y: 50,
						});
					},
				}),
				buffer(waitLongEnough$),
				first(),
			),
		);

		expect(values.length).toBe(0);
	});

	it("should not detect a tap if the pointer is held down too long", async () => {
		const multiTapThreshold = 5;
		const maximumPressTime = 10;
		const waitLongEnough$ = timer(100);
		const recognizer = new TapRecognizer({
			container,
			options: {
				multiTapThreshold,
				tolerance: 5,
				maximumPressTime,
				maxTaps: 1,
			},
		});

		const values = await lastValueFrom(
			recognizer.events$.pipe(
				tap({
					subscribe: async () => {
						await waitFor(1);

						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerdown",
							x: 0,
							y: 0,
						});

						await waitFor(maximumPressTime - 5);

						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerup",
							x: 0,
							y: 0,
						});

						await waitFor(multiTapThreshold * 2);

						sendPointerEvent({
							container,
							identifier: 2,
							type: "pointerdown",
							x: 0,
							y: 0,
						});

						await waitFor(maximumPressTime);

						sendPointerEvent({
							container,
							identifier: 2,
							type: "pointerup",
							x: 0,
							y: 0,
						});
					},
				}),
				buffer(waitLongEnough$),
				first(),
			),
		);

		expect(values.length).toBe(1);
		expect(values).toMatchObject([
			{ type: "tap", taps: 1, pointers: [{ pointerId: 1 }] },
		]);
	});

	it("should ignore taps when there are simultaneous pointers active", async () => {
		const recognizer = new TapRecognizer({ container });
		const waitLongEnough$ = timer(100);

		const values = await lastValueFrom(
			recognizer.events$.pipe(
				tap({
					subscribe: () => {
						setTimeout(() => {
							sendPointerEvent({
								container,
								identifier: 1,
								type: "pointerdown",
								x: 0,
								y: 0,
							});
							sendPointerEvent({
								container,
								identifier: 2,
								type: "pointerdown",
								x: 10,
								y: 10,
							});
							sendPointerEvent({
								container,
								identifier: 1,
								type: "pointerup",
								x: 0,
								y: 0,
							});
							sendPointerEvent({
								container,
								identifier: 2,
								type: "pointerup",
								x: 10,
								y: 10,
							});
						});
					},
				}),
				buffer(waitLongEnough$),
				first(),
			),
		);

		expect(values.length).toBe(0); // Assuming the recognizer should ignore simultaneous taps
	});

	it("should ignore one tap if there is more than one tap", async () => {
		const recognizer = new TapRecognizer({
			container,
			options: {
				multiTapThreshold: 10,
				maxTaps: 1,
			},
		});

		const waitLongEnough$ = timer(100);

		const values = await lastValueFrom(
			recognizer.events$.pipe(
				tap({
					subscribe: async () => {
						await waitFor(1);

						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerdown",
							x: 0,
							y: 0,
						});
						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerup",
							x: 0,
							y: 0,
						});

						await waitFor(1);

						sendPointerEvent({
							container,
							identifier: 2,
							type: "pointerdown",
							x: 0,
							y: 0,
						});
						sendPointerEvent({
							container,
							identifier: 2,
							type: "pointerup",
							x: 0,
							y: 0,
						});
					},
				}),
				buffer(waitLongEnough$),
				first(),
			),
		);

		expect(values.length).toBe(0);
	});

	it("should ignore taps when a second tap is outside of position threshold", async () => {
		const recognizer = new TapRecognizer({
			container,
			options: {
				tolerance: 5,
				multiTapThreshold: 10,
				maxTaps: Number.POSITIVE_INFINITY,
			},
		});

		const waitLongEnough$ = timer(100);

		const values = await lastValueFrom(
			recognizer.events$.pipe(
				tap({
					subscribe: async () => {
						// await waitFor(1)

						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerdown",
							x: 0,
							y: 0,
						});
						sendPointerEvent({
							container,
							identifier: 1,
							type: "pointerup",
							x: 0,
							y: 0,
						});

						// await waitFor(1)

						sendPointerEvent({
							container,
							identifier: 2,
							type: "pointerdown",
							x: 10,
							y: 10,
						});
						sendPointerEvent({
							container,
							identifier: 2,
							type: "pointerup",
							x: 10,
							y: 10,
						});
					},
				}),
				buffer(waitLongEnough$),
				first(),
			),
		);

		expect(values.length).toBe(0);
	});
});

describe("TapRecognizer with a press still down when the taps would end", () => {
	/**
	 * Taps once, then presses again and keeps the finger down for `holdFor`
	 * ms, longer than `multiTapThreshold`. Logs the taps, and when the finger
	 * is lifted.
	 */
	const tapThenHold = async (
		options: { maximumPressTime: number },
		holdFor: number,
	) => {
		const container = createContainer();
		const recognizer = new TapRecognizer({
			container,
			options: { maxTaps: 2, multiTapThreshold: 50, ...options },
		});
		const log: string[] = [];
		const subscription = recognizer.events$.subscribe(({ taps }) => {
			log.push(`taps: ${taps}`);
		});

		await waitFor(1);
		sendPointer(container, "pointerdown", { x: 0, y: 0 });
		await waitFor(10);
		sendPointer(container, "pointerup", { x: 0, y: 0 });
		await waitFor(10);
		sendPointer(container, "pointerdown", { x: 0, y: 0 });
		await waitFor(holdFor);
		log.push("lifted");
		sendPointer(container, "pointerup", { x: 0, y: 0 });
		await waitFor(200);

		subscription.unsubscribe();

		return log;
	};

	it("counts it once it's lifted", async () => {
		expect(await tapThenHold({ maximumPressTime: 5000 }, 100)).toEqual([
			"lifted",
			"taps: 2",
		]);
	});

	it("ignores the taps if it's held longer than maximumPressTime", async () => {
		expect(await tapThenHold({ maximumPressTime: 100 }, 200)).toEqual([
			"lifted",
		]);
	});
});
