import swaggerUi from "swagger-ui-express";
import type {
  ApiParameter,
  DonauApiConfig,
  DonauAuth,
  DonauRoute,
  express,
  ParamsType,
} from "../..";
import { _isAuthed } from "../api/_api_utils";
import { donauDocuCss } from "./donau.css";

var _baseOptions = {
  customCss: donauDocuCss,
  customSiteTitle: "moewe API docs",
  customfavIcon: "/assets/favicon.ico",
};

export function _useDocs<U>(
  e: express.Express,
  config: DonauApiConfig<U, any>
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

function _toSwaggerBody(body: ApiParameter<any, any>) {
  if (body.in !== "body") return undefined;
  const props: any = {};
  for (const k in body.properties ?? {}) {
    props[k] = { type: body.properties?.[k].type };
  }

  const examples: any = {};
  for (const k in body.examples ?? {}) {
    examples[k] = {
      value: body.examples?.[k],
    };
  }

  return {
    description: body.description,
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: Object.entries(body.properties ?? {})
            .map(([k, v]) => (v.required ? k : undefined))
            .filter((k) => k !== undefined),
          properties: props,
        },
        examples: examples,
      },
    },
  };
}

function _createSwaggerRoute<U, Params extends ParamsType>(
  def: DonauRoute<U, Params>,
  secSchemes: any[]
): any {
  const authed = _isAuthed(def);
  return {
    [def.method ?? "get"]: {
      ...def,
      parameters:
        Object.entries(def.parameters ?? {})
          .filter(([_, p]) => p.in !== "body")
          .map(([k, p]) => ({
            ...p,
            in: p.in ?? "query",
            name: k,
          })) ?? [],
      requestBody: def.parameters
        ? Object.values(def.parameters).find((p) => p.in === "body")
          ? _toSwaggerBody(
              Object.values(def.parameters).find(
                (p) => p.in === "body"
              ) as ApiParameter<any, any>
            )
          : undefined
        : undefined,
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

function _makeSwaggerRoutes(config: DonauApiConfig<any, any>): any {
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
