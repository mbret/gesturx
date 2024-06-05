import { useEffect, useState } from "react"
import { AppRecognizable } from "./useRecognizable"
import { DebugBox } from "../debug/DebugBox"
import { Text } from "@chakra-ui/react"

export const usePinch = (recognizable: AppRecognizable) => {
  const [boxScale, setBoxScale] = useState(1)
  const [scale, setScale] = useState(1)
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const sub = recognizable.events$.subscribe((e) => {
      if (e.type === "pinchMove") {
        setBoxScale((value) => value * e.deltaDistanceScale)
        setScale(e.scale)
        setDistance(e.distance)
      }

      if (e.type === "pinchEnd") {
        setScale(1)
        setDistance(0)
      }
    })

    return () => {
      sub.unsubscribe()
    }
  }, [recognizable])

  const pinchDebug = (
    <DebugBox>
      pinch:
      <Text>
        {scale.toFixed(1)}% {distance.toFixed(0)}px
      </Text>
    </DebugBox>
  )

  return { boxScale, pinchDebug }
}
