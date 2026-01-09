import { DataSource } from 'typeorm';
import { parseEnv } from './utils/env-parser';

async function run() {
    const env = parseEnv();

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

        // Check tables and schemas
        const columns = await dataSource.query(`
      SELECT table_schema, table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name = 'workspaces'
      ORDER BY table_schema, column_name;
    `);

        console.log('Found columns:', JSON.stringify(columns, null, 2));

    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    } finally {
        if (dataSource.isInitialized) await dataSource.destroy();
    }
}

run();
