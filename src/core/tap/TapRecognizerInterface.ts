import type { Observable } from "rxjs";
import type { Recognizer, RecognizerConfig } from "../recognizer/Recognizer";
import type { RecognizerEvent } from "../recognizer/RecognizerEvent";

export interface TapEvent extends RecognizerEvent {
	type: "tap";
	taps: number;
}

export interface TapRecognizerOptions {
	/**
	 * The time in ms to wait after a release for one more press. A longer time
	 * makes a multi tap easier, and delays every tap by as much.
	 *
	 * @default 300 with `maxTaps` of 2 or more, 0 otherwise
	 */
	multiTapThreshold?: number;

	/**
	 * Maximum time you allow a finger to be pressed on the screen before cancelling the gesture.
	 *
	 * This can be used to allow long press for example.
	 * The default value does not really allow long press but rather accomodate for slower
	 * taps.
	 *
	 * @default 150
	 */
	maximumPressTime?: number;

	/**
	 * Maximum number of taps allowed for the gesture. Going above will ignore the gesture.
	 * Going below will register a gesture with the number of taps.
	 *
	 * For example you can allow single and double tap only by setting `2` as value.
	 *
	 * @default 1
	 */
	maxTaps?: number;

	/**
	 * A tolerance value which allows the user to move their finger about a radius measured in pixels.
	 * This allows the Tap gesture to be triggered more easily since a User might move their
	 * finger slightly during a tap event.
	 *
	 * @default 10
	 */
	tolerance?: number;
}

export interface TapRecognizerInterface
	extends Recognizer<TapRecognizerOptions, TapEvent> {
	events$: Observable<TapEvent>;

	update(options: RecognizerConfig<TapRecognizerOptions>): void;
}
