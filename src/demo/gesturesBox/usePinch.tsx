import { useEffect, useState } from "react"
import { AppRecognizable } from "../useRecognizable"
import { ControlBox } from "../controls/ControlBox"
import { Text } from "@chakra-ui/react"
import { Settings } from "../App"
import { PinchRecognizer } from "../../core"

export const usePinch = ({
  recognizable,
  settings,
}: {
  recognizable: AppRecognizable
  settings: Settings
}) => {
  const [boxScale, setBoxScale] = useState(1)
  const [scale, setScale] = useState(1)
  const [distance, setDistance] = useState(0)
  const { pinchPosThreshold } = settings
  const pinchRecognizer = recognizable.recognizers.find(
    (recognizer): recognizer is PinchRecognizer =>
      recognizer instanceof PinchRecognizer,
  )

  /**
   * Update settings from controls
   */
  useEffect(() => {
    pinchRecognizer?.update({
      posThreshold: pinchPosThreshold,
    })
  }, [pinchRecognizer, pinchPosThreshold])

  useEffect(() => {
    const sub = recognizable.events$.subscribe((e) => {
      if (e.type === "pinchStart") {
        setBoxScale((value) => value * e.deltaDistanceScale)
      }

      if (e.type === "pinchMove") {
        setBoxScale((value) => value * e.deltaDistanceScale)
        setScale(e.scale)
        setDistance(e.distance)
      }

      if (e.type === "pinchEnd") {
        setBoxScale((value) => value * e.deltaDistanceScale)
        setScale(1)
        setDistance(0)
      }
    })

    return () => {
      sub.unsubscribe()
    }
  }, [recognizable])

  const pinchDebug = (
    <ControlBox>
      pinch:
      <Text>
        {scale.toFixed(1)}% {distance.toFixed(0)}px
      </Text>
    </ControlBox>
  )

  return { boxScale, pinchDebug }
}
