import {
  Observable,
  filter,
  map,
  merge,
  scan,
  share,
  shareReplay,
  switchMap,
} from "rxjs"
import {
  Recognizer,
  PanEvent,
  RecognizerConfig,
} from "../recognizer/Recognizer"
import {
  RotateEvent,
  RotateRecognizerInterface,
  RotateRecognizerOptions,
} from "./RotateRecognizerInterface"

export class RotateRecognizer
  extends Recognizer<RotateRecognizerOptions, RotateEvent>
  implements RotateRecognizerInterface
{
  public events$: Observable<RotateEvent>

  constructor(config: RecognizerConfig<RotateRecognizerOptions> = {}) {
    super(config, {
      numInputs: 2,
      posThreshold: 15,
      ...config.options,
    })

    this.events$ = this.config$.pipe(
      switchMap(() => {
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
          switchMap(() =>
            this.panEvent$.pipe(
              scan<
                PanEvent,
                PanEvent & { angle: number; deltaAngle: number },
                undefined
              >((acc, current) => {
                const angle = (acc?.angle ?? 0) + current.deltaPointersAngle

                return {
                  ...acc,
                  ...current,
                  angle,
                  deltaAngle: current.deltaPointersAngle,
                }
              }, undefined),
            ),
          ),
          share(),
        )

        const rotateMove$ = rotate$.pipe(
          filter((event) => event.type === "panMove"),
          map((event) => ({ ...event, type: "rotateMove" as const })),
        )

        const rotateEnd$ = rotate$.pipe(
          filter((event) => event.type === "panEnd"),
          map((event) => ({ ...event, type: "rotateEnd" as const })),
        )

        return merge(rotateStart$, rotateMove$, rotateEnd$)
      }),
      share(),
    )
  }

  public update(options: RecognizerConfig<RotateRecognizerOptions>) {
    super.update(options, options.options)
  }
}
