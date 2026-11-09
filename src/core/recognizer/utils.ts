import { EMPTY, fromEvent, merge, mergeMap, of } from "rxjs";
import { followPointer, isPrimaryButtonPress } from "../utils/events";

/**
 * Each press of the primary button in `container`, then the events of its
 * pointer until its release, also outside the container.
 */
export const getPointerEvents = ({
	container,
	afterEventReceived,
}: {
	container: HTMLElement;
	afterEventReceived: (event: PointerEvent) => PointerEvent;
}) =>
	fromEvent<PointerEvent>(container, "pointerdown").pipe(
		mergeMap((event) => {
			const pointerDown = afterEventReceived(event);

			if (!isPrimaryButtonPress(pointerDown)) {
				return EMPTY;
			}

			return merge(
				of(pointerDown),
				followPointer({
					// the document of the press, as the container can move to another one
					document: container.ownerDocument,
					pointerId: event.pointerId,
					afterEventReceived,
				}),
			);
		}),
	);
