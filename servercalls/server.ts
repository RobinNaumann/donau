import {
  err,
  grouped,
  parameter,
  route,
  routeAuthed,
  type DonauRoute,
} from "../server";
import type { ServerCalls } from "./shared";

export type ServerCallHandlers<T extends ServerCalls> = {
  [K in keyof T]: (
    args: T[K]["args"],
    auth: _AuthArgs<any>
  ) => Promise<T[K]["return"]>;
};

type _AuthArgs<U> = {
  user: U;
};

/**
 * define the server side handlers for the servercalls
 * @param def pass your global definitions
 * @param handlers define handlers as functions that are called when the client uses the client API. Note, that the `auth` attribute is only defined for server calls that have auth set to true
 * @returns
 */
export function handleServerCalls<T extends ServerCalls>(
  def: T,
  handlers: ServerCallHandlers<T>
): DonauRoute<any, any>[] {
  const routes = Object.keys(def).map((key) => {
    const fnDef = def[key];

    const authed = fnDef.auth ?? false;

    if (authed) {
      return routeAuthed(fnDef.path || `/${key}`, {
        description: `Handles the ${key} server call`,
        method: "post",
        parameters: {
          body: parameter.body({
            type: "any" as any,
            description: `Arguments for ${key}. Not documented as they may change`,
            properties: {},
          }),
        },
        workerAuthed: async (user, { body }) => {
          try {
            const args = body as any as T[typeof key]["args"] & {
              user: typeof user;
            };
            const result = await handlers[key](args, { user });
            return result;
          } catch (e) {
            return err.internalError(e);
          }
        },
      });
    }

    return route(fnDef.path || `/${key}`, {
      description: `Handles the ${key} server call`,
      method: "post",
      parameters: {
        body: parameter.body({
          type: "any" as any,
          description: `Arguments for ${key}. Not documented as they may change`,
          properties: {},
        }),
      },
      worker: async ({ body }) => {
        const args = body as T[typeof key]["args"];
        const result = await handlers[key](args, null as any);
        return result;
      },
    });
  });

  return grouped(routes, { tags: ["server-calls"], prefix: "/calls" });
}
