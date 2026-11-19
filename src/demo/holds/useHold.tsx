import { useEffect } from "react";
import type { Settings } from "../App.tsx";
import { toaster } from "../chakra/ui/toaster.tsx";
// import { ToastId, useToast } from "@chakra-ui/react"
import type { AppRecognizable } from "../useRecognizable.ts";

export const useHold = ({
	recognizable,
}: {
	recognizable: AppRecognizable;
	settings: Settings;
}) => {
	// const toast = useToast()

	useEffect(() => {
		let toastId: string | undefined;

		const clickSub = recognizable.events$.subscribe(({ event }) => {
			if (event.type === "holdStart") {
				toastId = toaster.create({
					title: "Holding",
					duration: 9999999,
				});
			}

			if (event.type === "holdEnd") {
				if (toastId) {
					toaster.remove(toastId);
				}
			}
		});

		return () => {
			clickSub.unsubscribe();
		};
	}, [recognizable]);
};
