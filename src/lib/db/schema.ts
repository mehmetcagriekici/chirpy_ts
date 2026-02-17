import { pgTable, timestamp, varchar, uuid, text, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  email: varchar("email", { length: 256 }).unique().notNull(),
  hashedPassword: varchar("hashed_password").notNull().default("unset"),
  isChirpyRed: boolean("is_chirpy_red").notNull().default(false),
});

export type NewUser = typeof users.$inferInsert;

export const chirps = pgTable("chirps", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  body: text().notNull(),
  userId: uuid("user_id").references(() => users.id, {onDelete: "cascade"}).notNull(),
});

export type NewChirp = typeof chirps.$inferInsert;

export const refreshTokens = pgTable("refresh_tables", {
  token: text("token").primaryKey().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  userId: uuid("user_id").references(() => users.id, {onDelete: "cascade"}).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});

export type NewRefresToken = typeof refreshTokens.$inferInsert;
