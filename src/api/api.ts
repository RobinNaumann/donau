import cookieParser from "cookie-parser";
import cors from "cors";
import {
  err,
  express,
  sendError,
  type DonauApiConfig,
  type DonauRoute,
} from "../..";
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
export function donauApi<U>(
  config: DonauApiConfig<U>,
  port?: number
): (e: express.Express) => void {
  return (e: express.Express) => _donauApi(e, _maybeLocalConfig(config, port));
}

function _donauApi<U>(e: express.Express, config: DonauApiConfig<U>): void {
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

function _makeWorker<U>(def: DonauRoute<U>, auth: boolean) {
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
          const r = await def.workerAuthed?.(user, ..._getParams(req, def));
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
        const r = await def.worker?.(..._getParams(req, def));
        r instanceof Object ? res.json(r) : res.send(r);
        return;
      }
      _noHandler(req, res);
    } catch (e) {
      sendError(res, e);
    }
  };
}

function _getParams(req: express.Request, def: DonauRoute) {
  const params: any[] = [];
  if (def.reqBody) params.push(req.body);

  for (const p of def.parameters ?? []) {
    if (p.in === "path") params.push(req.params[p.name]);
    if (p.in === "query") params.push(req.query[p.name]);
  }
  return params;
}
