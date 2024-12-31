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

	update(options: RecognizerConfig<HoldRecognizerOptions>): void;
}
