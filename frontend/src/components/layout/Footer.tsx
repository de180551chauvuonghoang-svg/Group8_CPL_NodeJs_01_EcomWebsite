export default function Footer() {
  return (
    <footer className="bg-navy-dark py-12 border-t border-white/10 mt-auto text-white">
      <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <img
              alt="Volitify Logo"
              className="h-10 w-auto shrink-0 object-contain"
              src="https://lh3.googleusercontent.com/aida/ADBb0uiy1x6g5DybSsrmO0aWGsaLaupq1Rte0xzHJObUVSZMRiC8GSDzCQHes4EqwN4fj0nPEAk-LulJTRkFINgcIggUM_8dIqWl6FNu4plcKRe1dW_5yq217PNVGf5ZrK-Dmj3MJvB3WhCP3jG970Klk2JOrkyirfLuk4vt6CBZjaqGi0Md0c0B1NUUw8pvj3ZBkZ7p53rfVgUeKx-rzn05fcuqBZ6-mL4DPxMOiNoe-pM-ysrsH5HCghtlUIbi"
            />
          </div>
          <p className="text-slate-400 mb-6 text-body-md leading-relaxed">
            Kiến tạo tương lai của ngôi nhà thông minh với những giải pháp công nghệ hàng đầu thế giới.
          </p>
          <div className="flex gap-4">
            <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-slate-300" href="#">
              <span className="material-symbols-outlined text-sm">public</span>
            </a>
            <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-slate-300" href="#">
              <span className="material-symbols-outlined text-sm">share</span>
            </a>
            <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-slate-300" href="#">
              <span className="material-symbols-outlined text-sm">mail</span>
            </a>
          </div>
        </div>
        <div>
          <h4 className="font-bold text-title-lg mb-6 text-white">Sản Phẩm</h4>
          <ul className="space-y-3">
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Tivi &amp; Video</a></li>
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Thiết Bị Bếp</a></li>
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Nhà Thông Minh</a></li>
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Gaming Gear</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-title-lg mb-6 text-white">Hỗ Trợ</h4>
          <ul className="space-y-3">
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Trung Tâm Bảo Hành</a></li>
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Chính Sách Đổi Trả</a></li>
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Theo Dõi Đơn Hàng</a></li>
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Câu Hỏi Thường Gặp</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-title-lg mb-6 text-white">Công Ty</h4>
          <ul className="space-y-3">
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Về Volitify</a></li>
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Cơ Hội Nghề Nghiệp</a></li>
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Tin Tức &amp; Sự Kiện</a></li>
            <li><a className="text-slate-400 hover:text-white transition-all text-body-md" href="#">Liên Hệ</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-container-max mx-auto px-margin-desktop mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-slate-500 text-body-md">
          © {new Date().getFullYear()} Volitify Enterprise. Built for the future of home automation.
        </p>
        <div className="flex gap-8">
          <a className="text-label-md text-slate-400 hover:text-white hover:underline" href="#">Điều Khoản Dịch Vụ</a>
          <a className="text-label-md text-slate-400 hover:text-white hover:underline" href="#">Chính Sách Bảo Mật</a>
          <a className="text-label-md text-slate-400 hover:text-white hover:underline" href="#">Store Finder</a>
        </div>
      </div>
    </footer>
  );
}
