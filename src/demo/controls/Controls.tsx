import { AccordionItemContent, Box } from "@chakra-ui/react"
import { PinchControls } from "../gesturesBox/PinchControls"
import { RotateControls } from "../gesturesBox/RotateControls"
import { HoldControls } from "../holds/HoldControls"
import { TapControls } from "../taps/TapControls"
import { AppRecognizable } from "../useRecognizable"
import { ControlBox } from "./ControlBox"
import { Settings } from "../App"
import { PanControl } from "../gesturesBox/PanControls"
import { ReactNode } from "react"
import {
  AccordionItem,
  AccordionItemTrigger,
  AccordionRoot,
} from "../chakra/ui/accordion"

const AccordionControlButton = ({ children }: { children: ReactNode }) => {
  return (
    <AccordionItemTrigger p={1} value="asdasd">
      <Box as="span" flex="1" textAlign="left">
        {children}
      </Box>
    </AccordionItemTrigger>
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
    <AccordionRoot
      collapsible
      multiple
      position="absolute"
      right={0}
      zIndex={1}
      width={150}
      bgColor="white"
      color="black"
    >
      <AccordionItem defaultChecked value="fingers">
        <AccordionControlButton>fingers</AccordionControlButton>
        <AccordionItemContent p={1}>
          <ControlBox>fingers: {fingers}</ControlBox>
        </AccordionItemContent>
      </AccordionItem>

      <AccordionItem value="taps">
        <AccordionControlButton>taps</AccordionControlButton>
        <AccordionItemContent p={1}>
          <TapControls
            value={settings.maxTaps}
            onChange={(value) => {
              onSettingsChange({ ...settings, maxTaps: value })
            }}
          />
        </AccordionItemContent>
      </AccordionItem>

      <AccordionItem value="pan">
        <AccordionControlButton>pan</AccordionControlButton>
        <AccordionItemContent p={1}>
          <PanControl
            recognizable={recognizable}
            settings={settings}
            setSettings={setSettings}
          />
        </AccordionItemContent>
      </AccordionItem>

      <AccordionItem value="hold">
        <AccordionControlButton>hold</AccordionControlButton>
        <AccordionItemContent p={1}>
          <HoldControls
            recognizable={recognizable}
            settings={settings}
            setSettings={setSettings}
          />
        </AccordionItemContent>
      </AccordionItem>

      <AccordionItem value="rotate">
        <AccordionControlButton>rotate</AccordionControlButton>
        <AccordionItemContent p={1}>
          <RotateControls
            recognizable={recognizable}
            settings={settings}
            setSettings={setSettings}
          />
        </AccordionItemContent>
      </AccordionItem>

      <AccordionItem value="pinch">
        <AccordionControlButton>pinch</AccordionControlButton>
        <AccordionItemContent p={1}>
          <PinchControls
            recognizable={recognizable}
            settings={settings}
            setSettings={setSettings}
          />
        </AccordionItemContent>
      </AccordionItem>
    </AccordionRoot>
  )
}
