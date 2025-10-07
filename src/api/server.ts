import chalk from "chalk";
import express from "express";
import { type DonauApiConfig } from "../models/m_api";
import { logger } from "../util/log";
import { donauApi } from "./api";

/**
 * run the donau server on a given port. This function will create an express app, add the donau API and run the server.
 * if you want to add additional services to the server, you can pass them as an array of functions.
 * @param port the port to run the server on
 * @param config the donau API configuration
 * @param preServices an array of functions that add additional services to the server. these will be called before the donau API is added.
 * @param postServices an array of functions that add additional services to the server. these will be called after the donau API is added.
 * @returns the express app that is running the server
 */
export function donauServerRun(
  port: number,
  config: DonauApiConfig<any, any>,
  preServices?: (((e: express.Express) => void) | null | undefined)[],
  postServices?: (((e: express.Express) => void) | null | undefined)[]
): { app: express.Express; server: any } | null {
  try {
    const app = express();
    for (const s of preServices ?? []) s && s(app);

    const api = donauApi(config, port);
    api(app);

    for (const s of postServices ?? []) s && s(app);

    const server = app.listen(port);
    logger.success(`donau API server running on port ${chalk.bold(port)}`);
    return { app, server };
  } catch (err) {
    logger.fatal("DONAU_SERVER: " + err);
    return null;
  }
}
