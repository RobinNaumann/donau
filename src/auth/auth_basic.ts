// At the top of your server.js
import bcrypt from "bcryptjs";
import type * as express from "express";
import type { DonauRoute } from "../models/m_api";
import { err } from "../util/error";
import { parameter } from "../util/param";
import { grouped, route } from "../util/route";
import { DonauAuth } from "./auth";

export const basicAuthBodyDef = parameter.body({
  type: {} as { username: string; password: string },
  description: "user credentials",
  properties: {
    username: { type: "string", required: true },
    password: { type: "string", required: true },
  },
});

export type BasicAuthParams<User> = {
  onSignUp?: (username: string, passwordHash: string) => Promise<void> | void;
  getPasswordHash: (username: string) => Promise<string | null | undefined>;
  getUser: (username: string) => Promise<User | null | undefined>;
};

export class BasicAuth<User> extends DonauAuth<User> {
  constructor(private p: BasicAuthParams<User>) {
    super();
  }

  // Authentication scheme
  public get schemes(): any {
    return {
      basicAuth: {
        type: "http",
        scheme: "basic",
        description: "Basic authentication using username and password",
      },
    };
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

  override get routes(): DonauRoute<any, any>[] {
    const routes = [
      // Signup route
      this.p.onSignUp &&
        route("/signup", {
          description: "sign up a new user",
          method: "post",
          parameters: { body: basicAuthBodyDef },
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
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Basic ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const base64Credentials = authorization.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString(
      "ascii"
    );
    const [username, password] = credentials.split(":");

    if (!username || !password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const passwordHash = await this.p.getPasswordHash(username);

    if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const user = await this.p.getUser(username);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    next(user);
  }
}
