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
		const sub = recognizable.events$.subscribe((e) => {
			if (e.type === "pinchStart") {
				setBoxScale((value) => value * e.deltaDistanceScale);
			}

			if (e.type === "pinchMove") {
				setBoxScale((value) => value * e.deltaDistanceScale);
			}

			if (e.type === "pinchEnd") {
				setBoxScale((value) => value * e.deltaDistanceScale);
			}
		});

		return () => {
			sub.unsubscribe();
		};
	}, [recognizable]);

	return { boxScale };
};
