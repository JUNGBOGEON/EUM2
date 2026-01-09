import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env: any = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });

    const host = env.DB_HOST || 'localhost';
    console.log('Target DB Host:', host);

    const dataSource = new DataSource({
        type: 'postgres',
        host: host,
        port: parseInt(env.DB_PORT) || 5432,
        username: env.DB_USERNAME,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
        synchronize: false,
        logging: false,
        ssl: host.includes('rds') ? { rejectUnauthorized: false } : false,
    });

    try {
        await dataSource.initialize();
        console.log('Connected.');

        // Add columns FORCEFULLY
        console.log('Adding thumbnail...');
        try {
            await dataSource.query('ALTER TABLE workspaces ADD COLUMN "thumbnail" text');
            console.log('thumbnail added.');
        } catch (e) {
            console.log('thumbnail add error (maybe exists?):', e.message);
        }

        console.log('Adding banner...');
        try {
            await dataSource.query('ALTER TABLE workspaces ADD COLUMN "banner" text');
            console.log('banner added.');
        } catch (e) {
            console.log('banner add error (maybe exists?):', e.message);
        }

        // Verify immediately
        const columns = await dataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'workspaces' AND column_name IN ('thumbnail', 'banner');
    `);

        console.log('Verification found:', columns);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        if (dataSource.isInitialized) await dataSource.destroy();
    }
}

run();
