import { useEffect, useState } from "react"
import {
  Recognizable,
  PanRecognizer,
  SwipeRecognizer,
  TapRecognizer,
} from "../core"
import { RotateRecognizer } from "../core/rotate/RotateRecognizer"
import { PinchRecognizer } from "../core/pinch/PinchRecognizer"
import { HoldRecognizer } from "../core/hold/HoldRecognizer"

export type AppRecognizable = ReturnType<typeof useRecognizable>["recognizable"]

export const useRecognizable = () => {
  const [container, containerRef] = useState<HTMLElement | undefined | null>()
  const [recognizable] = useState(() => {
    const panRecognizer = new PanRecognizer()
    const swipeRecognizer = new SwipeRecognizer()
    const rotateRecognizer = new RotateRecognizer()
    const pinchRecognizer = new PinchRecognizer()
    const holdRecognizer = new HoldRecognizer()
    const tapRecognizer = new TapRecognizer({
      failWith: [panRecognizer],
    })

    return new Recognizable({
      recognizers: [
        tapRecognizer,
        panRecognizer,
        swipeRecognizer,
        rotateRecognizer,
        pinchRecognizer,
        holdRecognizer,
      ],
    })
  })

  useEffect(() => {
    if (container) {
      recognizable.update({ container })
    }
  }, [container, recognizable])

  return { recognizable, containerRef }
}
