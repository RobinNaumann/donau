import { err, grouped, route, routeAuthed, type DonauRoute } from "..";
import { type ServerCall } from "./shared";

/**
 * define the server side handlers for the servercalls
 * @param def pass your global definitions
 * @param handlers define handlers as functions that are called when the client uses the client API. Note, that the `user` attribute is only defined for server calls that have auth set to true
 * @returns
 */
export function handleServerCalls<
  T extends { [key: string]: ServerCall<any, any> }
>(
  def: T,
  handlers: {
    [K in keyof T]: (args: T[K]["args"], user: any) => Promise<T[K]["return"]>;
  }
): DonauRoute[] {
  const routes = Object.keys(def).map((key) => {
    const fnDef = def[key];

    const authed = fnDef.auth ?? false;

    if (authed) {
      return routeAuthed(fnDef.path || `/${key}`, {
        description: `Handles the ${key} server call`,
        method: "post",
        reqBody: {
          description: `Arguments for ${key}. Not documented as they may change`,
          properties: {},
        },
        workerAuthed: async (user, body) => {
          try {
            const args = body as T[typeof key]["args"] & { user: typeof user };
            const result = await handlers[key](args, user);
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
      reqBody: {
        description: `Arguments for ${key}. Not documented as they may change`,
        properties: {},
      },
      worker: async (body) => {
        try {
          const args = body as T[typeof key]["args"];
          const result = await handlers[key](args, null);
          return result;
        } catch (e) {
          return err.internalError(e);
        }
      },
    });
  });

  return grouped(routes, { tags: ["server-calls"], prefix: "/calls" });
}
