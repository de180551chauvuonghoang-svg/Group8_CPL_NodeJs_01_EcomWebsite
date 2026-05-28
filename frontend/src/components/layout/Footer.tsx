import React from 'react';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';

// Logo URL - use local favicon.png
const logoUrl = (import.meta.env.VITE_CDN_URL && import.meta.env.VITE_CDN_URL !== 'undefined')
  ? `${import.meta.env.VITE_CDN_URL}/favicon.png`
  : '/favicon.png';

// Framer Motion animation variants
const footerVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const columnVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const iconHover = {
  scale: 1.15,
  backgroundColor: "rgba(37, 99, 235, 1)",
  color: "#ffffff",
  transition: { duration: 0.2, ease: "easeInOut" }
} as const;

export default function Footer(): React.ReactElement {
  return (
    <motion.footer
      className="bg-[#0F172A]/80 py-12 border-t border-white/10 mt-auto text-white backdrop-blur-xl"
      variants={footerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
    >
      <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <motion.div className="col-span-1 md:col-span-1" variants={columnVariants}>
          <div className="flex items-center gap-2 mb-6">
            <img
              alt="Volitify Logo"
              className="h-10 w-auto shrink-0 object-contain"
              src={logoUrl}
            />
          </div>
          <p className="text-slate-400 mb-6 text-body-md leading-relaxed">
            Kiến tạo tương lai của ngôi nhà thông minh với những giải pháp công nghệ hàng đầu thế giới.
          </p>
          <div className="flex gap-4">
            <motion.button
              type="button"
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-300 glass-panel"
              whileHover={iconHover}
              whileTap={{ scale: 0.95 }}
              aria-label="Website"
            >
              <span className="material-symbols-outlined text-sm">public</span>
            </motion.button>
            <motion.button
              type="button"
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-300 glass-panel"
              whileHover={iconHover}
              whileTap={{ scale: 0.95 }}
              aria-label="Chia sẻ"
            >
              <span className="material-symbols-outlined text-sm">share</span>
            </motion.button>
            <motion.button
              type="button"
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-300 glass-panel"
              whileHover={iconHover}
              whileTap={{ scale: 0.95 }}
              aria-label="Gửi thư điện tử"
            >
              <span className="material-symbols-outlined text-sm">mail</span>
            </motion.button>
          </div>
        </motion.div>

        <motion.div variants={columnVariants}>
          <h4 className="font-bold text-title-lg mb-6 text-white">Sản Phẩm</h4>
          <ul className="space-y-3">
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/?category=Electronics">Tivi &amp; Video</Link></li>
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/?category=Home%20%26%20Kitchen">Thiết Bị Bếp</Link></li>
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/?category=Accessories">Nhà Thông Minh</Link></li>
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/?category=Wearables">Gaming Gear</Link></li>
          </ul>
        </motion.div>

        <motion.div variants={columnVariants}>
          <h4 className="font-bold text-title-lg mb-6 text-white">Hỗ Trợ</h4>
          <ul className="space-y-3">
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/">Trung Tâm Bảo Hành</Link></li>
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/">Chính Sách Đổi Trả</Link></li>
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/">Theo Dõi Đơn Hàng</Link></li>
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/">Câu Hỏi Thường Gặp</Link></li>
          </ul>
        </motion.div>

        <motion.div variants={columnVariants}>
          <h4 className="font-bold text-title-lg mb-6 text-white">Công Ty</h4>
          <ul className="space-y-3">
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/">Về Volitify</Link></li>
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/">Cơ Hội Nghề Nghiệp</Link></li>
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/">Tin Tức &amp; Sự Kiện</Link></li>
            <li><Link className="text-slate-400 hover:text-white transition-all text-body-md" to="/">Liên Hệ</Link></li>
          </ul>
        </motion.div>
      </div>

      <div className="max-w-container-max mx-auto px-margin-desktop mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-slate-500 text-body-md">
          © {new Date().getFullYear()} Volitify Enterprise. Built for the future of home automation.
        </p>
        <div className="flex gap-8">
          <Link className="text-label-md text-slate-400 hover:text-white hover:underline" to="/">Điều Khoản Dịch Vụ</Link>
          <Link className="text-label-md text-slate-400 hover:text-white hover:underline" to="/">Chính Sách Bảo Mật</Link>
          <Link className="text-label-md text-slate-400 hover:text-white hover:underline" to="/">Store Finder</Link>
        </div>
      </div>
    </motion.footer>
  );
}
