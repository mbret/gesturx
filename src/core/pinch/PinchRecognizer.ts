import {
  Observable,
  combineLatest,
  distinctUntilChanged,
  filter,
  first,
  map,
  merge,
  mergeMap,
  scan,
  switchMap,
  takeUntil,
} from "rxjs"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"
import { Recognizer } from "../recognizer/Recognizer"
import { PanEvent, PanRecognizer } from "../pan/PanRecognizer"

export interface PinchEvent extends RecognizerEvent {
  type: "pinchStart" | "pinchMove" | "pinchEnd"
  scale: number
  /**
   * Distance between start and current
   */
  distance: number
  /**
   * Delta distance between events
   */
  deltaDistance: number
  /**
   * Delta scale between events
   */
  deltaDistanceScale: number
}

type Options = {
  posThreshold?: number
}

export class PinchRecognizer extends Recognizer<Options> {
  public events$: Observable<PinchEvent>

  constructor(protected options: Options = {}) {
    super(options)

    this.events$ = this.config$.pipe(
      switchMap((initializedWith) => {
        const { posThreshold } = initializedWith.options ?? {}
        const panRecognizer = new PanRecognizer({ posThreshold })

        panRecognizer.initialize(initializedWith)

        const hasLessThanTwoFinger$ = panRecognizer.events$.pipe(
          filter(({ pointers }) => pointers.length < 2),
          distinctUntilChanged(),
        )

        const hasMoreThanOneFinger$ = panRecognizer.events$.pipe(
          map((event) => [event, event.pointers.length > 1] as const),
          distinctUntilChanged(
            (
              [_, previousHasMoreThanOneFinger],
              [__, currentHasMoreThanOneFinger],
            ) => previousHasMoreThanOneFinger === currentHasMoreThanOneFinger,
          ),
          filter(([_, hasMoreThanOneFinger]) => hasMoreThanOneFinger),
        )

        const start$ = hasMoreThanOneFinger$.pipe(
          map(([event]) => ({
            ...event,
            type: "pinchStart" as const,
            scale: 1,
            distance: 0,
            deltaDistance: 0,
            deltaDistanceScale: 1,
          })),
        )

        const rotate$ = start$.pipe(
          mergeMap((startEvent) => {
            return panRecognizer.events$.pipe(
              scan<PanEvent, PinchEvent, Partial<PinchEvent>>(
                (acc, current) => {
                  const previousPointersAverageDistance =
                    acc.pointersAverageDistance ??
                    current.pointersAverageDistance

                  const scale =
                    current.pointersAverageDistance /
                    startEvent.pointersAverageDistance

                  return {
                    ...acc,
                    ...current,
                    scale,
                    distance:
                      current.pointersAverageDistance -
                      startEvent.pointersAverageDistance,
                    deltaDistance:
                      current.pointersAverageDistance -
                      previousPointersAverageDistance,
                    deltaDistanceScale:
                      current.pointersAverageDistance /
                      previousPointersAverageDistance,
                    type: "pinchMove" as const,
                  }
                },
                { scale: 0 },
              ),
              takeUntil(hasLessThanTwoFinger$),
            )
          }),
        )

        const end$ = start$.pipe(
          mergeMap(() =>
            combineLatest([rotate$, hasLessThanTwoFinger$] as const).pipe(
              first(),
              map(([event]) => ({
                ...event,
                type: "pinchEnd" as const,
              })),
            ),
          ),
        )

        return merge(start$, rotate$, end$)
      }),
    )
  }
}
