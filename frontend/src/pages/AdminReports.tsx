import { useEffect, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import {
  adminService,
  AdminSellerReportRow,
  AdminUserReportRow,
  AdminTopProductRow,
  AdminCancellationRateRow
} from '../services/adminService';

type Tab = 'sellers' | 'users' | 'top-products' | 'cancellation-rate';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

export default function AdminReports() {
  const [tab, setTab] = useState<Tab>('sellers');
  const [sellerRows, setSellerRows] = useState<AdminSellerReportRow[]>([]);
  const [userRows, setUserRows] = useState<AdminUserReportRow[]>([]);
  const [topProducts, setTopProducts] = useState<AdminTopProductRow[]>([]);
  const [cancellationRates, setCancellationRates] = useState<AdminCancellationRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      adminService.getSellerReport(),
      adminService.getUserReport(),
      adminService.getTopProducts({ limit: 10 }),
      adminService.getCancellationRates()
    ])
      .then(([sellers, users, products, rates]) => {
        setSellerRows(sellers);
        setUserRows(users);
        setTopProducts(products);
        setCancellationRates(rates);
      })
      .catch((err: any) => setError(err?.message || 'Không tải được báo cáo.'))
      .finally(() => setLoading(false));
  }, []);

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'sellers', label: 'Theo Shop' },
    { key: 'users', label: 'Theo Khách Hàng' },
    { key: 'top-products', label: 'SP Bán Chạy' },
    { key: 'cancellation-rate', label: 'Tỷ Lệ Hủy Đơn' }
  ];

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <FileBarChart size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface">Báo Cáo</h1>
            <p className="text-on-surface-variant text-sm">Doanh thu, sản phẩm bán chạy và tỷ lệ hủy đơn để đánh giá hiệu quả kinh doanh</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                tab === key ? 'bg-primary text-white border-primary' : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
              }`}
            >
              {label}
            </button>
          ))}
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
        ) : tab === 'sellers' ? (
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-on-surface-variant">
                  <th className="px-6 py-3 font-semibold">Shop</th>
                  <th className="px-6 py-3 font-semibold">Trạng thái</th>
                  <th className="px-6 py-3 font-semibold text-right">Sản phẩm</th>
                  <th className="px-6 py-3 font-semibold text-right">Số đơn</th>
                  <th className="px-6 py-3 font-semibold text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {sellerRows.map(row => (
                  <tr key={row.seller_id} className="border-b border-outline-variant/10 last:border-0">
                    <td className="px-6 py-4 font-semibold text-on-surface">{row.shop_name}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{row.status}</td>
                    <td className="px-6 py-4 text-right">{row.total_products}</td>
                    <td className="px-6 py-4 text-right">{row.total_orders}</td>
                    <td className="px-6 py-4 text-right font-bold text-primary">{formatMoney(row.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sellerRows.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Chưa có dữ liệu.</div>
            )}
          </div>
        ) : tab === 'users' ? (
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-on-surface-variant">
                  <th className="px-6 py-3 font-semibold">Khách hàng</th>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-6 py-3 font-semibold">Vai trò</th>
                  <th className="px-6 py-3 font-semibold text-right">Số đơn</th>
                  <th className="px-6 py-3 font-semibold text-right">Tổng chi tiêu</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map(row => (
                  <tr key={row.user_id} className="border-b border-outline-variant/10 last:border-0">
                    <td className="px-6 py-4 font-semibold text-on-surface">{row.name}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{row.email}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{row.role}</td>
                    <td className="px-6 py-4 text-right">{row.total_orders}</td>
                    <td className="px-6 py-4 text-right font-bold text-primary">{formatMoney(row.total_spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {userRows.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Chưa có dữ liệu.</div>
            )}
          </div>
        ) : tab === 'top-products' ? (
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-on-surface-variant">
                  <th className="px-6 py-3 font-semibold">#</th>
                  <th className="px-6 py-3 font-semibold">Sản phẩm</th>
                  <th className="px-6 py-3 font-semibold text-right">SL đã bán</th>
                  <th className="px-6 py-3 font-semibold text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((row, idx) => (
                  <tr key={row.product_id} className="border-b border-outline-variant/10 last:border-0">
                    <td className="px-6 py-4 text-on-surface-variant">{idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-on-surface">{row.product_name}</td>
                    <td className="px-6 py-4 text-right">{row.total_sold}</td>
                    <td className="px-6 py-4 text-right font-bold text-primary">{formatMoney(row.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topProducts.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Chưa có dữ liệu.</div>
            )}
          </div>
        ) : (
          <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-on-surface-variant">
                  <th className="px-6 py-3 font-semibold">Shop</th>
                  <th className="px-6 py-3 font-semibold text-right">Tổng đơn</th>
                  <th className="px-6 py-3 font-semibold text-right">Đơn huỷ</th>
                  <th className="px-6 py-3 font-semibold text-right">Tỷ lệ hủy</th>
                </tr>
              </thead>
              <tbody>
                {cancellationRates.map(row => (
                  <tr key={row.seller_id} className="border-b border-outline-variant/10 last:border-0">
                    <td className="px-6 py-4 font-semibold text-on-surface">{row.shop_name}</td>
                    <td className="px-6 py-4 text-right">{row.total_orders}</td>
                    <td className="px-6 py-4 text-right">{row.cancelled_orders}</td>
                    <td className={`px-6 py-4 text-right font-bold ${row.cancellation_rate >= 20 ? 'text-error' : 'text-on-surface'}`}>
                      {row.cancellation_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cancellationRates.length === 0 && (
              <div className="py-16 text-center text-on-surface-variant">Chưa có dữ liệu.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
