import { useEffect } from "react"
import { AppRecognizable } from "./useRecognizable"
import { useSwipeDebugToast } from "../debug/useSwipeDebugToast"

export const useSwipe = ({
  recognizable,
}: {
  recognizable: AppRecognizable
}) => {
  const swipeDebugToast = useSwipeDebugToast()

  useEffect(() => {
    const sub = recognizable.events$.subscribe((e) => {
      if (e.type === "swipe") {
        swipeDebugToast(e)
      }
    })

    return () => {
      sub.unsubscribe()
    }
  }, [recognizable])
}
