import { type Middleware } from "./middleware.js";
import { Request, Response, NextFunction } from "express";

export const middlewareLogResponses: Middleware = function(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (res.statusCode != 200) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    }
  });

  next();
}
