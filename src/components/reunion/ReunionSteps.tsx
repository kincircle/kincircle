"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";

export type StepState = "done" | "active" | "pending";

export interface StepConfig {
  id: string;
  number: number;
  title: string;
  summary: string;
  state: StepState;
  body: ReactNode;
}

interface ReunionStepsProps {
  steps: StepConfig[];
  initialExpandedId: string;
}

export function ReunionSteps({
  steps,
  initialExpandedId,
}: ReunionStepsProps) {
  const [expandedId, setExpandedId] = useState(initialExpandedId);

  return (
    <div className="reunion-steps">
      {steps.map((step) => {
        const isExpanded = step.id === expandedId;
        const bodyId = `${step.id}-body`;

        return (
          <div
            className={`step ${step.state}${isExpanded ? " expanded" : ""}`}
            id={step.id}
            key={step.id}
          >
            <button
              type="button"
              className="step-head"
              aria-expanded={isExpanded}
              aria-controls={bodyId}
              onClick={() => setExpandedId(isExpanded ? "" : step.id)}
            >
              <span className="step-num" aria-hidden="true">
                {step.state === "done" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </span>
              <div className="step-title">
                <h3>{step.title}</h3>
                <small className="muted">{step.summary}</small>
              </div>
            </button>

            {isExpanded && (
              <div className="step-body" id={bodyId}>
                {step.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
