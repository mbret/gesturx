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
}

export interface SwipeRecognizerOptions {
	/**
	 * The minimum velocity (px/ms) that the gesture has to obtain by the end event.
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
