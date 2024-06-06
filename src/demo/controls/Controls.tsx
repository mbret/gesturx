import { Stack } from "@chakra-ui/react"
import { PinchControls } from "../gesturesBox/PinchControls"
import { RotateControls } from "../gesturesBox/RotateControls"
import { HoldControls } from "../holds/HoldControls"
import { TapControls } from "../taps/TapControls"
import { AppRecognizable } from "../useRecognizable"
import { ControlBox } from "./ControlBox"

export const Controls = ({
  fingers,
  maxTaps,
  onMaxTapsChange,
  recognizable,
}: {
  recognizable: AppRecognizable
  fingers: number
  onMaxTapsChange: (value: number) => void
  maxTaps: number
}) => {
  return (
    <Stack position="absolute" right={0} top={0} pr={2} pt={2} zIndex={1}>
      <ControlBox>fingers: {fingers}</ControlBox>
      <TapControls value={maxTaps} onChange={onMaxTapsChange} />
      <HoldControls recognizable={recognizable} />
      <RotateControls recognizable={recognizable} />
      <PinchControls recognizable={recognizable} />
    </Stack>
  )
}
