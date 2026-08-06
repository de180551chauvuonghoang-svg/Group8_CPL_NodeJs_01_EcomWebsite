import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react';

interface DateTimePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
  compact?: boolean;
  align?: 'left' | 'right';
  placement?: 'top' | 'bottom';
}

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
  mobile: boolean;
}

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const pad = (value: number) => String(value).padStart(2, '0');

const toInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const parseInputValue = (value: string) => {
  if (!value) return new Date();
  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const parsed = new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const sameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const formatDisplayDate = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

export default function DateTimePicker({
  label,
  value,
  onChange,
  min,
  disabled = false,
  compact = false,
  align = 'left',
  placement = 'bottom',
}: DateTimePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedDate = useMemo(() => parseInputValue(value), [value]);
  const minDate = useMemo(() => (min ? parseInputValue(min) : null), [min]);
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedYear, selectedMonth, 1));
  const [position, setPosition] = useState<PopoverPosition>({
    top: 0,
    left: 0,
    width: 320,
    mobile: false,
  });

  useEffect(() => {
    setViewMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedMonth, selectedYear]);

  const updatePosition = useCallback(() => {
    const trigger = rootRef.current?.getBoundingClientRect();
    if (!trigger) return;
    const mobile = window.innerWidth < 640;
    if (mobile) {
      setPosition({ top: 0, left: 0, width: window.innerWidth, mobile: true });
      return;
    }

    const gap = 8;
    const viewportPadding = 12;
    const width = Math.min(320, window.innerWidth - viewportPadding * 2);
    const popoverHeight = popoverRef.current?.offsetHeight || 430;
    const leftCandidate = align === 'right' ? trigger.right - width : trigger.left;
    const left = Math.min(
      Math.max(viewportPadding, leftCandidate),
      window.innerWidth - width - viewportPadding,
    );
    const hasRoomBelow =
      trigger.bottom + gap + popoverHeight <= window.innerHeight - viewportPadding;
    const hasRoomAbove = trigger.top - gap - popoverHeight >= viewportPadding;
    const useTop =
      placement === 'top' ? hasRoomAbove || !hasRoomBelow : !hasRoomBelow && hasRoomAbove;
    const top = useTop
      ? Math.max(viewportPadding, trigger.top - gap - popoverHeight)
      : Math.min(trigger.bottom + gap, window.innerHeight - popoverHeight - viewportPadding);
    setPosition({ top, left, width, mobile: false });
  }, [align, placement]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition, viewMonth]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target))
        setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const reposition = () => updatePosition();
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, updatePosition]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [viewMonth]);

  const commit = (candidate: Date) => {
    const nextDate = minDate && candidate < minDate ? new Date(minDate) : candidate;
    onChange(toInputValue(nextDate));
  };

  const selectDay = (day: Date) => {
    const nextDate = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      selectedDate.getHours(),
      selectedDate.getMinutes(),
      0,
      0,
    );
    commit(nextDate);
    setViewMonth(new Date(day.getFullYear(), day.getMonth(), 1));
  };

  const updateTime = (part: 'hour' | 'minute', nextValue: number) => {
    const nextDate = new Date(selectedDate);
    if (part === 'hour') nextDate.setHours(nextValue);
    else nextDate.setMinutes(nextValue);
    commit(nextDate);
  };

  const isDayDisabled = (day: Date) => {
    if (!minDate) return false;
    const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
    return endOfDay < minDate;
  };

  const popover = open ? (
    <>
      {position.mobile && (
        <button
          type="button"
          aria-label="Đóng bộ chọn thời gian"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[139] bg-black/35"
        />
      )}
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={label || 'Chọn ngày và giờ'}
        style={
          position.mobile
            ? undefined
            : { top: position.top, left: position.left, width: position.width }
        }
        className={
          position.mobile
            ? 'fixed inset-x-0 bottom-0 z-[140] max-h-[88dvh] overflow-y-auto rounded-t-lg border border-outline-variant bg-surface-container-lowest shadow-2xl'
            : 'fixed z-[140] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-2xl shadow-primary/10'
        }
      >
        <header className="flex items-center justify-between border-b border-outline-variant/60 px-3 py-2.5">
          <button
            type="button"
            aria-label="Tháng trước"
            onClick={() =>
              setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }
            className="grid h-8 w-8 place-items-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
          >
            <ChevronLeft size={17} />
          </button>
          <p className="text-sm font-black text-on-surface">
            Tháng {viewMonth.getMonth() + 1}, {viewMonth.getFullYear()}
          </p>
          {position.mobile ? (
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container"
            >
              <X size={17} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Tháng sau"
              onClick={() =>
                setViewMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                )
              }
              className="grid h-8 w-8 place-items-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
            >
              <ChevronRight size={17} />
            </button>
          )}
        </header>
        {position.mobile && (
          <button
            type="button"
            onClick={() =>
              setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }
            className="absolute right-12 top-2.5 grid h-8 w-8 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container"
            aria-label="Tháng sau"
          >
            <ChevronRight size={17} />
          </button>
        )}

        <div className="p-3">
          <div className="mb-1 grid grid-cols-7">
            {WEEK_DAYS.map((day) => (
              <span
                key={day}
                className="py-1 text-center text-[10px] font-bold text-on-surface-variant"
              >
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day) => {
              const selected = sameDay(day, selectedDate);
              const today = sameDay(day, new Date());
              const muted = day.getMonth() !== viewMonth.getMonth();
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isDayDisabled(day)}
                  onClick={() => selectDay(day)}
                  className={`relative grid aspect-square place-items-center rounded-md text-xs font-semibold tabular-nums transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${selected ? 'bg-primary text-white shadow-sm shadow-primary/30' : muted ? 'text-on-surface-variant/40 hover:bg-surface-container' : 'text-on-surface hover:bg-primary/10 hover:text-primary'} disabled:cursor-not-allowed disabled:opacity-25`}
                >
                  {day.getDate()}
                  {today && !selected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-outline-variant/60 bg-surface-container/50 p-3">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 size={16} className="text-primary" />
            <select
              aria-label="Giờ"
              value={selectedDate.getHours()}
              onChange={(event) => updateTime('hour', Number(event.target.value))}
              className="h-10 flex-1 rounded-md border border-outline-variant bg-surface-container-lowest px-2 text-sm font-bold tabular-nums outline-none focus:border-primary"
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {pad(hour)} giờ
                </option>
              ))}
            </select>
            <span className="font-black text-on-surface-variant">:</span>
            <select
              aria-label="Phút"
              value={selectedDate.getMinutes()}
              onChange={(event) => updateTime('minute', Number(event.target.value))}
              className="h-10 flex-1 rounded-md border border-outline-variant bg-surface-container-lowest px-2 text-sm font-bold tabular-nums outline-none focus:border-primary"
            >
              {MINUTES.map((minute) => (
                <option key={minute} value={minute}>
                  {pad(minute)} phút
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => commit(new Date())}
              className="h-9 rounded-md px-2.5 text-xs font-bold text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
            >
              Bây giờ
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 1);
                commit(next);
              }}
              className="h-9 rounded-md px-2.5 text-xs font-bold text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
            >
              +1 ngày
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new Date(selectedDate);
                next.setHours(23, 59, 0, 0);
                commit(next);
              }}
              className="h-9 rounded-md px-2.5 text-xs font-bold text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
            >
              23:59
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold text-white transition hover:brightness-110"
            >
              <Check size={15} /> Xong
            </button>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      {label && (
        <span className="mb-1.5 block text-xs font-bold text-on-surface-variant">{label}</span>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center border bg-surface-container text-left text-on-surface transition duration-200 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${compact ? 'h-10 gap-2 rounded-lg px-2.5' : 'h-12 gap-3 rounded-lg px-3.5'} ${open ? 'border-primary ring-2 ring-primary/10' : 'border-outline-variant'}`}
      >
        <CalendarDays size={compact ? 15 : 17} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold tabular-nums">
          {formatDisplayDate(selectedDate)}
        </span>
        <span className="h-5 w-px bg-outline-variant" />
        <Clock3 size={compact ? 14 : 16} className="shrink-0 text-on-surface-variant" />
        <span className="text-sm font-bold tabular-nums">
          {pad(selectedDate.getHours())}:{pad(selectedDate.getMinutes())}
        </span>
      </button>
      {typeof document !== 'undefined' && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
