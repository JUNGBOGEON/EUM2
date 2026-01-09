import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf-8');
    } catch (e) {
        console.error('Could not read .env file', e);
        process.exit(1);
    }

    const env: any = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            env[key] = value;
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
        console.log('Connected to DB.');

        // 1. Count all workspaces
        const count = await dataSource.query('SELECT COUNT(*) FROM workspaces');
        console.log('Total workspaces in DB:', count[0].count);

        // 2. Select first 5 workspaces
        const workspaces = await dataSource.query('SELECT * FROM workspaces LIMIT 5');
        console.log('First 5 workspaces:', workspaces);

        // 3. User ID from previous logs check
        const userId = "7b51676c-9859-4b76-8c84-c12d89054b68";
        const userWorkspaces = await dataSource.query('SELECT * FROM workspaces WHERE "ownerId" = $1', [userId]);
        console.log(`Workspaces for user ${userId}:`, userWorkspaces.length);

    } catch (e) {
        console.error('Error querying DB:', e);
    } finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}

run();
