import { db } from "../index.js";
import { chirps } from "../schema.js";
import { asc, eq, desc } from "drizzle-orm";

export async function createChirp(body: string, userId: string) {
  const [res] = await db.insert(chirps)
    .values({body: body, userId: userId})
    .returning();

  return res;
}

export async function getChirps() {
  return await db.select().from(chirps).orderBy(asc(chirps.createdAt));
}

export async function getChirpsDesc() {
  return await db.select().from(chirps).orderBy(desc(chirps.createdAt));
}

export async function getChirp(chirpId: string) {
  const [res] = await db.select().from(chirps).where(eq(chirps.id, chirpId));
  return res;
}

export async function getChirpsByUserId(userId: string) {
  return await db.select().from(chirps).where(eq(chirps.userId, userId))
}

export async function deleteChirp(chirpId: string) {
  await db.delete(chirps).where(eq(chirps.id, chirpId));
}
