import { db } from "../index.js";
import { chirps } from "../schema.js";
import { asc } from "drizzle-orm";
export async function createChirp(body, userId) {
    const [res] = await db.insert(chirps)
        .values({ body: body, userId: userId })
        .returning();
    return res;
}
export async function getChirps() {
    return await db.select().from(chirps).orderBy(asc(chirps.createdAt));
}
