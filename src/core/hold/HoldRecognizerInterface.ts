import type { Observable } from "rxjs";
import type { Recognizer, RecognizerConfig } from "../recognizer/Recognizer";
import type { RecognizerEvent } from "../recognizer/RecognizerEvent";

export interface HoldEvent extends RecognizerEvent {
	type: "holdStart" | "holdEnd";
}

export interface HoldRecognizerOptions {
	posThreshold?: number;
	delay?: number;
	numInputs?: number;
}

export interface HoldRecognizerInterface
	extends Recognizer<HoldRecognizerOptions, HoldEvent> {
	events$: Observable<HoldEvent>;
	/**
	 * Whether a hold runs, from its holdStart event to its holdEnd event. It
	 * emits the current value when subscribed. Another recognizer's `failWith`
	 * reads it.
	 */
	running$: Observable<boolean>;

	update(options: RecognizerConfig<HoldRecognizerOptions>): void;
}
