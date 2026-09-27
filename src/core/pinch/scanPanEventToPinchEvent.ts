import { map, type Observable, scan } from "rxjs";
import type { RecognizerEvent } from "../recognizer/RecognizerEvent";
import type { PinchEvent } from "./PinchRecognizerInterface";

/**
 * What the scale and distance are measured from: an average distance between
 * the fingers, and the scale and distance reached there.
 */
type Reference = Pick<
	PinchEvent,
	"pointersAverageDistance" | "scale" | "distance"
>;

export const scanPanEventToPinchEvent =
	({
		type,
		initialEvent,
	}: {
		type: PinchEvent["type"];
		initialEvent: PinchEvent | RecognizerEvent | undefined;
	}) =>
	(stream: Observable<RecognizerEvent | PinchEvent>) =>
		stream.pipe(
			scan<
				RecognizerEvent | PinchEvent,
				PinchEvent & {
					reference: Reference;
				},
				PinchEvent | RecognizerEvent | undefined
			>((acc, curr) => {
				const previousPointersLength = acc?.pointers.length ?? 0;
				const hasChangedFingers =
					previousPointersLength !== curr.pointers.length;
				const previousPointersAverageDistance =
					acc?.pointersAverageDistance ?? curr.pointersAverageDistance;

				/**
				 * The reference is reset every time we change fingers, as the average
				 * distance between 3 fingers can't be compared with the one between 2:
				 * the scale and distance reached carry over. Otherwise it is the one
				 * of the event we continue from (the pinch start for the first move).
				 * @important in case of 1 finger, distance will be 0
				 */
				const reference: Reference =
					!hasChangedFingers && acc && "reference" in acc
						? acc.reference
						: {
								pointersAverageDistance: hasChangedFingers
									? curr.pointersAverageDistance
									: previousPointersAverageDistance,
								scale: acc && "scale" in acc ? acc.scale : 1,
								distance: acc && "distance" in acc ? acc.distance : 0,
							};

				/**
				 * @important When finger is 1, distance is 0
				 */
				const scale =
					reference.pointersAverageDistance === 0
						? reference.scale
						: reference.scale *
							(curr.pointersAverageDistance /
								reference.pointersAverageDistance);

				const distance =
					reference.distance +
					(curr.pointersAverageDistance - reference.pointersAverageDistance);

				const deltaDistance = hasChangedFingers
					? 0
					: curr.pointersAverageDistance - previousPointersAverageDistance;

				/**
				 * @important When finger is 1, distance is 0
				 * Same when fingers change
				 */
				const deltaDistanceScale =
					hasChangedFingers || previousPointersAverageDistance === 0
						? 1
						: curr.pointersAverageDistance / previousPointersAverageDistance;

				return {
					...acc,
					...curr,
					type,
					reference,
					scale,
					distance,
					deltaDistance,
					deltaDistanceScale,
				};
			}, initialEvent),
			map(({ reference, ...rest }): PinchEvent => rest),
		);
