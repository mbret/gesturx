import type { Observable } from "rxjs";
import type { Recognizer, RecognizerConfig } from "../recognizer/Recognizer";
import type { RecognizerEvent } from "../recognizer/RecognizerEvent";

export interface SwipeEvent extends RecognizerEvent {
	type: "swipe";
	/**
	 * Angle between first pointer and last one in degree
	 *
	 *             (-90)
	 * (+/-180) <-   |   -> (+/-0)
	 *             (+90)
	 */
	angle: number;
	/**
	 * The speed of the finger when it lifts, in px/ms: over its last 100 ms,
	 * or 0 if it stopped for more than 40 ms before it lifted. It can be
	 * negative.
	 */
	velocityX: number;
	/** The same as `velocityX`, on the y axis. */
	velocityY: number;
}

export interface SwipeRecognizerOptions {
	/**
	 * The speed (px/ms) on the x axis or the y axis that the finger must have
	 * when it lifts, as `velocityX` and `velocityY` of the swipe give it.
	 *
	 * @default 0.9
	 */
	escapeVelocity?: number;
}

export interface SwipeRecognizerInterface
	extends Recognizer<SwipeRecognizerOptions, SwipeEvent> {
	events$: Observable<SwipeEvent>;

	update(options: RecognizerConfig<SwipeRecognizerOptions>): void;
}
