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
        console.log('Connected to DB.');

        // 1. Count all workspaces
        const count = await dataSource.query('SELECT COUNT(*) FROM workspaces');
        console.log('Total workspaces in DB:', count[0].count);

        // 2. Select first 5 workspaces
        const workspaces = await dataSource.query('SELECT * FROM workspaces LIMIT 5');
        console.log('First 5 workspaces:', workspaces);

        // 3. User ID Check (Optional via args)
        const userId = process.argv[2];
        if (userId) {
            const userWorkspaces = await dataSource.query('SELECT * FROM workspaces WHERE "ownerId" = $1', [userId]);
            console.log(`Workspaces for user ${userId}:`, userWorkspaces.length);
        } else {
            console.log('No user ID provided. Usage: npx ts-node scripts/check-workspaces.ts <USER_ID>');
        }

    } catch (e) {
        console.error('Error querying DB:', e);
        process.exit(1);
    } finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}

run();
