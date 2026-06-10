import { pool, connectDB } from './src/config/db.js';

async function migrate() {
  try {
    await connectDB();
    
    // 1. Thêm cột image_url
    console.log('Thêm cột image_url...');
    try {
      await pool.request().query(`ALTER TABLE ProductCombos ADD image_url NVARCHAR(MAX)`);
      console.log('[✓] Đã thêm cột image_url thành công.');
    } catch (err) {
      console.log('[!] Cột image_url có thể đã tồn tại:', err.message);
    }

    // 2. Cập nhật dữ liệu cho các dòng đã có
    console.log('Cập nhật dữ liệu ảnh cho các Combo...');
    
    const updates = [
      { id: 1, url: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=2042&auto=format&fit=crop' },
      { id: 2, url: 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?q=80&w=1965&auto=format&fit=crop' },
      { id: 3, url: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?q=80&w=2000&auto=format&fit=crop' },
      { id: 4, url: 'https://images.unsplash.com/photo-1603481546238-487240415920?q=80&w=2070&auto=format&fit=crop' },
      { id: 5, url: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=1964&auto=format&fit=crop' },
      { id: 6, url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=2070&auto=format&fit=crop' },
      { id: 7, url: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?q=80&w=2070&auto=format&fit=crop' },
      { id: 8, url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop' },
      { id: 9, url: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=2070&auto=format&fit=crop' },
      { id: 10, url: 'https://images.unsplash.com/photo-1550505095-81378a675080?q=80&w=2070&auto=format&fit=crop' }
    ];

    for (const item of updates) {
      await pool.request()
        .input('url', item.url)
        .input('id', item.id)
        .query(`UPDATE ProductCombos SET image_url = @url WHERE combo_id = @id`);
    }

    console.log('[✓] Cập nhật thành công toàn bộ ảnh!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi migration:', error);
    process.exit(1);
  }
}

migrate();
