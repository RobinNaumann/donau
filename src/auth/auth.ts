// At the top of your server.js
import express from "express";
import type { DonauRoute } from "../models/m_api";
import { err } from "../util/error";

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
  public abstract authGuard(req: express.Request): Promise<User>;

  /**
   * check if the user has one of the required roles.
   * @param user the user object as returned by the `getUser` function
   * @param roles an array of roles that are required to access the resource
   * @returns true if the user has one of the required roles, false otherwise
   */
  userHasRole(user: User, roles: string[]): boolean {
    console.error(
      "userHasRole not implemented. Please override it to use roleGuard. Otherwise it will always throw forbidden."
    );
    return false;
  }

  /**
   * if you want to restrict access to certain roles, you can implement the `userHasRole` method.
   * You can then use this `roleGuard` method in your route handlers to check if the user has one of the required roles.
   * This will return void if the user has one of the required roles, otherwise it will throw an error.
   */
  roleGuard(user: User, roles: string[]): void {
    try {
      if (this.userHasRole(user, roles)) return;
      throw "forbidden";
    } catch (e) {
      throw err.forbidden(e);
    }
  }
}
