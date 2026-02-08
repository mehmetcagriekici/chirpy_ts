import express from "express";
import { middlewareLogResponses } from "./middleware_log_responses.js";
import { middlewareMetricsInc } from "./middleware_file_server_hits.js";
import { apiConfig } from "./config.js";
const app = express();
const PORT = 8080;
app.get("/app", middlewareMetricsInc);
app.get("/api", middlewareMetricsInc);
app.use("/app", express.static("./src/app"));
app.use(middlewareLogResponses);
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
app.get("/api/healthz", handlerReadiness);
app.get("/api/metrics", handlerLogMetrics);
app.get("/api/reset", handlerResetMetrics);
function handlerReadiness(req, res) {
    res.set({
        "Content-Type": "text/plain; charset=utf-8"
    });
    res.send("OK");
}
function handlerLogMetrics(req, res) {
    res.set({
        "Content-Type": "text/plain; charset=utf-8"
    });
    res.send(`Hits: ${apiConfig.fileserverHits}`);
}
function handlerResetMetrics(req, res) {
    apiConfig.fileserverHits = 0;
    res.set({
        "Content-Type": "text/plain; charset=utf-8"
    });
    res.send(`Hits: ${apiConfig.fileserverHits}`);
}
