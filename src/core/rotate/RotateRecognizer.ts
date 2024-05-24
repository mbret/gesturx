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
import { Recognizer } from "../recognizer/Recognizer"
import { PanEvent, PanRecognizer } from "../pan/PanRecognizer"
import { RecognizerEvent } from "../recognizer/RecognizerEvent"

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

type Params = {
  posThreshold?: number
}

export class RotateRecognizer extends Recognizer {
  public events$: Observable<RotateEvent>

  constructor(protected options: Params = {}) {
    super()

    const { posThreshold } = options

    const panRecognizer = new PanRecognizer({ posThreshold })

    this.events$ = this.init$.pipe(
      switchMap((initializedWith) => {
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
            type: "rotateStart" as const,
            angle: 0,
            deltaAngle: 0,
          })),
        )

        const rotate$ = start$.pipe(
          mergeMap(() =>
            panRecognizer.events$.pipe(
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
