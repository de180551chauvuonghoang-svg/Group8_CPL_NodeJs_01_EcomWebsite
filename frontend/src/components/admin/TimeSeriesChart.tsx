import { useMemo, useState, MouseEvent } from 'react';
import { TableProperties, LineChart } from 'lucide-react';

export interface ChartSeriesDef {
  key: string;
  label: string;
  color: string;
}

interface TimeSeriesChartProps {
  title: string;
  labels: string[];
  series: ChartSeriesDef[];
  values: Record<string, number[]>;
  valueFormatter?: (n: number) => string;
  height?: number;
}

const WIDTH = 640;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

export default function TimeSeriesChart({
  title,
  labels,
  series,
  values,
  valueFormatter = (n) => String(n),
  height = 260
}: TimeSeriesChartProps) {
  const [showTable, setShowTable] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const maxValue = useMemo(() => {
    let max = 0;
    for (const s of series) {
      for (const v of values[s.key] || []) {
        if (v > max) max = v;
      }
    }
    return max <= 0 ? 1 : max * 1.15;
  }, [series, values]);

  const xFor = (i: number) => (labels.length <= 1 ? PAD.left : PAD.left + (i / (labels.length - 1)) * plotW);
  const yFor = (v: number) => PAD.top + plotH - (v / maxValue) * plotH;

  const gridSteps = 4;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => (maxValue / gridSteps) * i);

  const tickEvery = Math.max(1, Math.ceil(labels.length / 6));

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (relX - PAD.left) / plotW;
    const idx = Math.round(ratio * (labels.length - 1));
    setHoverIndex(Math.min(Math.max(idx, 0), labels.length - 1));
  };

  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-on-surface text-sm">{title}</h3>
        <div className="flex items-center gap-3">
          {series.length > 1 && (
            <div className="flex items-center gap-3">
              {series.map(s => (
                <div key={s.key} className="flex items-center gap-1.5 text-xs text-on-surface-variant font-semibold">
                  <span className="inline-block w-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowTable(v => !v)}
            title={showTable ? 'Xem biểu đồ' : 'Xem dạng bảng'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all"
          >
            {showTable ? <LineChart size={16} /> : <TableProperties size={16} />}
          </button>
        </div>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-on-surface-variant border-b border-outline-variant/30">
                <th className="py-2 pr-4 font-semibold">Ngày</th>
                {series.map(s => (
                  <th key={s.key} className="py-2 pr-4 font-semibold text-right">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, i) => (
                <tr key={label} className="border-b border-outline-variant/10 last:border-0">
                  <td className="py-2 pr-4 text-on-surface-variant">{label}</td>
                  {series.map(s => (
                    <td key={s.key} className="py-2 pr-4 text-right font-semibold text-on-surface">
                      {valueFormatter(values[s.key]?.[i] || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : labels.length === 0 ? (
        <div className="py-16 text-center text-on-surface-variant text-sm">Chưa có dữ liệu trong khoảng thời gian này.</div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${WIDTH} ${height}`}
            className="w-full"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {gridValues.map((gv, i) => (
              <g key={i}>
                <line
                  x1={PAD.left} x2={WIDTH - PAD.right}
                  y1={yFor(gv)} y2={yFor(gv)}
                  stroke="var(--color-outline-variant)" strokeWidth={1} opacity={0.4}
                />
                <text x={PAD.left - 8} y={yFor(gv) + 4} textAnchor="end" fontSize={10} fill="var(--color-on-surface-variant)">
                  {valueFormatter(gv)}
                </text>
              </g>
            ))}

            {labels.map((label, i) => (
              i % tickEvery === 0 && (
                <text
                  key={label}
                  x={xFor(i)} y={height - 6}
                  textAnchor="middle" fontSize={10} fill="var(--color-on-surface-variant)"
                >
                  {label}
                </text>
              )
            ))}

            {series.map(s => {
              const pts = (values[s.key] || []).map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ');
              const areaPts = `${PAD.left},${yFor(0)} ${pts} ${xFor(labels.length - 1)},${yFor(0)}`;
              return (
                <g key={s.key}>
                  <polygon points={areaPts} fill={s.color} opacity={0.1} />
                  <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                </g>
              );
            })}

            {hoverIndex !== null && (
              <line
                x1={xFor(hoverIndex)} x2={xFor(hoverIndex)}
                y1={PAD.top} y2={height - PAD.bottom}
                stroke="var(--color-outline-variant)" strokeWidth={1}
              />
            )}

            {hoverIndex !== null && series.map(s => (
              <circle
                key={s.key}
                cx={xFor(hoverIndex)}
                cy={yFor(values[s.key]?.[hoverIndex] || 0)}
                r={4}
                fill={s.color}
                stroke="var(--color-surface-container-lowest)"
                strokeWidth={2}
              />
            ))}
          </svg>

          {hoverIndex !== null && (
            <div
              className="absolute top-2 bg-surface-container-highest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs shadow-lg pointer-events-none"
              style={{
                left: `${Math.min(85, Math.max(5, (xFor(hoverIndex) / WIDTH) * 100))}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <p className="font-bold text-on-surface mb-1">{labels[hoverIndex]}</p>
              {series.map(s => (
                <p key={s.key} className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="inline-block w-2.5 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="font-bold text-on-surface">{valueFormatter(values[s.key]?.[hoverIndex] || 0)}</span>
                  <span>{s.label}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
