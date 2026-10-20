import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Play,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Info,
  Lightbulb,
  Code,
  Zap,
} from "lucide-react";
import {
  TUTORIAL_WORKFLOWS,
  type TutorialWorkflow,
  type TutorialStep,
} from "../../data/tutorialWorkflows";
import { useTutorialProgress } from "../../stores/tutorialProgress";

interface TutorialWorkflowGuideProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTutorial?: string;
}

export default function TutorialWorkflowGuide({
  isOpen,
  onClose,
  selectedTutorial,
}: TutorialWorkflowGuideProps) {
  const { getProgressList, getProgress, saveProgress } = useTutorialProgress();
  const [currentTutorial, setCurrentTutorial] =
    useState<TutorialWorkflow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);


  useEffect(() => {
    if (selectedTutorial) {
      const tutorial = TUTORIAL_WORKFLOWS.find((t) => t.id === selectedTutorial);
      if (tutorial) {
        setCurrentTutorial(tutorial);
        setCurrentStepIndex(0);
        setCompletedSteps(new Set());
        setLoaded(true);
        saveProgress(tutorial.id, 0, []);
      }
      return;
    }

    const progressList = getProgressList();
    if (progressList.length > 0) {
      const latest = progressList[0];
      const tutorial = TUTORIAL_WORKFLOWS.find((t) => t.id === latest.tutorial_id);
      if (tutorial) {
        setCurrentTutorial(tutorial);
        setCurrentStepIndex(latest.current_step ?? 0);
        setCompletedSteps(new Set(latest.completed_steps ?? []));
        setLoaded(true);
        return;
      }
    }
    setCurrentTutorial(TUTORIAL_WORKFLOWS[0]);
    setLoaded(true);
  }, [selectedTutorial]);

  useEffect(() => {
    if (!loaded || !currentTutorial) return;
    saveProgress(currentTutorial.id, currentStepIndex, Array.from(completedSteps));
  }, [currentTutorial, currentStepIndex, completedSteps, loaded]);

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
  };

  const handleStepUncomplete = (stepId: string) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });
  };

  const nextStep = () => {
    if (
      currentTutorial &&
      currentStepIndex < currentTutorial.steps.length - 1
    ) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const selectTutorial = (tutorial: TutorialWorkflow) => {
    const progress = getProgress(tutorial.id);
    setCurrentTutorial(tutorial);
    setCurrentStepIndex(progress?.current_step ?? 0);
    setCompletedSteps(new Set(progress?.completed_steps ?? []));
  };

  const getProgressPercentage = () => {
    if (!currentTutorial) return 0;
    return (completedSteps.size / currentTutorial.steps.length) * 100;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="tutorial-guide-title">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--kai-border-dialog)] bg-[var(--kai-surface-dialog)] text-zinc-100 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--kai-border-dialog)] px-6 py-5">
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-[var(--kai-accent-text)]" />
            <div>
              <h2 id="tutorial-guide-title" className="text-xl font-semibold text-white">
                Tutorial Workflow Guide
              </h2>
              <p className="text-sm text-zinc-400">
                Step-by-step guides for building AI workflows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close tutorial guide"
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-[var(--kai-surface-hover)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--kai-accent-text)]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="kai-tutorial-layout min-h-0 flex-1 overflow-hidden">
          {/* Sidebar - Tutorial Selection */}
          <div className="kai-tutorial-sidebar shrink-0 overflow-y-auto bg-[var(--kai-sidebar)]">
            <div className="p-4">
              <h3 className="mb-4 text-sm font-semibold text-zinc-200">
                Available Tutorials
              </h3>
              <div className="space-y-3">
                {TUTORIAL_WORKFLOWS.map((tutorial) => (
                  <button
                    key={tutorial.id}
                    onClick={() => selectTutorial(tutorial)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${currentTutorial?.id === tutorial.id
                      ? "border-[var(--kai-accent)]/60 bg-[var(--kai-accent)]/15"
                      : "border-[var(--kai-border-dialog)] bg-[var(--kai-surface-control)] hover:border-[var(--kai-border-strong)]"
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">
                          {tutorial.name}
                        </h4>
                        <p className="mt-1 text-sm text-zinc-400">
                          {tutorial.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${tutorial.difficulty === "Beginner"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : tutorial.difficulty === "Intermediate"
                                ? "bg-amber-400/10 text-amber-300"
                                : "bg-red-400/10 text-red-300"
                              }`}
                          >
                            {tutorial.difficulty}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {tutorial.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Tutorial Steps */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {currentTutorial && (
              <>
                {/* Tutorial Header */}
                <div className="border-b border-[var(--kai-border-dialog)] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {currentTutorial.name}
                      </h3>
                      <p className="mt-1 text-zinc-400">
                        {currentTutorial.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-sm text-zinc-400">
                          <Code className="w-4 h-4 inline mr-1" />
                          {currentTutorial.category}
                        </span>
                        <span className="text-sm text-zinc-400">
                          <Zap className="w-4 h-4 inline mr-1" />
                          {currentTutorial.estimatedTime}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-[var(--kai-accent-text)]">
                        {Math.round(getProgressPercentage())}%
                      </div>
                      <div className="text-sm text-zinc-400">Complete</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-[var(--kai-border-dialog)]">
                      <div
                        className="h-2 rounded-full bg-[var(--kai-accent)] transition-[width] duration-300"
                        style={{ width: `${getProgressPercentage()}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Step Content */}
                <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--kai-surface-dialog)] p-6">
                  {currentTutorial.steps[currentStepIndex] && (
                    <div className="max-w-4xl mx-auto">
                      {/* Step Header */}
                      <div className="mb-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--kai-accent)]/15">
                            <span className="text-lg font-semibold text-[var(--kai-accent-text)]">
                              {currentStepIndex + 1}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-xl font-semibold text-white">
                              {currentTutorial.steps[currentStepIndex].title}
                            </h4>
                            <p className="text-zinc-400">
                              {
                                currentTutorial.steps[currentStepIndex]
                                  .description
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Step Instructions */}
                      <div className="mb-6 rounded-lg border border-[var(--kai-accent)]/25 bg-[var(--kai-accent)]/10 p-6">
                        <h5 className="mb-3 flex items-center gap-2 font-semibold text-[var(--kai-accent-text)]">
                          <Play className="w-5 h-5" />
                          Step-by-Step Instructions
                        </h5>
                        <ol className="space-y-3">
                          {currentTutorial.steps[
                            currentStepIndex
                          ].instructions.map((instruction, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--kai-accent)] text-sm font-semibold text-white">
                                {index + 1}
                              </span>
                              <span className="text-zinc-100">
                                {instruction}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Tips */}
                      {currentTutorial.steps[currentStepIndex].tips.length >
                        0 && (
                          <div className="mb-6 rounded-lg border border-amber-400/25 bg-amber-400/10 p-6">
                            <h5 className="mb-3 flex items-center gap-2 font-semibold text-amber-300">
                              <Lightbulb className="w-5 h-5" />
                              Pro Tips
                            </h5>
                            <ul className="space-y-2">
                              {currentTutorial.steps[currentStepIndex].tips.map(
                                (tip, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start gap-3"
                                  >
                                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-amber-300"></span>
                                    <span className="text-zinc-100">{tip}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                      {/* Expected Outcome */}
                      <div className="mb-6 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-6">
                        <h5 className="mb-3 flex items-center gap-2 font-semibold text-emerald-300">
                          <CheckCircle className="w-5 h-5" />
                          Expected Outcome
                        </h5>
                        <p className="text-zinc-100">
                          {
                            currentTutorial.steps[currentStepIndex]
                              .expectedOutcome
                          }
                        </p>
                      </div>

                      {/* Step Completion */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            const stepId =
                              currentTutorial.steps[currentStepIndex].id;
                            if (completedSteps.has(stepId)) {
                              handleStepUncomplete(stepId);
                            } else {
                              handleStepComplete(stepId);
                            }
                          }}
                          className={`px-6 py-3 rounded-lg font-medium transition-all ${completedSteps.has(
                            currentTutorial.steps[currentStepIndex].id
                          )
                            ? "border border-emerald-400/35 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                            : "bg-[var(--kai-accent)] text-white hover:bg-[var(--kai-accent-hover)]"
                            }`}
                        >
                          {completedSteps.has(
                            currentTutorial.steps[currentStepIndex].id
                          ) ? (
                            <>
                              <CheckCircle className="w-5 h-5 inline mr-2" />
                              Step Completed
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5 inline mr-2" />
                              Mark as Complete
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Footer */}
                <div className="border-t border-[var(--kai-border-dialog)] bg-[var(--kai-sidebar)] p-6">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={previousStep}
                      disabled={currentStepIndex === 0}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${currentStepIndex === 0
                        ? "cursor-not-allowed bg-[var(--kai-surface-control)] text-zinc-500"
                        : "border border-[var(--kai-border-strong)] bg-[var(--kai-surface-control)] text-zinc-100 hover:bg-[var(--kai-surface-hover)]"
                        }`}
                    >
                      <ChevronLeft className="w-5 h-5 inline mr-2" />
                      Previous
                    </button>

                    <div className="text-sm text-zinc-400">
                      Step {currentStepIndex + 1} of{" "}
                      {currentTutorial.steps.length}
                    </div>

                    <button
                      onClick={nextStep}
                      disabled={
                        currentStepIndex === currentTutorial.steps.length - 1
                      }
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${currentStepIndex === currentTutorial.steps.length - 1
                        ? "cursor-not-allowed bg-[var(--kai-surface-control)] text-zinc-500"
                        : "bg-[var(--kai-accent)] text-white hover:bg-[var(--kai-accent-hover)]"
                        }`}
                    >
                      Next
                      <ChevronRight className="w-5 h-5 inline ml-2" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
