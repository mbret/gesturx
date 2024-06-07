import { Observable, distinctUntilChanged, filter } from "rxjs"

export const emitOnceWhen =
  <T>(condition: (value: T) => boolean) =>
  (stream: Observable<T>) =>
    stream.pipe(
      // only emit once when we have a condition switch
      distinctUntilChanged((previous, current) => {
        const previousHasLessThan = condition(previous)
        const currentHasLessThan = condition(current)

        return previousHasLessThan === currentHasLessThan
      }),
      // make sure to only pass true
      filter(condition),
    )
