import { DataSource } from 'typeorm';
import { parseEnv } from './utils/env-parser';
import * as readline from 'readline';

function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
    }));
}

async function run() {
    const env = parseEnv();

    if (env.isRds) {
        console.warn('WARNING: You are about to run this on a remote RDS instance.');
    }

    const answer = await askQuestion(`Are you sure you want to TRUNCATE the 'transcriptions' table on ${env.DB_HOST}? All data will be lost. (yes/no): `);

    if (answer.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        process.exit(0);
    }

    const dataSource = new DataSource({
        type: 'postgres',
        host: env.DB_HOST,
        port: parseInt(env.DB_PORT),
        username: env.DB_USERNAME,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
        synchronize: false,
        logging: true,
        ssl: env.isRds ? { rejectUnauthorized: false } : false,
    });

    try {
        await dataSource.initialize();
        console.log('Connected to DB successfully.');

        // 3. Clear transcriptions table (incompatible data)
        console.log('Deleting incompatible data from transcriptions table...');
        await dataSource.query('TRUNCATE TABLE transcriptions CASCADE');

        console.log('Data cleared. Migration should work now.');
    } catch (e) {
        console.error('Error during data fix:', e);
        process.exit(1);
    } finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}

run();
