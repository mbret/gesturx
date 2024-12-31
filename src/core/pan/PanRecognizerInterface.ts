import type { Observable } from "rxjs";
import type { Recognizer, RecognizerConfig } from "../recognizer/Recognizer";
import type { RecognizerEvent } from "../recognizer/RecognizerEvent";

export interface PanEvent extends RecognizerEvent {
	type: "panStart" | "panMove" | "panEnd";
}

export interface PanRecognizerOptions {
	/**
	 * @default 15
	 */
	posThreshold?: number;
	delay?: number;
	numInputs?: number;
}

export interface PanRecognizerInterface
	extends Recognizer<PanRecognizerOptions, PanEvent> {
	events$: Observable<PanEvent>;

	update(options: RecognizerConfig<PanRecognizerOptions>): void;
}
