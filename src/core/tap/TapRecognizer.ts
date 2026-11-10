import {
	buffer,
	debounceTime,
	exhaustMap,
	filter,
	first,
	ignoreElements,
	map,
	merge,
	type Observable,
	of,
	switchMap,
	takeUntil,
	withLatestFrom,
} from "rxjs";
import { Recognizer, type RecognizerConfig } from "../recognizer/Recognizer";
import { scanToRecognizerEvent } from "../recognizer/scanToRecognizerEvent";
import { shareDelivered } from "../recognizer/updates";
import { trackPointers } from "../utils/events";
import { shareLatest } from "../utils/operators";
import { filterNotEmpty } from "../utils/utils";
import { takeWhenOutsideThreshold, takeWhenPressedTooLong } from "./operators";
import type {
	TapEvent,
	TapRecognizerInterface,
	TapRecognizerOptions,
} from "./TapRecognizerInterface";

export type { TapEvent, TapRecognizerOptions };

export class TapRecognizer
	extends Recognizer<TapRecognizerOptions, TapEvent>
	implements TapRecognizerInterface
{
	public events$: Observable<TapEvent>;

	constructor(options?: RecognizerConfig<TapRecognizerOptions>) {
		super(options);

		this.events$ = this.container$.pipe(
			switchMap(() => {
				const activePointers$ = trackPointers(this.pointerEvent$).pipe(
					shareLatest(),
				);

				const hasMoreThanOneActivePointer$ = activePointers$.pipe(
					filter(({ pointers }) => pointers.length > 1),
				);

				/**
				 * Collects the presses until `multiTapThreshold` after a release
				 * that no press followed: a press still down is part of the taps.
				 */
				const bufferPointerDowns =
					(multiTapThreshold: number) => (stream: Observable<PointerEvent>) =>
						stream.pipe(
							buffer(
								merge(this.pointerDown$, this.pointerUp$).pipe(
									debounceTime(multiTapThreshold),
									filter((event) => event.type === "pointerup"),
								),
							),
							first(),
						);

				const tap$ = merge(
					this.pointerDown$,
					activePointers$.pipe(ignoreElements()),
				).pipe(
					exhaustMap((initialPointerEvent) => {
						const { options } = this.configSubject.getValue();
						const maxTaps = options?.maxTaps ?? 1;
						const multiTapThreshold =
							options?.multiTapThreshold ?? (maxTaps > 1 ? 300 : 0);

						const { maximumPressTime = 150, tolerance = 10 } = options ?? {};

						const pointerDowns$ = merge(
							of(initialPointerEvent),
							this.pointerDown$,
						).pipe(shareLatest());

						const pointerDownsBuffered$ = pointerDowns$.pipe(
							bufferPointerDowns(multiTapThreshold),
						);

						/**
						 * Exit condition for `tolerance`
						 */
						const clickedTooFarFromOriginalTap$ = pointerDowns$.pipe(
							takeWhenOutsideThreshold({
								initialPointerEvent,
								pointerEvent$: this.pointerEvent$,
								tolerance,
							}),
						);

						/**
						 * Exit condition for `maximumPressTime`
						 */
						const hasFingersPressedForTooLong$ = pointerDowns$.pipe(
							takeWhenPressedTooLong({
								pointerEvent$: this.pointerEvent$,
								timeout: maximumPressTime,
							}),
						);

						const takeUntil$ = merge(
							this.failWithActive$.pipe(filter((active) => active)),
							// a release that isn't a lift
							this.pointerOff$.pipe(filter(({ type }) => type !== "pointerup")),
							hasMoreThanOneActivePointer$,
							clickedTooFarFromOriginalTap$,
							hasFingersPressedForTooLong$,
						);

						const rawEvent$ = pointerDownsBuffered$.pipe(
							filterNotEmpty,
							filter((events) => events.length <= maxTaps),
							map((events) => {
								// the finger, where it last pressed: `taps` counts the presses
								const lastPress = events[events.length - 1] ?? events[0];

								return {
									type: "tap" as const,
									taps: events.length,
									latestActivePointers: [lastPress],
									event: lastPress,
								};
							}),
							shareLatest(),
						);

						return rawEvent$.pipe(
							scanToRecognizerEvent,
							withLatestFrom(rawEvent$),
							map(([recognizerEvent, { type, taps }]) => ({
								...recognizerEvent,
								type,
								taps,
							})),
							takeUntil(takeUntil$),
						);
					}),
				);

				return tap$;
			}),
			shareDelivered(),
		);
	}

	public update(config: RecognizerConfig<TapRecognizerOptions>): void {
		super.update(config);
	}
}
