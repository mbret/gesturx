import { merge, share } from "rxjs"
import { TapRecognizer } from "./tap/TapRecognizer"
import { PanRecognizer } from "./pan/PanRecognizer"
import { SwipeRecognizer } from "./swipe/SwipeRecognizer"
import { RotateRecognizer } from "./rotate/RotateRecognizer"

export const createManager = ({
  container,
  afterEventReceived = (event) => event,
  recognizers,
}: {
  container: HTMLElement
  recognizers: (
    | TapRecognizer
    | PanRecognizer
    | SwipeRecognizer
    | RotateRecognizer
  )[]
  afterEventReceived?: (event: PointerEvent) => PointerEvent
}) => {
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

  const events$ = merge(
    ...recognizers.map((recognizer) => recognizer.events$),
  ).pipe(share())

  return { events$ }
}
