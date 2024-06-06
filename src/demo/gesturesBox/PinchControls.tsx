import { useEffect, useState } from "react"
import { AppRecognizable } from "../useRecognizable"
import { ControlBox } from "../controls/ControlBox"
import { Text } from "@chakra-ui/react"

export const PinchControls = ({
  recognizable,
}: {
  recognizable: AppRecognizable
}) => {
  const [scale, setScale] = useState(1)
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const sub = recognizable.events$.subscribe((e) => {
      if (e.type === "pinchMove") {
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

  return (
    <ControlBox>
      pinch:
      <Text>
        {scale.toFixed(1)}% {distance.toFixed(0)}px
      </Text>
    </ControlBox>
  )
}
