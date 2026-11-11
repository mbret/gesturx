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

// biome-ignore lint/suspicious/noExplicitAny: TODO
type RecognizableOptions<T extends Recognizer<any, any>[]> = {
	recognizers: T;
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

	private apply(config: RecognizableUpdate<T>) {
		for (const recognizer of this.recognizers) {
			recognizer.update(config);
		}
	}
}
