import { useEffect, useState } from "react"
import {
  Recognizable,
  PanRecognizer,
  SwipeRecognizer,
  TapRecognizer,
} from "../core"
import { RotateRecognizer } from "../core/rotate/RotateRecognizer"
import { PinchRecognizer } from "../core/pinch/PinchRecognizer"

export type AppRecognizable = ReturnType<typeof useRecognizable>["recognizable"]

export const useRecognizable = (container?: HTMLElement) => {
  const [recognizable] = useState(() => {
    const panRecognizer = new PanRecognizer()
    const swipeRecognizer = new SwipeRecognizer()
    const rotateRecognizer = new RotateRecognizer()
    const pinchRecognizer = new PinchRecognizer()
    const tapRecognizer = new TapRecognizer({
      maxTaps: 3,
      failWith: [panRecognizer],
    })

    return new Recognizable({
      recognizers: [
        tapRecognizer,
        panRecognizer,
        swipeRecognizer,
        rotateRecognizer,
        pinchRecognizer,
      ],
    })
  })

  useEffect(() => {
    if (container) {
      recognizable.initialize(container)
    }
  }, [container, recognizable])

  return { recognizable }
}
