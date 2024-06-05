import { useEffect, useState } from "react"
import { AppRecognizable } from "./useRecognizable"

/**
 * To track fingers we simply need to observe the state of the
 * recognizable instance. It will gives us the current maximum fingers 
 * used by whatever recognizers.
 */
export const useTrackFingers = (recognizable: AppRecognizable) => {
  const [fingers, setFingers] = useState(0)

  useEffect(() => {
    const sub = recognizable.state$.subscribe(({ fingers }) => {
      setFingers(fingers)
    })

    return () => {
      sub?.unsubscribe()
    }
  }, [recognizable])

  return { fingers }
}
