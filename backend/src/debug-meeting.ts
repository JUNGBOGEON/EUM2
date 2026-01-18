import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function debugMeeting() {
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
    console.log('Connected to DB successfully.\n');

    // 1. 최근 회의 세션 조회
    console.log('=== 최근 종료된 회의 세션 (최근 5개) ===');
    const sessions = await dataSource.query(`
      SELECT
        id,
        title,
        status,
        "summaryStatus",
        "startedAt",
        "endedAt",
        "workspaceId"
      FROM meeting_sessions
      WHERE status = 'ended'
      ORDER BY "endedAt" DESC NULLS LAST
      LIMIT 5
    `);
    console.table(sessions);

    if (sessions.length > 0) {
      const latestSessionId = sessions[0].id;
      console.log(`\n=== 최신 세션 (${latestSessionId}) 트랜스크립션 수 ===`);

      // 2. 해당 세션의 트랜스크립션 수
      const transcriptCount = await dataSource.query(`
        SELECT COUNT(*) as count
        FROM transcriptions
        WHERE "sessionId" = $1
      `, [latestSessionId]);
      console.log('트랜스크립션 개수:', transcriptCount[0].count);

      // 3. 해당 세션의 참가자 수
      const participantCount = await dataSource.query(`
        SELECT COUNT(*) as count
        FROM session_participants
        WHERE "sessionId" = $1
      `, [latestSessionId]);
      console.log('참가자 수:', participantCount[0].count);

      // 4. 트랜스크립션 샘플 (있는 경우)
      if (parseInt(transcriptCount[0].count) > 0) {
        console.log('\n=== 트랜스크립션 샘플 (최대 3개) ===');
        const transcripts = await dataSource.query(`
          SELECT
            id,
            "resultId",
            "originalText",
            "speakerId",
            "startTimeMs",
            "isPartial"
          FROM transcriptions
          WHERE "sessionId" = $1
          ORDER BY "startTimeMs" ASC
          LIMIT 3
        `, [latestSessionId]);
        console.table(transcripts);
      } else {
        console.log('\n⚠️ 이 세션에 트랜스크립션이 없습니다!');
        console.log('가능한 원인:');
        console.log('  1. AWS Chime Transcription이 활성화되지 않음');
        console.log('  2. 회의 중 아무도 말하지 않음');
        console.log('  3. 마이크가 음소거 상태였음');
        console.log('  4. Redis 버퍼 플러시 실패');
      }

      // 5. 워크스페이스 파일 (요약) 확인
      console.log('\n=== 워크스페이스 파일 (요약) 확인 ===');
      const files = await dataSource.query(`
        SELECT
          id,
          filename,
          "fileType",
          "sessionId",
          "createdAt"
        FROM workspace_files
        WHERE "sessionId" = $1
      `, [latestSessionId]);

      if (files.length > 0) {
        console.table(files);
      } else {
        console.log('이 세션과 연결된 파일이 없습니다.');
      }
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

debugMeeting();
