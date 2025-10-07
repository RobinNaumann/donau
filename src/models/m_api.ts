import type { CorsOptions } from "cors";
import express from "express";
import type { DonauAuth } from "../auth/auth";

export type PromiseOr<T> = Promise<T> | T;

export type ApiParameter<T, Req extends boolean> = {
  description?: string;
  type: T;
  parser?: (v: string | null | undefined) => T;
  optional: Req;
} & (
  | { in?: "query" | "path" | "header" }
  | {
      in: "body";
      properties: { [key: string]: { type: string; required?: boolean } };
      examples?: { [key: string]: any };
    }
);

export interface ApiResponse {
  description: string;
  content: any;
}

export interface DonauRoute<U = any, Params extends ParamsType = any> {
  path: string;
  method: "get" | "post" | "delete";
  summary?: string;
  description: string;
  tags?: string[];
  parameters?: Params;
  responses?: { [key: string]: ApiResponse };
  handler?: (req: express.Request, res: express.Response) => PromiseOr<void>;
  handlerAuthed?: (
    user: U,
    req: express.Request,
    res: express.Response
  ) => PromiseOr<void>;
  worker?: (args: {
    [key in keyof Params]: Params[key]["optional"] extends true
      ? Params[key]["type"] | undefined | null
      : Params[key]["type"];
  }) => PromiseOr<any>;
  workerAuthed?: (
    user: U,
    args: {
      [key in keyof Params]: Params[key]["optional"] extends true
        ? Params[key]["type"] | undefined | null
        : Params[key]["type"];
    }
  ) => PromiseOr<any>;
}

export const ParameterTypes = {
  string: "string",
  number: "number" as any as number,
  boolean: "boolean" as any as boolean,
  object: "object" as any as object,
};

export type ExpressMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => void;

export interface DonauApiInfo {
  title: string;
  version: string;
  description: string;
}

export type ParamsType = { [key: string]: ApiParameter<any, any> };

export interface DonauApiConfig<U, Params extends ParamsType> {
  cors?: CorsOptions;
  info: DonauApiInfo;
  auth?: DonauAuth<U>;
  servers?: { url: string; description: string }[];
  apiPath?: string;
  docsPath?: string | null;
  routes: DonauRoute<U, Params>[]; // U is the user type
}

export const defaultConfig: DonauApiConfig<any, any> = {
  apiPath: "/api",
  docsPath: "/docs",
  servers: [
    {
      url: `http://localhost:1235/api`,
      description: "local",
    },
  ],
  info: {
    title: "unnamed API",
    description: "default API configuration for donauAPI",
    version: "1.0.0",
  },
  routes: [],
};
