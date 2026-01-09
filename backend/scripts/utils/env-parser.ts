import * as fs from 'fs';
import * as path from 'path';

export interface DbEnv {
    DB_HOST: string;
    DB_PORT: string;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_DATABASE: string;
    isRds: boolean;
}

export function parseEnv(): DbEnv {
    const envPath = path.join(__dirname, '..', '..', '.env');
    let envContent = '';

    try {
        envContent = fs.readFileSync(envPath, 'utf-8');
    } catch (e) {
        console.error(`Could not read .env file at ${envPath}. Make sure you are running this from the project root or scripts directory.`);
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

    // Validate required fields
    const requiredFields = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
    const missingFields = requiredFields.filter(field => !env[field]);

    if (missingFields.length > 0) {
        console.error(`Missing required environment variables in .env: ${missingFields.join(', ')}`);
        process.exit(1);
    }

    return {
        DB_HOST: env.DB_HOST,
        DB_PORT: env.DB_PORT,
        DB_USERNAME: env.DB_USERNAME,
        DB_PASSWORD: env.DB_PASSWORD,
        DB_DATABASE: env.DB_DATABASE,
        isRds: env.DB_HOST.includes('rds.amazonaws.com')
    };
}
