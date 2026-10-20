import React, { useState } from "react";
import { BookOpen, Play, Clock } from "lucide-react";
import {
  TUTORIAL_WORKFLOWS,
  type TutorialWorkflow,
} from "../../data/tutorialWorkflows";

interface TutorialLauncherProps {
  onLaunchTutorial: (tutorialId: string) => void;
}

export default function TutorialLauncher({
  onLaunchTutorial,
}: TutorialLauncherProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  const categories = [
    "all",
    ...Array.from(new Set(TUTORIAL_WORKFLOWS.map((t) => t.category))),
  ];
  const difficulties = ["all", "Beginner", "Intermediate", "Advanced"];

  const filteredTutorials = TUTORIAL_WORKFLOWS.filter((tutorial) => {
    const categoryMatch =
      selectedCategory === "all" || tutorial.category === selectedCategory;
    const difficultyMatch =
      selectedDifficulty === "all" ||
      tutorial.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "border border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
      case "Intermediate":
        return "border border-amber-400/25 bg-amber-400/10 text-amber-300";
      case "Advanced":
        return "border border-red-400/25 bg-red-400/10 text-red-300";
      default:
        return "border border-[var(--kai-border-strong)] bg-[var(--kai-surface-hover)] text-zinc-300";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "AI & Chatbots":
        return "🤖";
      case "Document Processing":
        return "📄";
      case "Automation":
        return "⚡";
      default:
        return "🔧";
    }
  };

  return (
    <div className="bg-[var(--kai-surface-dialog)] p-6 text-zinc-100">
      <p className="mb-6 text-sm text-zinc-400">
        Choose a guided workflow to get started.
      </p>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="min-w-48 flex-1">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-[var(--kai-border-strong)] bg-[var(--kai-sidebar)] px-3 py-2 text-zinc-100 focus:border-[var(--kai-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--kai-accent)]/20"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Difficulty
          </label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full rounded-lg border border-[var(--kai-border-strong)] bg-[var(--kai-sidebar)] px-3 py-2 text-zinc-100 focus:border-[var(--kai-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--kai-accent)]/20"
          >
            {difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty === "all" ? "All Difficulties" : difficulty}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tutorial Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTutorials.map((tutorial) => (
          <div
            key={tutorial.id}
            className="flex flex-col rounded-lg border border-[var(--kai-border-dialog)] bg-[var(--kai-surface-control)] p-5 transition-colors hover:border-[var(--kai-accent)]/55"
          >
            {/* Tutorial Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {getCategoryIcon(tutorial.category)}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {tutorial.name}
                  </h3>
                  <p className="text-sm text-zinc-400">{tutorial.category}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                  tutorial.difficulty
                )}`}
              >
                {tutorial.difficulty}
              </span>
            </div>

            {/* Description */}
            <p className="mb-4 line-clamp-3 text-sm leading-6 text-zinc-300">
              {tutorial.description}
            </p>

            {/* Metadata */}
            <div className="mb-4 flex items-center gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {tutorial.estimatedTime}
              </div>
              <div className="flex items-center gap-1">
                <Play className="w-4 h-4" />
                {tutorial.steps.length} steps
              </div>
            </div>

            {/* Prerequisites */}
            {tutorial.prerequisites.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-zinc-300">
                  Prerequisites:
                </p>
                <div className="flex flex-wrap gap-1">
                  {tutorial.prerequisites.map((prereq, index) => (
                    <span
                      key={index}
                      className="rounded-full border border-[var(--kai-border-strong)] bg-[var(--kai-surface-hover)] px-2 py-1 text-xs text-zinc-300"
                    >
                      {prereq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {tutorial.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="rounded-full border border-[var(--kai-accent)]/25 bg-[var(--kai-accent)]/10 px-2 py-1 text-xs text-[var(--kai-accent-text)]"
                >
                  {tag}
                </span>
              ))}
              {tutorial.tags.length > 3 && (
                <span className="rounded-full border border-[var(--kai-border-strong)] bg-[var(--kai-surface-hover)] px-2 py-1 text-xs text-zinc-300">
                  +{tutorial.tags.length - 3}
                </span>
              )}
            </div>

            {/* Launch Button */}
            <button
              onClick={() => onLaunchTutorial(tutorial.id)}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--kai-accent)] px-4 py-2 text-white transition-colors hover:bg-[var(--kai-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kai-accent-text)]"
            >
              <Play className="w-4 h-4" />
              Start Tutorial
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTutorials.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto mb-4 h-16 w-16 text-zinc-500" />
          <h3 className="mb-2 text-lg font-semibold text-zinc-200">
            No tutorials found
          </h3>
          <p className="text-zinc-400">
            Try adjusting your filters to see more tutorials.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t border-[var(--kai-border-dialog)] pt-6 text-center">
        <p className="text-sm text-zinc-400">
          Need help? Check out our{" "}
          <a href="#" className="text-[var(--kai-accent-text)] underline hover:text-white">
            documentation
          </a>{" "}
          or{" "}
          <a href="#" className="text-[var(--kai-accent-text)] underline hover:text-white">
            community forum
          </a>
          .
        </p>
      </div>
    </div>
  );
}
