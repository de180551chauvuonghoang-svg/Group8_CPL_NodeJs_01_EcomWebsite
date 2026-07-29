import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SellerAnalyticsSeriesPoint } from '../../types';

const REVENUE_COLOR = '#2563eb';
const ORDER_COLOR = '#0f766e';

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

interface RevenueTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string;
  }>;
}

function RevenueTooltip({ active, label, payload }: RevenueTooltipProps) {
  if (!active || !payload?.length) return null;

  const revenue = Number(payload.find((item) => item.dataKey === 'gross_revenue')?.value ?? 0);
  const orders = Number(payload.find((item) => item.dataKey === 'orders_created')?.value ?? 0);

  return (
    <div className="min-w-48 rounded-md border border-outline-variant/50 bg-surface-container-lowest p-3 shadow-xl">
      <p className="mb-2 text-xs font-black uppercase text-on-surface-variant">{label}</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-5">
          <span className="flex items-center gap-2 text-on-surface-variant">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: REVENUE_COLOR }} />
            Doanh thu
          </span>
          <strong className="text-on-surface">{formatCurrency(revenue)}</strong>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="flex items-center gap-2 text-on-surface-variant">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ORDER_COLOR }} />
            Đơn phát sinh
          </span>
          <strong className="text-on-surface">{orders.toLocaleString('vi-VN')}</strong>
        </div>
      </div>
    </div>
  );
}

interface RevenueOrdersChartProps {
  series: SellerAnalyticsSeriesPoint[];
}

export default function RevenueOrdersChart({ series }: RevenueOrdersChartProps) {
  const hasData = series.some((item) => item.gross_revenue > 0 || item.orders_created > 0);
  const showDots = series.length <= 45;

  return (
    <section className="min-w-0">
      <div className="mb-4">
        <h3 className="font-black text-on-surface">Doanh thu và đơn phát sinh</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Doanh thu chỉ ghi nhận từ sản phẩm đã giao thành công.
        </p>
      </div>

      <div className="relative h-72 min-w-0 overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-low p-2 sm:h-80 sm:p-4">
        {!hasData && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-5 text-center">
            <div>
              <p className="font-bold text-on-surface">Chưa có dữ liệu trong khoảng này</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Biểu đồ sẽ cập nhật khi shop phát sinh đơn hoặc doanh thu.
              </p>
            </div>
          </div>
        )}

        <div className={`h-full w-full ${hasData ? '' : 'pointer-events-none opacity-25'}`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={series} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
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
                yAxisId="revenue"
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCompactNumber}
                tick={{ fill: 'currentColor', fontSize: 11 }}
                width={52}
                className="text-on-surface-variant"
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tick={{ fill: 'currentColor', fontSize: 11 }}
                width={34}
                className="text-on-surface-variant"
              />
              <Tooltip
                content={<RevenueTooltip />}
                cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={34}
                iconSize={10}
                formatter={(value) => (
                  <span className="text-xs font-semibold text-on-surface-variant">{value}</span>
                )}
              />
              <Bar
                yAxisId="revenue"
                dataKey="gross_revenue"
                name="Doanh thu"
                fill={REVENUE_COLOR}
                fillOpacity={0.72}
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
                isAnimationActive={hasData}
                animationDuration={500}
              />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders_created"
                name="Đơn phát sinh"
                stroke={ORDER_COLOR}
                strokeWidth={2.5}
                dot={showDots ? { r: 3, fill: ORDER_COLOR, strokeWidth: 0 } : false}
                activeDot={{ r: 5, fill: ORDER_COLOR, stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={hasData}
                animationDuration={500}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
