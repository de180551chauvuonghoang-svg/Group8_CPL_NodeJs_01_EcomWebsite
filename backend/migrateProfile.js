import { pool, connectDB } from './src/config/db.js';

async function migrate() {
  try {
    await connectDB();
    if (!pool) {
      console.log('Đang chờ kết nối CSDL...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 1. Thêm cột bio vào bảng Users nếu chưa có
    console.log('Đang kiểm tra bảng Users...');
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('Users') AND name = 'bio'
      )
      BEGIN
        ALTER TABLE Users ADD bio NVARCHAR(MAX) NULL;
        PRINT 'Đã thêm cột bio vào bảng Users.';
      END
      ELSE
      BEGIN
        PRINT 'Cột bio đã tồn tại.';
      END
    `);

    // 2. Tạo bảng UserAddresses
    console.log('Đang kiểm tra bảng UserAddresses...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserAddresses')
      BEGIN
        CREATE TABLE UserAddresses (
          id              VARCHAR(50)    NOT NULL PRIMARY KEY,
          user_id         VARCHAR(50)    NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
          recipient_name  NVARCHAR(100)  NOT NULL,
          phone_number    VARCHAR(20)    NOT NULL,
          street_address  NVARCHAR(500)  NOT NULL,
          city            NVARCHAR(100)  NOT NULL,
          is_default      BIT            NOT NULL DEFAULT 0,
          created_at      DATETIME2      NOT NULL DEFAULT GETDATE()
        );
        CREATE INDEX IX_UserAddresses_user_id ON UserAddresses(user_id);
        PRINT 'Đã tạo bảng UserAddresses.';
      END
      ELSE
      BEGIN
        PRINT 'Bảng UserAddresses đã tồn tại.';
      END
    `);

    console.log('✅ Chạy Migration Profile thành công!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi Migration:', err);
    process.exit(1);
  }
}

migrate();
