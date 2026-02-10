import { loadEnvFile, env } from 'node:process';
loadEnvFile();
const migrationConfig = {
    migrationsFolder: "./lib/db/migrations",
};
const apiConfig = {
    fileserverHits: 0,
    platform: getEnv("PLATFORM")
};
const dbConfig = {
    dbURL: getEnv("DB_URL"),
    migrationConfig: migrationConfig
};
export const config = {
    db: dbConfig,
    api: apiConfig
};
function getEnv(key) {
    const val = env[key];
    if (!val) {
        return "";
    }
    return val;
}
