import type { LucideIcon } from 'lucide-react';

interface SellerTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  type?: string;
  placeholder?: string;
  min?: string;
  step?: string;
}

export default function SellerTextField({
  label,
  value,
  onChange,
  icon: Icon,
  type = 'text',
  placeholder,
  min,
  step,
}: SellerTextFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <span className="relative block">
        <Icon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          min={min}
          step={step}
          className="h-11 w-full rounded-md border border-outline-variant bg-surface-container pl-10 pr-3 text-sm outline-none focus:border-primary"
        />
      </span>
    </label>
  );
}
