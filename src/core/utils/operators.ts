import {
	distinctUntilChanged,
	filter,
	type Observable,
	shareReplay,
} from "rxjs";

export const emitOnceWhen =
	<T>(condition: (value: T) => boolean) =>
	(stream: Observable<T>) =>
		stream.pipe(
			// only emit once when we have a condition switch
			distinctUntilChanged((previous, current) => {
				const previousHasLessThan = condition(previous);
				const currentHasLessThan = condition(current);

				return previousHasLessThan === currentHasLessThan;
			}),
			// make sure to only pass true
			filter(condition),
		);

/**
 * Shares the latest value with late subscribers, and unsubscribes from the
 * source along with the last subscriber, which shareReplay(1) doesn't do.
 */
export const shareLatest = <T>() =>
	shareReplay<T>({ bufferSize: 1, refCount: true });
