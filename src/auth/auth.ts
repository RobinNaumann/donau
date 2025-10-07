// At the top of your server.js
import express from "express";
import type { DonauRoute } from "../models/m_api";

const _bearerAuth = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
  },
};

/**
 * a base class for providing authentication for the donau API.
 * @description This class should be extended to provide authentication for the donau API.
 *
 * ready to use implementations are:
 * - `JWTAuth` for JWT authentication
 * - `BasicAuth` for basic authentication
 */
export abstract class DonauAuth<User> {
  constructor() {}

  /**
   * @description This method should be implemented to return the authentication type
   * as defined in the OpenAPI 3.0 specification.
   * @see https://swagger.io/specification/#security-scheme-object-examples
   * if not overriden, the default is `bearerAuth`.
   */
  public get schemes(): { [key: string]: any } {
    return _bearerAuth;
  }

  /**
   * @description This method should be implemented to return the routes for the authentication.
   * they will be added to the api routes.
   */
  public abstract get routes(): DonauRoute<any, any>[];

  /**
   * Middleware to protect routes
   * @description This method should be implemented to return the middleware for the authentication.
   * it will be added to the api logic.
   */
  public abstract middleware(
    req: express.Request,
    res: express.Response,
    next: (user: User) => void
  ): void | Promise<void>;
}
