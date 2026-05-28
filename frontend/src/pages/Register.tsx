import React, { useState, useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Spinner from "../components/common/Spinner";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function Register() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("Register must be used within an AuthProvider");
  }
  const { register, isAuthenticated, loading } = auth;
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Motion values for high-performance parallax mouse movement on the hero image
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 150 };
  const x = useSpring(
    useTransform(
      mouseX,
      [-window.innerWidth / 2, window.innerWidth / 2],
      [-15, 15],
    ),
    springConfig,
  );
  const y = useSpring(
    useTransform(
      mouseY,
      [-window.innerHeight / 2, window.innerHeight / 2],
      [-15, 15],
    ),
    springConfig,
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const moveX = e.clientX - window.innerWidth / 2;
      const moveY = e.clientY - window.innerHeight / 2;
      mouseX.set(moveX);
      mouseY.set(moveY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name || !email || !password || !confirmPassword || !phone) {
      setErrorMsg("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Mật khẩu nhập lại không trùng khớp");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Mật khẩu phải có độ dài ít nhất 6 ký tự");
      return;
    }

    try {
      await register(name, email, password, phone);
      setSuccessMsg("Đăng ký tài khoản thành công! Đang chuyển hướng...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setErrorMsg(
          String((err as { message: unknown }).message) ||
            "Lỗi đăng ký tài khoản. Vui lòng thử lại.",
        );
      } else {
        setErrorMsg("Lỗi đăng ký tài khoản. Vui lòng thử lại.");
      }
    }
  };

  if (loading)
    return <Spinner fullPage message="Đang tạo tài khoản của bạn..." />;

  return (
    <motion.div
      className="min-h-screen flex flex-col md:flex-row w-full bg-surface font-body-md text-on-surface overflow-x-hidden relative"
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.5 }}
    >
      {/* Cinematic Side: Visual Anchor */}
      <section className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden bg-primary items-center justify-center p-margin-desktop">
        <div className="absolute inset-0 z-0">
          <motion.img
            alt="Smart Home Cinematic"
            className="w-full h-full object-cover brightness-[0.7] contrast-[1.1]"
            style={{ x, y, scale: 1.1 }}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKw7yAcRKLtliKbu9dEy5TTZp4PAe0vwFVv6gm-truJBi6Os_YtO5vsfo7sm3W8vzAQdf1HkolYOH-7902diHu_S-VuMg4EKt6nC4UoXHrzBIsueAP43DZimNW4MP3BHsRnMHI3GuCXVyMXpW11AE-mj_iwsTaQcWv5APjAWuCPRvL5mcCVYbpqZNoTZatpPDepKu_xfod7WYPMwIR6NBXJvMMWjo5hMpPWQ4BR49OTBnUGxQAh92xPF_Z30yMM4UzB7RFZko8M06q"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/60 via-transparent to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-xl text-white">
          <div className="mb-gutter">
            <span className="font-display-md text-6xl font-extrabold tracking-tighter block mb-4">
              Volitify
            </span>
            <h2 className="font-headline-lg text-headline-lg mb-6 leading-tight font-bold">
              Kiến tạo không gian sống thông minh của bạn.
            </h2>
            <p className="font-body-lg text-body-lg opacity-90 max-w-lg">
              Gia nhập cộng đồng Volitify để trải nghiệm sự kết hợp hoàn hảo
              giữa công nghệ hiện đại và sự tiện nghi tối ưu trong chính ngôi
              nhà của bạn.
            </p>
          </div>
          {/* System status card */}
          <div className="glass-panel rounded-2xl p-6 border border-white/20 inline-flex items-center gap-4 animate-pulse bg-white/10 backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white">bolt</span>
            </div>
            <div>
              <p className="font-label-md text-label-md uppercase tracking-wider text-white/70">
                Trạng thái hệ thống
              </p>
              <p className="font-title-lg text-title-lg text-white font-bold">
                Sẵn sàng vận hành
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form Side: Interaction Canvas */}
      <section className="flex-1 flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface-container-lowest relative py-20">
        {/* Mobile Brand Header */}
        <div className="md:hidden absolute top-margin-mobile left-margin-mobile">
          <Link
            to="/"
            className="font-display-md text-title-lg font-extrabold tracking-tighter text-primary"
          >
            Volitify
          </Link>
        </div>

        <div className="w-full max-w-[440px] space-y-8 py-12">
          <div className="space-y-2">
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
              Tạo tài khoản mới
            </h1>
            <p className="font-body-md text-on-surface-variant">
              Bắt đầu hành trình thông minh cùng chúng tôi ngay hôm nay.
            </p>
          </div>

          {/* Validation Alerts */}
          {errorMsg && (
            <div className="bg-error-container text-on-error-container p-4 rounded-xl flex items-center gap-2 text-sm border border-error/20">
              <span className="material-symbols-outlined text-error">
                error
              </span>
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-primary-fixed text-primary-fixed-dim p-4 rounded-xl flex items-center gap-2 text-sm border border-primary/20 bg-primary/5">
              <span className="material-symbols-outlined text-primary">
                check_circle
              </span>
              <span className="font-semibold text-primary">{successMsg}</span>
            </div>
          )}

          {/* Form registration */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="space-y-2 group">
              <label
                className="font-label-md text-label-md text-on-surface-variant block"
                htmlFor="full_name"
              >
                Họ và Tên
              </label>
              <div className="relative">
                <input
                  className="w-full h-14 bg-surface-container-low border-transparent rounded-xl px-4 font-body-md transition-all duration-300 focus:ring-0 focus:border-primary focus:bg-white border-2 hover:bg-surface-container-high outline-none text-on-surface"
                  id="full_name"
                  placeholder="Nguyễn Văn A"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2 group">
              <label
                className="font-label-md text-label-md text-on-surface-variant block"
                htmlFor="email"
              >
                Địa chỉ Email
              </label>
              <div className="relative">
                <input
                  className="w-full h-14 bg-surface-container-low border-transparent rounded-xl px-4 font-body-md transition-all duration-300 focus:ring-0 focus:border-primary focus:bg-white border-2 hover:bg-surface-container-high outline-none text-on-surface"
                  id="email"
                  placeholder="email@example.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2 group">
              <label
                className="font-label-md text-label-md text-on-surface-variant block"
                htmlFor="phone"
              >
                Số điện thoại
              </label>
              <div className="relative">
                <input
                  className="w-full h-14 bg-surface-container-low border-transparent rounded-xl px-4 font-body-md transition-all duration-300 focus:ring-0 focus:border-primary focus:bg-white border-2 hover:bg-surface-container-high outline-none text-on-surface"
                  id="phone"
                  placeholder="0912345678"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 group">
                <label
                  className="font-label-md text-label-md text-on-surface-variant block"
                  htmlFor="password"
                >
                  Mật khẩu
                </label>
                <input
                  className="w-full h-14 bg-surface-container-low border-transparent rounded-xl px-4 font-body-md transition-all duration-300 focus:ring-0 focus:border-primary focus:bg-white border-2 hover:bg-surface-container-high outline-none text-on-surface"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2 group">
                <label
                  className="font-label-md text-label-md text-on-surface-variant block"
                  htmlFor="confirm_password"
                >
                  Xác nhận
                </label>
                <input
                  className="w-full h-14 bg-surface-container-low border-transparent rounded-xl px-4 font-body-md transition-all duration-300 focus:ring-0 focus:border-primary focus:bg-white border-2 hover:bg-surface-container-high outline-none text-on-surface"
                  id="confirm_password"
                  placeholder="••••••••"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-start gap-3 py-2">
              <div className="flex items-center h-5">
                <input
                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 transition-all cursor-pointer"
                  id="terms"
                  type="checkbox"
                  required
                />
              </div>
              <label
                className="font-body-md text-on-surface-variant leading-tight cursor-pointer"
                htmlFor="terms"
              >
                Tôi đồng ý với{" "}
                <a
                  className="text-primary font-semibold hover:underline"
                  href="#"
                >
                  Điều khoản Dịch vụ
                </a>{" "}
                và{" "}
                <a
                  className="text-primary font-semibold hover:underline"
                  href="#"
                >
                  Chính sách Bảo mật
                </a>{" "}
                của Volitify.
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              className="w-full h-14 bg-primary text-white font-label-md rounded-xl transition-all duration-300 hover:bg-primary/90 flex items-center justify-center gap-2 font-bold focus:outline-none"
              type="submit"
              whileHover={{
                scale: 1.03,
                boxShadow: "0 8px 20px rgba(37,99,235,0.12)",
              }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Đăng ký Tài khoản</span>
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </motion.button>
          </form>

          {/* Footer Link */}
          <div className="text-center pt-4">
            <p className="font-body-md text-on-surface-variant">
              Bạn đã có tài khoản?{" "}
              <Link
                className="text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1 transition-all"
                to="/login"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>

          {/* Secondary Auth Options */}
          <div className="pt-8 border-t border-outline-variant/30">
            <p className="text-center font-label-md text-on-surface-variant mb-6 uppercase tracking-widest text-[10px]">
              Hoặc đăng ký bằng
            </p>
            <div className="flex gap-4">
              <motion.button
                type="button"
                className="flex-1 h-12 flex items-center justify-center border border-outline-variant rounded-xl hover:bg-surface-container transition-colors duration-200 group focus:outline-none bg-white"
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 8px 20px rgba(37,99,235,0.12)",
                }}
                whileTap={{ scale: 0.98 }}
              >
                <img
                  alt="Google"
                  className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXCSbdMH3PUdGgWzIAFJJbtLUaUu_Tt3ElYSAkK4A7r-PLg7P4aN1vHvnMPlR36nLYMEvUvCtaeA5WoN0FiSG5IHQDFVwLc67Dr940Xws7a4fh7GZgcHJTbfz8BEGfT7TuXN8FtEwLAZRU4U6KTiqjzs8XcSbeUousbB5q5fZZORtdroAV2eOwaFPLNm29C_pz2tE07eCj7O535acCss9uNzf-eeVefiWWNunFvmwlt316kYIbJKD2ofTOZ-yPFYTwU392Fp8Tkpe5"
                />
              </motion.button>
              <motion.button
                type="button"
                className="flex-1 h-12 flex items-center justify-center border border-outline-variant rounded-xl hover:bg-surface-container transition-colors duration-200 group focus:outline-none bg-white text-on-surface-variant hover:text-primary"
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 8px 20px rgba(37,99,235,0.12)",
                }}
                whileTap={{ scale: 0.98 }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  ios
                </span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Minimal Footer Copyright */}
        <footer className="absolute bottom-8 left-0 w-full text-center">
          <p className="font-label-md text-[12px] text-outline">
            © {new Date().getFullYear()} Volitify Systems. Bảo lưu mọi quyền.
          </p>
        </footer>
      </section>
    </motion.div>
  );
}
