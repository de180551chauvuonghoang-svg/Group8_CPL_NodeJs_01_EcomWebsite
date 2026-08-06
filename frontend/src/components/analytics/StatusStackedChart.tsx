import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SellerAnalyticsSeriesPoint, SellerAnalyticsStatusCounts } from '../../types';

const STATUS_CONFIG: {
  key: keyof SellerAnalyticsStatusCounts;
  label: string;
  color: string;
}[] = [
  { key: 'pending_fulfillment', label: 'Chờ xử lý', color: '#d97706' },
  { key: 'ready_to_ship', label: 'Chờ lấy hàng', color: '#0891b2' },
  { key: 'shipping', label: 'Đang giao', color: '#2563eb' },
  { key: 'delivered', label: 'Đã giao', color: '#16a34a' },
  { key: 'cancelled', label: 'Đã hủy', color: '#dc2626' },
];

interface StatusTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string;
    color?: string;
    name?: string;
  }>;
}

function StatusTooltip({ active, label, payload }: StatusTooltipProps) {
  if (!active || !payload?.length) return null;

  const visibleItems = payload.filter((item) => Number(item.value) > 0);

  return (
    <div className="min-w-44 rounded-md border border-outline-variant/50 bg-surface-container-lowest p-3 shadow-xl">
      <p className="mb-2 text-xs font-black uppercase text-on-surface-variant">{label}</p>
      {visibleItems.length > 0 ? (
        <div className="space-y-1.5">
          {visibleItems.map((item) => (
            <div
              key={String(item.dataKey)}
              className="flex items-center justify-between gap-5 text-sm"
            >
              <span className="flex items-center gap-2 text-on-surface-variant">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <strong className="text-on-surface">
                {Number(item.value).toLocaleString('vi-VN')}
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">Không có thay đổi trạng thái.</p>
      )}
    </div>
  );
}

interface StatusStackedChartProps {
  series: SellerAnalyticsSeriesPoint[];
}

export default function StatusStackedChart({ series }: StatusStackedChartProps) {
  const hasData = series.some((item) => STATUS_CONFIG.some((status) => item[status.key] > 0));

  return (
    <section className="min-w-0">
      <div className="mb-4">
        <h3 className="font-black text-on-surface">Biến động trạng thái</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Số lần đơn chuyển sang từng trạng thái trong kỳ.
        </p>
      </div>

      <div className="relative h-72 min-w-0 overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-low p-2 sm:h-80 sm:p-4">
        {!hasData && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-5 text-center">
            <p className="text-sm font-semibold text-on-surface-variant">
              Chưa có biến động trạng thái trong khoảng này.
            </p>
          </div>
        )}

        <div className={`h-full w-full ${hasData ? '' : 'pointer-events-none opacity-25'}`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={series} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={24}
                tick={{ fill: 'currentColor', fontSize: 11 }}
                className="text-on-surface-variant"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tick={{ fill: 'currentColor', fontSize: 11 }}
                width={34}
                className="text-on-surface-variant"
              />
              <Tooltip
                content={<StatusTooltip />}
                cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
              />
              <Legend
                verticalAlign="top"
                align="center"
                height={48}
                iconSize={9}
                formatter={(value) => (
                  <span className="text-xs font-semibold text-on-surface-variant">{value}</span>
                )}
              />
              {STATUS_CONFIG.map((status, index) => (
                <Bar
                  key={status.key}
                  dataKey={status.key}
                  name={status.label}
                  stackId="fulfillment"
                  fill={status.color}
                  maxBarSize={34}
                  radius={index === STATUS_CONFIG.length - 1 ? [3, 3, 0, 0] : 0}
                  isAnimationActive={hasData}
                  animationDuration={500}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
