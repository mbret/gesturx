import {
	combineLatest,
	distinctUntilChanged,
	map,
	merge,
	type Observable,
	type ObservedValueOf,
	share,
} from "rxjs";
import type { Recognizer, RecognizerConfig } from "../recognizer/Recognizer";
import type {
	RecognizableInterface,
	RecognizableState,
} from "./RecognizableInterface";

export type { RecognizableState };

/**
 * Sets `touch-action: none` on the container, and `user-select: none` with
 * `disableTextSelection`. Returns a function that sets them back.
 */
const applyStyles = (
	container: HTMLElement,
	disableTextSelection: boolean | undefined,
) => {
	const { touchAction, userSelect } = container.style;

	/**
	 * We have to disable touch-action otherwise every events will be followed
	 * by a cancel event since the browser will try to handle touch.
	 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
	 */
	container.style.touchAction = "none";

	/**
	 *  Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
	 */
	if (disableTextSelection) {
		container.style.userSelect = "none";
	}

	return () => {
		container.style.touchAction = touchAction;
		container.style.userSelect = userSelect;
	};
};

// biome-ignore lint/suspicious/noExplicitAny: TODO
type RecognizableOptions<T extends Recognizer<any, any>[]> = {
	recognizers: T;
	/**
	 * If you don't need to have text selection, set this to true
	 * to improve dragging gesture. This will prevent accidental
	 * text selection on your component.
	 */
	disableTextSelection?: boolean;
} & RecognizerConfig<unknown>;

// biome-ignore lint/suspicious/noExplicitAny: TODO
export class Recognizable<T extends Recognizer<any, any>[]>
	implements RecognizableInterface<T>
{
	events$: Observable<{
		event: ObservedValueOf<T[number]["events$"]>;
		recognizer: T[number];
	}>;

	recognizers: T;

	state$: Observable<RecognizableState>;

	/** The container of the latest update that passed one, `null` included. */
	private requestedContainer: HTMLElement | null = null;
	private restoreStyles = () => {};

	constructor(options: RecognizableOptions<T>) {
		this.recognizers = options.recognizers;

		this.events$ = merge(
			...options.recognizers.map((recognizer) =>
				recognizer.events$.pipe(map((event) => ({ event, recognizer }))),
			),
		).pipe(share());

		this.state$ = combineLatest(
			this.recognizers.map((recognizer) => recognizer.state$),
		).pipe(
			map((states) =>
				states.reduce((acc, state) => ({
					fingers: Math.max(acc.fingers, state.fingers),
				})),
			),
			distinctUntilChanged(
				(previous, current) => previous.fingers === current.fingers,
			),
		);

		this.update(options);
	}

	public update({
		disableTextSelection,
		container,
		...rest
	}: Partial<Omit<RecognizableOptions<T>, "recognizers">>) {
		// the other fields first, so that an update from an end handler comes after
		for (const recognizer of this.recognizers) {
			recognizer.update(rest);
		}

		if (container === undefined) {
			return;
		}

		this.restoreStyles();
		this.restoreStyles = container
			? applyStyles(container, disableTextSelection)
			: () => {};
		this.requestedContainer = container;

		for (const recognizer of this.recognizers) {
			// an end handler can set another container during this loop, which then stays
			recognizer.update({ container: this.requestedContainer });
		}
	}
}
