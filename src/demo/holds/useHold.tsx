import { useEffect } from "react"
import { ToastId, useToast } from "@chakra-ui/react"
import { AppRecognizable } from "../useRecognizable"
import { Settings } from "../App"
import { HoldRecognizer } from "../../core/hold/HoldRecognizer"

export const useHold = ({
  recognizable,
  settings,
}: {
  recognizable: AppRecognizable
  settings: Settings
}) => {
  const toast = useToast()
  const { holdDelay, holdNumInputs, holdPosThreshold } = settings
  const holdRecognizer = recognizable.recognizers.find(
    (recognizer): recognizer is HoldRecognizer =>
      recognizer instanceof HoldRecognizer,
  )

  useEffect(() => {
    holdRecognizer?.update({
      numInputs: holdNumInputs,
      posThreshold: holdPosThreshold,
      delay: holdDelay,
    })
  }, [holdRecognizer, holdDelay, holdNumInputs, holdPosThreshold])

  useEffect(() => {
    let toastId: ToastId | undefined

    const clickSub = recognizable.events$.subscribe((e) => {
      if (e.type === "holdStart") {
        toastId = toast({
          title: "Holding",
          duration: 9999999,
        })
      }

      if (e.type === "holdEnd") {
        toastId && toast.close(toastId)
      }
    })

    return () => {
      clickSub.unsubscribe()
    }
  }, [recognizable, toast])
}
