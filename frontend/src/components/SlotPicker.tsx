import React from "react";
import { Clock, Users } from "lucide-react";
import { Button } from "./ui/Button";

interface Slot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  status: string;
}

interface SlotPickerProps {
  slots: Slot[];
  selectedSlotId: number | null;
  onSelectSlot: (slotId: number) => void;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  selectedSlotId,
  onSelectSlot
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {slots.map((slot) => {
        const isFull = slot.booked_count >= slot.capacity;
        const isClosed = slot.status === "closed";
        const isSelected = selectedSlotId === slot.id;
        const availableCount = Math.max(0, slot.capacity - slot.booked_count);

        return (
          <div
            key={slot.id}
            onClick={() => {
              if (!isFull && !isClosed) onSelectSlot(slot.id);
            }}
            className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden ${
              isSelected
                ? "border-red-500 bg-red-500/[0.02] ring-2 ring-red-500/20"
                : isFull || isClosed
                ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 opacity-60 cursor-not-allowed"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-350 dark:hover:border-slate-700"
            }`}
          >
            {/* Top Bar */}
            <div className="flex justify-between items-start">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Clock className="h-4 w-4 text-red-500" />
                {slot.start_time} - {slot.end_time}
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                  isClosed
                    ? "bg-slate-200 text-slate-500"
                    : isFull
                    ? "bg-red-500/10 text-red-500"
                    : availableCount < 3
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-emerald-500/10 text-emerald-500"
                }`}
              >
                {isClosed ? "Closed" : isFull ? "Full" : `${availableCount} Left`}
              </span>
            </div>

            {/* Middle Stats */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold leading-none">
              <Users className="h-3.5 w-3.5" />
              <span>
                Capacity: {slot.booked_count} / {slot.capacity} booked
              </span>
            </div>

            {/* Bottom Selection Marker */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">
                {slot.date}
              </span>
              <span
                className={`text-[10px] font-bold ${
                  isSelected ? "text-red-500" : "text-slate-400"
                }`}
              >
                {isSelected ? "Selected" : "Click to select"}
              </span>
            </div>
          </div>
        );
      })}

      {slots.length === 0 && (
        <div className="col-span-full p-8 text-center text-slate-400 font-bold border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          No slots registered for this camp drive.
        </div>
      )}
    </div>
  );
};
export default SlotPicker;
