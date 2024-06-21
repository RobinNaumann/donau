import chalk from "chalk";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { donauDocuCss } from "../donau.css";
import { err, sendError } from "../util/error";
import { logger } from "../util/log";
import {
  defaultConfig,
  type ApiRequestBody,
  type DonauApiConfig,
  type DonauRoute,
} from "./m_docu";

var _baseOptions = {
  customCss: donauDocuCss,
  customSiteTitle: "moewe API docs",
  customfavIcon: "/assets/favicon.ico",
};

function _toSwaggerBody(body: ApiRequestBody) {
  const props: any = {};
  for (const k in body.properties) {
    props[k] = { type: body.properties[k] };
  }

  const examples: any = {};
  for (const k in body.examples) {
    examples[k] = {
      value: body.examples[k],
    };
  }

  return {
    description: body.description,
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: body.required ?? Object.keys(body.properties),
          properties: props,
        },
        examples: examples,
      },
    },
  };
}

/**
 * convert path parameters fro {name} to :name
 * @param path the entire path string
 * @returns the transformed string
 */
function _convertPath(path: string) {
  return path.replace(/{(.*?)}/g, ":$1");
}

const _noHandler = (req: express.Request, res: express.Response) => {
  res.send("No handler");
};

const _cookieExtractMiddleware = (
  req: express.Request,
  _: any,
  next: express.NextFunction
) => {
  (req as any).socketInfo = {
    remoteAddress: req.socket.remoteAddress,
    remotePort: req.socket.remotePort,
  };
  next();
};

function _guardAuthDefined(config: DonauApiConfig<any>) {
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

function _mergeDefaults<U>(config: DonauApiConfig<U>): DonauApiConfig<U> {
  const nonNullConfig = Object.fromEntries(
    Object.entries(config).filter(([_, v]) => v != null)
  );
  return { ...defaultConfig, ...nonNullConfig };
}

function _createDocuRoute<U>(def: DonauRoute<U>, authed: boolean): any {
  return {
    [def.method ?? "get"]: {
      ...def,
      parameters:
        def.parameters?.map((p) => ({ ...p, in: p.in ?? "query" })) ?? [],
      requestBody: def.reqBody ? _toSwaggerBody(def.reqBody) : undefined,
      responses: def.responses ?? { "200": { description: "OK" } },
      security: authed ? [{ bearerAuth: [] }] : undefined,
      worker: undefined,
      workerAuthed: undefined,
      handler: undefined,
      handlerAuthed: undefined,
    },
  };
}

function _setupSwaggerUi(
  e: express.Express,
  config: DonauApiConfig<any>,
  docuRoutes: any
) {
  e.use(
    config.docsPath!,
    swaggerUi.serve,
    swaggerUi.setup(
      {
        openapi: "3.0.0",
        info: config.info,
        servers: config.servers,
        components: {
          securitySchemes: config.securitySchemes,
        },
        paths: docuRoutes,
      },
      {
        ..._baseOptions,
        customSiteTitle: config.info.title + " | donau API docs",
      }
    )
  );
}

function _docuApi<U>(e: express.Express, config: DonauApiConfig<U>) {
  const docuRoutes: any = {};

  config = _mergeDefaults(config);

  // throw exception if the API contains authed routes and does not define "auth"
  _guardAuthDefined(config);

  const _api = express.Router({ mergeParams: true });

  e.use(config.apiPath!, _api);

  _api.use(_cookieExtractMiddleware);
  _api.use(cookieParser());
  _api.use(express.json());

  if (config.cors) _api.use(cors(config.cors));

  for (const a of config.routes) {
    const authed = a.handlerAuthed != null || a.workerAuthed != null;
    const d = _createDocuRoute(a, authed);
    const _w = _makeWorker(a, authed);
    const _p = _convertPath(a.path);

    // merge the docu route with the existing ones
    // (e.g. if there are multiple routes with the same path but different methods)
    docuRoutes[a.path] = { ...docuRoutes[a.path], ...d };

    authed
      ? _api[a.method ?? "get"](_p, config.auth!, _w)
      : _api[a.method ?? "get"](_p, _w);
  }

  _setupSwaggerUi(e, config, docuRoutes);

  const i = config.info;
  logger.success(
    `serving ${chalk.bold(i.title)} v${chalk.bold(i.version)}
             ├─ api at:   ${chalk.bold(config.apiPath)}
             └─ docs at:  ${chalk.bold(config.docsPath)}`
  );
}

function _makeWorker<U>(def: DonauRoute<U>, auth: boolean) {
  return (req: express.Request, res: express.Response) => {
    try {
      const ps: any[] = [];
      if (def.reqBody) ps.push(req.body);

      for (const p of def.parameters ?? []) {
        if (p.in === "path") ps.push(req.params[p.name]);
        if (p.in === "query") ps.push(req.query[p.name]);
      }

      if (auth) {
        const user = (req as any).user;
        if (!user) throw err.notAuthorized("no user found in request");
        if (def.workerAuthed) {
          const r = def.workerAuthed?.(user, ...ps);
          r instanceof Object ? res.json(r) : res.send(r);
          return;
        }
        def.handlerAuthed?.(user, req, res) ?? _noHandler(req, res);
        return;
      }

      if (def.worker) {
        const r = def.worker?.(...ps);
        r instanceof Object ? res.json(r) : res.send(r);
        return;
      }
      def.handler?.(req, res) ?? _noHandler(req, res);
    } catch (e) {
      sendError(res, e);
    }
  };
}

/**
 * create a donau API on an existing express app. This function will add the donau API to the app.
 * @param config the donau API configuration
 * @param port the port to show in the documentation if `servers` is omitted
 * @returns void
 */
export function donauApi<U>(
  config: DonauApiConfig<U>,
  port?: number
): (e: express.Express) => void {
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
  return (e: express.Express) => _docuApi(e, config);
}
