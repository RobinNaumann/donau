import fs from "fs";
import path from "path";
import {
  chalk,
  err,
  express,
  grouped,
  logger,
  route,
  routeAuthed,
  type DonauRoute,
} from "..";
import { type ServerCall } from "./shared";

/**
 * define the server side handlers for the servercalls
 * @param def pass your global definitions
 * @param handlers define handlers as functions that are called when the client uses the client API. Note, that the `user` attribute is only defined for server calls that have auth set to true
 * @returns
 */
export function handleServerCalls<
  T extends { [key: string]: ServerCall<any, any> }
>(
  def: T,
  handlers: {
    [K in keyof T]: (args: T[K]["args"], user: any) => Promise<T[K]["return"]>;
  }
): DonauRoute[] {
  const routes = Object.keys(def).map((key) => {
    const fnDef = def[key];

    const authed = fnDef.auth ?? false;

    if (authed) {
      return routeAuthed(fnDef.path || `/${key}`, {
        description: `Handles the ${key} server call`,
        method: "post",
        reqBody: {
          description: `Arguments for ${key}. Not documented as they may change`,
          properties: {},
        },
        workerAuthed: async (user, body) => {
          try {
            const args = body as T[typeof key]["args"] & { user: typeof user };
            const result = await handlers[key](args, user);
            return result;
          } catch (e) {
            return err.internalError(e);
          }
        },
      });
    }

    return route(fnDef.path || `/${key}`, {
      description: `Handles the ${key} server call`,
      method: "post",
      reqBody: {
        description: `Arguments for ${key}. Not documented as they may change`,
        properties: {},
      },
      worker: async (body) => {
        const args = body as T[typeof key]["args"];
        const result = await handlers[key](args, null);
        return result;
      },
    });
  });

  return grouped(routes, { tags: ["server-calls"], prefix: "/calls" });
}

/**
 * a middleware that serves a SPA frontend (such as a react app) via donau at "/".
 * @param clientPath the path to the client build folder. This should be the folder that contains the `index.html` file.
 * Provide an absolute path or a relative path from the current working directory.
 * @return a function that can be used to add the middleware to an express app or
 * pass it as a `preService` to the donauServerRun function
 */
export function serveFrontend(
  clientPath: string
): (app: express.Express) => void {
  return (app: express.Express) => {
    const _clientPath = path.isAbsolute(clientPath)
      ? path.normalize(clientPath)
      : path.join(process.cwd(), clientPath);
    // adapted from: https://leejjon.medium.com/33705be3ceda
    // This code makes sure that any request that does not matches a static file
    // in the build folder, will just serve index.html. Client side routing is
    // going to make sure that the correct content will be loaded.
    app.use((req, res, next) => {
      const filePath = path.join(_clientPath, req.path);

      if (
        req.path === "/api" ||
        req.path === "/docs" ||
        req.path.startsWith("/api/") ||
        req.path.startsWith("/docs/") ||
        _fileExists(filePath)
        // /(.ico|.js|.css|.jpg|.png|.map)$/i.test(req.path)
      ) {
        return next();
      }
      res.header(
        "Cache-Control",
        "private, must-revalidate, no-cache, no-store"
      );
      res.header("Expires", "-1");
      res.header("Pragma", "no-cache");
      res.sendFile(path.join(_clientPath, "index.html"));
    });
    app.use(express.static(_clientPath));

    app.use("/app", express.static(_clientPath));

    logger.success(`serving ${chalk.bold("frontend")} at: /`);
  };
}

function _fileExists(filePath: string): boolean {
  try {
    var stats = fs.statSync(filePath);
    return stats.isFile();
  } catch (err) {
    return false;
  }
}
