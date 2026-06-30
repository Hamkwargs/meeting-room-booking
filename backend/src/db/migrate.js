require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigrations() {
    const migrationsDir = path.join(__dirname, '..', '..', 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    console.log(`Found ${files.length} migration file(s)`);

    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`Running migration: ${file}`);
        try {
            await pool.query(sql);
            console.log(`  -> OK`);
        } catch (err) {
            console.error(`  -> FAILED: ${err.message}`);
            process.exit(1);
        }
    }

    console.log('All migrations completed.');
    await pool.end();
}

runMigrations();