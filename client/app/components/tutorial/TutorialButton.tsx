import React, { useState, useEffect } from "react";
import { BookOpen, X } from "lucide-react";
import TutorialLauncher from "./TutorialLauncher";
import TutorialWorkflowGuide from "./TutorialWorkflowGuide";
import { useTutorialProgress } from "../../stores/tutorialProgress";

interface TutorialButtonProps {
  isOpen?: boolean;
  onClose?: () => void;
  showTriggerButton?: boolean;
}

export default function TutorialButton({
  isOpen,
  onClose,
  showTriggerButton = true,
}: TutorialButtonProps) {
  const [showLauncher, setShowLauncher] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState<
    string | undefined
  >();
  const { hasAnyProgress } = useTutorialProgress();

  const handleTutorialButtonClick = () => {
    if (hasAnyProgress()) {
      setSelectedTutorial(undefined);
      setShowGuide(true);
    } else {
      setShowLauncher(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleTutorialButtonClick();
      onClose?.();
    }
  }, [isOpen]);

  const handleLaunchTutorial = (tutorialId: string) => {
    setSelectedTutorial(tutorialId);
    setShowLauncher(false);
    setShowGuide(true);
  };

  const handleCloseGuide = () => {
    setShowGuide(false);
    setSelectedTutorial(undefined);
  };

  return (
    <>
      {/* Tutorial Button */}
      {showTriggerButton && (
        <button
          onClick={handleTutorialButtonClick}
          className="fixed bottom-6 left-6 z-40 rounded-full bg-[var(--kai-accent)] p-4 text-white shadow-lg transition-colors hover:bg-[var(--kai-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kai-accent-text)]"
          title="Open Tutorials"
        >
          <BookOpen className="w-6 h-6" />
        </button>
      )}

      {/* Tutorial Launcher Modal */}
      {showLauncher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="tutorial-launcher-title">
          <div className="flex w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-[var(--kai-border-dialog)] bg-[var(--kai-surface-dialog)] text-zinc-100 shadow-2xl shadow-black/50 max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--kai-border-dialog)] px-6 py-5">
              <h2 id="tutorial-launcher-title" className="text-xl font-semibold text-white">
                Tutorial Workflows
              </h2>
              <button
                onClick={() => setShowLauncher(false)}
                aria-label="Close tutorials"
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-[var(--kai-surface-hover)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--kai-accent-text)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="min-h-0 overflow-y-auto">
              <TutorialLauncher onLaunchTutorial={handleLaunchTutorial} />
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Guide Modal */}
      {showGuide && (
        <TutorialWorkflowGuide
          isOpen={showGuide}
          onClose={handleCloseGuide}
          selectedTutorial={selectedTutorial}
        />
      )}
    </>
  );
}
