import {
	type Observable,
	filter,
	first,
	map,
	merge,
	of,
	share,
	switchMap,
	takeUntil,
	tap,
	withLatestFrom,
} from "rxjs";
import { Recognizer, type RecognizerConfig } from "../recognizer/Recognizer";
import type {
	PanEvent,
	PanRecognizerInterface,
	PanRecognizerOptions,
} from "./PanRecognizerInterface";

export type { PanEvent };

export class PanRecognizer
	extends Recognizer<PanRecognizerOptions, PanEvent>
	implements PanRecognizerInterface
{
	public events$: Observable<PanEvent>;
	public start$: Observable<PanEvent>;
	public end$: Observable<PanEvent>;

	constructor(config?: RecognizerConfig<PanRecognizerOptions>) {
		super(config, {
			...config,
			posThreshold: config?.options?.posThreshold ?? 15,
		});

		const panStart$ = this.panStart$.pipe(
			map((event) => ({
				type: "panStart" as const,
				...event,
			})),
			withLatestFrom(this.failWithActive$),
			filter(([, failWithActive]) => !failWithActive),
			map(([event]) => event),
			share(),
		);

		const panEnd$ = this.panEnd$.pipe(
			map((event) => ({
				type: "panEnd" as const,
				...event,
			})),
			share(),
		);

		const panMove$ = this.panMove$.pipe(
			map((event) => ({
				type: "panMove" as const,
				...event,
			})),
		);

		this.events$ = panStart$.pipe(
			switchMap((panStartEvent) => {
				let latestEvent: PanEvent = panStartEvent;

				const panStarted$ = of(panStartEvent);

				const failingActive$ = this.failWithActive$.pipe(
					filter((isActive) => isActive),
					first(),
				);

				const events$ = merge(panStarted$, panMove$, panEnd$).pipe(
					tap((event) => {
						latestEvent = event;
					}),
					takeUntil(failingActive$),
				);

				const trailingEndEventIfFailed$ = failingActive$.pipe(
					map(() => ({
						...latestEvent,
						type: "panEnd" as const,
					})),
					takeUntil(panEnd$),
				);

				return merge(events$, trailingEndEventIfFailed$);
			}),
			share(),
		);

		this.start$ = this.events$.pipe(
			filter((event) => event.type === "panStart"),
		);

		this.end$ = this.events$.pipe(filter((event) => event.type === "panEnd"));
	}

	public update(config: RecognizerConfig<PanRecognizerOptions>) {
		super.update(config, config.options);
	}
}
