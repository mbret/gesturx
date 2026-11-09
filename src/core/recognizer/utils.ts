import { fromEvent, map, merge, mergeMap, of, takeWhile } from "rxjs";
import { fromPointerDown, matchPointer } from "../utils/events";

/**
 * Each press in `container`, then the events of its pointer until it is
 * released, also outside the container.
 */
export const getPointerEvents = ({
	container,
	afterEventReceived = (event) => event,
}: {
	container: HTMLElement;
	afterEventReceived?: (event: PointerEvent) => PointerEvent;
}) => {
	const { ownerDocument } = container;
	/**
	 * In the capture phase, so that an element that stops the propagation of
	 * an event can't hide it.
	 */
	const fromDocumentEvent = (type: string) =>
		fromEvent<PointerEvent>(ownerDocument, type, { capture: true });

	return fromPointerDown({ afterEventReceived, container }).pipe(
		mergeMap((pointerDown) =>
			merge(
				of(pointerDown),
				merge(
					fromDocumentEvent("pointermove"),
					fromDocumentEvent("pointerup"),
					fromDocumentEvent("pointercancel"),
				).pipe(
					matchPointer(pointerDown),
					takeWhile(({ type }) => type === "pointermove", true),
					map(afterEventReceived),
				),
			),
		),
	);
};
