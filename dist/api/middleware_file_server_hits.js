import { config } from "../config.js";
export const middlewareMetricsInc = function (req, res, next) {
    config.api.fileserverHits++;
    next();
};
