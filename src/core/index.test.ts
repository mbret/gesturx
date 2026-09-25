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
});
