// At the top of your server.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { err, express, grouped, route, type DonauRoute } from "../..";
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
  secretKey: string;
  expiresIn?: ExpiresInTimes | number;
  onSignUp?: (username: string, passwordHash: string) => Promise<void> | void;
  getPasswordHash: (username: string) => Promise<string | null | undefined>;
  getUser: (username: string) => Promise<User | null | undefined>;
};

export class JWTAuth<User> extends DonauAuth<User> {
  constructor(private p: JWTAuthParams<User>) {
    super();
  }

  // Signup route
  private async signupWorker(body: any) {
    if (!body.username || !body.password) {
      return err.badRequest("username and password required");
    }

    const hash = await this.hashPassword(body.password);

    // Store user
    await this.p.onSignUp?.(body.username, hash);
    return { message: "user created" };
  }

  private async loginWorker(body: any) {
    if (!body.username || !body.password) {
      return err.badRequest("username and password required");
    }
    const storedHash = await this.p.getPasswordHash(body.username);

    if (!storedHash || !(await bcrypt.compare(body.password, storedHash))) {
      return err.notAuthorized("invalid username or password");
    }

    // Generate token
    const token = jwt.sign({ username: body.username }, this.p.secretKey, {
      expiresIn: this.p.expiresIn || "1h",
    });

    return {
      message: "login successful",
      token,
    };
  }

  override get routes(): DonauRoute[] {
    const routes = [
      // Login route
      route("/login", {
        description: "log in as user",
        method: "post",
        reqBody: basicAuthBodyDef,
        worker: this.loginWorker.bind(this),
      }),

      // Signup route
      this.p.onSignUp &&
        route("/signup", {
          description: "sign up a new user",
          method: "post",
          reqBody: basicAuthBodyDef,
          worker: this.signupWorker.bind(this),
        }),
    ].filter((v) => !!v);

    return grouped(routes, {
      tags: ["auth"],
      prefix: "/auth",
    });
  }

  /**
   * Hashes and salts a password using bcrypt
   * @param password The password to hash
   * @returns A promise that resolves to the hashed password
   */
  public hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 8);
  }

  override async middleware(
    req: express.Request,
    res: express.Response,
    next: (user: User) => void
  ) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).send("auth token required");
      return;
    }

    jwt.verify(token, this.p.secretKey, async (err: any, user: any) => {
      if (err) {
        res.status(403).send("invalid or expired auth token");
        return;
      }

      const richUser = await this.p.getUser(user.username);
      if (!richUser) {
        res.status(403).send("user not found");
        return;
      }

      next(richUser);
    });
  }
}
