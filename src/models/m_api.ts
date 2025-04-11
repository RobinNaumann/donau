import type { CorsOptions } from "cors";
import express from "express";
import type { DonauAuth } from "../auth/auth";

export type PromiseOr<T> = Promise<T> | T;

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
  handler?: (req: express.Request, res: express.Response) => PromiseOr<void>;
  handlerAuthed?: (
    user: U,
    req: express.Request,
    res: express.Response
  ) => PromiseOr<void>;
  worker?: (...args: any[]) => PromiseOr<any>;
  workerAuthed?: (user: U, ...args: any[]) => PromiseOr<any>;
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
  auth?: DonauAuth<U>;
  servers?: { url: string; description: string }[];
  apiPath?: string;
  docsPath?: string | null;
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
  info: {
    title: "unnamed API",
    description: "default API configuration for donauAPI",
    version: "1.0.0",
  },
  routes: [],
};
