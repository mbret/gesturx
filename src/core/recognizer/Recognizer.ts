import {
	BehaviorSubject,
	combineLatest,
	distinctUntilChanged,
	EMPTY,
	exhaustMap,
	filter,
	finalize,
	first,
	map,
	merge,
	mergeMap,
	type Observable,
	of,
	Subject,
	share,
	skip,
	startWith,
	switchMap,
	takeUntil,
	tap,
	timer,
	withLatestFrom,
} from "rxjs";
import { matchPointer, trackPointers } from "../utils/events";
import { shareLatest } from "../utils/operators";
import { isWithinPosThreshold, omitUnset } from "../utils/utils";
import { filterPointerOff } from "./operators";
import type { RecognizerEvent } from "./RecognizerEvent";
import { scanToRecognizerEvent } from "./scanToRecognizerEvent";
import { getPointerEvents } from "./utils";

export type { RecognizerEvent };

type PanConfig = {
	posThreshold?: number;
	delay?: number;
	/**
	 * Number of inputs to trigger the event.
	 * Default to 1
	 */
	numInputs?: number;
};

const panSettingsOf = (panConfig: PanConfig = {}) => ({
	numInputs: Math.max(1, panConfig.numInputs ?? 1),
	posThreshold: Math.max(0, panConfig.posThreshold ?? 0),
	delay: Math.max(0, panConfig.delay ?? 0),
});

export interface FailWith {
	/**
	 * Whether the source runs. It emits the current value when subscribed,
	 * then each change, as a `BehaviorSubject` does. A source that emits
	 * nothing when subscribed counts as not running until it emits.
	 */
	running$: Observable<boolean>;
}

export type RecognizerConfig<Options> = {
	/**
	 * The element to listen on. `null` detaches the recognizer, and
	 * `undefined` keeps the current element.
	 */
	container?: HTMLElement | null;
	afterEventReceived?: (event: PointerEvent) => PointerEvent;
	options?: Options;
	failWith?: FailWith[];
};

export interface RecognizerPanEvent extends RecognizerEvent {
	type: "start" | "move" | "end";
}

export type State = {
	/**
	 * Fingers of the gesture the recognizer recognizes, as of its latest
	 * event, from its start event until its end event. None the rest of the
	 * time, and none for a gesture recognized once the fingers are lifted,
	 * as a tap or a swipe.
	 */
	fingers: number;
};

export abstract class Recognizer<
	Options extends object = never,
	Event extends RecognizerEvent = RecognizerEvent,
> {
	/** The latest config. Read it, and change it with `update()` only. */
	protected configSubject = new BehaviorSubject<
		Omit<RecognizerConfig<Options>, "container"> & {
			/** `null` while the recognizer is detached. */
			container: HTMLElement | null;
			panConfig?: PanConfig;
		}
	>({ container: null });
	private stateSubject = new BehaviorSubject<State>({
		fingers: 0,
	});
	/** The container of the latest update that passed one, `null` included. */
	private requestedContainer: HTMLElement | null = null;
	private containerChanging = new Subject<void>();
	protected pan$: Observable<RecognizerPanEvent>;
	protected panStart$: Observable<RecognizerEvent>;
	protected panMove$: Observable<RecognizerEvent>;
	protected panEnd$: Observable<RecognizerEvent>;

	protected pointerEvent$: Observable<PointerEvent>;
	protected pointerDown$: Observable<PointerEvent>;
	protected pointerUp$: Observable<PointerEvent>;
	protected pointerCancel$: Observable<PointerEvent>;
	protected pointerMove$: Observable<PointerEvent>;
	protected pointerOff$: Observable<PointerEvent>;

	public state$: Observable<State>;
	/**
	 * Whether a gesture is in progress, as `state$` tells: `true` from the start
	 * event to the end event, or until the last subscriber of `events$` leaves.
	 * It emits the current value when subscribed, and subscribing to it doesn't
	 * subscribe to `events$`. It stays `false` for a recognizer whose `events$`
	 * doesn't use `reportFingers`, as a tap or a swipe. The `failWith` of other
	 * recognizers reads it.
	 */
	public running$: Observable<boolean>;

	/**
	 * The container, each time it changes, and `null` while the recognizer is
	 * detached. `pan$` ends its gesture before this emits. Switch on it to reset
	 * the state of a gesture.
	 */
	protected container$ = this.configSubject.pipe(
		map(({ container }) => container),
		distinctUntilChanged(),
	);

	abstract events$: Observable<Event>;

	/**
	 * Track active running failWith recognizers
	 */
	protected failWithActive$: Observable<boolean>;

	/**
	 * Reports in `state$` and `running$` the fingers of the gesture the
	 * recognizer's events recognize, until `isEnd` tells its end event, or until
	 * nothing listens to them anymore. It shares the events, so that every
	 * subscriber reads the same gesture.
	 */
	protected reportFingers =
		(isEnd: (event: Event) => boolean) => (events$: Observable<Event>) =>
			events$.pipe(
				tap((event) => {
					this.stateSubject.next({
						fingers: isEnd(event) ? 0 : event.pointers.length,
					});
				}),
				finalize(() => {
					this.stateSubject.next({ fingers: 0 });
				}),
				share(),
			);

	constructor(config?: RecognizerConfig<Options>, panConfig?: PanConfig) {
		this.pointerEvent$ = this.container$.pipe(
			switchMap((container) =>
				container
					? getPointerEvents({
							container,
							// read at each event, so that an update applies right away
							afterEventReceived: (event) => {
								const { afterEventReceived } = this.configSubject.getValue();

								return afterEventReceived ? afterEventReceived(event) : event;
							},
						})
					: EMPTY,
			),
			share(),
		);

		this.pointerDown$ = this.pointerEvent$.pipe(
			filter((event) => event.type === "pointerdown"),
		);

		this.pointerUp$ = this.pointerEvent$.pipe(
			filter((event) => event.type === "pointerup"),
		);

		this.pointerMove$ = this.pointerEvent$.pipe(
			filter((event) => event.type === "pointermove"),
		);

		this.pointerCancel$ = this.pointerEvent$.pipe(
			filter((event) => event.type === "pointercancel"),
		);

		this.pointerOff$ = this.pointerEvent$.pipe(filterPointerOff);

		const failWith$ = this.configSubject.pipe(
			map(({ failWith }) => failWith),
			distinctUntilChanged(),
		);

		this.failWithActive$ = failWith$.pipe(
			switchMap((failWith) =>
				failWith?.length
					? combineLatest(
							failWith.map(({ running$ }) => running$.pipe(startWith(false))),
						).pipe(map((runnings) => runnings.some(Boolean)))
					: of(false),
			),
			distinctUntilChanged(),
			// a source tells whether it runs when subscribed again, so letting go of it is safe
			shareLatest(),
		);

		this.pan$ = this.container$.pipe(
			switchMap(() => {
				const trackPointers$ = this.pointerDown$.pipe(
					trackPointers({
						pointerEvent$: this.pointerEvent$,
						trackMove: true,
					}),
					shareLatest(),
				);

				return trackPointers$.pipe(
					filter(
						({ pointers }) =>
							pointers.length >=
							panSettingsOf(this.configSubject.getValue().panConfig).numInputs,
					),
					exhaustMap(({ pointers: initialPointerEvents }) => {
						const { numInputs, posThreshold, delay } = panSettingsOf(
							this.configSubject.getValue().panConfig,
						);

						const panReleased$ = merge(
							trackPointers$.pipe(
								filter(({ pointers }) => pointers.length < numInputs),
							),
							this.containerChanging.pipe(
								withLatestFrom(trackPointers$),
								map(([, latest]) => latest),
							),
						).pipe(first(), share());

						const delay$ = timer(delay);

						const pointerDownPassingThreshold$ = merge(
							...initialPointerEvents.map((pointerEvent) => of(pointerEvent)),
							this.pointerDown$,
						).pipe(
							mergeMap((pointerDown) =>
								merge(this.pointerMove$, of(pointerDown)).pipe(
									matchPointer(pointerDown),
									filter((pointerEvent) =>
										isWithinPosThreshold(
											pointerDown,
											pointerEvent,
											posThreshold,
										),
									),
								),
							),
							first(),
						);

						const panStart$ = pointerDownPassingThreshold$.pipe(
							switchMap(() => delay$),
							withLatestFrom(trackPointers$),
							map(([, { event, pointers }]) => ({
								type: "start" as const,
								event,
								latestActivePointers: pointers,
							})),
							shareLatest(),
							takeUntil(panReleased$),
						);

						const panUpdate$ = panStart$.pipe(
							mergeMap(() =>
								trackPointers$.pipe(
									skip(1),
									map(({ event, pointers }) => ({
										type: "move" as const,
										event,
										latestActivePointers: pointers,
									})),
								),
							),
							takeUntil(panReleased$),
						);

						const panEnd$ = panStart$.pipe(
							mergeMap(() =>
								panReleased$.pipe(
									map(({ event, pointers }) => ({
										type: "end" as const,
										event,
										latestActivePointers: pointers,
									})),
								),
							),
						);

						const rawEvent$ = merge(panStart$, panUpdate$, panEnd$).pipe(
							shareLatest(),
						);

						return rawEvent$.pipe(
							scanToRecognizerEvent,
							withLatestFrom(rawEvent$),
							map(([recognizerEvent, { type }]) => ({
								...recognizerEvent,
								type,
							})),
						);
					}),
				);
			}),
			share(),
		);

		this.panStart$ = this.pan$.pipe(
			filter((event) => event.type === "start"),
			map(({ type, ...rest }) => rest),
		);

		this.panMove$ = this.pan$.pipe(
			filter((event) => event.type === "move"),
			map(({ type, ...rest }) => rest),
		);

		this.panEnd$ = this.pan$.pipe(
			filter((event) => event.type === "end"),
			map(({ type, ...rest }) => rest),
		);

		this.state$ = this.stateSubject.pipe(
			distinctUntilChanged(
				(previous, current) => previous.fingers === current.fingers,
			),
		);

		this.running$ = this.state$.pipe(
			map(({ fingers }) => fingers > 0),
			distinctUntilChanged(),
		);

		this.updateInternal(config ?? {}, panConfig);
	}

	private updateInternal(
		config: Partial<RecognizerConfig<Options>>,
		panConfig?: PanConfig,
	) {
		const { container, ...rest } = config;
		const currentContainer = this.configSubject.getValue().container;

		if (container !== undefined) {
			this.requestedContainer = container;
		}

		// the other fields first, so that an update from an end handler comes after
		this.mergeConfig(rest, panConfig);

		if (container === undefined || container === currentContainer) {
			return;
		}

		// before container$ switches, so that pan$ ends its gesture while it's followed
		this.containerChanging.next();

		// an end handler can set another container, which then stays
		this.mergeConfig({ container: this.requestedContainer });
	}

	private mergeConfig(
		config: Partial<RecognizerConfig<Options>>,
		panConfig?: PanConfig,
	) {
		const existingConfig = this.configSubject.getValue();

		this.configSubject.next({
			...existingConfig,
			...config,
			// unset, as when forwarding an optional value, they stay as they are
			failWith: config.failWith ?? existingConfig.failWith,
			afterEventReceived:
				config.afterEventReceived ?? existingConfig.afterEventReceived,
			options: config.options
				? // every option is optional, so leaving out the unset ones keeps them valid
					({
						...existingConfig.options,
						...omitUnset(config.options),
					} as Options)
				: existingConfig.options,
			panConfig: {
				...existingConfig.panConfig,
				...omitUnset(panConfig),
			},
		});
	}

	public update(
		config: Partial<RecognizerConfig<Options>>,
		panConfig?: PanConfig,
	) {
		this.updateInternal(config, panConfig);
	}
}
