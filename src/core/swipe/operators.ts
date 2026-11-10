import { filter, type Observable } from "rxjs";
import type { RecognizerEvent } from "../recognizer/RecognizerEvent";
import { calculateVelocity } from "../utils/utils";

/** The time before the release, in ms, whose moves give its speed. */
export const RELEASE_WINDOW = 100;

/** A finger that doesn't move for this long, in ms, has stopped. */
const STOPPED_AFTER = 40;

/**
 * The speed at the end event, the last of `events`, in px/ms: from the oldest
 * of the events of its last `RELEASE_WINDOW` ms. It is 0 if the finger
 * stopped for more than `STOPPED_AFTER` ms before the end event.
 */
export const releaseVelocity = (events: RecognizerEvent[]) => {
	const end = events[events.length - 1];
	const lastMove = events[events.length - 2];

	if (!end || !lastMove || end.delay - lastMove.delay > STOPPED_AFTER) {
		return { velocityX: 0, velocityY: 0 };
	}

	const oldest =
		events.find(({ delay }) => end.delay - delay <= RELEASE_WINDOW) ?? end;

	return calculateVelocity(
		end.delay - oldest.delay,
		end.deltaX - oldest.deltaX,
		end.deltaY - oldest.deltaY,
	);
};

export const isRecognizedAsSwipe =
	(escapeVelocity: number) => (stream: Observable<RecognizerEvent>) =>
		stream.pipe(
			filter((event) => {
				return (
					Math.abs(event.velocityX) >= escapeVelocity ||
					Math.abs(event.velocityY) >= escapeVelocity
				);
			}),
		);
