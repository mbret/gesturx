import {
	EMPTY,
	filter,
	fromEvent,
	map,
	merge,
	mergeMap,
	of,
	takeWhile,
} from "rxjs";
import { isPointerOffEvent, isPrimaryButtonPress } from "../utils/events";

/**
 * The events of the pointer `pointerId` until its release, wherever it goes.
 * They come in the capture phase, so that an element that stops their
 * propagation can't hide them.
 */
const followPointer = (document: Document, pointerId: number) =>
	merge(
		...["pointermove", "pointerup", "pointercancel", "contextmenu"].map(
			(type) => fromEvent<PointerEvent>(document, type, { capture: true }),
		),
	).pipe(
		filter((event) => event.pointerId === pointerId),
		takeWhile((event) => !isPointerOffEvent(event), true),
	);

/**
 * Each press of the primary button in `container`, then the events of its
 * pointer until its release, also outside the container. `afterEventReceived`
 * changes each of them, once the follow has read the `pointerId` and the type
 * that the browser gave.
 */
export const getPointerEvents = ({
	container,
	afterEventReceived = (event) => event,
}: {
	container: HTMLElement;
	afterEventReceived?: (event: PointerEvent) => PointerEvent;
}) =>
	fromEvent<PointerEvent>(container, "pointerdown").pipe(
		mergeMap((event) => {
			const pointerDown = afterEventReceived(event);

			if (!isPrimaryButtonPress(pointerDown)) {
				return EMPTY;
			}

			return merge(
				of(pointerDown),
				// the document of the press, as the container can move to another one
				followPointer(container.ownerDocument, event.pointerId).pipe(
					map(afterEventReceived),
				),
			);
		}),
	);
