import type { Observable } from "rxjs";
import type { Recognizer, RecognizerConfig } from "../recognizer/Recognizer.ts";
import type { RecognizerEvent } from "../recognizer/RecognizerEvent.ts";

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
