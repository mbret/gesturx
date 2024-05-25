import { Observable, ObservedValueOf, merge, share } from "rxjs"
import { TapRecognizer } from "./tap/TapRecognizer"
import { PanRecognizer } from "./pan/PanRecognizer"
import { SwipeRecognizer } from "./swipe/SwipeRecognizer"
import { RotateRecognizer } from "./rotate/RotateRecognizer"
import { PinchRecognizer } from "./pinch/PinchRecognizer"

type Recognizer =
  | TapRecognizer
  | PanRecognizer
  | SwipeRecognizer
  | RotateRecognizer
  | PinchRecognizer

export class Manager {
  public readonly events$: Observable<ObservedValueOf<Recognizer["events$"]>>
  public recognizers: Recognizer[]

  constructor(
    protected options: {
      recognizers: Recognizer[]
      afterEventReceived?: (event: PointerEvent) => PointerEvent
    },
  ) {
    this.recognizers = options.recognizers
    this.events$ = merge(
      ...options.recognizers.map((recognizer) => recognizer.events$),
    ).pipe(share())
  }

  public initialize(container: HTMLElement) {
    /**
     * We have to disable touch-action otherwise every events will be followed
     * by a cancel event since the browser will try to handle touch.
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
     */
    container.style.touchAction = `none`

    /**
     *  Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
     */
    container.style.userSelect = `none`

    this.options.recognizers.forEach((recognizer) => {
      recognizer.initialize({
        container,
        afterEventReceived: this.options.afterEventReceived,
      })
    })
  }
}

export const createManager = ({
  afterEventReceived = (event) => event,
  recognizers,
}: {
  recognizers: (
    | TapRecognizer
    | PanRecognizer
    | SwipeRecognizer
    | RotateRecognizer
    | PinchRecognizer
  )[]
  afterEventReceived?: (event: PointerEvent) => PointerEvent
}) => {
  const events$ = merge(
    ...recognizers.map((recognizer) => recognizer.events$),
  ).pipe(share())

  const initialize = (container: HTMLElement) => {
    /**
     * We have to disable touch-action otherwise every events will be followed
     * by a cancel event since the browser will try to handle touch.
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
     */
    container.style.touchAction = `none`

    /**
     *  Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
     */
    container.style.userSelect = `none`

    recognizers.forEach((recognizer) => {
      recognizer.initialize({ container, afterEventReceived })
    })
  }

  return { events$, initialize, recognizers }
}
