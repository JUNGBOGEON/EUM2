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

    const isRds = env.DB_HOST && env.DB_HOST.includes('rds.amazonaws.com');
    console.log('Connecting to:', env.DB_HOST);

    const dataSource = new DataSource({
        type: 'postgres',
        host: env.DB_HOST || 'localhost',
        port: parseInt(env.DB_PORT) || 5432,
        username: env.DB_USERNAME,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
        synchronize: false,
        logging: false,
        ssl: isRds ? { rejectUnauthorized: false } : false,
    });

    try {
        await dataSource.initialize();

        // 1. Simple check
        console.log('Test 1: Simple Select');
        try {
            await dataSource.query('SELECT thumbnail, banner FROM workspaces LIMIT 1');
            console.log('Test 1 Passed');
        } catch (e) {
            console.error('Test 1 Failed:', e.message);
        }

        // 2. Aliased check (The failing one)
        console.log('Test 2: Aliased Select');
        try {
            const query = `
        SELECT "Workspace"."thumbnail" 
        FROM "workspaces" "Workspace" 
        LIMIT 1
      `;
            await dataSource.query(query);
            console.log('Test 2 Passed');
        } catch (e) {
            console.error('Test 2 Failed:', e.message);
        }

    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        if (dataSource.isInitialized) await dataSource.destroy();
    }
}

run();
