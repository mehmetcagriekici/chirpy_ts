import express from "express";
import { middlewareLogResponses } from "./api/middleware_log_responses.js";
import { middlewareMetricsInc } from "./api/middleware_file_server_hits.js";
import { config } from "./config.js";
import { createUser, deleteUsers } from "./lib/db/queries/users.js";
import { createChirp, getChirps } from "./lib/db/queries/chirps.js";
const app = express();
const PORT = 8080;
app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.use(middlewareLogResponses);
// app.use(express.json());
app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerLogMetrics);
app.get("/api/chirps", handlerGetChirps);
app.post("/admin/reset", handlerResetMetrics);
// app.post("/api/validate_chirp", (req: Request, res: Response) => {
//  res.end();
// });
// app.post("/api/validate_chirp", handlerValidateChirp);
app.post("/api/users", handlerCreateUser);
app.post("/api/chirps", handlerCreateChirp);
app.use(errorHandler);
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
class ChirpIsTooLongError extends Error {
    constructor(message) {
        super(message);
    }
}
class PlatfromForbiddenError extends Error {
    constructor(message) {
        super(message);
    }
}
function errorHandler(err, req, res, next) {
    console.log(err.message);
    if (err instanceof ChirpIsTooLongError) {
        res.status(400).json({
            error: err.message,
        });
    }
    else if (err instanceof PlatfromForbiddenError) {
        res.status(403).json({
            error: err.message,
        });
    }
    else {
        res.status(500).json({
            error: "Something went wrong on our end",
        });
    }
}
async function handlerGetChirps(req, res, next) {
    try {
        const chirps = await getChirps();
        res.status(200).send(JSON.stringify(chirps));
    }
    catch (err) {
        next(err);
    }
}
async function handlerCreateChirp(req, res, next) {
    try {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", async () => {
            const parsed = JSON.parse(body);
            if (!("body" in parsed) || !("userId" in parsed)) {
                throw new Error("Invalid JSON. Request requires body and userID");
            }
            if (parsed.body.length > 140) {
                throw new ChirpIsTooLongError("Chirp is too long. Max length is 140");
            }
            const profane = { kerfuffle: "****", sharbert: "****", fornax: "****" };
            const arr = parsed.body.split(" ");
            const cleanedBody = arr.reduce((acc, word) => word.toLowerCase() in profane ? `${acc} ****` : `${acc} ${word}`, "").trim();
            const chirp = await createChirp(cleanedBody, parsed.userId);
            res.status(201).send(JSON.stringify(chirp));
        });
    }
    catch (err) {
        next(err);
    }
}
async function handlerCreateUser(req, res, next) {
    try {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", async () => {
            const parsed = JSON.parse(body);
            if (!("email" in parsed)) {
                throw new Error("Invalid request. Request must own an email field.");
            }
            const createdUser = await createUser(parsed.email);
            res.status(201).send(JSON.stringify(createdUser));
        });
    }
    catch (err) {
        next(err);
    }
}
/*
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
*/
function handlerReadiness(req, res) {
    res.set({
        "Content-Type": "text/plain; charset=utf-8"
    });
    res.send("OK");
}
function handlerLogMetrics(req, res) {
    res.set({
        "Content-Type": "text/html; charset=utf-8"
    });
    res.send(`
<html>
<body>
<h1>Welcome, Chirpy Admin</h1>
<p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
</body>
</html>
`);
}
async function handlerResetMetrics(req, res) {
    config.api.fileserverHits = 0;
    await deleteUsers();
    res.set({
        "Content-Type": "text/plain; charset=utf-8"
    });
    res.send(`Hits: ${config.api.fileserverHits}`);
}
