import fs from 'fs';
import path from 'path';
import { connectDB, pool } from './src/config/db.js';

const runSeed = async () => {
    try {
        console.log("Connecting to database...");
        await connectDB(); // this will also run initDb, which is fine
        
        console.log("Reading seed_ai_combos.sql...");
        const seedPath = path.join(process.cwd(), 'src', 'config', 'seed_ai_combos.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        
        console.log("Executing seed query...");
        await pool.request().query(seedSql);
        
        console.log("✅ Seed completed successfully!");
        process.exit(0);
    } catch(err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
}

runSeed();
