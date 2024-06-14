import { useEffect, useState } from "react"
import { AppRecognizable } from "../useRecognizable"
import { Settings } from "../App"

export const usePan = ({
  recognizable,
}: {
  recognizable: AppRecognizable
  settings: Settings
}) => {
  const [position, setPosition] = useState({
    initial: { x: 0, y: 0 },
    x: 0,
    y: 0,
  })

  /**
   * Subscribe to pan events
   */
  useEffect(() => {
    const sub = recognizable.events$.subscribe((event) => {
      if (
        event.type === "panMove" ||
        event.type === "panEnd" ||
        event.type === "panStart"
      ) {
        const boxElement = document.getElementById(`boxContainer`)

        if (boxElement) {
          const domRect = boxElement.getBoundingClientRect()

          if (event.type === "panStart") {
            setPosition((state) => ({
              ...state,
              initial: {
                x: domRect.left,
                y: domRect.top,
              },
            }))
          }

          setPosition((state) => ({
            ...state,
            x: state.initial.x + event.deltaX,
            y: state.initial.y + event.deltaY,
          }))
        }
      }
    })

    return () => {
      sub.unsubscribe()
    }
  }, [recognizable])

  return { position }
}
