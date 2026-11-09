import {
	buffer,
	first,
	lastValueFrom,
	type Observable,
	Subject,
	tap,
} from "rxjs";

export type Point = { x: number; y: number };

export const waitFor = (time: number) =>
	new Promise((resolve) => setTimeout(resolve, time));

export const createContainer = () => {
	const container = document.createElement("div");

	document.body.appendChild(container);

	return container;
};

const dispatchPointer = (
	target: EventTarget,
	type: string,
	{ x, y }: Point,
	init: PointerEventInit,
) => {
	const event = new PointerEvent(type, { clientX: x, clientY: y, ...init });

	// happy-dom does not derive them from clientX and clientY
	// @ts-expect-error
	event.x = x;
	// @ts-expect-error
	event.y = y;

	target.dispatchEvent(event);
};

/**
 * Dispatches a touch pointer event on `container`, from the finger `id`.
 */
export const sendPointer = (
	container: HTMLElement,
	type: "pointerdown" | "pointermove" | "pointerup",
	point: Point,
	id = 1,
) =>
	dispatchPointer(container, type, point, {
		pointerId: id,
		pointerType: "touch",
		// a move presses no button
		button: type === "pointermove" ? -1 : 0,
		bubbles: true,
	});

/**
 * Dispatches a mouse pointer event on `target`, with the left button pressed
 * from `pointerdown` until `pointerup`. A `pointerleave` doesn't bubble, as in
 * a browser.
 */
export const sendMouse = (
	target: EventTarget,
	type: "pointerdown" | "pointermove" | "pointerleave" | "pointerup",
	point: Point,
) =>
	dispatchPointer(target, type, point, {
		pointerId: 1,
		pointerType: "mouse",
		// a move or a leave presses no button
		button: type === "pointerdown" || type === "pointerup" ? 0 : -1,
		buttons: type === "pointerup" ? 0 : 1,
		bubbles: type !== "pointerleave",
	});

/**
 * Everything `events$` emits while `gesture` runs, and shortly after.
 */
export const eventsFor = <T>(
	events$: Observable<T>,
	gesture: () => void | Promise<void>,
) => {
	const done$ = new Subject<void>();

	return lastValueFrom(
		events$.pipe(
			tap({
				subscribe: async () => {
					await waitFor(1);

					await gesture();

					await waitFor(20);

					done$.next();
				},
			}),
			buffer(done$),
			first(),
		),
	);
};
