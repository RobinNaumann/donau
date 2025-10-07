import type { MError } from "../src/util/error";
import { type ServerCall } from "./shared";

/**
 * create an interface that provides a set of functions to call server-side
 * server calls defined in the `defs` object. Each function corresponds to a server call
 * and can be used to send requests to the server.
 *
 * @param defs - An object where each key is a server call name and each value is a
 *               ServerCall definition containing the arguments and return type.
 * @returns An object with functions to call each server call defined in `defs`.
 *
 * @example
 * ```typescript
 * const serverCalls = useServerCalls({...}, 3000);
 * const result = await serverCalls.myServerCall({ arg1: "value1", arg2: 42 });
 * ```
 */
export function useServerCalls<
  T extends { [key: string]: ServerCall<any, any> }
>(defs: T, port?: number, host?: string) {
  const usedFns = Object.keys(defs).reduce((acc, key) => {
    const fnDef = defs[key];
    return {
      ...acc,
      [key]: async (
        args: (typeof fnDef)["args"]
      ): Promise<(typeof fnDef)["return"]> => {
        // get own host name from browser environment
        const apiProtocol = window.location.protocol;
        const apiHost = host ?? window?.location.hostname ?? "localhost";
        const apiPort = port ?? window?.location.port ?? "80";

        try {
          const response = await fetch(
            `${apiProtocol}//${apiHost}:${apiPort}/api/calls` +
              (fnDef.path || `/${key}`),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(args),
            }
          );
          const data = await response.json();
          if (!response.ok) throw data;

          return data;
        } catch (e: any) {
          if (e && typeof e === "object" && "code" in e && "message" in e) {
            throw {
              ...e,
              cause: e.cause ?? {},
            };
          }
          throw {
            code: -1,
            message: "could not connect to server",
            cause: e,
          } as MError;
        }
      },
    };
  }, {} as { [K in keyof T]: (args: T[K]["args"]) => Promise<T[K]["return"]> });

  return usedFns;
}
