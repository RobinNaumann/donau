import cookieParser from "cookie-parser";
import cors from "cors";
import {
  err,
  express,
  ParameterTypes,
  sendError,
  type ApiParameter,
  type DonauApiConfig,
  type DonauRoute,
  type ParamsType,
} from "../../server";
import { _useDocs } from "../docs/_docs";
import {
  _authDefinedGuard,
  _convertPath,
  _isAuthed,
  _maybeLocalConfig,
  _mergeDefaults,
  _noHandler,
  _printStartupMsg,
} from "./_api_utils";
import { _authMiddleware, _remoteExtractMiddleware } from "./_middlewares";

/**
 * create a donau API on an existing express app. This function will add the donau API to the app.
 * @param config the donau API configuration
 * @param port the port to show in the documentation if `servers` is omitted
 * @returns void
 */
export function donauApi<U, Params extends ParamsType>(
  config: DonauApiConfig<U, Params>,
  port?: number
): (e: express.Express) => void {
  return (e: express.Express) => _donauApi(e, _maybeLocalConfig(config, port));
}

function _donauApi<U, Params extends ParamsType>(
  e: express.Express,
  config: DonauApiConfig<U, Params>
): void {
  config = _mergeDefaults(config);
  _authDefinedGuard(config);
  // add the auth routes if defined
  config.routes = [...(config.routes ?? []), ...(config.auth?.routes ?? [])];

  const _api = express.Router({ mergeParams: true });
  e.use(config.apiPath!, _api);

  // add middlewares
  [
    _remoteExtractMiddleware(),
    cookieParser(),
    express.json(),
    cors(config.cors ?? undefined),
  ].forEach((m) => m && _api.use(m));

  for (const a of config.routes) {
    const authed = _isAuthed(a);
    const _w = _makeWorker(a, authed);
    const _p = _convertPath(a.path);

    authed
      ? _api[a.method ?? "get"](_p, _authMiddleware(config.auth!), _w)
      : _api[a.method ?? "get"](_p, _w);
  }

  if (config.docsPath !== null) _useDocs(e, config);
  _printStartupMsg(config);
}

function _makeWorker<U, Params extends ParamsType>(
  def: DonauRoute<U, Params>,
  auth: boolean
) {
  return async (req: express.Request, res: express.Response) => {
    try {
      if (auth) {
        const user = (req as any).user;
        if (!user) throw err.notAuthorized("no user found in request");

        // if a handler is defined, use it
        if (def.handlerAuthed) {
          await def.handlerAuthed?.(user, req, res);
          return;
        }

        if (def.workerAuthed) {
          const r = await def.workerAuthed?.(user, _getParams(req, def));
          r instanceof Object ? res.json(r) : res.send(r);
          return;
        }
        _noHandler(req, res);
        return;
      }

      // if a handler is defined, use it
      if (def.handler) {
        await def.handler(req, res);
        return;
      }

      if (def.worker) {
        const r = await def.worker?.(_getParams(req, def));
        r instanceof Object ? res.json(r) : res.send(r);
        return;
      }
      _noHandler(req, res);
    } catch (e) {
      sendError(res, e);
    }
  };
}

function _getParams<Params extends ParamsType>(
  req: express.Request,
  def: DonauRoute<any, Params>
): { [key in keyof Params]: Params[key]["type"] } {
  const params: any = {};
  //if (def.reqBody) params.push(req.body);

  for (const [k, v] of Object.entries(def.parameters ?? {})) {
    let val = undefined;
    if (v.in === "path") {
      val = req.params[k];
    } else if (v.in === "header") {
      val = req.headers[k.toLowerCase()];
    } else if (v.in === "body") {
      val = req.body;
    } else {
      // default to query
      val = req.query[k];
    }

    try {
      params[k] = _makeParser(v)(val as any);
    } catch (e) {
      throw err.badRequest(
        `Error parsing parameter ${k}: ${(e as Error).message}`
      );
    }
  }

  return params;
}

function _makeParser<T>(
  p: ApiParameter<T, any>
): (v: string | null | undefined) => T {
  if (p.parser) return p.parser;

  let type: any = p.type;
  if (
    type !== ParameterTypes.string &&
    type !== ParameterTypes.number &&
    type !== ParameterTypes.boolean &&
    type !== ParameterTypes.object
  ) {
    // default types based on `in` if no parsers are defined:
    if (p.in === "body") type = ParameterTypes.object;
    else type = ParameterTypes.string;
  }

  // parser for string
  if (type === ParameterTypes.string)
    return (v) => {
      if (v === null || v === undefined) {
        if (p.optional) return null as any;
        throw new Error("Expected string but got null or undefined");
      }
      return v as any;
    };

  // parser for number
  if (type === ParameterTypes.number)
    return (v) => {
      if (v === null || v === undefined) {
        if (p.optional) return null as any;
        throw new Error("Expected number but got null or undefined");
      }
      const n = Number(v);
      if (isNaN(n)) throw new Error(`Expected number but got ${v}`);
      return n as any;
    };

  // parser for boolean
  if (type === ParameterTypes.boolean)
    return (v) => {
      if (v === null || v === undefined) {
        if (p.optional) return null as any;
        throw new Error("Expected boolean but got null or undefined");
      }
      if (v.toLowerCase() === "true") return true as any;
      if (v.toLowerCase() === "false") return false as any;
      throw new Error(`Expected boolean but got ${v}`);
    };

  // parser for object
  if (type === ParameterTypes.object)
    return (v) => {
      if (v === null || v === undefined) {
        if (p.optional) return null as any;
        throw new Error("Expected object but got null or undefined");
      }
      try {
        if (typeof v === "object") return v as any;
        return JSON.parse(v) as any;
      } catch (e) {
        throw new Error(`Expected object but got ${v}`);
      }
    };

  throw new Error("No parser defined for parameter");
}
