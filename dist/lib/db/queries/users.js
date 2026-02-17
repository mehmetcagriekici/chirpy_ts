import { db } from "../index.js";
import { users } from "../schema.js";
import { eq } from "drizzle-orm";
export async function createUser(email, hashedPassword) {
    const [result] = await db
        .insert(users)
        .values({ email: email, hashedPassword: hashedPassword })
        .onConflictDoNothing()
        .returning();
    return result;
}
export async function updateUser(newEmail, newPassword, userId) {
    const [res] = await db.update(users).set({ email: newEmail, hashedPassword: newPassword }).where(eq(users.id, userId)).returning();
    return res;
}
export async function upgradeUserRed(userId) {
    const [res] = await db.update(users).set({ isChirpyRed: true }).where(eq(users.id, userId));
    return res;
}
export async function getUserById(id) {
    const [res] = await db.select().from(users).where(eq(users.id, id));
    return res;
}
export async function getUser(email) {
    const [res] = await db.select()
        .from(users)
        .where(eq(users.email, email));
    return res;
}
export async function deleteUsers() {
    await db.delete(users);
}
