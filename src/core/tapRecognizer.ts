import {
  Observable,
  buffer,
  debounceTime,
  exhaustMap,
  filter,
  first,
  ignoreElements,
  map,
  merge,
  of,
  share,
  shareReplay,
  switchMap,
  takeUntil,
  timer,
  withLatestFrom,
} from "rxjs";
import {
  fromFailWith,
  fromPointerDown,
  getPointerEvents,
  hasAtLeastOneItem,
  isOUtsidePosThreshold,
  trackActivePointers,
} from "./utils";
import { GestureEvent } from "./types";

export type TapEvent = GestureEvent & { type: "tap"; taps: number };

type Options = {
  // Maximum time in ms between multiple taps.
  multiTapThreshold?: number;
  // Maximum press time in ms.
  maximumPressTime?: number;
  maxTaps?: number;
  posThreshold?: number;
  failWith?: { start$: Observable<unknown> }[];
};

const mapToTapEvent = (
  stream: Observable<[PointerEvent, ...PointerEvent[]]>,
): Observable<TapEvent> =>
  stream.pipe(
    map((events) => ({
      type: "tap",
      srcEvent: events[0],
      taps: events.length,
    })),
  );

export const createTapRecognizer = ({
  multiTapThreshold = 200,
  maximumPressTime = 250,
  maxTaps = 1,
  posThreshold = 5,
  failWith,
}: Options = {}) => {
  return ({
    container,
    afterEventReceived = (event) => event,
  }: {
    container: HTMLElement;
    afterEventReceived?: (event: PointerEvent) => PointerEvent;
  }) => {
    const { pointerUp$, pointerLeave$, pointerCancel$, pointerMove$ } =
      getPointerEvents({
        container,
        afterEventReceived,
      });

    const pointerDown$ = fromPointerDown({ container, afterEventReceived });
    const activePointers$ = trackActivePointers({ container }).pipe(
      shareReplay(1),
    );
    const hasMoreThanOneActivePointer$ = activePointers$.pipe(
      filter((pointers) => pointers.length > 1),
    );

    const onlyOnePointer = <T>(stream: Observable<T>) =>
      stream.pipe(
        withLatestFrom(activePointers$),
        filter(([, pointers]) => pointers.length === 1),
        map(([pointer]) => pointer),
      );

    const bufferPointerDowns = (stream: Observable<PointerEvent>) =>
      stream.pipe(
        buffer(pointerUp$.pipe(debounceTime(multiTapThreshold))),
        first(),
      );

    const failWith$ = fromFailWith(failWith);

    const tap$ = merge(
      pointerDown$,
      activePointers$.pipe(ignoreElements()),
    ).pipe(
      onlyOnePointer,
      exhaustMap((initialPointerEvent) => {
        const pointerDowns$ = merge(of(initialPointerEvent), pointerDown$);
        const subsequentPointerEvents$ = merge(
          pointerUp$,
          pointerLeave$,
          pointerCancel$,
          pointerMove$,
        );
        const pointerDownsBuffered$ = pointerDowns$.pipe(bufferPointerDowns);
        const subsequentPointersOutOfPositionThreshold$ =
          subsequentPointerEvents$.pipe(
            filter((event) =>
              isOUtsidePosThreshold(initialPointerEvent, event, posThreshold),
            ),
            first(),
          );
        const waitedTooLong$ = activePointers$.pipe(
          switchMap(() => timer(maximumPressTime)),
        );

        const takeUntil$ = merge(
          failWith$,
          pointerCancel$,
          pointerLeave$,
          hasMoreThanOneActivePointer$,
          subsequentPointersOutOfPositionThreshold$,
          waitedTooLong$,
        );

        const tap$ = pointerDownsBuffered$.pipe(
          filter(hasAtLeastOneItem),
          filter((events) => events.length <= maxTaps),
          mapToTapEvent,
          takeUntil(takeUntil$),
        );

        return tap$;
      }),
      share(),
    );

    return { events$: tap$ };
  };
};
