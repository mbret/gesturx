import { useEffect, useState } from "react"
import { AppRecognizable } from "./useRecognizable"
import { DebugBox } from "../debug/DebugBox"
import { ArrowForwardIcon } from "@chakra-ui/icons"

export const useRotate = (recognizable: AppRecognizable) => {
  const [boxAngle, setBoxAngle] = useState(0)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const sub = recognizable.events$.subscribe((e) => {
      if (e.type === "rotate") {
        setBoxAngle((state) => state + e.deltaAngle)
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

  const rotateDebug = (
    <DebugBox>
      rotation:{" "}
      <ArrowForwardIcon boxSize={6} transform={`rotate(${rotation}deg)`} />{" "}
    </DebugBox>
  )

  return { rotateDebug, boxAngle }
}
