import type { MError } from "../src/util/error";
import { type Obj, type ServerCall } from "./shared";

type _AuthListener<U> = (user: U | null) => void;

export type AuthOptions<T, U> = {
  loginArgs: T;
  userModel: U;
};

export type AuthState<U> = {
  type: "authorized" | "unauthorized" | "unknown";
  user: U | null;
};

export type CallsUseInteface<
  T extends { [key: string]: ServerCall<any, any> }
> = {
  [K in keyof T]: (args: T[K]["args"]) => Promise<T[K]["return"]>;
};

export type ClientAuthInterface<LoginArgs, User> = {
  login: (args: LoginArgs) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  currentUser: () => User | null;
  addStateListener: (l: _AuthListener<User>) => () => void;
};

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
>(
  defs: T,
  options?: { port?: number | string; host?: string }
): { makeServerCall: CallsUseInteface<T> } {
  return _useServerCalls(defs, options);
}

export function useServerCallsWithAuth<
  T extends { [key: string]: ServerCall<any, any> },
  LoginArgs = undefined,
  User = Obj
>(
  defs: T,
  options?: {
    port?: number | string;
    host?: string;
    auth: AuthOptions<LoginArgs, User>;
  }
): {
  makeServerCall: CallsUseInteface<T>;
  serverAuth: ClientAuthInterface<LoginArgs, User>;
} {
  return _useServerCalls(defs, options);
}

export function _useServerCalls<
  T extends { [key: string]: ServerCall<any, any> },
  LoginArgs = undefined,
  User = Obj
>(
  defs: T,
  options?: {
    port?: number | string;
    host?: string;
    auth?: AuthOptions<LoginArgs, User>;
  }
): {
  makeServerCall: CallsUseInteface<T>;
  serverAuth: ClientAuthInterface<LoginArgs, User>;
} {
  let authListeners: _AuthListener<User>[] = [];
  let currentUser: AuthState<User> = { type: "unknown", user: null };

  function setCurrentUser(user: User | null): void {
    //if (user === null && currentUser === null) return;
    currentUser = { type: user ? "authorized" : "unauthorized", user };
    console.log("auth state changed", currentUser);

    authListeners.forEach((l) => {
      try {
        l(user);
      } catch (e) {}
    });
  }

  const apiProtocol = window.location.protocol;
  const apiHost = options?.host ?? window?.location.hostname ?? "localhost";
  const apiPort = options?.port ?? window?.location.port ?? "80";
  const apiUrl = `${apiProtocol}//${apiHost}:${apiPort}/api`;

  const usedFns = Object.keys(defs).reduce((acc, key) => {
    const fnDef = defs[key];

    return {
      ...acc,
      [key]: async (
        args: (typeof fnDef)["args"]
      ): Promise<(typeof fnDef)["return"]> => {
        // get own host name from browser environment

        try {
          const response = await fetch(
            `${apiUrl}/calls` + (fnDef.path || `/${key}`),
            {
              method: "POST",
              credentials: options?.auth ? "include" : "same-origin",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(args),
            }
          );

          if (response.status === 401 && options?.auth) {
            setCurrentUser(null);
          }

          const data = await response.json();
          if (!response.ok) throw data;

          return data;
        } catch (e: any) {
          _throwAsMError(e);
        }
      },
    };
  }, {} as CallsUseInteface<T>);

  if (!options?.auth) {
    return { makeServerCall: usedFns, serverAuth: null as any };
  }

  async function login(args?: LoginArgs): Promise<void> {
    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args ?? {}),
      });
      const resData = await res.json();
      if (!res.ok) throw resData;
      setCurrentUser(resData.user);
    } catch (e) {
      setCurrentUser(null);
      _throwAsMError(e);
    }
  }

  async function logout(): Promise<void> {
    const res = await fetch(`${apiUrl}/auth/logout`, {
      credentials: "include",
    });
    if (!res.ok) throw "logout failed";
    setCurrentUser(null);
  }

  function addStateListener(l: _AuthListener<User>): () => void {
    authListeners.push(l);
    return () => {
      authListeners = authListeners.filter((x) => x !== l);
    };
  }

  // check if already logged in from
  // the previous session
  login();

  return {
    makeServerCall: usedFns,
    serverAuth: {
      login,
      logout,
      refresh: async () => login(),
      addStateListener,
      currentUser: () => currentUser.user,
    },
  };
}

function _throwAsMError(e: any): never {
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
