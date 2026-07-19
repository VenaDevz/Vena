"use client";

import { ChevronRight, SkipForward } from "lucide-react";
import { FARM_TUTORIAL_STEPS } from "../config/farm-tutorial";

type Props = {
  step: number;
  onNext: () => void;
  onSkip: () => void;
};

export default function FarmTutorial({ step, onNext, onSkip }: Props) {
  const current = FARM_TUTORIAL_STEPS[step];
  if (!current) return null;

  const isLast = step >= FARM_TUTORIAL_STEPS.length - 1;

  return (
    <div className="farm-tutorial-backdrop" role="dialog" aria-modal aria-labelledby="farm-tutorial-title">
      <div className="farm-tutorial-card">
        <div className="farm-tutorial-progress">
          {FARM_TUTORIAL_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`farm-tutorial-dot ${i <= step ? "farm-tutorial-dot-on" : ""}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="farm-tutorial-skip"
          aria-label="Skip tutorial"
        >
          <SkipForward size={14} />
        </button>

        <p className="farm-tutorial-kicker">Commander briefing · {step + 1}/{FARM_TUTORIAL_STEPS.length}</p>
        <h2 id="farm-tutorial-title" className="farm-tutorial-title">
          {current.title}
        </h2>
        <p className="farm-tutorial-body">{current.body}</p>
        {current.hint && (
          <p className="farm-tutorial-hint">{current.hint}</p>
        )}

        <div className="farm-tutorial-actions">
          <button type="button" onClick={onSkip} className="farm-btn-ghost px-4 py-2 text-xs uppercase tracking-wider">
            Skip all
          </button>
          <button type="button" onClick={onNext} className="farm-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-wider">
            {isLast ? "Deploy" : "Next"}
            {!isLast && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
