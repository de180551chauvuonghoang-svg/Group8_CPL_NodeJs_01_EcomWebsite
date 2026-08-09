import 'dotenv/config';
import { sql, connectDB, pool } from './src/config/db.js';

const migrateNotifications = async () => {
  try {
    console.log("Connecting to Database...");
    await connectDB();

    console.log("Creating Notifications table if not exists...");
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Notifications')
      BEGIN
        CREATE TABLE Notifications (
          id           VARCHAR(50)    NOT NULL PRIMARY KEY,
          user_id      VARCHAR(50)    NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
          title        NVARCHAR(255)  NOT NULL,
          message      NVARCHAR(MAX)  NOT NULL,
          type         VARCHAR(50)    NOT NULL DEFAULT 'system',
          related_id   VARCHAR(50)    NULL,
          is_read      BIT            NOT NULL DEFAULT 0,
          created_at   DATETIME2      NOT NULL DEFAULT GETDATE()
        );
        CREATE INDEX IX_Notifications_user_id ON Notifications(user_id);
        CREATE INDEX IX_Notifications_created_at ON Notifications(created_at);
        PRINT '[✓] Table Notifications created';
      END
      ELSE
      BEGIN
        PRINT '[ok] Table Notifications already exists';
      END
    `);

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateNotifications();
