'use client';

import { Check } from 'lucide-react';

const steps = [
  { number: 1, label: 'Trade' },
  { number: 2, label: 'Template' },
  { number: 3, label: 'Info' },
  { number: 4, label: 'Domain' },
  { number: 5, label: 'Customize' },
  { number: 6, label: 'Launch' },
];

export default function WizardProgress({ currentStep, onStepClick }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isUpcoming = currentStep < step.number;

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <button
                onClick={() => isCompleted && onStepClick(step.number)}
                disabled={!isCompleted}
                className={`flex flex-col items-center gap-1.5 ${
                  isCompleted ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    isCompleted
                      ? 'bg-gold-500 text-navy-500'
                      : isCurrent
                        ? 'border-2 border-gold-500 text-gold-500 pulse-gold'
                        : 'border-2 border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check size={18} /> : step.number}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    isCompleted
                      ? 'text-gold-600'
                      : isCurrent
                        ? 'text-navy-500'
                        : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-3">
                  <div
                    className={`h-0.5 rounded-full transition-colors duration-200 ${
                      currentStep > step.number ? 'bg-gold-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
