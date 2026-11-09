import { useEffect, useState } from "react";
import { distinctUntilChanged, fromEvent, map, startWith } from "rxjs";
import {
	type FailWith,
	HoldRecognizer,
	PanRecognizer,
	PinchRecognizer,
	Recognizable,
	RotateRecognizer,
	SwipeRecognizer,
	TapRecognizer,
} from "../core";

export type AppRecognizable = ReturnType<
	typeof useRecognizable
>["recognizable"];

/**
 * Example of how to fail a gesture on specific event
 */
const failWithTextSelection: FailWith = {
	// from the selection when subscribed, then at each change
	running$: fromEvent(document, "selectionchange").pipe(
		startWith(undefined),
		map(() => !!document.getSelection()?.toString()),
		distinctUntilChanged(),
	),
};

const panRecognizer = new PanRecognizer({
	failWith: [failWithTextSelection],
});
const swipeRecognizer = new SwipeRecognizer({
	failWith: [failWithTextSelection],
});
const rotateRecognizer = new RotateRecognizer();
const pinchRecognizer = new PinchRecognizer();
const holdRecognizer = new HoldRecognizer();
const tapRecognizer = new TapRecognizer({
	failWith: [panRecognizer],
});

export const useRecognizable = () => {
	const [container, containerRef] = useState<HTMLElement | undefined | null>();
	const [recognizable] = useState(
		() =>
			new Recognizable({
				recognizers: [
					tapRecognizer,
					panRecognizer,
					swipeRecognizer,
					rotateRecognizer,
					pinchRecognizer,
					holdRecognizer,
				],
			}),
	);

	useEffect(() => {
		if (container) {
			recognizable.update({ container });
		}
	}, [container, recognizable]);

	return { recognizable, containerRef };
};
