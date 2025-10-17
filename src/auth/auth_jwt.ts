// At the top of your server.js
import bcrypt from "bcryptjs";
import type * as express from "express";
import jwt from "jsonwebtoken";
import type { DonauRoute } from "../models/m_api";
import { err, sendError } from "../util/error";
import { grouped, route } from "../util/route";
import { DonauAuth } from "./auth";
import { basicAuthBodyDef } from "./auth_basic";

type ExpiresInTimes =
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "6h"
  | "12h"
  | "24h"
  | "7d"
  | "30d"
  | "1y";

export type JWTAuthParams<User> = {
  debugMode?: boolean;
  secretKey: string;
  expiresIn?: ExpiresInTimes | number;
  allowSignup?: boolean;
  onUserCreate: (
    username: string,
    passwordHash: string
  ) => Promise<void> | void;
  getPasswordHash: (username: string) => Promise<string | null | undefined>;
  getUser: (username: string) => Promise<User | null | undefined>;
  userHasRole?: (user: User, roles: string[]) => boolean;
};

export class JWTAuth<User> extends DonauAuth<User> {
  constructor(private p: JWTAuthParams<User>) {
    super();
  }

  public async createUser(username: string, password: string): Promise<void> {
    const hash = await this.hashPassword(password);
    await this.p.onUserCreate(username, hash);
  }

  private async loginWorker(body: any, res: express.Response): Promise<void> {
    if (!body.username || !body.password) {
      throw err.notAuthorized("username and password required");
    }
    const storedHash = await this.p.getPasswordHash(body.username);

    if (!storedHash || !(await bcrypt.compare(body.password, storedHash))) {
      throw err.notAuthorized("invalid username or password");
    }

    // Generate token
    const token = jwt.sign({ username: body.username }, this.p.secretKey, {
      expiresIn: this.p.expiresIn || "1h",
    });

    // Return a function to set cookie in Express response
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: !(this.p.debugMode ?? false),
      sameSite: this.p.debugMode ?? false ? "lax" : "strict",
      maxAge: 1000 * 60 * 60, // 1 hour
    });
  }

  override get routes(): DonauRoute<any, any>[] {
    const routes: DonauRoute<any, any>[] = [
      // Login route
      route("/login", {
        description: "log in as user",
        method: "post",
        parameters: { body: basicAuthBodyDef },
        handler: async (req, res) => {
          // if already authenticated, return the user
          try {
            const user = await this._userFromReq(req);
            if (user) {
              if (!user) throw err.notAuthorized("invalid token");
              res.status(200).send({ user: user });
              return;
            }

            // if not authenticated, try to log in
            await this.loginWorker(req.body, res);

            res
              .status(200)
              .send({ user: await this.p.getUser(req.body.username) });
          } catch (error) {
            sendError(res, error);
          }
        },
      }),

      // Logout route
      route("/logout", {
        description: "log out the current user",
        method: "get",
        handler: async (req, res) => {
          res.clearCookie("auth_token");
          res.status(200).send({ message: "logged out" });
        },
      }),

      // Signup route
      this.p.allowSignup &&
        route("/signup", {
          description: "sign up a new user",
          method: "post",
          parameters: { body: basicAuthBodyDef },
          worker: async (body: any) => {
            if (!body.username || !body.password)
              return err.badRequest("username and password required");

            await this.createUser(body.username, body.password);
            return { message: "user created" };
          },
        }),
    ].filter((v) => !!v);

    return grouped(routes, {
      tags: ["auth"],
      prefix: "/auth",
    });
  }

  userHasRole(user: User, roles: string[]): boolean {
    if (this.p.userHasRole) {
      return this.p.userHasRole(user, roles);
    }
    return super.userHasRole(user, roles);
  }

  /**
   * Hashes and salts a password using bcrypt
   * @param password The password to hash
   * @returns A promise that resolves to the hashed password
   */
  public hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 8);
  }

  override async authGuard(req: express.Request): Promise<User> {
    const user = await this._userFromReq(req);
    if (!user) throw err.notAuthorized("invalid token");
    return user;
  }

  private _userFromReq(req: express.Request): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const token = req.cookies?.auth_token;

      if (!token) return resolve(null);

      jwt.verify(token, this.p.secretKey, async (err: any, user: any) => {
        if (err || !user?.username) return resolve(null);

        const richUser = await this.p.getUser(user.username);
        if (!richUser) return resolve(null);

        return resolve(richUser ?? null);
      });
    });
  }
}
