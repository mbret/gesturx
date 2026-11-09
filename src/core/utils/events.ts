import {
	filter,
	fromEvent,
	map,
	merge,
	type Observable,
	scan,
	takeWhile,
} from "rxjs";

export function matchPointer(pointer: PointerEvent) {
	return (stream: Observable<PointerEvent>) =>
		stream.pipe(
			filter((newPointer) => newPointer.pointerId === pointer.pointerId),
		);
}

/**
 * Whether the browser's `event` releases its pointer. A mouse or pen move with
 * no button pressed releases it too, because the page didn't receive the
 * `pointerup`.
 */
const releasesPointer = (event: PointerEvent) =>
	event.type === "pointerup" ||
	event.type === "pointercancel" ||
	event.type === "contextmenu" ||
	(event.type === "pointermove" &&
		(event.pointerType === "mouse" || event.pointerType === "pen") &&
		event.buttons === 0);

/**
 * The releases that `followPointer` found, as `afterEventReceived` changed
 * them. A changed event can lose the fields that tell a release.
 */
const releases = new WeakSet<PointerEvent>();

/** Whether `event`, from `followPointer`, releases its pointer. */
export const isPointerOffEvent = (event: PointerEvent) => releases.has(event);

/**
 * A press of the primary button: a left click, a finger or a pen's tip. A
 * right click is for the context menu, a middle click for the browser, and a
 * pen's barrel button or eraser for the app.
 *
 * @see https://w3c.github.io/pointerevents/#the-button-property
 */
export const isPrimaryButtonPress = (event: PointerEvent) => event.button === 0;

/**
 * The events of the pointer `pointerId` on `document`, as `afterEventReceived`
 * changes them, until its release.
 */
export const followPointer = ({
	document,
	pointerId,
	afterEventReceived,
}: {
	document: Document;
	pointerId: number;
	afterEventReceived: (event: PointerEvent) => PointerEvent;
}) =>
	merge(
		// in the capture phase, so that an element that stops their propagation can't hide them
		...["pointerdown", "pointermove", "pointerup", "pointercancel"].map(
			(type) => fromEvent<PointerEvent>(document, type, { capture: true }),
		),
		// in the bubble phase, so that an element that stops its propagation keeps the gesture
		fromEvent<PointerEvent>(document, "contextmenu"),
	).pipe(
		filter((event) => event.pointerId === pointerId),
		// a new press of the pointer cancels the press whose release the page missed
		map((event) =>
			event.type === "pointerdown"
				? new PointerEvent("pointercancel", event)
				: event,
		),
		takeWhile((event) => !releasesPointer(event), true),
		map((event) => {
			const received = afterEventReceived(event);

			if (releasesPointer(event)) {
				releases.add(received);
			}

			return received;
		}),
	);

type TrackedPointers = {
	event?: PointerEvent;
	pointers: Record<number, PointerEvent>;
};

/**
 * The pressed pointers after each event of `pointerEvent$`, which has each
 * press, then the events of its pointer until its release. It skips the
 * events of a pointer pressed before it subscribed.
 */
export const trackPointers = (pointerEvent$: Observable<PointerEvent>) =>
	pointerEvent$.pipe(
		scan<PointerEvent, TrackedPointers>(
			({ pointers }, event) => {
				if (event.type !== "pointerdown" && !(event.pointerId in pointers)) {
					return { pointers };
				}

				const { [event.pointerId]: _previous, ...others } = pointers;

				return {
					event,
					pointers: isPointerOffEvent(event)
						? others
						: { ...others, [event.pointerId]: event },
				};
			},
			{ pointers: {} },
		),
		filter(
			(tracked): tracked is Required<TrackedPointers> =>
				tracked.event !== undefined,
		),
		map(({ event, pointers }) => ({
			event,
			pointers: Object.values(pointers),
		})),
	);
