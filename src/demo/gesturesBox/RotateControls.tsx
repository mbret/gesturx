import { ArrowForwardIcon } from "@chakra-ui/icons"
import { ControlBox } from "../controls/ControlBox"
import { AppRecognizable } from "../useRecognizable"
import { useEffect, useState } from "react"

export const RotateControls = ({
  recognizable,
}: {
  recognizable: AppRecognizable
}) => {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const sub = recognizable.events$.subscribe((e) => {
      if (e.type === "rotate") {
        setRotation(e.angle)
      }

      if (e.type === "rotateEnd") {
        setRotation(0)
      }
    })

    return () => {
      sub.unsubscribe()
    }
  }, [recognizable])

  return (
    <ControlBox>
      rotation:{" "}
      <ArrowForwardIcon boxSize={6} transform={`rotate(${rotation}deg)`} />{" "}
    </ControlBox>
  )
}
