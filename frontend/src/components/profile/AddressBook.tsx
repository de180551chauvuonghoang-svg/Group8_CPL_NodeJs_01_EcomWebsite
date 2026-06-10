import React, { useState, useEffect } from 'react';
import { addressService, Address } from '../../services/addressService';
import Spinner from '../common/Spinner';

export default function AddressBook() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Form states
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (error) {
      console.error('Failed to fetch addresses', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingAddress(null);
    setRecipientName('');
    setPhoneNumber('');
    setStreetAddress('');
    setCity('');
    setIsDefault(false);
    setShowModal(true);
  };

  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    setRecipientName(addr.recipient_name);
    setPhoneNumber(addr.phone_number);
    setStreetAddress(addr.street_address);
    setCity(addr.city);
    setIsDefault(addr.is_default);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        recipient_name: recipientName,
        phone_number: phoneNumber,
        street_address: streetAddress,
        city: city,
        is_default: isDefault
      };
      
      if (editingAddress) {
        await addressService.updateAddress(editingAddress.id, payload);
      } else {
        await addressService.addAddress(payload);
      }
      
      await fetchAddresses();
      setShowModal(false);
    } catch (error) {
      console.error('Submit error', error);
      alert('Có lỗi xảy ra khi lưu địa chỉ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
      try {
        await addressService.deleteAddress(id);
        await fetchAddresses();
      } catch (error) {
        alert('Xóa thất bại.');
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await addressService.setDefault(id);
      await fetchAddresses();
    } catch (error) {
      alert('Không thể đặt mặc định.');
    }
  };

  if (loading) return <div className="py-8"><Spinner message="Đang tải danh sách địa chỉ..." /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-headline-md text-title-lg text-on-surface font-extrabold">Sổ địa chỉ</h2>
          <p className="font-body-md text-sm text-on-surface-variant">Quản lý các địa chỉ giao hàng của bạn</p>
        </div>
        <button 
          onClick={openAddModal}
          className="pill-button pill-button--accent flex items-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Thêm địa chỉ mới
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="glass-panel p-10 text-center flex flex-col items-center justify-center border-dashed border-2 border-outline-variant/30">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">location_off</span>
          <h3 className="font-title-md text-on-surface mb-2 font-bold">Chưa có địa chỉ nào</h3>
          <p className="font-body-sm text-on-surface-variant">Thêm một địa chỉ để dễ dàng thanh toán hơn</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className={`glass-panel p-6 shadow-sm border-2 transition-all ${addr.is_default ? 'border-primary ring-2 ring-primary/10' : 'border-transparent hover:border-outline-variant/50'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-on-surface">{addr.recipient_name}</h3>
                  {addr.is_default && (
                    <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">MẶC ĐỊNH</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(addr)} className="text-on-surface-variant hover:text-primary transition-colors p-1" title="Sửa">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onClick={() => handleDelete(addr.id)} className="text-on-surface-variant hover:text-error transition-colors p-1" title="Xóa">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-1 mb-6 text-sm text-on-surface-variant">
                <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] opacity-70">call</span> {addr.phone_number}</p>
                <p className="flex items-start gap-2"><span className="material-symbols-outlined text-[16px] opacity-70 mt-0.5">location_on</span> <span className="flex-1">{addr.street_address}, {addr.city}</span></p>
              </div>

              {!addr.is_default && (
                <button 
                  onClick={() => handleSetDefault(addr.id)}
                  className="w-full py-2 bg-surface-container-high hover:bg-primary/10 text-primary rounded-xl text-xs font-bold transition-colors"
                >
                  Đặt làm mặc định
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-xl font-bold mb-6">{editingAddress ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Tên người nhận</label>
                <input required type="text" className="glass-input" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Số điện thoại</label>
                <input required type="tel" className="glass-input" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Tỉnh/Thành phố</label>
                <input required type="text" className="glass-input" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Địa chỉ cụ thể (Số nhà, Đường...)</label>
                <textarea required rows={3} className="glass-input h-auto py-4 resize-none" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_default"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-outline-variant/30 bg-surface/50 focus:ring-primary/20"
                />
                <label htmlFor="is_default" className="text-sm cursor-pointer select-none">Đặt làm địa chỉ mặc định</label>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="pill-button flex-1 text-sm py-2.5">Hủy</button>
                <button type="submit" disabled={submitting} className="pill-button pill-button--accent flex-1 text-sm py-2.5">
                  {submitting ? 'Đang lưu...' : 'Lưu địa chỉ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
