import { useEffect, useState } from "react";
import type { Settings } from "../App";
import type { AppRecognizable } from "../useRecognizable";

export const useRotate = ({
	recognizable,
}: {
	recognizable: AppRecognizable;
	settings: Settings;
}) => {
	const [boxAngle, setBoxAngle] = useState(0);

	useEffect(() => {
		const sub = recognizable.events$.subscribe((e) => {
			if (e.type === "rotateMove") {
				setBoxAngle((state) => state + e.deltaAngle);
			}
		});

		return () => {
			sub.unsubscribe();
		};
	}, [recognizable]);

	return { boxAngle };
};
