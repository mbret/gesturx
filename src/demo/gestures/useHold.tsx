import { useEffect, useState } from "react"
import {
  useToast,
} from "@chakra-ui/react"
import { AppRecognizable } from "./useRecognizable"

export const useHold = (recognizable: AppRecognizable) => {
  const toast = useToast()
  const [isHolding, setIsHolding] = useState(false)

  useEffect(() => {
    const clickSub = recognizable.events$.subscribe((e) => {
      if (e.type === "holdStart") {
        setIsHolding(true)
      }

      if (e.type === "holdEnd") {
        setIsHolding(false)
      }
    })

    return () => {
      clickSub.unsubscribe()
    }
  }, [recognizable, toast])

  return { isHolding }
}
