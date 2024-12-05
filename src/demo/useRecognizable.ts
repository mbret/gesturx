import { useEffect, useState } from "react"
import {
  Recognizable,
  PanRecognizer,
  SwipeRecognizer,
  TapRecognizer,
  FailWith,
} from "../core"
import { RotateRecognizer } from "../core/rotate/RotateRecognizer"
import { PinchRecognizer } from "../core/pinch/PinchRecognizer"
import { HoldRecognizer } from "../core/hold/HoldRecognizer"
import { filter, fromEvent } from "rxjs"

export type AppRecognizable = ReturnType<typeof useRecognizable>["recognizable"]

/**
 * Example of how to fail a gesture on specific event
 */
const failWithTextSelection: FailWith = {
  start$: fromEvent(document, "selectionchange").pipe(
    filter(() => !!document.getSelection()?.toString()),
  ),
  end$: fromEvent(document, "selectionchange").pipe(
    filter(() => !document.getSelection()?.toString()),
  ),
}

const panRecognizer = new PanRecognizer({
  failWith: [failWithTextSelection],
})
const swipeRecognizer = new SwipeRecognizer({
  failWith: [failWithTextSelection],
})
const rotateRecognizer = new RotateRecognizer()
const pinchRecognizer = new PinchRecognizer()
const holdRecognizer = new HoldRecognizer()
const tapRecognizer = new TapRecognizer({
  failWith: [panRecognizer],
})

export const useRecognizable = () => {
  const [container, containerRef] = useState<HTMLElement | undefined | null>()
  const [recognizable] = useState(
    () =>
      new Recognizable({
        recognizers: [
          tapRecognizer,
          panRecognizer,
          swipeRecognizer,
          rotateRecognizer,
          pinchRecognizer,
          holdRecognizer,
        ],
      }),
  )

  useEffect(() => {
    if (container) {
      recognizable.update({ container })
    }
  }, [container, recognizable])

  return { recognizable, containerRef }
}
