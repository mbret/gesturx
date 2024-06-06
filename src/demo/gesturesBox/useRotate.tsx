import { useEffect, useState } from "react"
import { AppRecognizable } from "../useRecognizable"

export const useRotate = (recognizable: AppRecognizable) => {
  const [boxAngle, setBoxAngle] = useState(0)

  useEffect(() => {
    const sub = recognizable.events$.subscribe((e) => {
      if (e.type === "rotate") {
        setBoxAngle((state) => state + e.deltaAngle)
      }
    })

    return () => {
      sub.unsubscribe()
    }
  }, [recognizable])

  return { boxAngle }
}
