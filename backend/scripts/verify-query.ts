import { DataSource } from 'typeorm';
import { parseEnv } from './utils/env-parser';

async function run() {
    const env = parseEnv();
    console.log('Connecting to:', env.DB_HOST);

    const dataSource = new DataSource({
        type: 'postgres',
        host: env.DB_HOST,
        port: parseInt(env.DB_PORT),
        username: env.DB_USERNAME,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
        synchronize: false,
        logging: false,
        ssl: env.isRds ? { rejectUnauthorized: false } : false,
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

        // 2. Aliased check
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
        process.exit(1);
    } finally {
        if (dataSource.isInitialized) await dataSource.destroy();
    }
}

run();
