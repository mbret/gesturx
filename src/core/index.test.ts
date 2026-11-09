import { describe, expect, expectTypeOf, it } from "vitest";
import * as gesturx from "./index";

describe("gesturx", () => {
	it.each([
		"HoldRecognizer",
		"PanRecognizer",
		"PinchRecognizer",
		"Recognizable",
		"Recognizer",
		"RotateRecognizer",
		"SwipeRecognizer",
		"TapRecognizer",
	])("exports %s", (name) => {
		expect(gesturx).toHaveProperty(name, expect.any(Function));
	});

	it("exports the type of the hold events", () => {
		// only tsc checks it, as part of npm run build
		expectTypeOf<gesturx.HoldEvent["type"]>().toEqualTypeOf<
			"holdStart" | "holdEnd"
		>();
	});

	it("exports the types of the options, the events and the state", () => {
		// only tsc checks it, as part of npm run build
		expectTypeOf<gesturx.HoldRecognizerOptions>().toHaveProperty("numInputs");
		expectTypeOf<gesturx.PanRecognizerOptions>().toHaveProperty("posThreshold");
		expectTypeOf<gesturx.PinchRecognizerOptions>().toHaveProperty(
			"posThreshold",
		);
		expectTypeOf<gesturx.RotateRecognizerOptions>().toHaveProperty("numInputs");
		expectTypeOf<gesturx.SwipeRecognizerOptions>().toHaveProperty(
			"escapeVelocity",
		);
		expectTypeOf<gesturx.TapRecognizerOptions>().toHaveProperty("maxTaps");
		expectTypeOf<gesturx.RecognizerEvent>().toHaveProperty("pointers");
		expectTypeOf<gesturx.RecognizableState>().toHaveProperty("fingers");
	});

	it("takes any recognizer as a failWith source", () => {
		// only tsc checks it, as part of npm run build
		expectTypeOf<gesturx.PanRecognizer>().toExtend<gesturx.FailWith>();
		expectTypeOf<gesturx.PinchRecognizer>().toExtend<gesturx.FailWith>();
		expectTypeOf<gesturx.RotateRecognizer>().toExtend<gesturx.FailWith>();
		expectTypeOf<gesturx.HoldRecognizer>().toExtend<gesturx.FailWith>();
		expectTypeOf<gesturx.TapRecognizer>().toExtend<gesturx.FailWith>();
		expectTypeOf<gesturx.SwipeRecognizer>().toExtend<gesturx.FailWith>();
	});
});
