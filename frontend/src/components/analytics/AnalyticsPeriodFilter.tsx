import { CalendarDays, RefreshCw, RotateCcw } from 'lucide-react';
import { AnalyticsPeriod } from '../../types';

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'day', label: 'Ngày' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];

interface AnalyticsPeriodFilterProps {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  loading: boolean;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onRefresh: () => void;
}

export default function AnalyticsPeriodFilter({
  period,
  from,
  to,
  loading,
  onPeriodChange,
  onFromChange,
  onToChange,
  onApply,
  onReset,
  onRefresh,
}: AnalyticsPeriodFilterProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-outline-variant/40 px-5 py-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-on-surface-variant">Chu kỳ</p>
        <div className="inline-flex rounded-lg border border-outline-variant/50 bg-surface-container p-1">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onPeriodChange(item.value)}
              className={`min-w-20 rounded-md px-4 py-2 text-sm font-bold transition ${
                period === item.value
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-40 flex-1 xl:flex-none">
          <span className="mb-2 block text-xs font-bold uppercase text-on-surface-variant">
            Từ ngày
          </span>
          <span className="flex h-10 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-3 focus-within:border-primary">
            <CalendarDays size={16} className="text-on-surface-variant" />
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => onFromChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none"
            />
          </span>
        </label>

        <label className="min-w-40 flex-1 xl:flex-none">
          <span className="mb-2 block text-xs font-bold uppercase text-on-surface-variant">
            Đến ngày
          </span>
          <span className="flex h-10 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-3 focus-within:border-primary">
            <CalendarDays size={16} className="text-on-surface-variant" />
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => onToChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none"
            />
          </span>
        </label>

        <button
          type="button"
          onClick={onApply}
          disabled={loading}
          className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:opacity-50"
        >
          Áp dụng
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
          title="Dùng khoảng mặc định"
          aria-label="Dùng khoảng mặc định"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
          title="Làm mới dữ liệu"
          aria-label="Làm mới dữ liệu"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
