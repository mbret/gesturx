import { useEffect } from "react";
import type { AppRecognizable } from "../useRecognizable";
import { useSwipeToast } from "./useSwipeToast";

export const useSwipe = ({
	recognizable,
}: {
	recognizable: AppRecognizable;
}) => {
	const swipeDebugToast = useSwipeToast();

	useEffect(() => {
		const sub = recognizable.events$.subscribe((e) => {
			if (e.type === "swipe") {
				swipeDebugToast(e);
			}
		});

		return () => {
			sub.unsubscribe();
		};
	}, [recognizable, swipeDebugToast]);
};
