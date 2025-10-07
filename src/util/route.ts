import type { DonauRoute, ParamsType } from "../models/m_api";

type HttpMethod = "get" | "post" | "delete";

/**
 * Group a set of route definitions under a common prefix and tags. This function
 * is used to group routes that are logically connected, for example, all routes
 * that are related to a specific resource.
 * @param defs the route definitions to group
 * @param param1 relevant information for the group
 * @returns the grouped route definitions
 */
export function grouped<U, Params extends ParamsType>(
  defs: DonauRoute<U, Params>[],
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
 * @param path the path of the route. You can define path parameters using curly braces, e.g., `/users/{userId}`
 * @param param1 relevant information for the route. All parameters you define will be available to the worker.
 * For a request body, use the `reqBody` property.
 * @returns the route definition
 */
export function route<U, Params extends ParamsType>(
  path: string,
  {
    method = "get",
    ...rest
  }: Omit<
    DonauRoute<U, Params>,
    "path" | "workerAuthed" | "handlerAuthed" | "method"
  > & {
    method?: HttpMethod;
  }
): DonauRoute<U, Params> {
  return { method, ...rest, path };
}

/**
 * Create a route definition for the donau API. This function is used to define
 * a **authorized** (protected) route of the API. If you want to define a
 * route that does not require authentication, use the `route` function.
 * @param path the path of the route. You can define path parameters using curly braces, e.g., `/users/{userId}`
 * @param param1 relevant information for the route
 * @returns the route definition
 */
export function routeAuthed<U, Params extends ParamsType>(
  path: string,
  {
    method = "get",
    ...rest
  }: Omit<DonauRoute<U, Params>, "path" | "worker" | "handler" | "method"> & {
    method?: HttpMethod;
  }
): DonauRoute<U, Params> {
  return { method, ...rest, path };
}
