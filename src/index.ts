import express from "express";
import { Request, Response } from "express";

import { middlewareLogResponses } from "./api/middleware_log_responses.js";
import { middlewareMetricsInc } from "./api/middleware_file_server_hits.js";

import { apiConfig } from "./config.js";

const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.use(middlewareLogResponses);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerLogMetrics);
app.get("/admin/reset", handlerResetMetrics);

function handlerReadiness(req: Request, res: Response) {
  res.set({
    "Content-Type": "text/plain; charset=utf-8"
  });
  
  res.send("OK");
}

function handlerLogMetrics(req: Request, res: Response) {
  res.set({
    "Content-Type": "text/html; charset=utf-8"
  });

  res.send(`
<html>
<body>
<h1>Welcome, Chirpy Admin</h1>
<p>Chirpy has been visited ${apiConfig.fileserverHits} times!</p>
</body>
</html>
`);
}

function handlerResetMetrics(req: Request, res: Response) {
  apiConfig.fileserverHits = 0;

  res.set({
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.send(`Hits: ${apiConfig.fileserverHits}`); 
}
