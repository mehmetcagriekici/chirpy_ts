import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
const { randomBytes } = await import("node:crypto");
import { UnauthorizedError } from "./index.js";
export async function hashPassword(password) {
    return await argon2.hash(password);
}
export async function checkPasswordHash(password, hash) {
    return await argon2.verify(hash, password);
}
export function makeJWT(userID, expiresIn, secret) {
    const payload = {
        iss: "chirpy",
        sub: userID,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + expiresIn,
    };
    const token = jwt.sign(payload, secret);
    return token;
}
export function validateJWT(tokenString, secret) {
    try {
        const decoded = jwt.verify(tokenString, secret);
        return decoded.sub || "";
    }
    catch (err) {
        throw new UnauthorizedError("jwt malformed");
    }
}
export function getBearerToken(req) {
    const token = req.get("Authorization");
    if (!token) {
        return "";
    }
    return token.split(" ")[1] || "";
}
export function makeRefreshToken() {
    const buf = randomBytes(256);
    return buf.toString("hex");
}
