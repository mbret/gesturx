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
import { scheduleUpdate } from "../recognizer/updates";
import type {
	RecognizableInterface,
	RecognizableState,
} from "./RecognizableInterface";

export type { RecognizableState };

/**
 * Sets `touch-action: none` on the container, and `user-select: none` with
 * `disableTextSelection`. Returns a function that sets them back.
 */
const applyStyles = (container: HTMLElement, disableTextSelection: boolean) => {
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
type RecognizableUpdate<T extends Recognizer<any, any>[]> = Partial<
	Omit<RecognizableOptions<T>, "recognizers">
>;

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

	/** The latest container it got, `null` included. */
	private container: HTMLElement | null = null;
	private disableTextSelection = false;
	private restoreStyles = () => {};
	/** The updates made while an update runs, as from an end handler. */

	constructor({ recognizers, ...config }: RecognizableOptions<T>) {
		this.recognizers = recognizers;

		this.events$ = merge(
			...recognizers.map((recognizer) =>
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

		this.update(config);
	}

	public update(config: RecognizableUpdate<T>) {
		scheduleUpdate(() => this.apply(config));
	}

	private apply({
		disableTextSelection,
		container,
		...rest
	}: RecognizableUpdate<T>) {
		const changesStyles =
			(container !== undefined && container !== this.container) ||
			(disableTextSelection !== undefined &&
				disableTextSelection !== this.disableTextSelection);

		if (container !== undefined) {
			this.container = container;
		}

		if (disableTextSelection !== undefined) {
			this.disableTextSelection = disableTextSelection;
		}

		if (changesStyles) {
			this.restoreStyles();
			this.restoreStyles = this.container
				? applyStyles(this.container, this.disableTextSelection)
				: () => {};
		}

		for (const recognizer of this.recognizers) {
			recognizer.update(
				container === undefined ? rest : { ...rest, container },
			);
		}
	}
}
