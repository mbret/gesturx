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
      p={0}
    >
      <AccordionItem defaultChecked>
        <AccordionControlButton>fingers</AccordionControlButton>
        <AccordionPanel p={1}>
          <ControlBox>fingers: {fingers}</ControlBox>
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem>
        <AccordionControlButton>taps</AccordionControlButton>
        <AccordionPanel p={1}>
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
        <AccordionPanel p={1}>
          <PanControl
            recognizable={recognizable}
            settings={settings}
            setSettings={setSettings}
          />
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem>
        <AccordionControlButton>hold</AccordionControlButton>
        <AccordionPanel p={1}>
          <HoldControls
            recognizable={recognizable}
            settings={settings}
            setSettings={setSettings}
          />
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem>
        <AccordionControlButton>rotate</AccordionControlButton>
        <AccordionPanel p={1}>
          <RotateControls
            recognizable={recognizable}
            settings={settings}
            setSettings={setSettings}
          />
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem>
        <AccordionControlButton>pinch</AccordionControlButton>
        <AccordionPanel p={1}>
          <PinchControls
            recognizable={recognizable}
            settings={settings}
            setSettings={setSettings}
          />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  )
}
