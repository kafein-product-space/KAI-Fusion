import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import { NumberStepControls } from "./ThemedNumberInput";

interface ThemedDateTimeInputProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (value: number) => String(value).padStart(2, "0");

const parseValue = (value?: string | null) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2}):(\d{2})/);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

const serialize = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
  `T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const sameDay = (left: Date | null, right: Date) =>
  !!left &&
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

interface TimeControlProps {
  label: string;
  value: number | null;
  max: number;
  disabled: boolean;
  onType: (value: string) => void;
  onStep: (delta: number) => void;
}

const TimeControl = ({
  label,
  value,
  max,
  disabled,
  onType,
  onStep,
}: TimeControlProps) => (
  <div className={`kai-node-field-shell h-9 w-[4.5rem] rounded-md ${disabled ? "is-disabled opacity-40" : ""}`}>
    <input
      aria-label={label}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      disabled={disabled}
      value={value === null ? "" : pad(value)}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => {
        const next = event.target.value.trim();
        if (/^\d{1,2}$/.test(next) && Number(next) <= max) onType(next);
      }}
      className="kai-node-field-input px-2 text-center"
    />
    <NumberStepControls
      increaseDisabled={disabled}
      decreaseDisabled={disabled}
      increaseLabel={`Increase ${label.toLowerCase()}`}
      decreaseLabel={`Decrease ${label.toLowerCase()}`}
      onIncrease={() => onStep(1)}
      onDecrease={() => onStep(-1)}
    />
  </div>
);

export const ThemedDateTimeInput = ({
  value,
  onChange,
  placeholder = "Select date and time",
}: ThemedDateTimeInputProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => parseValue(value), [value]);
  const [open, setOpen] = useState(false);
  const [headerPicker, setHeaderPicker] = useState<"month" | "year" | null>(null);
  const [yearPageStart, setYearPageStart] = useState(() => {
    const initial = selected ?? new Date();
    return Math.floor(initial.getFullYear() / 10) * 10;
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const initial = selected ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setHeaderPicker(null);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (open && selected) {
      setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [open, selected?.getTime()]);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const leadingEmptyDays = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: leadingEmptyDays }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [viewMonth]);

  const selectDay = (day: Date) => {
    const next = new Date(day);
    next.setHours(selected?.getHours() ?? 0, selected?.getMinutes() ?? 0, 0, 0);
    onChange(serialize(next));
  };

  const updateTime = (part: "hours" | "minutes", rawValue: string) => {
    if (!selected) return;
    const next = new Date(selected);
    const numericValue = Number(rawValue);
    if (part === "hours") next.setHours(Math.min(23, Math.max(0, numericValue || 0)));
    else next.setMinutes(Math.min(59, Math.max(0, numericValue || 0)));
    onChange(serialize(next));
  };

  const stepTime = (part: "hours" | "minutes", delta: number) => {
    if (!selected) return;
    const next = new Date(selected);
    if (part === "hours") next.setHours(next.getHours() + delta);
    else next.setMinutes(next.getMinutes() + delta);
    onChange(serialize(next));
  };

  const openHeaderPicker = (picker: "month" | "year") => {
    setHeaderPicker((current) => (current === picker ? null : picker));
    if (picker === "year") {
      setYearPageStart(Math.floor(viewMonth.getFullYear() / 10) * 10);
    }
  };

  const chooseToday = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    onChange(serialize(now));
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const displayValue = selected
    ? `${pad(selected.getDate())}.${pad(selected.getMonth() + 1)}.${selected.getFullYear()} ` +
      `${pad(selected.getHours())}:${pad(selected.getMinutes())}`
    : "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setHeaderPicker(null);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        className="kai-node-field-control flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <CalendarDays size={16} className="shrink-0 text-[var(--kai-accent-text)]" />
        <span className={displayValue ? "text-[var(--kai-text)]" : "text-[var(--kai-placeholder)]"}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date and time"
          className="kai-node-field-menu absolute z-[70] mt-2 w-full min-w-[20rem] max-w-sm p-3"
        >
          <div className="relative mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
              }
              className="rounded-md p-1.5 text-[var(--kai-text-muted)] transition-colors hover:bg-[var(--kai-surface-hover)] hover:text-[var(--kai-text)]"
            >
              <ChevronLeft size={17} />
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-expanded={headerPicker === "month"}
                onClick={() => openHeaderPicker("month")}
                className={`rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                  headerPicker === "month"
                    ? "bg-[var(--kai-accent-soft)] text-[var(--kai-accent-text)]"
                    : "text-[var(--kai-text)] hover:bg-[var(--kai-surface-hover)]"
                }`}
              >
                {MONTHS[viewMonth.getMonth()]}
              </button>
              <button
                type="button"
                aria-expanded={headerPicker === "year"}
                onClick={() => openHeaderPicker("year")}
                className={`rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                  headerPicker === "year"
                    ? "bg-[var(--kai-accent-soft)] text-[var(--kai-accent-text)]"
                    : "text-[var(--kai-text)] hover:bg-[var(--kai-surface-hover)]"
                }`}
              >
                {viewMonth.getFullYear()}
              </button>
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
              }
              className="rounded-md p-1.5 text-[var(--kai-text-muted)] transition-colors hover:bg-[var(--kai-surface-hover)] hover:text-[var(--kai-text)]"
            >
              <ChevronRight size={17} />
            </button>

            {headerPicker === "month" && (
              <div className="kai-node-field-menu absolute left-8 right-8 top-10 z-10 grid grid-cols-3 gap-1 p-2">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      setViewMonth(new Date(viewMonth.getFullYear(), index, 1));
                      setHeaderPicker(null);
                    }}
                    className={`rounded-md px-2 py-2 text-xs transition-colors ${
                      viewMonth.getMonth() === index
                        ? "bg-[var(--kai-accent)] text-[var(--kai-text-on-accent)]"
                        : "text-[var(--kai-text-secondary)] hover:bg-[var(--kai-surface-hover)] hover:text-[var(--kai-text)]"
                    }`}
                  >
                    {month.slice(0, 3)}
                  </button>
                ))}
              </div>
            )}

            {headerPicker === "year" && (
              <div className="kai-node-field-menu absolute left-8 right-8 top-10 z-10 p-2">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Previous decade"
                    onClick={() => setYearPageStart((year) => year - 10)}
                    className="rounded p-1 text-[var(--kai-text-muted)] transition-colors hover:bg-[var(--kai-surface-hover)] hover:text-[var(--kai-text)]"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-medium text-[var(--kai-text-muted)]">
                    {yearPageStart}–{yearPageStart + 9}
                  </span>
                  <button
                    type="button"
                    aria-label="Next decade"
                    onClick={() => setYearPageStart((year) => year + 10)}
                    className="rounded p-1 text-[var(--kai-text-muted)] transition-colors hover:bg-[var(--kai-surface-hover)] hover:text-[var(--kai-text)]"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 12 }, (_, index) => yearPageStart - 1 + index).map(
                    (year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setViewMonth(new Date(year, viewMonth.getMonth(), 1));
                          setHeaderPicker(null);
                        }}
                        className={`rounded-md px-2 py-2 text-xs transition-colors ${
                          viewMonth.getFullYear() === year
                            ? "bg-[var(--kai-accent)] text-[var(--kai-text-on-accent)]"
                            : year < yearPageStart || year > yearPageStart + 9
                              ? "text-[var(--kai-text-disabled)] hover:bg-[var(--kai-surface-hover)] hover:text-[var(--kai-text-secondary)]"
                              : "text-[var(--kai-text-secondary)] hover:bg-[var(--kai-surface-hover)] hover:text-[var(--kai-text)]"
                        }`}
                      >
                        {year}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="py-1 text-center text-[10px] font-medium text-[var(--kai-text-muted)]">
                {weekday}
              </div>
            ))}
            {calendarDays.map((day, index) =>
              day ? (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-8 rounded-md text-xs transition-colors ${
                    sameDay(selected, day)
                      ? "bg-[var(--kai-accent)] font-semibold text-[var(--kai-text-on-accent)]"
                      : sameDay(new Date(), day)
                        ? "bg-[var(--kai-accent-subtle)] text-[var(--kai-accent-text)] hover:bg-[var(--kai-accent-soft)]"
                        : "text-[var(--kai-text-secondary)] hover:bg-[var(--kai-surface-hover)]"
                  }`}
                >
                  {day.getDate()}
                </button>
              ) : (
                <div key={`empty-${index}`} />
              )
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-[var(--kai-border-strong)] pt-3">
            <Clock size={15} className="text-[var(--kai-text-muted)]" />
            <TimeControl
              label="Hour"
              disabled={!selected}
              value={selected?.getHours() ?? null}
              max={23}
              onType={(nextValue) => updateTime("hours", nextValue)}
              onStep={(delta) => stepTime("hours", delta)}
            />
            <span className="text-[var(--kai-text-muted)]">:</span>
            <TimeControl
              label="Minute"
              disabled={!selected}
              value={selected?.getMinutes() ?? null}
              max={59}
              onType={(nextValue) => updateTime("minutes", nextValue)}
              onStep={(delta) => stepTime("minutes", delta)}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={chooseToday}
                className="rounded-md px-2.5 py-1.5 text-xs text-[var(--kai-accent-text)] transition-colors hover:bg-[var(--kai-accent-subtle)]"
              >
                Today
              </button>
              {selected && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-[var(--kai-text-muted)] transition-colors hover:bg-[var(--kai-danger-subtle)] hover:text-[var(--kai-danger-text-soft)]"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-[var(--kai-accent)] px-3 py-1.5 text-xs font-medium text-[var(--kai-text-on-accent)] transition-colors hover:bg-[var(--kai-accent-hover)]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemedDateTimeInput;
