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

/**
 * Dispatches a touch pointer event on `container`, from the finger `id`.
 */
export const sendPointer = (
	container: HTMLElement,
	type: "pointerdown" | "pointermove" | "pointerup",
	{ x, y }: Point,
	id = 1,
) => {
	const event = new PointerEvent(type, {
		clientX: x,
		clientY: y,
		pointerId: id,
		pointerType: "touch",
		// a move presses no button
		button: type === "pointermove" ? -1 : 0,
		bubbles: true,
	});

	// happy-dom does not derive them from clientX and clientY
	// @ts-expect-error
	event.x = x;
	// @ts-expect-error
	event.y = y;

	container.dispatchEvent(event);
};

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
