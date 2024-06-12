import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
} from "@chakra-ui/react"
import { PinchControls } from "../gesturesBox/PinchControls"
import { RotateControls } from "../gesturesBox/RotateControls"
import { HoldControls } from "../holds/HoldControls"
import { TapControls } from "../taps/TapControls"
import { AppRecognizable } from "../useRecognizable"
import { ControlBox } from "./ControlBox"
import { Settings } from "../App"
import { PanControl } from "../gesturesBox/PanControls"
import { ReactNode } from "react"

const AccordionControlButton = ({ children }: { children: ReactNode }) => {
  return (
    <AccordionButton p={1}>
      <Box as="span" flex="1" textAlign="left">
        {children}
      </Box>
      <AccordionIcon />
    </AccordionButton>
  )
}

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
    <Accordion
      allowMultiple
      position="absolute"
      reduceMotion
      right={0}
      top={0}
      pr={2}
      pt={2}
      zIndex={1}
      width={150}
      bgColor="white"
    >
      <AccordionItem defaultChecked>
        <AccordionControlButton>fingers</AccordionControlButton>
        <AccordionPanel>
          <ControlBox>fingers: {fingers}</ControlBox>
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem>
        <AccordionControlButton>taps</AccordionControlButton>
        <AccordionPanel>
          <TapControls
            value={settings.maxTaps}
            onChange={(value) => {
              onSettingsChange({ ...settings, maxTaps: value })
            }}
          />
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem>
        <AccordionControlButton>pan</AccordionControlButton>
        <AccordionPanel>
          <PanControl
            recognizable={recognizable}
            settings={settings}
            setSettings={setSettings}
          />
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem>
        <AccordionControlButton>hold</AccordionControlButton>
        <AccordionPanel>
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
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem>
        <AccordionControlButton>rotate</AccordionControlButton>
        <AccordionPanel>
          <RotateControls recognizable={recognizable} />
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem>
        <AccordionControlButton>pinch</AccordionControlButton>
        <AccordionPanel>
          <PinchControls recognizable={recognizable} />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  )
}
