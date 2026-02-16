import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import { Request } from "express";

const { randomBytes } = await import("node:crypto");

import { UnauthorizedError } from "./index.js";

export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
  return await argon2.verify(hash, password);
}

type Payload = Pick<jwt.JwtPayload, "iss" | "sub" | "iat" | "exp">;

export function makeJWT(userID: string, expiresIn: number, secret: string): string {
  const payload: Payload = {
    iss: "chirpy",
    sub: userID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };

  const token = jwt.sign(payload, secret);
  return token;
}

export function validateJWT(tokenString: string, secret: string): string {
  try {
    const decoded = jwt.verify(tokenString, secret) as Payload;
    return decoded.sub || "";
  } catch (err) {
    throw new UnauthorizedError("jwt malformed");
  }
}

export function getBearerToken(req: Request): string {
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
