import { useRecognizable } from "./useRecognizable"
import { useTap } from "./taps/useTap"
import { useHold } from "./holds/useHold"
import { CenterTracker } from "./trackers/CenterTracker"
import { useSwipe } from "./swipes/useSwipe"
import { useTrackFingers } from "./trackers/useTrackFingers"
import { Pan } from "./Pan"
import { GesturesBox } from "./gesturesBox/GesturesBox"
import { memo, useState } from "react"
import { Controls } from "./controls/Controls"
import { Toaster } from "./chakra/ui/toaster"

export type Settings = {
  maxTaps: number
  holdNumInputs: number
  holdPosThreshold: number
  holdDelay: number
  panNumInputs: number
  panPosThreshold: number
  panDelay: number
  pinchPosThreshold: number
  rotateNumInputs: number
  rotatePosThreshold: number
}

function App() {
  const [settings, setSettings] = useState<Settings>({
    maxTaps: 3,
    holdNumInputs: 1,
    holdPosThreshold: 0,
    holdDelay: 0,
    panDelay: 0,
    panNumInputs: 1,
    panPosThreshold: 15,
    pinchPosThreshold: 15,
    rotateNumInputs: 2,
    rotatePosThreshold: 15,
  })
  const { recognizable, containerRef } = useRecognizable()

  /**
   * Detect user taps
   */
  useTap({ recognizable, maxTaps: settings.maxTaps })

  /**
   * Detect when user is holding the pan
   */
  useHold({ recognizable, settings })

  /**
   * Detect swipes
   */
  useSwipe({
    recognizable,
  })

  /**
   * Track number of fingers active
   */
  const { fingers } = useTrackFingers(recognizable)

  return (
    <>
      <Controls
        fingers={fingers}
        settings={settings}
        setSettings={setSettings}
        onSettingsChange={(newSettings) => setSettings(newSettings)}
        recognizable={recognizable}
      />
      <Pan containerRef={containerRef}>
        <GesturesBox recognizable={recognizable} settings={settings} />
        <CenterTracker recognizable={recognizable} />
      </Pan>
      <Toaster />
    </>
  )
}

export default memo(App)
