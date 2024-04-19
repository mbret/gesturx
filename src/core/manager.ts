import { merge } from "rxjs"
import { TapRecognizer } from "./TapRecognizer"
import { PanRecognizer } from "./PanRecognizer"
import { SwipeRecognizer } from "./SwipeRecognizer"

export const createManager = ({
  container,
  afterEventReceived = (event) => event,
  recognizers,
}: {
  container: HTMLElement
  recognizers: (TapRecognizer | PanRecognizer | SwipeRecognizer)[]
  afterEventReceived?: (event: PointerEvent) => PointerEvent
}) => {
  recognizers.forEach((recognizer) => {
    recognizer.initialize({ container, afterEventReceived })
  })

  const events$ = merge(...recognizers.map((recognizer) => recognizer.events$))

  return { events$ }
}
