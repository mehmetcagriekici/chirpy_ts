import { loadEnvFile, env } from 'node:process';
import type { MigrationConfig } from "drizzle-orm/migrator";

loadEnvFile();

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./lib/db/migrations",
};


type APIConfig = {
  fileserverHits: number;
  platform: string;
  secret: string;
};

type DBConfig = {
  dbURL: string;
  migrationConfig: MigrationConfig;
}

type Config = {
  api: APIConfig;
  db: DBConfig;
}

const apiConfig: APIConfig = {
  fileserverHits: 0,
  platform: getEnv("PLATFORM"),
  secret: getEnv("AUTH_SECRET")
}

const dbConfig: DBConfig = {
  dbURL: getEnv("DB_URL"),
  migrationConfig: migrationConfig
}

export const config: Config = {
  db: dbConfig,
  api: apiConfig
}

function getEnv(key: string): string {
  const val = env[key];
  if (!val) {
    return "";
  }

  return val;
}
