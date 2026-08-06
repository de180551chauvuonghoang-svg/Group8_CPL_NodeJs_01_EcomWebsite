import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArchiveRestore,
  Filter,
  History,
  Image,
  Loader2,
  PackageCheck,
  RefreshCw,
  SlidersHorizontal,
  Warehouse,
} from 'lucide-react';
import InventoryAdjustModal, {
  InventoryVariantTarget,
} from '../components/inventory/InventoryAdjustModal';
import StockThresholdEditor from '../components/inventory/StockThresholdEditor';
import SellerPageHeader from '../components/seller/SellerPageHeader';
import SellerFilterBar from '../components/seller/SellerFilterBar';
import SellerPagination from '../components/seller/SellerPagination';
import SellerTableViewport from '../components/seller/SellerTableViewport';
import SellerTabs from '../components/seller/SellerTabs';
import { inventoryService, InventoryLogQuery } from '../services/inventoryService';
import { sellerService } from '../services/sellerService';
import { InventoryLog, InventoryType, LowStockVariant, Pagination, SellerProduct } from '../types';
import { getInventoryErrorMessage } from '../utils/inventoryErrors';

const INVENTORY_TYPE_LABELS: Record<InventoryType, string> = {
  sale: 'Bán hàng',
  order_cancelled: 'Hoàn kho do hủy đơn',
  restock: 'Nhập kho',
  manual_adjustment: 'Điều chỉnh thủ công',
  return_refund: 'Hoàn hàng/hoàn tiền',
};

const emptyPagination: Pagination = { page: 1, limit: 20, total: 0, total_pages: 0 };

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export default function SellerInventory() {
  const [activeTab, setActiveTab] = useState<'low-stock' | 'logs'>('low-stock');
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockVariant[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [lowPagination, setLowPagination] = useState<Pagination>(emptyPagination);
  const [logPagination, setLogPagination] = useState<Pagination>(emptyPagination);
  const [lowPage, setLowPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingLowStock, setLoadingLowStock] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState<InventoryVariantTarget | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterDraft, setFilterDraft] = useState<InventoryLogQuery>({
    variantId: '',
    type: '',
    from: '',
    to: '',
  });
  const [filters, setFilters] = useState<InventoryLogQuery>({});

  const allVariants = useMemo(
    () =>
      products.flatMap((product) =>
        (product.variants || []).map((variant) => ({
          ...variant,
          product_name: product.name,
        })),
      ),
    [products],
  );

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const data = await sellerService.getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(getInventoryErrorMessage(requestError, 'Không thể tải danh sách sản phẩm.'));
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadLowStock = useCallback(
    async (page = lowPage) => {
      setLoadingLowStock(true);
      try {
        const data = await inventoryService.getLowStock(page, 20);
        setLowStock(data.variants || []);
        setLowPagination(data.pagination || emptyPagination);
      } catch (requestError) {
        setError(getInventoryErrorMessage(requestError, 'Không thể tải danh sách sắp hết hàng.'));
      } finally {
        setLoadingLowStock(false);
      }
    },
    [lowPage],
  );

  const loadLogs = useCallback(
    async (page = logPage, appliedFilters = filters) => {
      setLoadingLogs(true);
      try {
        const data = await inventoryService.getLogs({
          ...appliedFilters,
          page,
          limit: 20,
        });
        setLogs(data.logs || []);
        setLogPagination(data.pagination || emptyPagination);
      } catch (requestError) {
        setError(getInventoryErrorMessage(requestError, 'Không thể tải lịch sử tồn kho.'));
      } finally {
        setLoadingLogs(false);
      }
    },
    [filters, logPage],
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadLowStock(lowPage);
  }, [loadLowStock, lowPage]);

  useEffect(() => {
    loadLogs(logPage, filters);
  }, [filters, loadLogs, logPage]);

  const refreshInventory = async () => {
    setError('');
    await Promise.all([loadProducts(), loadLowStock(lowPage), loadLogs(logPage, filters)]);
  };

  const openAdjust = (variant: LowStockVariant) => {
    setAdjustTarget({
      variantId: variant.variant_id,
      productId: variant.product_id,
      productName: variant.product_name,
      sku: variant.sku,
      stockQty: variant.stock_qty,
    });
    setError('');
    setSuccess('');
  };

  const applyFilters = () => {
    if (filterDraft.from && filterDraft.to && filterDraft.from > filterDraft.to) {
      setError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }
    setError('');
    setLogPage(1);
    setFilters({
      variantId: filterDraft.variantId || undefined,
      type: filterDraft.type || undefined,
      from: filterDraft.from || undefined,
      to: filterDraft.to || undefined,
    });
  };

  const resetFilters = () => {
    const emptyFilters = { variantId: '', type: '', from: '', to: '' } as InventoryLogQuery;
    setFilterDraft(emptyFilters);
    setFilters({});
    setLogPage(1);
    setError('');
  };

  return (
    <div className="min-h-screen bg-surface p-5 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <SellerPageHeader
          icon={Warehouse}
          eyebrow="Vận hành"
          title="Quản lý tồn kho"
          description="Theo dõi cảnh báo, nhập hàng và kiểm tra mọi thay đổi số lượng."
          actions={
            <button
              type="button"
              onClick={refreshInventory}
              disabled={loadingLowStock || loadingLogs || loadingProducts}
              className="flex h-10 items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-sm font-bold text-on-surface transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loadingLowStock || loadingLogs || loadingProducts ? 'animate-spin' : ''}
              />
              Làm mới
            </button>
          }
        />

        {(error || success) && (
          <div
            className={`mb-5 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
              error
                ? 'border-error/20 bg-error/10 text-error'
                : 'border-success/20 bg-success/10 text-success'
            }`}
          >
            {error ? <AlertTriangle size={17} /> : <PackageCheck size={17} />}
            {error || success}
          </div>
        )}

        <SellerTabs<'low-stock' | 'logs'>
          value={activeTab}
          ariaLabel="Khu vực tồn kho"
          onChange={setActiveTab}
          tabs={[
            {
              value: 'low-stock',
              label: 'Sắp hết hàng',
              icon: AlertTriangle,
              count: lowPagination.total,
            },
            { value: 'logs', label: 'Lịch sử kho', icon: History },
          ]}
        />

        {activeTab === 'low-stock' ? (
          <section className="overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
            <div className="border-b border-outline-variant/40 px-5 py-4">
              <h2 className="font-black text-on-surface">Các phiên bản cần bổ sung hàng</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Chỉ hiển thị sản phẩm đang bán có tồn kho thấp hơn hoặc bằng ngưỡng cảnh báo.
              </p>
            </div>

            {loadingLowStock ? (
              <div className="flex h-56 items-center justify-center">
                <Loader2 size={30} className="animate-spin text-primary" />
              </div>
            ) : lowStock.length === 0 ? (
              <div className="py-20 text-center">
                <PackageCheck size={44} className="mx-auto text-success/60" />
                <h3 className="mt-4 font-black text-on-surface">Tồn kho đang ổn định</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Không có phiên bản nào chạm ngưỡng cảnh báo.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/30">
                {lowStock.map((variant) => (
                  <article
                    key={variant.variant_id}
                    className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-container">
                        {variant.image_url ? (
                          <img
                            src={variant.image_url}
                            alt={variant.product_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Image size={22} className="text-on-surface-variant/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-black text-on-surface">
                          {variant.product_name}
                        </h3>
                        <p className="mt-1 truncate text-xs text-on-surface-variant">
                          SKU: {variant.sku || 'Mặc định'} · Cập nhật{' '}
                          {formatDateTime(variant.updated_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase text-on-surface-variant">
                          Tồn kho
                        </p>
                        <p
                          className={`text-xl font-black ${
                            variant.stock_status === 'out_of_stock' ? 'text-error' : 'text-warning'
                          }`}
                        >
                          {variant.stock_qty}
                        </p>
                      </div>
                      <StockThresholdEditor
                        productId={variant.product_id}
                        variantId={variant.variant_id}
                        value={variant.low_stock_threshold}
                        onUpdated={async () => {
                          await Promise.all([loadProducts(), loadLowStock(lowPage)]);
                          setSuccess('Đã cập nhật ngưỡng cảnh báo tồn kho.');
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => openAdjust(variant)}
                      className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
                    >
                      <ArchiveRestore size={16} />
                      Điều chỉnh kho
                    </button>
                  </article>
                ))}
              </div>
            )}
            <SellerPagination
              page={lowPagination.page}
              totalPages={lowPagination.total_pages}
              total={lowPagination.total}
              onPageChange={setLowPage}
            />
          </section>
        ) : (
          <section className="overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
            <SellerFilterBar
              onSubmit={(event) => {
                event.preventDefault();
                applyFilters();
              }}
              className="md:grid-cols-2 xl:grid-cols-4"
              ariaLabel="Lọc lịch sử tồn kho"
            >
              <div className="flex items-center gap-2 md:col-span-2 xl:col-span-4">
                <Filter size={18} className="text-primary" />
                <h2 className="font-black text-on-surface">Bộ lọc lịch sử</h2>
              </div>
              <select
                value={filterDraft.variantId || ''}
                onChange={(event) =>
                  setFilterDraft((previous) => ({ ...previous, variantId: event.target.value }))
                }
                disabled={loadingProducts}
                className="rounded-md border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="">Tất cả phiên bản</option>
                {allVariants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.product_name} · {variant.sku || 'Mặc định'}
                  </option>
                ))}
              </select>
              <select
                value={filterDraft.type || ''}
                onChange={(event) =>
                  setFilterDraft((previous) => ({
                    ...previous,
                    type: event.target.value as InventoryType | '',
                  }))
                }
                className="rounded-md border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="">Tất cả loại thay đổi</option>
                {Object.entries(INVENTORY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={filterDraft.from || ''}
                onChange={(event) =>
                  setFilterDraft((previous) => ({ ...previous, from: event.target.value }))
                }
                aria-label="Từ ngày"
                className="rounded-md border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
              />
              <input
                type="date"
                value={filterDraft.to || ''}
                onChange={(event) =>
                  setFilterDraft((previous) => ({ ...previous, to: event.target.value }))
                }
                aria-label="Đến ngày"
                className="rounded-md border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
              />
              <div className="flex justify-end gap-2 md:col-span-2 xl:col-span-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-md border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface-variant transition hover:text-on-surface"
                >
                  Xóa lọc
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white"
                >
                  <SlidersHorizontal size={15} />
                  Áp dụng
                </button>
              </div>
            </SellerFilterBar>

            {loadingLogs ? (
              <div className="flex h-56 items-center justify-center">
                <Loader2 size={30} className="animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center">
                <History size={44} className="mx-auto text-on-surface-variant/40" />
                <h3 className="mt-4 font-black text-on-surface">Chưa có lịch sử phù hợp</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Thử thay đổi bộ lọc hoặc thực hiện một lần điều chỉnh kho.
                </p>
              </div>
            ) : (
              <SellerTableViewport minWidthClass="min-w-[900px]" ariaLabel="Lịch sử tồn kho">
                <thead className="bg-surface-container text-xs uppercase text-on-surface-variant">
                  <tr>
                    <th className="px-5 py-3">Sản phẩm</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3">Thay đổi</th>
                    <th className="px-4 py-3">Lý do</th>
                    <th className="px-4 py-3">Người thực hiện</th>
                    <th className="px-5 py-3 text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {logs.map((log) => (
                    <tr key={log.id} className="align-top transition hover:bg-surface-container/50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-on-surface">{log.product_name}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          SKU: {log.sku || 'Mặc định'}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-on-surface">
                        {INVENTORY_TYPE_LABELS[log.type] || log.type}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-black text-on-surface">
                          {log.old_quantity} → {log.new_quantity}{' '}
                          <span className={log.change_quantity > 0 ? 'text-success' : 'text-error'}>
                            ({log.change_quantity > 0 ? '+' : ''}
                            {log.change_quantity})
                          </span>
                        </p>
                      </td>
                      <td className="max-w-72 px-4 py-4 text-on-surface-variant">
                        {log.reason || '—'}
                      </td>
                      <td className="px-4 py-4 text-on-surface-variant">
                        {log.created_by_name || 'Hệ thống'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-on-surface-variant">
                        {formatDateTime(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SellerTableViewport>
            )}
            <SellerPagination
              page={logPagination.page}
              totalPages={logPagination.total_pages}
              total={logPagination.total}
              onPageChange={setLogPage}
            />
          </section>
        )}
      </div>

      <InventoryAdjustModal
        variant={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onAdjusted={async (result) => {
          await refreshInventory();
          setSuccess(
            `Đã cập nhật ${result.variant.product_name}: tồn kho còn ${result.variant.stock_qty}.`,
          );
        }}
      />
    </div>
  );
}
