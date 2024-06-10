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
import { Recognizer, PanEvent } from "../recognizer/Recognizer"

export interface RotateEvent extends RecognizerEvent {
  type: "rotate" | "rotateStart" | "rotateEnd"
  /**
   * Current rotation angle
   */
  angle: number
  /**
   * Delta angle between events
   */
  deltaAngle: number
}

type Options = {
  posThreshold?: number
}

export class RotateRecognizer extends Recognizer<
  Options,
  RotateEvent
> {
  public events$: Observable<RotateEvent>

  constructor(protected options: Options = {}) {
    super(options)

    this.events$ = this.validConfig$.pipe(
      switchMap(() => {
        const hasLessThanTwoFinger$ = this.panEvent$.pipe(
          filter(({ pointers }) => pointers.length < 2),
          distinctUntilChanged(),
        )

        const hasMoreThanOneFinger$ = this.panEvent$.pipe(
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
            type: "rotateStart" as const,
            angle: 0,
            deltaAngle: 0,
          })),
        )

        const rotate$ = start$.pipe(
          mergeMap(() =>
            this.panEvent$.pipe(
              scan<
                PanEvent,
                RotateEvent,
                Pick<RotateEvent, "angle" | "deltaAngle">
              >(
                (acc, current) => {
                  const angle = acc.angle + current.deltaPointersAngle

                  return {
                    ...acc,
                    ...current,
                    type: "rotate" as const,
                    angle,
                    deltaAngle: current.deltaPointersAngle,
                  }
                },
                { angle: 0, deltaAngle: 0 },
              ),
              takeUntil(hasLessThanTwoFinger$),
            ),
          ),
        )

        const end$ = start$.pipe(
          mergeMap(() =>
            combineLatest([rotate$, hasLessThanTwoFinger$] as const).pipe(
              first(),
              map(([event]) => ({
                ...event,
                type: "rotateEnd" as const,
              })),
            ),
          ),
        )

        return merge(start$, rotate$, end$)
      }),
    )
  }
}
