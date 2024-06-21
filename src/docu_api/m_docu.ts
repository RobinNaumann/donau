import type { CorsOptions } from "cors";
import express from "express";

export interface ApiParameter {
  name: string;
  in?: "query" | "path" | "header";
  description?: string;
  required: boolean;
  type: string;
}

export interface ApiResponse {
  description: string;
  content: any;
}

export interface ApiRequestBody {
  description: string;
  required?: string[];
  properties: { [key: string]: string };
  examples?: { [key: string]: any };
}

export interface DonauRoute<U = any> {
  path: string;
  method: "get" | "post" | "delete";
  summary?: string;
  description: string;
  tags?: string[];
  parameters?: ApiParameter[];
  reqBody?: ApiRequestBody;
  responses?: { [key: string]: ApiResponse };
  handler?: (req: express.Request, res: express.Response) => void;
  handlerAuthed?: (
    user: U,
    req: express.Request,
    res: express.Response
  ) => void;
  worker?: (...args: any[]) => any;
  workerAuthed?: (user: U, ...args: any[]) => any;
}

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

export interface DonauApiConfig<U> {
  cors?: CorsOptions;
  info: DonauApiInfo;
  auth?: ExpressMiddleware;
  securitySchemes?: {
    bearerAuth?: any;
  };
  servers?: { url: string; description: string }[];
  apiPath?: string;
  docsPath?: string;
  routes: DonauRoute<U>[]; // U is the user type
}

export const defaultConfig: DonauApiConfig<any> = {
  apiPath: "/api",
  docsPath: "/docs",
  servers: [
    {
      url: `http://localhost:1235/api`,
      description: "local",
    },
  ],
  //securitySchemes: {},
  info: {
    title: "unknown API",
    description: "default API configuration for donauAPI",
    version: "1.0.0",
  },
  routes: [],
};
