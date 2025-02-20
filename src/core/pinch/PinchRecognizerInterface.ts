import type { Observable } from "rxjs";
import type { Recognizer, RecognizerConfig } from "../recognizer/Recognizer";
import type { RecognizerEvent } from "../recognizer/RecognizerEvent";

export interface PinchEvent extends RecognizerEvent {
	type: "pinchStart" | "pinchMove" | "pinchEnd";
	scale: number;
	/**
	 * Distance between start and current
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
