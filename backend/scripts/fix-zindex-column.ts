import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || process.env.DB_NAME,
    ssl: process.env.DB_HOST?.includes('rds.amazonaws.com')
      ? { rejectUnauthorized: false }
      : false,
  });

  await dataSource.initialize();
  console.log('Database connected');

  try {
    // Check current column type
    const result = await dataSource.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'whiteboard_item' AND column_name = 'zIndex'
    `);
    console.log('Current column type:', result);

    if (result.length > 0 && result[0].data_type === 'integer') {
      console.log('Altering zIndex column from integer to bigint...');
      await dataSource.query(`
        ALTER TABLE whiteboard_item
        ALTER COLUMN "zIndex" TYPE bigint USING "zIndex"::bigint
      `);
      console.log('Column altered successfully!');
    } else if (result.length > 0 && result[0].data_type === 'bigint') {
      console.log('Column is already bigint. No change needed.');
    } else {
      console.log('Column not found or unexpected type:', result);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

main();
