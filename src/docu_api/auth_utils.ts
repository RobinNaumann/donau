import express from "express";
import jwt from "jsonwebtoken";
import { err, sendError } from "../util/error";

export const bearerAuth = {
  type: "http",
  scheme: "bearer",
};

export function authMiddlewareToken<U>(
  worker: (token: string, req: express.Request) => Promise<U>
) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(" ")[1] || req.cookies?.token;

      if (!token) throw new Error("an authorization token is required");

      (req as any).user = await worker(token, req);
      next();
    } catch (error) {
      sendError(res, err.notAuthorized());
    }
  };
}

export function authMiddlewareJWT<U>(
  secret: string,
  guard?: (user: U) => Promise<void>
) {
  return authMiddlewareToken(async (token) => {
    let user = jwt.verify(token, secret) as U;
    if (guard) await guard(user);
    return user;
  });
}
