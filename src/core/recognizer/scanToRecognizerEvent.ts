import { map, type Observable, scan } from "rxjs";
import { isPointerOffEvent } from "../utils/events";
import {
	calculateAngleDelta,
	calculateAverageDistance,
	calculateCentroid,
} from "../utils/geometry";
import { calculateVelocity } from "../utils/utils";
import type { RecognizerEvent } from "./RecognizerEvent";

export interface RecognizerEventInput {
	event: PointerEvent;
	latestActivePointers: PointerEvent[];
}

interface RecognizerEventState extends RecognizerEventInput {
	startTime: number;
	center: { x: number; y: number };
	deltaX: number;
	deltaY: number;
	deltaPointersAngle: number;
}

const calculateNewDelta = (
	newCenter: { x: number; y: number },
	prevCenter: { x: number; y: number },
	prevDeltaX: number,
	prevDeltaY: number,
) => {
	const deltaX = newCenter.x - prevCenter.x + prevDeltaX;
	const deltaY = newCenter.y - prevCenter.y + prevDeltaY;

	return {
		deltaX,
		deltaY,
	};
};

/**
 * Whether the coordinates of `event` can be far from the fingers: the browser
 * took the pointer over, or the page missed its release. The deltas ignore
 * such an event.
 */
const isOutOfSync = (event: PointerEvent) =>
	event.type === "pointercancel" ||
	(event.type === "pointermove" && isPointerOffEvent(event));

export const scanToRecognizerEvent = <T extends RecognizerEventInput>(
	stream: Observable<T>,
): Observable<RecognizerEvent> => {
	const getCenterFromData = (data: T) =>
		calculateCentroid(
			!data.latestActivePointers.length
				? [data.event]
				: data.latestActivePointers,
		);

	return stream.pipe(
		scan<T, RecognizerEventState, undefined>((acc, curr) => {
			const newCenter = getCenterFromData(curr);
			const prevCenter = acc?.center ?? newCenter;
			const prevDeltaX = acc?.deltaX ?? 0;
			const prevDeltaY = acc?.deltaY ?? 0;
			const prevActivePointersNumber = acc?.latestActivePointers?.length ?? 1;
			const currActivePointersNumber = curr.latestActivePointers?.length ?? 1;

			const hasAddedOrRemovedAFinger =
				prevActivePointersNumber !== currActivePointersNumber;

			const hasAtLeastOneFinger = currActivePointersNumber > 0;

			const { deltaX, deltaY } =
				(hasAddedOrRemovedAFinger && hasAtLeastOneFinger) ||
				isOutOfSync(curr.event)
					? calculateNewDelta(newCenter, newCenter, prevDeltaX, prevDeltaY)
					: calculateNewDelta(newCenter, prevCenter, prevDeltaX, prevDeltaY);

			const { degreesDelta: deltaPointersAngle } =
				prevActivePointersNumber === currActivePointersNumber &&
				prevActivePointersNumber >= 2 &&
				currActivePointersNumber >= 2 &&
				!isOutOfSync(curr.event)
					? calculateAngleDelta(
							acc?.latestActivePointers ?? [],
							curr.latestActivePointers ?? [],
						)
					: { degreesDelta: 0 };

			return {
				startTime: Date.now(),
				...acc,
				...curr,
				center: newCenter,
				deltaX,
				deltaY,
				deltaPointersAngle,
			};
		}, undefined),
		map((data) => {
			const {
				deltaX,
				deltaY,
				latestActivePointers,
				startTime,
				center,
				event,
				deltaPointersAngle,
			} = data;
			const events = latestActivePointers ?? [];

			// Calculate the change in time
			const now = Date.now();
			const delay = now - startTime;

			const { velocityX, velocityY } = calculateVelocity(delay, deltaX, deltaY);
			const pointersAverageDistance =
				calculateAverageDistance(latestActivePointers);

			return {
				deltaX,
				deltaY,
				velocityX,
				velocityY,
				delay,
				center,
				pointers: events,
				startTime,
				event,
				deltaPointersAngle,
				pointersAverageDistance,
			} satisfies RecognizerEvent;
		}),
	);
};
