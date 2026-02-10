import { db } from "../index.js";
import { users } from "../schema.js";
export async function createUser(email) {
    const [result] = await db
        .insert(users)
        .values({ email: email })
        .onConflictDoNothing()
        .returning();
    return result;
}
export async function deleteUsers() {
    await db.delete(users);
}
