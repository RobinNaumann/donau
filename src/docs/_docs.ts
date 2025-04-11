import swaggerUi from "swagger-ui-express";
import type {
  ApiRequestBody,
  DonauApiConfig,
  DonauAuth,
  DonauRoute,
  express,
} from "../..";
import { _isAuthed } from "../api/_api_utils";
import { donauDocuCss } from "./donau.css";

var _baseOptions = {
  customCss: donauDocuCss,
  customSiteTitle: "moewe API docs",
  customfavIcon: "/assets/favicon.ico",
};

export function _useDocs<U>(e: express.Express, config: DonauApiConfig<U>) {
  e.use(
    config.docsPath!,
    swaggerUi.serve,
    swaggerUi.setup(
      {
        openapi: "3.0.0",
        info: config.info,
        servers: config.servers,
        components: {
          securitySchemes: config.auth?.schemes,
        },
        paths: _makeSwaggerRoutes(config),
      },
      {
        ..._baseOptions,
        customSiteTitle: config.info.title + " | donau API docs",
      }
    )
  );
  _addDocsRedirect(config.docsPath!, e);
}

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

function _createSwaggerRoute<U>(def: DonauRoute<U>, secSchemes: any[]): any {
  const authed = _isAuthed(def);
  return {
    [def.method ?? "get"]: {
      ...def,
      parameters:
        def.parameters?.map((p) => ({ ...p, in: p.in ?? "query" })) ?? [],
      requestBody: def.reqBody ? _toSwaggerBody(def.reqBody) : undefined,
      responses: def.responses ?? { "200": { description: "OK" } },
      security: authed ? secSchemes : undefined,
      worker: undefined,
      workerAuthed: undefined,
      handler: undefined,
      handlerAuthed: undefined,
    },
  };
}

function _addDocsRedirect(docsPath: string, e: express.Express) {
  e.get("/", (req, res) => {
    res.redirect(docsPath);
  });
}

function _makeSwaggerRoutes(config: DonauApiConfig<any>): any {
  const docuRoutes: any = {};
  for (const r of config.routes) {
    const sec = _securitySchemes(config.auth);
    const swaggerRoute = _createSwaggerRoute(r, sec);

    // merge the docu route with the existing ones
    // (e.g. if there are multiple routes with the same path but different methods)
    docuRoutes[r.path] = { ...(docuRoutes[r.path] ?? {}), ...swaggerRoute };
  }
  return docuRoutes;
}

export function _securitySchemes(
  auth: DonauAuth<any> | null | undefined
): { [key: string]: [] }[] {
  const schemes = auth?.schemes;
  return Object.keys(schemes ?? {}).map((k) => ({ [k]: [] }));
}
