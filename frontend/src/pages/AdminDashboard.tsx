import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, ClipboardList, TrendingUp, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { adminService, AdminDashboardSummary } from '../services/adminService';
import TimeSeriesChart from '../components/admin/TimeSeriesChart';

type RangePreset = '7' | '30' | '90';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0)) + 'đ';

const formatMoneyFull = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

const rangeToFrom = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
};

function StatTile({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'primary' | 'good' | 'error' }) {
  const toneClasses = {
    primary: 'bg-primary/10 text-primary',
    good: 'bg-green-500/10 text-green-600',
    error: 'bg-error/10 text-error'
  }[tone];

  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${toneClasses}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-on-surface-variant font-semibold">{label}</p>
        <p className="text-xl font-black text-on-surface truncate">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [range, setRange] = useState<RangePreset>('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revenueLabels, setRevenueLabels] = useState<string[]>([]);
  const [revenueValues, setRevenueValues] = useState<number[]>([]);
  const [cashflowLabels, setCashflowLabels] = useState<string[]>([]);
  const [cashIn, setCashIn] = useState<number[]>([]);
  const [cashOut, setCashOut] = useState<number[]>([]);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);

  useEffect(() => {
    const from = rangeToFrom(Number(range));
    setLoading(true);
    setError('');
    Promise.all([
      adminService.getRevenueStats({ from, groupBy: 'day' }),
      adminService.getCashflowStats({ from, groupBy: 'day' })
    ])
      .then(([revenue, cashflow]) => {
        setRevenueLabels(revenue.map(p => p.bucket));
        setRevenueValues(revenue.map(p => Number(p.revenue) || 0));
        setCashflowLabels(cashflow.map(p => p.bucket));
        setCashIn(cashflow.map(p => Number(p.cash_in) || 0));
        setCashOut(cashflow.map(p => Number(p.cash_out) || 0));
      })
      .catch((err: any) => setError(err?.message || 'Không tải được thống kê.'))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    adminService.getDashboardSummary().then(setSummary).catch(() => {});
  }, []);

  const totals = useMemo(() => {
    const totalRevenue = revenueValues.reduce((a, b) => a + b, 0);
    const totalIn = cashIn.reduce((a, b) => a + b, 0);
    const totalOut = cashOut.reduce((a, b) => a + b, 0);
    return { totalRevenue, totalIn, totalOut, net: totalIn - totalOut };
  }, [revenueValues, cashIn, cashOut]);

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <BarChart3 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-on-surface">Tổng Quan</h1>
              <p className="text-on-surface-variant text-sm">Doanh số bán hàng và dòng tiền</p>
            </div>
          </div>

          <div className="flex gap-2">
            {(['7', '30', '90'] as RangePreset[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                  range === r ? 'bg-primary text-white border-primary' : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
                }`}
              >
                {r} ngày
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 text-error bg-error/10 border border-error/20 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-primary">
            <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
            <p className="mt-2 font-semibold">Đang tải...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatTile icon={TrendingUp} label="Tổng doanh số" value={formatMoney(totals.totalRevenue)} tone="primary" />
              <StatTile icon={ArrowUpCircle} label="Tiền vào" value={formatMoney(totals.totalIn)} tone="good" />
              <StatTile icon={ArrowDownCircle} label="Tiền ra" value={formatMoney(totals.totalOut)} tone="error" />
              <StatTile icon={Wallet} label="Dòng tiền ròng" value={formatMoney(totals.net)} tone={totals.net >= 0 ? 'good' : 'error'} />
            </div>

            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Link to="/admin/orders" className="block">
                  <StatTile icon={ClipboardList} label="Đơn hàng mới hôm nay" value={String(summary.newOrdersToday)} tone="primary" />
                </Link>
                <Link to="/admin/inventory" className="block">
                  <StatTile icon={AlertTriangle} label="Sản phẩm sắp hết hàng (≤5)" value={String(summary.lowStockCount)} tone={summary.lowStockCount > 0 ? 'error' : 'good'} />
                </Link>
              </div>
            )}

            {summary && summary.lowStockProducts.length > 0 && (
              <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-5 mb-6">
                <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-error" />
                  Sản phẩm sắp hết hàng
                </h3>
                <div className="space-y-2">
                  {summary.lowStockProducts.map(p => (
                    <div key={p.variant_id} className="flex justify-between items-center text-sm border-b border-outline-variant/10 pb-2 last:border-0">
                      <span className="text-on-surface">{p.product_name}</span>
                      <span className="font-bold text-error">{p.stock_qty} còn lại</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6">
              <TimeSeriesChart
                title="Doanh số bán hàng theo ngày"
                labels={revenueLabels}
                series={[{ key: 'revenue', label: 'Doanh số', color: 'var(--color-primary)' }]}
                values={{ revenue: revenueValues }}
                valueFormatter={formatMoneyFull}
              />

              <TimeSeriesChart
                title="Dòng tiền vào / ra theo ngày"
                labels={cashflowLabels}
                series={[
                  { key: 'cash_in', label: 'Tiền vào', color: 'var(--color-primary)' },
                  { key: 'cash_out', label: 'Tiền ra', color: 'var(--color-error)' }
                ]}
                values={{ cash_in: cashIn, cash_out: cashOut }}
                valueFormatter={formatMoneyFull}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
