import { useEffect, useState } from "react";
import type { Settings } from "../App";
import type { AppRecognizable } from "../useRecognizable";

export const usePinch = ({
	recognizable,
}: {
	recognizable: AppRecognizable;
	settings: Settings;
}) => {
	const [boxScale, setBoxScale] = useState(1);

	useEffect(() => {
		const sub = recognizable.events$.subscribe(({ event }) => {
			if (event.type === "pinchStart") {
				setBoxScale((value) => value * event.deltaDistanceScale);
			}

			if (event.type === "pinchMove") {
				setBoxScale((value) => value * event.deltaDistanceScale);
			}

			if (event.type === "pinchEnd") {
				setBoxScale((value) => value * event.deltaDistanceScale);
			}
		});

		return () => {
			sub.unsubscribe();
		};
	}, [recognizable]);

	return { boxScale };
};
