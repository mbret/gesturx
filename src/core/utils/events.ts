import {
	type Observable,
	defer,
	filter,
	fromEvent,
	map,
	merge,
	mergeMap,
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

export const isPointerOffEvent = (pointerEvent: PointerEvent) =>
	pointerEvent.type === "pointerleave" ||
	pointerEvent.type === "pointercancel" ||
	pointerEvent.type === "pointerup";

export const fromPointerDown = ({
	container,
	afterEventReceived = (event) => event,
}: {
	container: HTMLElement;
	afterEventReceived?: (event: PointerEvent) => PointerEvent;
}) =>
	fromEvent<PointerEvent>(container, "pointerdown").pipe(
		map(afterEventReceived),
	);

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

		const pointerUp$ = pointerEvent$.pipe(
			filter((event) => event.type === "pointerup"),
		);
		const pointerLeave$ = pointerEvent$.pipe(
			filter((event) => event.type === "pointerleave"),
		);
		const pointerCancel$ = pointerEvent$.pipe(
			filter((event) => event.type === "pointercancel"),
		);
		const pointerMove$ = pointerEvent$.pipe(
			filter((event) => event.type === "pointermove"),
		);
		const contextMenu$ = fromEvent<PointerEvent>(window, "contextmenu");

		const isPointerRemoved = (event: PointerEvent) =>
			["pointercancel", "pointerleave", "pointerup", "contextmenu"].includes(
				event.type,
			);

		return stream.pipe(
			mergeMap((pointerDown) => {
				const pointerDown$ = defer(() => of(pointerDown));

				const tracking$ = merge(
					pointerDown$,
					merge(
						pointerMove$,
						pointerCancel$,
						pointerLeave$,
						pointerUp$,
						contextMenu$,
					),
				).pipe(
					matchPointer(pointerDown),
					takeWhile((event) => !isPointerRemoved(event), true),
				);

				return tracking$;
			}),
			scan<PointerEvent, PointersState, undefined>((acc, event) => {
				if (isPointerRemoved(event)) {
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
