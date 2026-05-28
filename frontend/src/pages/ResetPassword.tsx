import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Spinner from '../components/common/Spinner';

export default function ResetPassword(): React.ReactElement {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password validations
  const isMinLength = password.length >= 8;
  const hasLetterAndNumber = /[A-Za-z]/.test(password) && /[0-9]/.test(password);

  // Parallax motion values for sunset cityscape image
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { damping: 30, stiffness: 180 };
  const x = useSpring(useTransform(mouseX, [0, 1], [-15, 15]), springConfig);
  const y = useSpring(useTransform(mouseY, [0, 1], [-15, 15]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const relativeX = (e.clientX - rect.left) / width;
    const relativeY = (e.clientY - rect.top) / height;
    mouseX.set(relativeX);
    mouseY.set(relativeY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setErrorMsg('Vui lòng điền đầy đủ các ô mật khẩu.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    if (!isMinLength || !hasLetterAndNumber) {
      setErrorMsg('Mật khẩu chưa đáp ứng đầy đủ các yêu cầu bảo mật.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Simulate calling password reset API offline
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess(true);
    } catch (err: unknown) {
      setErrorMsg('Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Automatically redirect user to login page after success screen displays
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  return (
    <motion.div
      className="h-screen w-full flex font-body-md overflow-hidden bg-background text-on-background relative animate-in fade-in duration-300"
      initial={{ y: '30px', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '30px', opacity: 0 }}
      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.5 }}
    >
      <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Cinematic Visual */}
        <section
          className="relative w-full md:w-1/2 lg:w-3/5 h-64 md:h-full overflow-hidden group cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="absolute inset-0 z-0">
            <motion.img
              alt="Sunset Cinematic Smart Home"
              className="w-full h-full object-cover brightness-[0.75] contrast-[1.05]"
              style={{ x, y, scale: 1.1 }}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3JkieV6juEnsqJ-OJC34IGpfIaLRdS5_j9E04LaOJR2ylCbLgYmAYwP29LjXwQIjelF0iA9QlDgZIas-_q8ipt6cTJaVIqPFIlCsE7NMO8eKTXfmELQPBWQFxChyPn6buRHYrpY1Zj6YHd94L8u7x9qJKuTB7y5E6UKJVbXMqGlfWBA1CI8IA-b0YTw8GlhjN1fOxkUFypwbAHi6jM3foJYVeTWff_EUxwGNxPGpr6ckuVvP6UQuOilds1m53gqN1HjWgZhgAYqBS"
            />
            <div className="absolute inset-0 auth-image-overlay z-10"></div>
          </div>
          {/* Branding on Image */}
          <div className="relative z-20 h-full flex flex-col justify-between p-margin-mobile md:p-p-margin-desktop p-8 text-white">
            <div className="flex items-center gap-3">
              <span className="font-display-md text-display-md text-white tracking-tighter leading-none font-black">
                Volitify
              </span>
            </div>
            <div className="max-w-md mt-auto">
              <h2 className="font-headline-lg text-headline-lg text-white mb-4 font-bold">
                Kiến tạo tương lai an toàn
              </h2>
              <p className="font-body-lg text-body-lg text-white/80 leading-relaxed">
                Giải pháp bảo mật thông minh cho ngôi nhà hiện đại của bạn.
              </p>
            </div>
          </div>
        </section>

        {/* Right Side: Reset Form */}
        <section className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center bg-surface-container-lowest p-margin-mobile md:p-margin-desktop py-12 relative">
          <div className="w-full max-w-md space-y-10 px-4">

            {/* Header Text */}
            {!success && (
              <div className="space-y-4">
                <h1 className="font-headline-md text-headline-md text-on-surface font-bold text-navy-dark">
                  Đặt lại mật khẩu
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                  Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
                </p>
              </div>
            )}

            {/* Error Notification Alert */}
            {errorMsg && (
              <div className="bg-error-container text-on-error-container p-4 rounded-xl flex items-center gap-2 text-sm border border-error/20">
                <span className="material-symbols-outlined text-error">error</span>
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {!success ? (
              /* Reset Form */
              <form className="space-y-8" onSubmit={handleResetSubmit}>
                <div className="space-y-6">
                  {/* New Password Field */}
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block font-semibold" htmlFor="password">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">
                        lock
                      </span>
                      <input
                        className="w-full h-14 pl-12 pr-12 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-body-md text-on-surface focus:outline-none"
                        id="password"
                        placeholder="••••••••"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors focus:outline-none"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        <span className="material-symbols-outlined">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block font-semibold" htmlFor="confirm-password">
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">
                        verified_user
                      </span>
                      <input
                        className="w-full h-14 pl-12 pr-12 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-body-md text-on-surface focus:outline-none"
                        id="confirm-password"
                        placeholder="••••••••"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors focus:outline-none"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        type="button"
                      >
                        <span className="material-symbols-outlined">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Requirements (Real-time micro-interactions) */}
                <div className="bg-surface-container-low rounded-2xl p-6 space-y-3">
                  <p className="font-label-md text-label-md text-on-surface mb-1 font-bold">
                    Yêu cầu mật khẩu:
                  </p>
                  <div className={`flex items-center gap-2 transition-colors duration-300 ${isMinLength ? 'text-success' : 'text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {isMinLength ? 'check_circle' : 'circle'}
                    </span>
                    <span className="text-xs">Tối thiểu 8 ký tự</span>
                  </div>
                  <div className={`flex items-center gap-2 transition-colors duration-300 ${hasLetterAndNumber ? 'text-success' : 'text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {hasLetterAndNumber ? 'check_circle' : 'circle'}
                    </span>
                    <span className="text-xs">Bao gồm cả chữ cái và chữ số</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  <motion.button
                    className="w-full h-14 bg-primary text-on-primary font-title-lg text-title-lg rounded-full shadow-lg shadow-primary/30 font-bold transition-all flex items-center justify-center gap-2"
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center text-white">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang cập nhật...</span>
                      </span>
                    ) : (
                      <>
                        <span>Cập nhật mật khẩu</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </>
                    )}
                  </motion.button>

                  <div className="text-center">
                    <Link
                      className="inline-flex items-center gap-2 font-label-md text-label-md text-primary transition-all font-bold group"
                      to="/login"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      <span className="group-hover:underline">Quay lại đăng nhập</span>
                    </Link>
                  </div>
                </div>
              </form>
            ) : (
              /* Success State */
              <motion.div
                className="text-center space-y-8 py-10"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <div className="w-20 h-20 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-on-surface font-headline-md text-headline-md font-bold text-navy-dark">
                    Đặt lại thành công!
                  </h3>
                  <p className="text-on-surface-variant font-body-lg text-body-lg leading-relaxed">
                    Mật khẩu của bạn đã được cập nhật thành công. Đang chuyển hướng bạn quay lại trang đăng nhập...
                  </p>
                </div>
                <Spinner message="Vui lòng đợi..." />
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
