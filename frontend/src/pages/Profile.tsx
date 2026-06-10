import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';
import { motion } from 'framer-motion';
import { authService } from '../services/authService';
import AddressBook from '../components/profile/AddressBook';

export default function Profile() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('Profile must be used within an AuthProvider');
  }
  const { user, isAuthenticated, loading } = auth;
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState('profile');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Sync state with logged in user
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone_number || '');
      setAvatarUrl(user.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhH6M7taxWH1fH8jTLXjRXGASClEEtDR2CeN1In1IG7iwj64RxGDXue_IrlAPsCh41fcDvOX2I0Y5f1uqquYN8sj-82ClnMvoTNMJUiR0vgoRIFfmu1IL2QzFIFxE-VtnptRxpbOCPz8UXctOdWuPrMrdikuSt8hWHnj0pMEtwfY_X2BVQw9jHTwuIeohbkOIiyDL6muCfSyf8AQug9Zm-78TqSIfnEjCyMBV52LNRsPfZpq9fldsRuAOW9wiGUUhzBuM0rXTpKIXR');
      setBio(user.bio || '');
    }
  }, [user, isAuthenticated, loading, navigate]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file size (e.g. limit to 4MB)
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('Dung lượng ảnh vượt quá giới hạn cho phép (Tối đa 4MB).');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      
      try {
        const secureUrl = await authService.uploadAvatar(base64Data);
        if (secureUrl) {
          setAvatarUrl(secureUrl);
          setSuccessMsg('Đã tải ảnh đại diện lên thành công! Hãy nhấn "Lưu thay đổi" để áp dụng.');
        } else {
          throw new Error('Không nhận được URL ảnh từ server.');
        }
      } catch (err: unknown) {
        let errMsg = 'Lỗi hệ thống khi tải ảnh lên server.';
        if (err instanceof Error) {
          errMsg = err.message;
        } else if (typeof err === 'string') {
          errMsg = err;
        }
        setErrorMsg(errMsg);
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Lỗi đọc tệp tin hình ảnh.');
      setUploading(false);
    };
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('https://lh3.googleusercontent.com/aida-public/AB6AXuDhH6M7taxWH1fH8jTLXjRXGASClEEtDR2CeN1In1IG7iwj64RxGDXue_IrlAPsCh41fcDvOX2I0Y5f1uqquYN8sj-82ClnMvoTNMJUiR0vgoRIFfmu1IL2QzFIFxE-VtnptRxpbOCPz8UXctOdWuPrMrdikuSt8hWHnj0pMEtwfY_X2BVQw9jHTwuIeohbkOIiyDL6muCfSyf8AQug9Zm-78TqSIfnEjCyMBV52LNRsPfZpq9fldsRuAOW9wiGUUhzBuM0rXTpKIXR');
    setSuccessMsg('Đã gỡ ảnh đại diện! Hãy nhấn "Lưu thay đổi" để áp dụng.');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');
    
    try {
      const updatedUser = await authService.updateProfile(name, phone, avatarUrl, bio);
      setSuccessMsg('Đã lưu các thay đổi hồ sơ thành công!');
      
      // Update global context state immediately
      auth.updateUser(updatedUser);

      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err: unknown) {
      let errMsg = 'Cập nhật hồ sơ thất bại. Vui lòng thử lại.';
      if (err instanceof Error) {
        errMsg = err.message;
      } else if (typeof err === 'string') {
        errMsg = err;
      }
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner fullPage message="Đang nạp thông tin hồ sơ..." />;

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <main className="pt-8 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col lg:flex-row gap-gutter">
        
        {/* Side Navigation Shell - Centralized glass style applied */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="glass-panel p-6 shadow-xl space-y-2 sticky top-28 transition-all duration-300">
            <div className="mb-8 px-2">
              <h2 className="font-headline-md text-title-lg font-black text-primary">Cài đặt</h2>
              <p className="font-label-md text-xs text-on-surface-variant">Quản lý tài khoản của bạn</p>
            </div>
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-transform hover:translate-x-1 ${activeTab === 'profile' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
                <span className="font-label-md text-sm">Hồ sơ</span>
              </button>
              <button 
                onClick={() => setActiveTab('address')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-transform hover:translate-x-1 ${activeTab === 'address' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined text-[20px]">location_on</span>
                <span className="font-label-md text-sm">Sổ địa chỉ</span>
              </button>
              <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-transform hover:translate-x-1" href="#security">
                <span className="material-symbols-outlined text-[20px]">security</span>
                <span className="font-label-md text-sm">Bảo mật</span>
              </a>
              <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-transform hover:translate-x-1" href="#notifications">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="font-label-md text-sm">Thông báo</span>
              </a>
              <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-transform hover:translate-x-1" href="#payments">
                <span className="material-symbols-outlined text-[20px]">payments</span>
                <span className="font-label-md text-sm">Thanh toán</span>
              </a>
            </nav>
            <div className="pt-8 px-2">
              <button className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-full font-bold text-sm hover:shadow-lg transition-all active:scale-95">
                <span className="material-symbols-outlined text-sm">add</span>
                Thiết bị mới
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-grow space-y-8">
          {/* Header Section */}
          <div className="space-y-2">
            <h1 className="font-headline-lg text-headline-md text-on-surface font-extrabold">Thông tin cá nhân</h1>
            <p className="font-body-lg text-body-md text-on-surface-variant">
              Cập nhật ảnh đại diện và thông tin cơ bản để cá nhân hóa trải nghiệm của bạn trên Volitify.
            </p>
          </div>

          {/* Success Notification - Glassmorphism alert applied */}
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-alert glass-alert--success"
            >
              <span className="material-symbols-outlined">check_circle</span>
              <span className="font-semibold">{successMsg}</span>
            </motion.div>
          )}

          {/* Error Notification - Glassmorphism alert applied */}
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-alert glass-alert--error"
            >
              <span className="material-symbols-outlined">error</span>
              <span className="font-semibold">{errorMsg}</span>
            </motion.div>
          )}

          {/* Content Area Based on Tab */}
          {activeTab === 'profile' ? (
            <div className="glass-panel p-8 lg:p-12 shadow-xl">
              <form className="space-y-12" onSubmit={handleSubmit}>
                
                {/* Avatar Section */}
                <div className="flex flex-col md:flex-row items-center gap-8 pb-12 border-b border-outline-variant/30">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-lg border-2 border-white ring-4 ring-primary/5">
                      {uploading ? (
                        <div className="w-full h-full bg-surface-container-low flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-primary text-3xl animate-spin">sync</span>
                          <span className="text-[10px] text-primary font-bold">Đang tải...</span>
                        </div>
                      ) : (
                        <img 
                          className="w-full h-full object-cover" 
                          id="avatar-preview" 
                          alt="User Avatar"
                          src={avatarUrl}
                        />
                      )}
                    </div>
                    <label 
                      htmlFor="avatar-file-input" 
                      className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                    </label>
                  </div>
                  
                  <input 
                    type="file" 
                    id="avatar-file-input" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarChange}
                    disabled={uploading || submitting}
                  />
                  
                  <div className="space-y-4 text-center md:text-left">
                    <h3 className="font-title-lg text-title-lg text-on-surface font-bold">Ảnh đại diện của bạn</h3>
                    <p className="font-body-md text-xs text-on-surface-variant">PNG hoặc JPG. Tối đa 4MB.</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <button 
                        onClick={() => document.getElementById('avatar-file-input')?.click()}
                        className="pill-button pill-button--accent" 
                        type="button"
                        disabled={uploading || submitting}
                      >
                        {uploading ? 'Đang tải lên...' : 'Tải lên ảnh mới'}
                      </button>
                      <button 
                        onClick={handleRemoveAvatar}
                        className="pill-button" 
                        type="button"
                        disabled={uploading || submitting}
                      >
                        Gỡ bỏ
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personal Info Form - Centralized glass inputs applied */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Họ và tên</label>
                    <input 
                      className="glass-input" 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Email (Đã xác minh)</label>
                    <div className="relative">
                      <input 
                        className="glass-input" 
                        disabled 
                        type="email" 
                        value={email}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary font-fill">verified</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Số điện thoại</label>
                    <input 
                      className="glass-input" 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="font-label-md text-xs text-on-surface-variant font-bold ml-2 block">Tiểu sử</label>
                    <textarea 
                      className="glass-input h-32 py-4 resize-none" 
                      placeholder="Viết một chút về bản thân bạn..." 
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </div>

                {/* Action Footer - Pill buttons with active effects applied */}
                <div className="pt-12 border-t border-outline-variant/30 flex flex-col sm:flex-row justify-end gap-4">
                  <button 
                    onClick={() => navigate('/')}
                    className="order-2 sm:order-1 pill-button" 
                    type="button"
                  >
                    Hủy
                  </button>
                  <button 
                    className="order-1 sm:order-2 pill-button pill-button--accent" 
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <AddressBook />
          )}
        </section>
      </main>
    </div>
  );
}
