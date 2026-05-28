import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Spinner from '../components/common/Spinner';

export default function ForgotPassword(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Parallax motion values for hero image
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
    if (!email) {
      setErrorMsg('Vui lòng nhập địa chỉ email');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // Simulate sending reset email offline
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsSubmitted(true);
    } catch (err: unknown) {
      setErrorMsg('Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="h-screen w-full flex font-body-md overflow-hidden bg-background text-on-background relative"
      initial={{ y: '30px', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '30px', opacity: 0 }}
      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.5 }}
    >
      <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Cinematic Visual Anchor */}
        <section 
          className="hidden lg:flex w-1/2 relative overflow-hidden bg-primary items-center justify-center p-margin-desktop cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="absolute inset-0 z-0">
            <motion.img
              alt="Smart Home Cinematic"
              className="absolute inset-0 w-full h-full object-cover brightness-[0.7] contrast-[1.05]"
              style={{ x, y, scale: 1.1 }}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRM09VtSXxLNxY8Ht7kxxD4WeQbC6-YG84_9_0t_CeydXBCspatCow0wNxGLzY1-N9vz7z3-LjlMmoaZDdErIbnKI5K3SvTfStr4vT7yIFIdwO6vSZXxpfwBk1HMoIFldbeFM8W9O-_KddHz93OUE7XPKalr2T6LDSmsAX1YHf84GYdgUKRs1yoytqqq_BfFTwJMyDnjP_-IPY3uyzkL-vU3KWEt8ISG2eoBSBnMvU5DHUh4UabBtjGEPF8t7EicfDMd0onn1iCA2K"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-primary/30 to-transparent z-10"></div>
          </div>
          <div className="relative z-20 max-w-xl text-white">
            <div className="mb-gutter">
              <span className="font-display-md text-6xl font-extrabold tracking-tighter block mb-4">
                Volitify
              </span>
              <h2 className="font-headline-lg text-headline-lg mb-6 leading-tight font-bold">
                Bảo vệ ngôi nhà, an tâm tuyệt đối.
              </h2>
              <p className="font-body-lg text-body-lg opacity-90 max-w-lg leading-relaxed">
                Sự an tâm của bạn là ưu tiên hàng đầu của chúng tôi. Hệ thống bảo mật thông minh giúp bạn luôn kết nối và bảo vệ những gì quan trọng nhất.
              </p>
            </div>
          </div>
        </section>

        {/* Right Side: Interaction Form */}
        <section className="w-full lg:w-1/2 flex flex-col justify-center items-center px-margin-mobile md:px-margin-desktop py-12 bg-white relative">
          {/* Mobile Logo */}
          <div className="lg:hidden absolute top-8 left-8">
            <Link to="/" className="font-display-md text-title-lg font-extrabold tracking-tighter text-primary">
              Volitify
            </Link>
          </div>

          <div className="w-full max-w-[440px] space-y-10">
            {/* Header Text */}
            {!isSubmitted && (
              <header className="space-y-3">
                <h1 className="font-headline-md text-headline-md text-on-surface font-bold text-navy-dark">
                  Quên mật khẩu?
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                  Nhập địa chỉ email của bạn để nhận liên kết đặt lại mật khẩu.
                </p>
              </header>
            )}

            {/* Error Notification Alert */}
            {errorMsg && (
              <div className="bg-error-container text-on-error-container p-4 rounded-xl flex items-center gap-2 text-sm border border-error/20">
                <span className="material-symbols-outlined text-error">error</span>
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* Reset Form */}
            {!isSubmitted ? (
              <form className="space-y-8" onSubmit={handleResetSubmit}>
                <div className="space-y-2 group">
                  <label className="font-label-md text-label-md text-on-surface-variant block font-semibold" htmlFor="email">
                    ĐỊA CHỈ EMAIL
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                      mail
                    </span>
                    <input
                      className="w-full h-[56px] pl-12 pr-4 bg-[#F1F5F9] border border-outline-variant rounded-xl focus:border-primary focus:ring-0 focus:outline-none input-focus-glow transition-all font-body-md text-on-surface"
                      id="email"
                      name="email"
                      placeholder="ten@congty.vn"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <motion.button
                    className="w-full h-[60px] bg-primary text-on-primary font-title-lg text-title-lg rounded-xl flex items-center justify-center gap-3 btn-primary-hover font-bold transition-all duration-200"
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2 justify-center text-white">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang xử lý...</span>
                      </span>
                    ) : (
                      <>
                        <span>Gửi liên kết đặt lại</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </>
                    )}
                  </motion.button>

                  <Link
                    className="flex items-center justify-center gap-2 text-primary font-label-md text-label-md transition-all group font-bold"
                    to="/login"
                  >
                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">
                      arrow_back
                    </span>
                    <span className="group-hover:underline decoration-2 underline-offset-8">
                      Quay lại đăng nhập
                    </span>
                  </Link>
                </div>
              </form>
            ) : (
              /* Success State */
              <motion.div 
                className="text-center space-y-8"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-on-surface font-headline-md text-headline-md font-bold text-navy-dark">
                    Email đã được gửi!
                  </h3>
                  <p className="text-on-surface-variant font-body-lg text-body-lg leading-relaxed">
                    Chúng tôi đã gửi hướng dẫn khôi phục đến địa chỉ email <strong className="text-on-surface font-semibold">{email}</strong>. Vui lòng kiểm tra hộp thư đến.
                  </p>
                </div>
                <div className="flex flex-col gap-4 items-center">
                  <button
                    className="text-primary font-label-md text-label-md border border-primary/20 px-8 py-3 rounded-full hover:bg-primary/5 transition-colors font-bold"
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                  >
                    Thử lại với email khác
                  </button>
                  <Link
                    className="flex items-center justify-center gap-2 text-primary font-label-md text-label-md transition-all group font-bold"
                    to="/login"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      arrow_back
                    </span>
                    <span className="group-hover:underline decoration-2 underline-offset-8">
                      Quay lại đăng nhập
                    </span>
                  </Link>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer (Minimalist) */}
          <footer className="absolute bottom-8 left-0 w-full px-margin-desktop hidden lg:flex justify-between items-center text-outline">
            <p className="font-label-md text-[12px]">© {new Date().getFullYear()} Volitify Systems.</p>
            <div className="flex gap-6">
              <a className="font-label-md text-[12px] hover:text-primary transition-colors" href="#">Bảo mật</a>
              <a className="font-label-md text-[12px] hover:text-primary transition-colors" href="#">Điều khoản</a>
            </div>
          </footer>
          <div className="lg:hidden absolute bottom-8 text-center w-full">
            <p className="font-label-md text-[12px] text-outline">© {new Date().getFullYear()} Volitify Systems.</p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
