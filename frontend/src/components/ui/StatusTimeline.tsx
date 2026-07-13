import React from "react";
import { Check } from "lucide-react";

interface StatusTimelineProps {
  currentStatus: string;
}

const STEPS = ["created", "verified", "searching", "matched", "fulfilled", "closed"];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ currentStatus }) => {
  const currentIndex = STEPS.indexOf(currentStatus.toLowerCase());

  return (
    <div className="w-full py-4 overflow-x-auto">
      <div className="flex items-center min-w-[500px] justify-between relative px-2">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-red-500 -translate-y-1/2 z-0 transition-all duration-700"
          style={{
            width: `${(Math.max(0, currentIndex) / (STEPS.length - 1)) * 100}%`
          }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          const isPastOrActive = idx <= currentIndex;

          return (
            <div key={idx} className="flex flex-col items-center z-10 relative">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center border font-extrabold text-[11px] transition-all duration-500 ${
                  isCompleted
                    ? "bg-red-500 border-red-500 text-white"
                    : isActive
                    ? "bg-white dark:bg-slate-900 border-red-500 text-red-500 ring-4 ring-red-500/10 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-850 border-slate-250 dark:border-slate-800 text-slate-400"
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
              </div>
              <span
                className={`text-[9px] font-extrabold uppercase mt-2 tracking-wider ${
                  isPastOrActive
                    ? "text-red-500 dark:text-red-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default StatusTimeline;
