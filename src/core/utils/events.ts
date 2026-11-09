import {
	filter,
	map,
	merge,
	mergeMap,
	type Observable,
	of,
	scan,
	takeWhile,
} from "rxjs";
import { isDefined } from "./utils";

export function matchPointer(pointer: PointerEvent) {
	return (stream: Observable<PointerEvent>) =>
		stream.pipe(
			filter((newPointer) => newPointer.pointerId === pointer.pointerId),
		);
}

/**
 * Whether `event` releases its pointer: the pointer lifts, the browser takes it
 * over, or its context menu opens. A mouse that moves with no button pressed
 * is released too: the page didn't receive its `pointerup`.
 */
export const isPointerOffEvent = (event: PointerEvent) =>
	event.type === "pointerup" ||
	event.type === "pointercancel" ||
	event.type === "contextmenu" ||
	(event.type === "pointermove" &&
		event.pointerType === "mouse" &&
		event.buttons === 0);

/**
 * A press of the primary button: a left click, a finger or a pen's tip. A
 * right click is for the context menu, a middle click for the browser, and a
 * pen's barrel button or eraser for the app. Every recognizer tracks a pointer
 * from such a press, so a pointer pressed with another button starts nothing:
 * no tap, pan or pinch, and no share of a multi tap.
 *
 * @see https://w3c.github.io/pointerevents/#the-button-property
 */
export const isPrimaryButtonPress = (event: PointerEvent) => event.button === 0;

/**
 * Track all pointerEvent for active fingers
 */
export const trackPointers =
	({
		pointerEvent$,
	}: {
		pointerEvent$: Observable<PointerEvent>;
		/**
		 * Setting this value to false will not update the list
		 * on pointer move. Use it if you only need to track number of active
		 * fingers.
		 */
		trackMove: boolean;
	}) =>
	(stream: Observable<PointerEvent>) => {
		type PointersState = {
			event: PointerEvent;
			pointers: Record<number, PointerEvent | undefined>;
		};

		return stream.pipe(
			mergeMap((pointerDown) =>
				merge(
					of(pointerDown),
					pointerEvent$.pipe(filter(({ type }) => type !== "pointerdown")),
				).pipe(
					matchPointer(pointerDown),
					takeWhile((event) => !isPointerOffEvent(event), true),
				),
			),
			scan<PointerEvent, PointersState, undefined>((acc, event) => {
				if (isPointerOffEvent(event)) {
					const { [event.pointerId]: _deleted, ...rest } = acc?.pointers ?? {};

					void _deleted;

					return {
						event,
						pointers: rest,
					};
				}

				return {
					event,
					pointers: {
						...(acc?.pointers ?? {}),
						[event.pointerId]: event,
					},
				};
			}, undefined),
			map(({ event, pointers }) => ({
				event,
				pointers: Object.values(pointers).filter(isDefined),
			})),
		);
	};
