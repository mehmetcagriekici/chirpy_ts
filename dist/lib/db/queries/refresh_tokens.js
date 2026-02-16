import { db } from "../index.js";
import { refreshTokens } from "../schema.js";
import { eq } from "drizzle-orm";
export async function createRefreshToken(token, userId, expiresAt) {
    const [res] = await db.insert(refreshTokens).values({ token: token, userId: userId, expiresAt: new Date(expiresAt) }).returning();
    return res;
}
export async function getRefreshToken(token) {
    const [res] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));
    return res;
}
export async function updateRefreshToken(token, revokedAt) {
    const [res] = await db.update(refreshTokens).set({ revokedAt: new Date(revokedAt) }).where(eq(refreshTokens.token, token)).returning();
    return res;
}
