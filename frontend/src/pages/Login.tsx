import React, { useState, useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Spinner from "../components/common/Spinner";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function Login() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("Login must be used within an AuthProvider");
  }
  const { login, isAuthenticated, loading } = auth;
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    (window as any).handleQuickLogin = handleQuickLogin;
  }, []);

  // Motion values for cinematic bento/card hover tilt
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { damping: 25, stiffness: 200 };
  const rotateX = useSpring(
    useTransform(mouseY, [0, 1], [10, -10]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(mouseX, [0, 1], [-10, 10]),
    springConfig,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setErrorMsg("");
      await login(email, password);
      navigate("/");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setErrorMsg(
          String((err as { message: unknown }).message) ||
            "Sai tài khoản hoặc mật khẩu",
        );
      } else {
        setErrorMsg("Sai tài khoản hoặc mật khẩu");
      }
    }
  };

  const handleQuickLogin = (role: "customer" | "admin") => {
    if (role === "customer") {
      setEmail("customer");
      setPassword("password123");
    } else if (role === "admin") {
      setEmail("admin");
      setPassword("password123");
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = (e.clientX - rect.left) / width;
    const y = (e.clientY - rect.top) / height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  if (loading)
    return <Spinner fullPage message="Đang xác minh thông tin tài khoản..." />;

  return (
    <motion.div
      className="min-h-screen flex font-body-md overflow-x-hidden w-full bg-background text-on-background relative"
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "-100%", opacity: 0 }}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.5 }}
    >
      {/* Top Navigation Bar */}
      <nav className="absolute top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop py-6">
        <Link to="/" className="flex items-center gap-2">
          <img
            alt="Volitify Logo"
            className="h-10 w-auto shrink-0 object-contain"
            src="/favicon.png"
          />
        </Link>
        <div className="hidden md:flex gap-gutter items-center">
          <span className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            Hỗ trợ
          </span>
        </div>
      </nav>

      <main className="flex w-full min-h-screen">
        {/* Left Side: Login Form Canvas */}
        <section className="w-full lg:w-1/2 flex flex-col justify-center items-center px-margin-mobile md:px-margin-desktop py-24 bg-white relative z-10">
          <div className="w-full max-w-[440px] space-y-6">
            {/* Header Text */}
            <header className="space-y-2 mb-10">
              <h1 className="font-headline-lg text-headline-lg text-on-surface text-center text-primary">
                Volitify
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant text-center">
                Chào mừng bạn đến với Volitify
              </p>
            </header>

            {/* Error Notification Alert */}
            {errorMsg && (
              <div className="bg-error-container text-on-error-container p-4 rounded-xl flex items-center gap-2 text-sm border border-error/20">
                <span className="material-symbols-outlined text-error">
                  error
                </span>
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  className="font-label-md text-label-md text-on-surface-variant"
                  htmlFor="email"
                >
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                    person
                  </span>
                  <input
                    className="w-full h-[56px] pl-12 pr-4 bg-[#F1F5F9] border border-outline-variant rounded-xl focus:border-primary focus:ring-0 focus:outline-none input-focus-glow transition-all font-body-md text-on-surface"
                    id="email"
                    name="email"
                    placeholder="customer"
                    required
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className="font-label-md text-label-md text-on-surface-variant"
                  htmlFor="password"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                    lock
                  </span>
                  <input
                    className="w-full h-[56px] pl-12 pr-12 bg-[#F1F5F9] border border-outline-variant rounded-xl focus:border-primary focus:ring-0 focus:outline-none input-focus-glow transition-all font-body-md text-on-surface"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
                    type="checkbox"
                  />
                  <span className="font-body-md text-on-surface-variant group-hover:text-primary transition-colors">
                    Ghi nhớ đăng nhập
                  </span>
                </label>
                <Link
                  className="font-label-md text-label-md text-primary hover:underline decoration-2 underline-offset-4 font-semibold"
                  to="/forgot-password"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <motion.button
                className="w-full h-[56px] bg-primary text-on-primary font-title-lg text-title-lg rounded-xl flex items-center justify-center gap-2 btn-primary-hover transition-all duration-200 font-bold"
                type="submit"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Đăng Nhập
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant"></div>
              </div>
              <div className="relative flex justify-center text-label-md">
                <span className="bg-white px-4 text-on-surface-variant uppercase font-semibold">
                  Hoặc tiếp tục với
                </span>
              </div>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                type="button"
                className="flex items-center justify-center gap-3 h-[56px] border border-outline-variant rounded-xl hover:bg-surface-container transition-colors focus:outline-none bg-white"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <img
                  alt="Google"
                  className="w-6 h-6"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-sElvOzl0O8c2NzCmfIJ_UAUpIG0cBFlaaTgvq4BXwF0uxm6N2yZfpFpOF_BLUEO1iFLzjXzWu6rH1He4pYdlFvbiNM_FTxiCkUlrGUncQ6gxOyQ7ZBaP9bu_zErFJkJwRkAGE0XTiFnKAHSZ9hIbuAd0t2MmV5xXiLfylRpCm58w85S0KG2FQmx7ePD9qrEU1bWpBheYCYudvkEOOl2CMYLynvbi9VF1_pSYqsBSMca_vwgoS8Qi3D64AeLo7TcRijkzFXYp9AJY"
                />
                <span className="font-label-md text-label-md text-on-surface">
                  Google
                </span>
              </motion.button>
              <motion.button
                type="button"
                className="flex items-center justify-center gap-3 h-[56px] border border-outline-variant rounded-xl hover:bg-surface-container transition-colors focus:outline-none bg-white"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span
                  className="material-symbols-outlined text-on-surface"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  ios
                </span>
                <span className="font-label-md text-label-md text-on-surface">
                  Apple
                </span>
              </motion.button>
            </div>

            {/* Signup Link */}
            <p className="text-center font-body-md text-on-surface-variant mt-10">
              Chưa có tài khoản?{" "}
              <Link
                className="text-primary font-bold hover:underline decoration-2 underline-offset-4"
                to="/register"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </section>

        {/* Right Side: Cinematic Image Section */}
        <section
          className="hidden lg:block w-1/2 relative overflow-hidden bg-surface-container-highest"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ perspective: 1000 }}
        >
          <div className="absolute inset-0 hero-gradient z-10"></div>
          <img
            className="absolute inset-0 w-full h-full object-cover transform hover:scale-105 transition-transform duration-300 ease-out"
            alt="Volitify Smart Home"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRM09VtSXxLNxY8Ht7kxxD4WeQbC6-YG84_9_0t_CeydXBCspatCow0wNxGLzY1-N9vz7z3-LjlMmoaZDdErIbnKI5K3SvTfStr4vT7yIFIdwO6vSZXxpfwBk1HMoIFldbeFM8W9O-_KddHz93OUE7XPKalr2T6LDSmsAX1YHf84GYdgUKRs1yoytqqq_BfFTwJMyDnjP_-IPY3uyzkL-vU3KWEt8ISG2eoBSBnMvU5DHUh4UabBtjGEPF8t7EicfDMd0onn1iCA2K"
          />
          {/* Floating Feature Card */}
          <motion.div
            className="absolute bottom-16 left-16 right-16 z-20 glass-effect p-8 rounded-3xl border border-white/20 shadow-2xl space-y-4"
            style={{
              backdropFilter: "blur(20px)",
              background: "rgba(255, 255, 255, 0.8)",
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  smart_toy
                </span>
              </div>
              <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
                Tương lai của nhà thông minh
              </h3>
            </div>
            <p className="font-body-md text-on-surface-variant leading-relaxed">
              Trải nghiệm sự tiện nghi tuyệt đối với hệ sinh thái Volitify. Điều
              khiển mọi thiết bị trong ngôi nhà của bạn chỉ với một cú chạm hoặc
              lệnh giọng nói. An toàn, bảo mật và hoàn toàn tự động.
            </p>
            <div className="flex gap-2">
              <div className="h-1 w-12 bg-primary rounded-full"></div>
              <div className="h-1 w-4 bg-outline-variant rounded-full"></div>
              <div className="h-1 w-4 bg-outline-variant rounded-full"></div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 w-full lg:w-1/2 p-6 flex justify-between items-center border-t border-outline-variant/50 md:border-none z-20">
        <p className="font-label-md text-label-md text-outline">
          © {new Date().getFullYear()} Volitify Systems.
        </p>
        <div className="flex gap-6">
          <a
            className="font-label-md text-label-md text-outline hover:text-primary transition-colors"
            href="#"
          >
            Bảo mật
          </a>
          <a
            className="font-label-md text-label-md text-outline hover:text-primary transition-colors"
            href="#"
          >
            Điều khoản
          </a>
        </div>
      </footer>
    </motion.div>
  );
}
