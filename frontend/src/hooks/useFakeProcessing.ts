import { useState, useEffect } from "react";

type Stage = {
  label: string;
  progress: number;
};

const STAGES: Stage[] = [
  { label: "Analyzing text...", progress: 25 },
  { label: "Matching sign patterns...", progress: 50 },
  { label: "Rendering gestures...", progress: 75 },
  { label: "Finalizing video...", progress: 100 },
];

export function useFakeProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!isProcessing) return;

    // determine total time from ENV, default 180s (3min)
    const renderTimeMs = parseInt(import.meta.env.VITE_RENDER_TIME || "180000", 10);
    const intervalMs = 100; // update frequency
    const totalSteps = renderTimeMs / intervalMs;
    const progressPerStep = 100 / totalSteps;

    let currentProgress = 0;
    
    // Set initial text
    setStatusText(STAGES[0].label);

    const interval = setInterval(() => {
      currentProgress += progressPerStep;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setIsProcessing(false);
      }

      setProgress(currentProgress);

      const targetStage = STAGES.find(s => currentProgress <= s.progress);
      if (targetStage && targetStage.label !== statusText) {
        setStatusText(targetStage.label);
      }

    }, intervalMs);

    return () => clearInterval(interval);
  }, [isProcessing, statusText]);

  const startProcessing = () => {
    setIsProcessing(true);
    setProgress(0);
    setStageIndex(0);
    setStatusText(STAGES[0].label);
  };

  const cancelProcessing = () => {
    setIsProcessing(false);
    setProgress(0);
    setStatusText("");
  };

  return {
    isProcessing,
    progress,
    statusText,
    startProcessing,
    cancelProcessing
  };
}
