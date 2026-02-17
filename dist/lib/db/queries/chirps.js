import { db } from "../index.js";
import { chirps } from "../schema.js";
import { asc, eq, desc } from "drizzle-orm";
export async function createChirp(body, userId) {
    const [res] = await db.insert(chirps)
        .values({ body: body, userId: userId })
        .returning();
    return res;
}
export async function getChirps() {
    return await db.select().from(chirps).orderBy(asc(chirps.createdAt));
}
export async function getChirpsDesc() {
    return await db.select().from(chirps).orderBy(desc(chirps.createdAt));
}
export async function getChirp(chirpId) {
    const [res] = await db.select().from(chirps).where(eq(chirps.id, chirpId));
    return res;
}
export async function getChirpsByUserId(userId) {
    return await db.select().from(chirps).where(eq(chirps.userId, userId));
}
export async function deleteChirp(chirpId) {
    await db.delete(chirps).where(eq(chirps.id, chirpId));
}
