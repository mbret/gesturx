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
  share,
  shareReplay,
  switchMap,
  takeUntil,
} from "rxjs"
import {
  Recognizer,
  PanEvent,
} from "../recognizer/Recognizer"
import { RotateEvent, RotateRecognizerOptions } from "./RotateRecognizerInterface"

export class RotateRecognizer extends Recognizer<RotateRecognizerOptions, RotateEvent> {
  public events$: Observable<RotateEvent>

  constructor(protected options: RotateRecognizerOptions = {}) {
    super({
      numInputs: 2,
      posThreshold: 15,
      ...options,
    })

    this.events$ = this.validConfig$.pipe(
      switchMap(() => {
        const hasLessThanTwoFinger$ = this.panEvent$.pipe(
          filter(({ pointers }) => pointers.length < 2),
          distinctUntilChanged(),
        )

        const rotateStart$ = this.panEvent$.pipe(
          filter((event) => event.type === "panStart"),
          map((event) => ({
            ...event,
            type: "rotateStart" as const,
            angle: 0,
            deltaAngle: 0,
          })),
          shareReplay(1),
        )

        const rotate$ = rotateStart$.pipe(
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

        const rotateEnd$ = rotateStart$.pipe(
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

        return merge(rotateStart$, rotate$, rotateEnd$)
      }),
      share(),
    )
  }

  public update(options: RotateRecognizerOptions) {
    super.update(options)
  }
}
