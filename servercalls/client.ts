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
        const apiHost = host ?? window?.location.hostname ?? "localhost";
        const apiPort = port ?? window?.location.port ?? "80";

        const response = await fetch(
          `http://${apiHost}:${apiPort}/api/calls` + (fnDef.path || `/${key}`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(args),
          }
        );
        if (!response.ok)
          throw new Error(`Error calling ${key}: ${response.statusText}`);
        const data = await response.json();
        return data;
      },
    };
  }, {} as { [K in keyof T]: (args: T[K]["args"]) => Promise<T[K]["return"]> });

  return usedFns;
}
