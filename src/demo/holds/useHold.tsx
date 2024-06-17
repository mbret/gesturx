import { useEffect } from "react"
import { ToastId, useToast } from "@chakra-ui/react"
import { AppRecognizable } from "../useRecognizable"
import { Settings } from "../App"

export const useHold = ({
  recognizable,
}: {
  recognizable: AppRecognizable
  settings: Settings
}) => {
  const toast = useToast()

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
        if (toastId) {
          toast.close(toastId)
        }
      }
    })

    return () => {
      clickSub.unsubscribe()
    }
  }, [recognizable, toast])
}
