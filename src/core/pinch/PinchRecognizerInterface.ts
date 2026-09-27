import type { Observable } from "rxjs";
import type { Recognizer, RecognizerConfig } from "../recognizer/Recognizer";
import type { RecognizerEvent } from "../recognizer/RecognizerEvent";

export interface PinchEvent extends RecognizerEvent {
	type: "pinchStart" | "pinchMove" | "pinchEnd";
	/**
	 * Scale since the pinch started, from the average distance between the
	 * fingers. A finger touching or lifting doesn't change it.
	 */
	scale: number;
	/**
	 * Change in the average distance between the fingers since the pinch
	 * started. A finger touching or lifting doesn't change it.
	 */
	distance: number;
	/**
	 * Delta distance between events
	 */
	deltaDistance: number;
	/**
	 * Delta scale between events
	 */
	deltaDistanceScale: number;
}

export interface PinchRecognizerOptions {
	posThreshold?: number;
}

export interface PinchRecognizerInterface
	extends Recognizer<PinchRecognizerOptions, PinchEvent> {
	events$: Observable<PinchEvent>;

	update(options: RecognizerConfig<PinchRecognizerOptions>): void;
}
