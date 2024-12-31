import { memo, useState } from "react";
import { Pan } from "./Pan";
import { Toaster } from "./chakra/ui/toaster";
import { Controls } from "./controls/Controls";
import { GesturesBox } from "./gesturesBox/GesturesBox";
import { useHold } from "./holds/useHold";
import { useSwipe } from "./swipes/useSwipe";
import { useTap } from "./taps/useTap";
import { CenterTracker } from "./trackers/CenterTracker";
import { useTrackFingers } from "./trackers/useTrackFingers";
import { useRecognizable } from "./useRecognizable";

export type Settings = {
	maxTaps: number;
	holdNumInputs: number;
	holdPosThreshold: number;
	holdDelay: number;
	panNumInputs: number;
	panPosThreshold: number;
	panDelay: number;
	pinchPosThreshold: number;
	rotateNumInputs: number;
	rotatePosThreshold: number;
};

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
	});
	const { recognizable, containerRef } = useRecognizable();

	/**
	 * Detect user taps
	 */
	useTap({ recognizable, maxTaps: settings.maxTaps });

	/**
	 * Detect when user is holding the pan
	 */
	useHold({ recognizable, settings });

	/**
	 * Detect swipes
	 */
	useSwipe({
		recognizable,
	});

	/**
	 * Track number of fingers active
	 */
	const { fingers } = useTrackFingers(recognizable);

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
	);
}

export default memo(App);
