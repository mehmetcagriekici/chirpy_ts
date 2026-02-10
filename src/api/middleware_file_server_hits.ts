import { type Middleware } from "./middleware.js";
import { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

export const middlewareMetricsInc: Middleware = function(req: Request, res: Response, next: NextFunction) {
  config.api.fileserverHits++;
  next();
}
