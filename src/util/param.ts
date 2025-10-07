import type { ApiParameter } from "../models/m_api";

function path<T, Req extends boolean = false>({
  optional = false as any,
  ...p
}: Omit<ApiParameter<T, Req>, "in" | "optional"> & {
  optional?: Req;
}): ApiParameter<T, Req> {
  return {
    ...p,
    optional,
    in: "path",
  };
}

function query<T, Req extends boolean = false>({
  optional = false as any,
  ...p
}: Omit<ApiParameter<T, Req>, "in" | "optional"> & {
  optional?: Req;
}): ApiParameter<T, Req> {
  return {
    ...p,
    optional,
    in: "query",
  };
}

function header<T, Req extends boolean = false>({
  optional = false as any,
  ...p
}: Omit<ApiParameter<T, Req>, "in" | "optional"> & {
  optional?: Req;
}): ApiParameter<T, Req> {
  return {
    ...p,
    optional,
    in: "header",
  };
}

function body<T, Req extends boolean = false>({
  optional = false as any,
  ...p
}: Omit<ApiParameter<T, Req>, "in" | "optional"> & {
  optional?: Req;
  properties: { [key: string]: { type: string; required?: boolean } };
  examples?: { [key: string]: any };
}): ApiParameter<T, Req> {
  return {
    ...p,
    optional,
    in: "body",
  };
}

/**
 * create paremeter definitions for `DonauRoute` definitions. They also provide
 * type safety when defining routes and pass the type information to the
 * worker functions
 */
export const parameter = {
  /** create a parameter that is passed in the **path** of a request */
  path,
  /** create a parameter that is passed in the **query** of a request */
  query,
  /** create a parameter that is passed in the **header** of a request */
  header,
  /** create a parameter that is passed in the **body** of a request */
  body,
};
