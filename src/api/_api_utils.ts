import chalk from "chalk";
import {
  defaultConfig,
  express,
  logger,
  type DonauApiConfig,
  type DonauRoute,
  type ParamsType,
} from "../../server";

// THIS FILE CONTAINS HELPER FUNCTIONS FOR THE DONAU API
// IT IS NOT PART OF THE PUBLIC API AND SHOULD NOT BE USED DIRECTLY

export function _mergeDefaults<U, Params extends ParamsType>(
  config: DonauApiConfig<U, Params>
): DonauApiConfig<U, Params> {
  const nonNullConfig = Object.fromEntries(
    Object.entries(config).filter(([_, v]) => v != null)
  );
  return { ...defaultConfig, ...nonNullConfig };
}

/**
 * throw an exception if the API contains authed routes and does not define "auth"
 * @param config the donau API configuration
 */
export function _authDefinedGuard(config: DonauApiConfig<any, any>) {
  if (
    config.routes.some(
      (r) => r.handlerAuthed != null || r.workerAuthed != null
    ) &&
    !config.auth
  ) {
    throw Error(
      "you defined authed routes but did not provide an auth middleware via the donau API config"
    );
  }
}

/**
 * convert path parameters fro {name} to :name
 * @param path the entire path string
 * @returns the transformed string
 */
export function _convertPath(path: string) {
  return path.replace(/{(.*?)}/g, ":$1");
}

/**
 * a default handler for the API that returns a 200 OK response
 */
export function _noHandler(req: express.Request, res: express.Response) {
  res.send("No handler");
}

/**
 * if the config does not contain a server, add a local server with the given port
 * @param config the donau API configuration
 * @param port the port to use for the local server
 * @returns a new donau API configuration
 */
export function _maybeLocalConfig<U, Params extends ParamsType>(
  config: DonauApiConfig<U, Params>,
  port?: number
): DonauApiConfig<U, Params> {
  if (!config.servers && port) {
    config.servers = [
      {
        url: `http://localhost:${port}${
          config.apiPath ?? defaultConfig.apiPath
        }`,
        description: "local",
      },
    ];
  }
  return config;
}

/**
 * returns true if the route is authed
 */
export function _isAuthed(route: DonauRoute<any, any>): boolean {
  return route.handlerAuthed != null || route.workerAuthed != null;
}

export function _printStartupMsg(config: DonauApiConfig<any, any>) {
  const i = config.info;
  let indent = " ".repeat(12);
  let apiMsg = `├─ api at:   ${chalk.bold(config.apiPath)}`;
  let docMsg = `└─ docs at:  ${chalk.bold(config.docsPath)}`;

  logger.success(
    `serving ${chalk.bold(i.title)} v${chalk.bold(i.version)}` +
      `\n${indent}${apiMsg}` +
      (config.docsPath === null ? "" : `\n${indent}${docMsg}`)
  );
}

export function uniqueAlphaNum(
  existing: string[],
  length: number,
  prefix = ""
): string {
  let newId;
  do {
    newId = randomAlphaNum(length, prefix);
  } while (existing.includes(newId));
  return newId;
}

export function randomAlphaNum(length: number, prefix = ""): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
