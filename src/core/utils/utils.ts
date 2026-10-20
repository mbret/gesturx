import { filter, type Observable } from "rxjs";
import { calculateCentroid } from "./geometry";

export function isDefined<T>(
	arg: T | null | undefined,
): arg is T extends null | undefined ? never : T {
	return arg !== null && arg !== undefined;
}

/**
 * `values` without the ones that aren't set: `undefined`, as forwarding an
 * optional value passes, or `NaN`, as `parseInt` gives for an empty field.
 * Spread over defaults or current values, they then leave them alone.
 */
export const omitUnset = <T extends object>(values: T | undefined) =>
	Object.fromEntries(
		Object.entries(values ?? {}).filter(
			([, value]) => value !== undefined && !Number.isNaN(value),
		),
	) as Partial<T>;

export const hasAtLeastOneItem = <T>(events: T[]): events is [T, ...T[]] =>
	events.length > 0;

export const filterNotEmpty = <T>(
	stream: Observable<T[]>,
): Observable<[T, ...T[]]> => stream.pipe(filter(hasAtLeastOneItem));

export function isWithinPosThreshold(
	startEvent: PointerEvent,
	endEvent: PointerEvent,
	posThreshold: number,
) {
	const start = calculateCentroid([startEvent]);
	const end = calculateCentroid([endEvent]);

	// Determines if the movement qualifies as a drag
	return (
		Math.abs(end.x - start.x) >= posThreshold ||
		Math.abs(end.y - start.y) >= posThreshold
	);
}

/**
 * Avoid division by zero
 * Calculate velocity in pixels per second
 */
export const calculateVelocity = (
	delay: number,
	deltaX: number,
	deltaY: number,
) => {
	const velocityX = delay > 0 ? deltaX / delay : 0;
	const velocityY = delay > 0 ? deltaY / delay : 0;

	return {
		velocityX,
		velocityY,
	};
};
