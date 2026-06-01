import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';

export default function ForgotPassword(): React.ReactElement {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isMockOtp, setIsMockOtp] = useState(false);

  // Password visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Countdown Timer state
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [isTimerActive, setIsTimerActive] = useState(false);

  // OTP inputs references
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Parallax motion values for hero image
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  
  const springConfig = { damping: 30, stiffness: 180 };
  const x = useSpring(useTransform(mouseX, [0, 1], [-15, 15]), springConfig);
  const y = useSpring(useTransform(mouseY, [0, 1], [-15, 15]), springConfig);

  const navigate = useNavigate();

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timer]);

  // Formatter for timer MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Live Password validations based on backend constraints
  const isLengthValid = newPassword.length >= 6;
  const isMatchValid = newPassword !== '' && newPassword === confirmPassword;
  const isPasswordFormValid = isLengthValid && isMatchValid;

  // STEP 1: Request OTP via email
  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Vui lòng nhập địa chỉ email.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response: any = await authService.forgotPassword(email);
      setIsMockOtp(!!response?.data?.mock);
      setSuccessMsg(response?.message || 'Mã OTP đã được gửi đến email của bạn.');
      
      // Move to Step 2 & Reset timer
      setStep(2);
      setTimer(300);
      setIsTimerActive(true);
      setOtp(Array(6).fill('')); // Clear previous OTP entries
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setErrorMsg('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response: any = await authService.verifyOtp(email, otpCode);
      setSuccessMsg(response?.message || 'Mã OTP đã được xác nhận thành công.');
      setStep(3); // Go to set new password
    } catch (err: any) {
      setErrorMsg(err.message || 'Mã OTP không đúng hoặc đã hết hạn.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 2B: Resend OTP
  const handleResendOtp = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response: any = await authService.forgotPassword(email);
      setIsMockOtp(!!response?.data?.mock);
      setSuccessMsg(response?.message || 'Mã OTP mới đã được gửi.');
      setTimer(300);
      setIsTimerActive(true);
      setOtp(Array(6).fill(''));
      
      // Auto focus the first OTP input
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 50);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gửi lại mã OTP thất bại, vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 3: Reset password
  const handleResetPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isPasswordFormValid) {
      setErrorMsg('Vui lòng thoả mãn tất cả các ràng buộc đặt mật khẩu.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const otpCode = otp.join('');
      const response: any = await authService.resetPassword(email, otpCode, newPassword);
      setSuccessMsg(response?.message || 'Đặt lại mật khẩu thành công!');
      setStep(4); // Show success screen
    } catch (err: any) {
      setErrorMsg(err.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // OTP inputs keyboard navigation & events
  const handleOtpChange = (value: string, index: number) => {
    // Only accept numeric inputs
    if (value !== '' && !/^[0-9]$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next field if filled
    if (value !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Backspace: clear current input and focus previous
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (!/^\d{6}$/.test(pastedData)) return; // Only process if exactly 6 digits

    const digits = pastedData.split('');
    setOtp(digits);
    
    // Focus the last field
    otpRefs.current[5]?.focus();
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
        <section className="w-full lg:w-1/2 flex flex-col px-margin-mobile md:px-margin-desktop py-12 bg-white relative overflow-y-auto h-full">
          {/* Mobile Logo */}
          <div className="lg:hidden absolute top-8 left-8">
            <Link to="/" className="font-display-md text-title-lg font-extrabold tracking-tighter text-primary">
              Volitify
            </Link>
          </div>

          <div className="w-full max-w-[440px] mx-auto my-auto space-y-8 py-8">
            
            {/* Error Notification Alert */}
            {errorMsg && (
              <motion.div 
                className="bg-error-container text-on-error-container p-4 rounded-xl flex items-start gap-2 text-sm border border-error/20"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="material-symbols-outlined text-error flex-shrink-0 mt-0.5">error</span>
                <span className="font-semibold">{errorMsg}</span>
              </motion.div>
            )}

            {/* Success Notification Alert */}
            {successMsg && step !== 4 && (
              <motion.div 
                className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex items-start gap-2 text-sm border border-emerald-200"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="material-symbols-outlined text-emerald-600 flex-shrink-0 mt-0.5">check_circle</span>
                <span className="font-semibold">{successMsg}</span>
              </motion.div>
            )}

            {/* Development Mock Otp Tip */}
            {isMockOtp && step === 2 && (
              <motion.div 
                className="bg-blue-50 text-blue-800 p-4 rounded-xl flex flex-col gap-1.5 text-sm border border-blue-200"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">info</span>
                  <span className="font-bold">Môi trường Thử nghiệm (Dev Mode)</span>
                </div>
                <p className="text-blue-700 leading-relaxed font-medium">
                  Vì bạn chưa thiết lập cấu hình SMTP thực tế, hệ thống đã in mã OTP 6 chữ số ra **Terminal (Console) của backend**. Hãy mở Terminal chạy backend để lấy mã nhập nhé!
                </p>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {/* STEP 1: Enter Email */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <header className="space-y-3">
                    <h1 className="font-headline-md text-headline-md text-on-surface font-bold text-navy-dark">
                      Quên mật khẩu?
                    </h1>
                    <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                      Nhập địa chỉ email của bạn để chúng tôi gửi mã xác nhận OTP 6 số để thiết lập lại mật khẩu.
                    </p>
                  </header>

                  <form className="space-y-8" onSubmit={handleEmailSubmit}>
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
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {submitting ? (
                          <span className="flex items-center gap-2 justify-center text-white">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang gửi mã...</span>
                          </span>
                        ) : (
                          <>
                            <span>Gửi mã xác thực OTP</span>
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
                </motion.div>
              )}

              {/* STEP 2: Verify OTP 6 digits */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <header className="space-y-3">
                    <h1 className="font-headline-md text-headline-md text-on-surface font-bold text-navy-dark">
                      Xác nhận OTP
                    </h1>
                    <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                      Vui lòng nhập mã xác thực OTP gồm 6 chữ số đã được gửi đến hộp thư <strong className="text-on-surface font-semibold">{email}</strong>.
                    </p>
                  </header>

                  <form className="space-y-8" onSubmit={handleVerifyOtpSubmit}>
                    <div className="space-y-4">
                      <label className="font-label-md text-label-md text-on-surface-variant block font-semibold text-center">
                        MÃ XÁC THỰC OTP
                      </label>
                      <div className="flex justify-between gap-2 max-w-[360px] mx-auto">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => { otpRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(e.target.value, index)}
                            onKeyDown={(e) => handleOtpKeyDown(e, index)}
                            onPaste={index === 0 ? handleOtpPaste : undefined}
                            className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold bg-[#F1F5F9] border border-outline-variant rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-on-surface"
                          />
                        ))}
                      </div>

                      {/* Timer & Resend */}
                      <div className="flex items-center justify-between text-sm font-semibold pt-2 px-2">
                        <div className="flex items-center gap-1.5 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">schedule</span>
                          <span>Hết hạn sau: </span>
                          <span className={`font-mono ${timer < 60 ? 'text-error font-bold' : 'text-primary'}`}>
                            {formatTime(timer)}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={timer > 0 || submitting}
                          onClick={handleResendOtp}
                          className={`text-primary flex items-center gap-1 hover:underline transition-all ${
                            timer > 0 ? 'opacity-50 cursor-not-allowed' : 'font-bold'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                          Gửi lại mã
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <motion.button
                        className="w-full h-[60px] bg-primary text-on-primary font-title-lg text-title-lg rounded-xl flex items-center justify-center gap-3 btn-primary-hover font-bold transition-all duration-200"
                        type="submit"
                        disabled={submitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {submitting ? (
                          <span className="flex items-center gap-2 justify-center text-white">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang xác nhận...</span>
                          </span>
                        ) : (
                          <>
                            <span>Xác nhận mã OTP</span>
                            <span className="material-symbols-outlined">verified</span>
                          </>
                        )}
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="w-full flex items-center justify-center gap-2 text-outline hover:text-on-surface font-label-md text-label-md transition-all font-bold group"
                      >
                        <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">
                          arrow_back
                        </span>
                        <span>Thay đổi địa chỉ email</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* STEP 3: Enter New Password with validation rules */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <header className="space-y-3">
                    <h1 className="font-headline-md text-headline-md text-on-surface font-bold text-navy-dark">
                      Đặt mật khẩu mới
                    </h1>
                    <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                      Tạo một mật khẩu mới bảo mật cao cho tài khoản của bạn.
                    </p>
                  </header>

                  <form className="space-y-6" onSubmit={handleResetPasswordSubmit}>
                    {/* New Password field */}
                    <div className="space-y-2 group">
                      <label className="font-label-md text-label-md text-on-surface-variant block font-semibold" htmlFor="newPassword">
                        MẬT KHẨU MỚI
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                          lock
                        </span>
                        <input
                          className="w-full h-[56px] pl-12 pr-12 bg-[#F1F5F9] border border-outline-variant rounded-xl focus:border-primary focus:ring-0 focus:outline-none input-focus-glow transition-all font-body-md text-on-surface"
                          id="newPassword"
                          name="newPassword"
                          placeholder="Nhập mật khẩu mới"
                          required
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          onClick={() => setShowNewPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-outline hover:text-primary hover:bg-primary/8 transition-all"
                          tabIndex={-1}
                        >
                          <span className="material-symbols-outlined text-[22px] select-none">
                            {showNewPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password field */}
                    <div className="space-y-2 group">
                      <label className="font-label-md text-label-md text-on-surface-variant block font-semibold" htmlFor="confirmPassword">
                        XÁC NHẬN MẬT KHẨU
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                          lock_reset
                        </span>
                        <input
                          className="w-full h-[56px] pl-12 pr-12 bg-[#F1F5F9] border border-outline-variant rounded-xl focus:border-primary focus:ring-0 focus:outline-none input-focus-glow transition-all font-body-md text-on-surface"
                          id="confirmPassword"
                          name="confirmPassword"
                          placeholder="Nhập lại mật khẩu"
                          required
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-outline hover:text-primary hover:bg-primary/8 transition-all"
                          tabIndex={-1}
                        >
                          <span className="material-symbols-outlined text-[22px] select-none">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Backend validation check points display */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="text-[12px] font-bold text-outline uppercase tracking-wider">
                        RÀNG BUỘC BẢO MẬT (BACKEND RULES)
                      </div>
                      
                      <div className="space-y-2">
                        {/* Rule 1: Min 6 characters */}
                        <div className="flex items-center gap-2.5 text-sm transition-all duration-300">
                          {isLengthValid ? (
                            <span className="material-symbols-outlined text-emerald-600 font-bold text-[18px]">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-slate-300 text-[18px]">radio_button_unchecked</span>
                          )}
                          <span className={isLengthValid ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                            Mật khẩu phải dài ít nhất 6 ký tự
                          </span>
                        </div>

                        {/* Rule 2: Passwords match */}
                        <div className="flex items-center gap-2.5 text-sm transition-all duration-300">
                          {isMatchValid ? (
                            <span className="material-symbols-outlined text-emerald-600 font-bold text-[18px]">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-slate-300 text-[18px]">radio_button_unchecked</span>
                          )}
                          <span className={isMatchValid ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                            Mật khẩu xác nhận phải trùng khớp
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-4">
                      <motion.button
                        className={`w-full h-[60px] font-title-lg text-title-lg rounded-xl flex items-center justify-center gap-3 font-bold transition-all duration-200 ${
                          isPasswordFormValid
                            ? 'bg-primary text-on-primary btn-primary-hover'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        type="submit"
                        disabled={submitting || !isPasswordFormValid}
                        whileHover={isPasswordFormValid ? { scale: 1.02 } : {}}
                        whileTap={isPasswordFormValid ? { scale: 0.98 } : {}}
                      >
                        {submitting ? (
                          <span className="flex items-center gap-2 justify-center">
                            <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang thiết lập...</span>
                          </span>
                        ) : (
                          <>
                            <span>Đặt lại mật khẩu</span>
                            <span className="material-symbols-outlined">published_with_changes</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* STEP 4: Success state */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="text-center space-y-8"
                >
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-on-surface font-headline-md text-headline-md font-bold text-navy-dark">
                      Đặt lại mật khẩu thành công!
                    </h3>
                    <p className="text-on-surface-variant font-body-lg text-body-lg leading-relaxed">
                      Mật khẩu của bạn đã được thay đổi thành công. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới này.
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <motion.button
                      onClick={() => navigate('/login')}
                      className="w-full h-[60px] bg-primary text-on-primary font-title-lg text-title-lg rounded-xl flex items-center justify-center gap-3 btn-primary-hover font-bold transition-all duration-200 shadow-md shadow-primary/20"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>Đăng nhập ngay</span>
                      <span className="material-symbols-outlined">login</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer (Minimalist) */}
          <footer className="mt-auto pt-8 w-full hidden lg:flex justify-between items-center text-outline">
            <p className="font-label-md text-[12px]">© {new Date().getFullYear()} Volitify Systems.</p>
            <div className="flex gap-6">
              <a className="font-label-md text-[12px] hover:text-primary transition-colors" href="#">Bảo mật</a>
              <a className="font-label-md text-[12px] hover:text-primary transition-colors" href="#">Điều khoản</a>
            </div>
          </footer>
          <div className="lg:hidden mt-auto pt-8 text-center w-full">
            <p className="font-label-md text-[12px] text-outline">© {new Date().getFullYear()} Volitify Systems.</p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

