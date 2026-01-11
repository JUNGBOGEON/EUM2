import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  // 1. Read .env manually
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (e) {
    console.error('Could not read .env file', e);
    process.exit(1);
  }

  const env: any = {};
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      env[key] = value;
    }
  });

  const isRds = env.DB_HOST && env.DB_HOST.includes('rds.amazonaws.com');
  console.log('Connecting to:', env.DB_HOST, 'SSL:', isRds);

  // 2. Create DataSource without entities and synchronize: false
  const dataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT) || 5432,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    synchronize: false,
    logging: true,
    ssl: isRds ? { rejectUnauthorized: false } : false, // Add SSL logic
  });

  try {
    await dataSource.initialize();
    console.log('Connected to DB successfully.');

    // 3. Run queries
    console.log('Adding thumbnail column...');
    await dataSource.query(
      'ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS thumbnail text',
    );

    console.log('Adding banner column...');
    await dataSource.query(
      'ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS banner text',
    );

    console.log('Schema patch completed.');
  } catch (e) {
    console.error('Error during schema patch:', e);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

run();
