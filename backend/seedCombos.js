import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, connectDB } from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  try {
    await connectDB();
    
    // Kiểm tra xem bảng đã có dữ liệu chưa
    const result = await pool.request().query('SELECT COUNT(*) AS cnt FROM ProductCombos');
    if (result.recordset[0].cnt > 0) {
      console.log('Bảng ProductCombos đã có dữ liệu. Tiến hành xoá dữ liệu cũ...');
      await pool.request().query('DELETE FROM ProductCombos');
    }

    // Đọc file SQL
    const sqlPath = path.join(__dirname, 'src', 'config', 'seed_ai_combos.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Mssql npm package không hỗ trợ chạy hàng loạt lệnh có chữ PRINT ở cuối một cách hoàn hảo nếu không tách lô.
    // Xoá chữ PRINT ở cuối để tránh lỗi nếu có
    const queries = sqlContent.split('PRINT')[0];

    console.log('Đang chạy lệnh INSERT dữ liệu mới...');
    await pool.request().query(queries);
    
    console.log('[✓] Đã chèn dữ liệu Combo thành công vào Database!');
    process.exit(0);
  } catch (error) {
    console.error('[!] Lỗi khi chèn dữ liệu:', error);
    process.exit(1);
  }
}

runSeed();
