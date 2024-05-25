import { useEffect, useState } from "react"
import {
  PanRecognizer,
  SwipeRecognizer,
  TapRecognizer,
  createManager,
} from "../core"
import { RotateRecognizer } from "../core/rotate/RotateRecognizer"
import { PinchRecognizer } from "../core/pinch/PinchRecognizer"

export const useManager = (container?: HTMLElement) => {
  const [manager] = useState(() => {
    const panRecognizer = new PanRecognizer()
    const swipeRecognizer = new SwipeRecognizer()
    const rotateRecognizer = new RotateRecognizer()
    const pinchRecognizer = new PinchRecognizer()
    const tapRecognizer = new TapRecognizer({
      maxTaps: 3,
      failWith: [panRecognizer],
    })

    return createManager({
      recognizers: [
        tapRecognizer,
        // panRecognizer,
        // swipeRecognizer,
        // rotateRecognizer,
        // pinchRecognizer,
      ],
    })
  })

  useEffect(() => {
    if (container) {
      manager.initialize(container)
    }
  }, [container, manager])

  return { manager }
}
