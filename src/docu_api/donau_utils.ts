import type { ApiParameter, DonauRoute } from "./m_docu";

/**
 * Group a set of route definitions under a common prefix and tags. This function
 * is used to group routes that are logically connected, for example, all routes
 * that are related to a specific resource.
 * @param defs the route definitions to group
 * @param param1 relevant information for the group
 * @returns the grouped route definitions
 */
export function grouped<U>(
  defs: DonauRoute<U>[],
  { tags, prefix }: { prefix?: string; tags?: string[] }
): any {
  return defs.map((d) => ({
    ...d,
    path: (prefix ?? "") + d.path,
    tags: [...(d.tags ?? []), ...(tags ?? [])],
  }));
}

/**
 * Create a route definition for the donau API. This function is used to define
 * a **unauthorized** (unprotected) route of the API. If you want to define a
 * route that requires authentication, use the `routeAuthed` function.
 * @param param0 relevant information for the route
 * @returns the route definition
 */
export function route<U>(
  path: string,
  {
    method = "get",
    ...rest
  }: Omit<
    DonauRoute<U>,
    "path" | "workerAuthed" | "handlerAuthed" | "method"
  > & {
    method?: "get" | "post" | "delete";
  }
): DonauRoute<U> {
  return { method, ...rest, path };
}

/**
 * Create a route definition for the donau API. This function is used to define
 * a **authorized** (protected) route of the API. If you want to define a
 * route that does not require authentication, use the `route` function.
 * @param param0 relevant information for the route
 * @returns the route definition
 */
export function routeAuthed<U>(
  path: string,
  {
    method = "get",
    ...rest
  }: Omit<DonauRoute<U>, "path" | "worker" | "handler" | "method"> & {
    method?: "get" | "post" | "delete";
  }
): DonauRoute<U> {
  return { method, ...rest, path };
}

type _paramParam = Omit<ApiParameter, "in" | "name" | "type" | "required"> & {
  type?: "string" | "number";
  required?: boolean;
};

/**
 * Create a parameter definition for the donau API. This function is used to define
 * a parameter that is passed to the API via the query string.
 * @param name the name of the parameter
 * @param param0 relevant information for the parameter
 * @returns the parameter definition
 */
export function parameterQuery(
  name: string,
  { required = true, type = "string", ...rest }: _paramParam
): ApiParameter {
  return { ...rest, in: "query", required, type, name };
}

/**
 * Create a parameter definition for the donau API. This function is used to define
 * a parameter that is passed to the API via the path.
 * @param name the name of the parameter as it is used in the path
 * @param param0 relevant information for the parameter
 * @returns the parameter definition
 */
export function parameterPath(
  name: string,
  { required = true, type = "string", ...rest }: _paramParam
): ApiParameter {
  return { ...rest, in: "path", required, type, name };
}

/**
 * Create a parameter definition for the donau API. This function is used to define
 * a parameter that is passed to the API via the header.
 * @param name the name of the parameter
 * @param param0 relevant information for the parameter
 * @returns the parameter definition
 */
export function parameterHeader(
  name: string,
  { required = true, type = "string", ...rest }: _paramParam
): ApiParameter {
  return { ...rest, in: "header", required, type, name };
}
