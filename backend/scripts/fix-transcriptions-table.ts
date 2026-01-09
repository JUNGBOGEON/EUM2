import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixTranscriptionsTable() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    console.log('Database connected');

    // transcriptions 테이블 비우기
    await dataSource.query('TRUNCATE TABLE transcriptions CASCADE;');
    console.log('Transcriptions table truncated');

    // 필요하다면 테이블 자체를 드롭
    // await dataSource.query('DROP TABLE IF EXISTS transcriptions CASCADE;');
    // console.log('Transcriptions table dropped');

    console.log('Done! Now restart the backend.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

fixTranscriptionsTable();
