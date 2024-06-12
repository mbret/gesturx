import { Stack } from "@chakra-ui/react"
import { PinchControls } from "../gesturesBox/PinchControls"
import { RotateControls } from "../gesturesBox/RotateControls"
import { HoldControls } from "../holds/HoldControls"
import { TapControls } from "../taps/TapControls"
import { AppRecognizable } from "../useRecognizable"
import { ControlBox } from "./ControlBox"
import { Settings } from "../App"
import { PanControl } from "../gesturesBox/PanControls"

export const Controls = ({
  fingers,
  recognizable,
  settings,
  onSettingsChange,
  setSettings,
}: {
  recognizable: AppRecognizable
  fingers: number
  onSettingsChange: (settings: Settings) => void
  setSettings: React.Dispatch<React.SetStateAction<Settings>>
  settings: Settings
}) => {
  return (
    <Stack
      position="absolute"
      right={0}
      top={0}
      pr={2}
      pt={2}
      zIndex={1}
      maxW={150}
    >
      <ControlBox>fingers: {fingers}</ControlBox>
      <TapControls
        value={settings.maxTaps}
        onChange={(value) => {
          onSettingsChange({ ...settings, maxTaps: value })
        }}
      />
      <PanControl
        recognizable={recognizable}
        settings={settings}
        setSettings={setSettings}
      />
      <HoldControls
        recognizable={recognizable}
        numInputsHold={settings.holdNumInputs}
        setNumInputsHold={(value) => {
          onSettingsChange({ ...settings, holdNumInputs: value })
        }}
        posThreshold={settings.holdPosThreshold}
        setPosThreshold={(value) =>
          onSettingsChange({ ...settings, holdPosThreshold: value })
        }
        delay={settings.holdDelay}
        setDelay={(value) =>
          onSettingsChange({ ...settings, holdDelay: value })
        }
      />
      <RotateControls recognizable={recognizable} />
      <PinchControls recognizable={recognizable} />
    </Stack>
  )
}
