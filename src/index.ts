import express from "express";
import { Request, Response, NextFunction } from "express";
import { middlewareLogResponses } from "./api/middleware_log_responses.js";
import { middlewareMetricsInc } from "./api/middleware_file_server_hits.js";

import { config } from "./config.js";

import { createUser, deleteUsers, getUser, getUserById, updateUser, upgradeUserRed } from "./lib/db/queries/users.js";
import { createChirp, getChirps, getChirp, deleteChirp, getChirpsByUserId, getChirpsDesc } from "./lib/db/queries/chirps.js";
import { createRefreshToken, updateRefreshToken, getRefreshToken } from "./lib/db/queries/refresh_tokens.js";
import { type NewUser } from "./lib/db/schema.js";

import { hashPassword, checkPasswordHash, makeJWT, validateJWT, getBearerToken, makeRefreshToken, getAPIKey } from "./auth.js";

interface LoginUser extends Omit<NewUser, "hashedPassword"> {
  token: string;
  refreshToken: string;
}

const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.use(middlewareLogResponses);
// app.use(express.json());

app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerLogMetrics);
app.get("/api/chirps", handlerGetChirps);
app.get("/api/chirps/:chirpId", handlerGetChirp)

app.post("/admin/reset", handlerResetMetrics);
// app.post("/api/validate_chirp", (req: Request, res: Response) => {
//  res.end();
// });
// app.post("/api/validate_chirp", handlerValidateChirp);
app.post("/api/users", handlerCreateUser);
app.post("/api/chirps", handlerCreateChirp);
app.post("/api/login", handlerUserLogin)
app.post("/api/refresh", handlerApiRefresh);
app.post("/api/revoke", handlerApiRevoke);
app.post("/api/polka/webhooks", handlerUserUpgradeRed);

app.put("/api/users", handlerUpdateUser);

app.delete("/api/chirps/:chirpId", handlerChirpDelete);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

class ChirpIsTooLongError extends Error {
  constructor(message: string) {
    super(message);
  }
}

class PlatfromForbiddenError extends Error {
  constructor(message: string) {
    super(message);
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedError extends Error {
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
    });
  } else if (err instanceof PlatfromForbiddenError) {
    res.status(403).json({
      error: err.message,
    });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({
      error: err.message,
    });
  }  else if (err instanceof UnauthorizedError ) {
    res.status(401).json({
      error: err.message,
    });
  } else {
    res.status(500).json({
      error: "Something went wrong on our end",
    });
  }
}

const expiresInSeconds = 1 * 60 * 60;
const refreshTokenExpiresInSeconds = 60 * 24 * 60 *60;

async function handlerUserUpgradeRed(req: Request, res: Response, next: NextFunction) {
  const apiKey = getAPIKey(req);
  if (!apiKey || apiKey != config.api.polkaKey) {
    throw new UnauthorizedError("Invalid API key.")
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const parsed = JSON.parse(body);
      if (!("event" in parsed) || !("data" in parsed) || !("userId" in parsed.data)) {
	throw new Error("user upgrade red handler requires event and data with userId.");
      }

      if (parsed.event !== "user.upgraded") {
	res.status(204).send();
	return
      }

      const user = await getUserById(parsed.data.userId);
      if (!user) {
	throw new NotFoundError("user not found");
      }

      await upgradeUserRed(user.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });
}

async function handlerChirpDelete(req: Request, res: Response, next: NextFunction) {
  try {
    const tokenString = getBearerToken(req);
    if (!tokenString) {
      throw new UnauthorizedError("Missing Token String");
    }

    const userId = validateJWT(tokenString, config.api.secret);
    if (!userId) {
      throw new PlatfromForbiddenError("Invalid token.");
    }

    const chirpId = req.params.chirpId as string;
    if (!chirpId) {
      throw new NotFoundError("delete chrip handler request requires a chirp id parameter");
    }

    const deletedChirp = await getChirp(chirpId);
    if (!deletedChirp) {
      throw new NotFoundError("Chirp does not exist.");
    }

    if (deletedChirp.userId != userId) {
      throw new PlatfromForbiddenError("Unauthorized access");
    }

    await deleteChirp(chirpId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function handlerUpdateUser(req: Request, res: Response, next: NextFunction) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

  req.on("end", async () => {
    try {
      const parsed = JSON.parse(body);
      if (!("email" in parsed) || !("password" in parsed)) {
	throw new Error("update user handler requires an email and a password.");
      }

      const tokenString = getBearerToken(req);
      if (!tokenString) {
	throw new UnauthorizedError("Missing Token String");
      }
  
      const userId = validateJWT(tokenString, config.api.secret);
      if (!userId) {
	throw new UnauthorizedError("Invalid token.");
      }

      const hashedPassword = await hashPassword(parsed.password);
      const updatedUser = await updateUser(parsed.email, hashedPassword, userId);
      res.status(200).send(JSON.stringify(updatedUser));
    } catch (err) {
      next(err);
    }
  });
}

async function handlerApiRevoke(req: Request, res: Response, next: NextFunction) {
  try {
    const tokenHeader = req.get("Authorization");
    if (!tokenHeader) {
      throw new UnauthorizedError("Missing refresh header.");
    }

    const tokenString = tokenHeader.split(" ")[1];
    const token = await getRefreshToken(tokenString);
    if (!token) {
      throw new UnauthorizedError("Malformed refresh token.");
    }
    
    await updateRefreshToken(token.token, Date.now());
    res.status(204).send();
  } catch(err) {
    next(err);
  }

}

async function handlerApiRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const tokenHeader = req.get("Authorization");
    if (!tokenHeader) {
      throw new UnauthorizedError("Missing refresh header.");
    }

    const tokenString = tokenHeader.split(" ")[1];
    const token = await getRefreshToken(tokenString);
    if (!token) {
      throw new UnauthorizedError("Malformed refresh token.");
    }

    if (token.revokedAt) {
      throw new UnauthorizedError("Expired Token");
    }

    const user = await getUserById(token.userId);
    if (!user) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    const accToken = makeJWT(user.id, expiresInSeconds, config.api.secret);
    res.status(200).send(JSON.stringify({token: accToken}));
    
  } catch(err) {
    next(err);
  }
}

async function handlerGetChirp(req: Request, res: Response, next: NextFunction) {
  try {
    const chirpId = req.params.chirpId as string;
    if (!chirpId) {
      throw new Error("get chrip handler request requires a chirp id parameter");
    }

    const chirp = await getChirp(chirpId);
    if (!chirp) {
      throw new NotFoundError("chirp is not found");
    }

    res.status(200).send(JSON.stringify(chirp));
  } catch(err) {
    next(err);
  } 
}

async function handlerGetChirps(req: Request, res: Response, next: NextFunction) {
  try {
    let authorId = "";
    const authorIdQuery = req.query.authorId;
    if (typeof authorIdQuery === "string") {
      authorId = authorIdQuery;
    }

    let chirps = await getChirps();
    if (req.query.sort && req.query.sort === "desc") {
      chirps = await getChirpsDesc();
    }
    if (authorId) {
      chirps = await getChirpsByUserId(authorId);
    }
    res.status(200).send(JSON.stringify(chirps));
  } catch(err) {
    next(err);
  }
}

async function handlerCreateChirp(req: Request, res: Response, next: NextFunction) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk
    });

  req.on("end", async () => {
    try {
      const parsed = JSON.parse(body);
      if (!("body" in parsed)) {
	throw new Error("Invalid JSON. Request requires body and user id");
      }

      const tokenString = getBearerToken(req);
      if (!tokenString) {
	throw new UnauthorizedError("Missing Token String");
      }
  
      const userId = validateJWT(tokenString, config.api.secret);
      if (!userId) {
	throw new UnauthorizedError("Invalid token.");
      }
      if (parsed.body.length > 140) {
 	 throw new ChirpIsTooLongError("Chirp is too long. Max length is 140");
      }

      const profane = {kerfuffle: "****", sharbert: "****", fornax: "****"};
      const arr = parsed.body.split(" ") as string[];
      
      const cleanedBody = arr.reduce((acc, word) => word.toLowerCase() in profane ? `${acc} ****` : `${acc} ${word}`, "").trim();

      const chirp = await createChirp(cleanedBody, userId);
      res.status(201).send(JSON.stringify(chirp));
    } catch(err) {
      next(err);
    }
  });
}

async function handlerUserLogin(req: Request, res: Response, next: NextFunction) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

  req.on("end", async () => {
    try {
      const parsed = JSON.parse(body);
      if (!("email" in parsed) || !("password" in parsed)) {
	throw new Error("login handler requires an email and a password.");
      }

      const reqUser = await getUser(parsed.email);
      if (!reqUser) {
	throw new NotFoundError("User does not exist.");
      }

      const passwordCheck = await checkPasswordHash(parsed.password, reqUser.hashedPassword);
      if (!passwordCheck) {
	throw new UnauthorizedError("Invalid or wrong password.");
      }

      const refreshToken = makeRefreshToken();
      await createRefreshToken(refreshToken, reqUser.id, Date.now() + refreshTokenExpiresInSeconds);

      const loginUser: LoginUser = {
	id: reqUser.id,
	createdAt: reqUser.createdAt,
	updatedAt: reqUser.updatedAt,
	email: reqUser.email,
	token: makeJWT(reqUser.id, expiresInSeconds, config.api.secret),
	refreshToken: refreshToken,
	isChirpyRed: reqUser.isChirpyRed
      };
      res.status(200).send(JSON.stringify(loginUser));
    } catch (err) {
      next(err);
    }
    });
}

async function handlerCreateUser(req: Request, res: Response, next: NextFunction) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
      const parsed = JSON.parse(body);
      if (!("email" in parsed) || !("password" in parsed)) {
	throw new Error("Invalid request. Request must own an email and a password field.");
      }

      const hashedPassword = await hashPassword(parsed.password);
      const createdUser = await createUser(parsed.email, hashedPassword);
	res.status(201).send(JSON.stringify(createdUser));
      } catch (err) {
	next(err);
      }
    });
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
<p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
</body>
</html>
`);
}

async function handlerResetMetrics(req: Request, res: Response) {
  config.api.fileserverHits = 0;
  await deleteUsers();

  res.set({
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.send(`Hits: ${config.api.fileserverHits}`); 
}
