import { useRecognizable } from "./useRecognizable"
import { useTap } from "./taps/useTap"
import { useHold } from "./holds/useHold"
import { CenterTracker } from "./trackers/CenterTracker"
import { useSwipe } from "./swipes/useSwipe"
import { useTrackFingers } from "./trackers/useTrackFingers"
import { Pan } from "./Pan"
import { GesturesBox } from "./gesturesBox/GesturesBox"
import { useState } from "react"
import { Controls } from "./controls/Controls"

function App() {
  const [maxTaps, setMaxTaps] = useState(3)
  const { recognizable, containerRef } = useRecognizable()

  /**
   * Detect user taps
   */
  useTap({ recognizable, maxTaps })

  /**
   * Detect when user is holding the pan
   */
  useHold(recognizable)

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
        maxTaps={maxTaps}
        onMaxTapsChange={(value) => setMaxTaps(value)}
        recognizable={recognizable}
      />
      <Pan containerRef={containerRef}>
        <GesturesBox recognizable={recognizable} />
        <CenterTracker recognizable={recognizable} />
      </Pan>
    </>
  )
}

export default App
