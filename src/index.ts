import express from "express";
import { Request, Response, NextFunction } from "express";

import { middlewareLogResponses } from "./api/middleware_log_responses.js";
import { middlewareMetricsInc } from "./api/middleware_file_server_hits.js";

import { apiConfig } from "./config.js";

const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.use(middlewareLogResponses);
// app.use(express.json());

app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerLogMetrics);

app.post("/admin/reset", handlerResetMetrics);
// app.post("/api/validate_chirp", (req: Request, res: Response) => {
//  res.end();
// });
app.post("/api/validate_chirp", handlerValidateChirp);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

class ChirpIsTooLongError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log(err.message);
  if (err instanceof ChirpIsTooLongError) {
    res.status(400).json({
      error: err.message,
    })
  }
  else {
    res.status(500).json({
      error: "Something went wrong on our end",
    });
  }
}

function handlerValidateChirp(req: Request, res: Response, next: NextFunction) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk
  });

  req.on("end", () => {
    try {
      const parsed = JSON.parse(body);
      if (!("body" in parsed)) {
	throw new Error("Invalid JSON");
        // res.status(400).send(JSON.stringify({error: "Invalid JSON"}));
        // return;
      }

      if (typeof parsed.body != "string") {
	throw new Error("Invalid response body");
        // res.status(400).send(JSON.stringify({error: "Invalid response body"}));
        // return
      }

      if (parsed.body.length > 140) {
	throw new ChirpIsTooLongError("Chirp is too long. Max length is 140");
        // res.status(400).send(JSON.stringify({error: "Chirp is too long"}));
        // return;
      }

      const profane = {kerfuffle: "****", sharbert: "****", fornax: "****"};
      const arr = parsed.body.split(" ") as string[];
      const cleanedBody = arr.reduce((acc, word) => word.toLowerCase() in profane ? `${acc} ****` : `${acc} ${word}`, "").trim();

      res.status(200).send(JSON.stringify({cleanedBody}));
    } catch(err) {
      next(err);
    }
  });
}


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
