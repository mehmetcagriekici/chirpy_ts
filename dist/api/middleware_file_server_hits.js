import { apiConfig } from "../config.js";
export const middlewareMetricsInc = function (req, res, next) {
    apiConfig.fileserverHits++;
    next();
};
