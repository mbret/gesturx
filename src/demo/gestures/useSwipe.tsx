import { useEffect } from "react"
import { AppRecognizable } from "./useRecognizable"
import { SwipeEvent } from "../../core"

export const useSwipe = ({
  onSwipe,
  recognizable,
}: {
  onSwipe: (event: SwipeEvent) => void
  recognizable: AppRecognizable
}) => {
  useEffect(() => {
    const sub = recognizable.events$.subscribe((e) => {
      if (e.type === "swipe") {
        onSwipe(e)
      }
    })

    return () => {
      sub.unsubscribe()
    }
  }, [recognizable])
}
