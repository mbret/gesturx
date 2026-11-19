import { useEffect } from "react";
import type { AppRecognizable } from "../useRecognizable.ts";
import { useSwipeToast } from "./useSwipeToast.tsx";

export const useSwipe = ({
	recognizable,
}: {
	recognizable: AppRecognizable;
}) => {
	const swipeDebugToast = useSwipeToast();

	useEffect(() => {
		const sub = recognizable.events$.subscribe(({ event }) => {
			if (event.type === "swipe") {
				swipeDebugToast(event);
			}
		});

		return () => {
			sub.unsubscribe();
		};
	}, [recognizable, swipeDebugToast]);
};
