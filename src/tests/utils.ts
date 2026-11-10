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
	type: "pointerdown" | "pointermove" | "pointerup" | "contextmenu",
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
 * from `pointerdown` until `pointerup` or `pointercancel`. Pass `buttons: 0`
 * for a move after a release that the page didn't receive, and
 * `pointerType: "pen"` for a pen.
 */
export const sendMouse = (
	target: EventTarget,
	type:
		| "pointerdown"
		| "pointermove"
		| "pointerleave"
		| "pointerup"
		| "pointercancel"
		| "contextmenu",
	point: Point,
	{
		buttons = type === "pointerup" || type === "pointercancel" ? 0 : 1,
		pointerType = "mouse",
	}: { buttons?: number; pointerType?: "mouse" | "pen" } = {},
) =>
	dispatchPointer(target, type, point, {
		pointerId: 1,
		pointerType,
		button: {
			pointerdown: 0,
			pointerup: 0,
			// the right button opens the context menu
			contextmenu: 2,
			// a move, a leave or a cancel changes no button
			pointermove: -1,
			pointerleave: -1,
			pointercancel: -1,
		}[type],
		buttons,
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
