import { Box } from "@chakra-ui/react"
import { usePan } from "./usePan"
import { AppRecognizable } from "../useRecognizable"
import { usePinch } from "./usePinch"
import { useRotate } from "./useRotate"

export const GesturesBox = ({
  recognizable,
}: {
  recognizable: AppRecognizable
}) => {
  /**
   * Move the box with fingers
   */
  const { position } = usePan(recognizable)
  /**
   * Zoom in/out the box
   */
  const { boxScale } = usePinch(recognizable)
  /**
   * Rotate the box
   */
  const { boxAngle } = useRotate(recognizable)

  return (
    <Box id="boxContainer" left={`${position.x}px`} top={`${position.y}px`}>
      <Box
        height="148px"
        width="148px"
        bgColor="red"
        style={{
          transform: `rotate(${boxAngle}deg) scale(${boxScale})`,
        }}
      />
    </Box>
  )
}
