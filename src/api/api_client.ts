import type { MError } from "../util/error";

export interface PostArgs {
  path?: { [key: string]: string | number | boolean | undefined } | null;
  query?: { [key: string]: string | number | boolean | undefined } | null;
  body?: any;
}

const _noArgs: PostArgs = { path: null, query: null, body: null };

export class ApiClient {
  private readonly apiURL: string;

  /**
   * create a new Api Service.
   * - If the `host` is omitted, it will be inferred
   * from the current browser location.
   * - If the `port` is omitted, it will
   * default to the current browser port, or 80 if no port is specified.
   * - If the `path` is omitted, it will default to `/api`.
   */
  public constructor(p: { host?: string; port?: number; path?: string }) {
    const apiProtocol = window.location.protocol;
    const apiHost = p.host ?? window?.location.hostname ?? "localhost";
    const apiPort = p.port ?? window?.location.port ?? "80";
    const apiPath = p.path ?? "/api";
    this.apiURL = `${apiProtocol}//${apiHost}:${apiPort}${apiPath}`;
  }

  private async _fetch<T>(
    p: string,
    method: "GET" | "POST" | "DELETE",
    { path, query, body }: PostArgs
  ): Promise<T> {
    try {
      p = path
        ? p.replace(/:([a-zA-Z0-9_]+)/g, (m, p1) => {
            const v = path[p1];
            if (v === undefined)
              throw { code: 400, message: `missing parameter ${p1}` };
            return v?.toString() ?? "";
          })
        : p;

      const queryStr =
        query != null ? "?" + new URLSearchParams(query as any).toString() : "";
      const response = await fetch(this.apiURL + p + queryStr, {
        method,
        //credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (response.ok) {
        try {
          return (await response.clone().json()) as any as T;
        } catch (e) {
          return (await response.clone().text()) as any as T;
        }
      }
      let data = null;
      try {
        data = await response.clone().json();
      } catch (e) {
        data = await response.text();
      }

      throw {
        code: response.status,
        message: data.message ?? "undefined error",
        data,
      } as MError;
    } catch (e) {
      return _rethrow(e, 0, "unknown error") as any;
    }
  }

  public async get<T>(path: string, args?: PostArgs): Promise<T> {
    return this._fetch(path, "GET", args || _noArgs);
  }

  public async post(path: string, args: PostArgs): Promise<any> {
    return this._fetch(path, "POST", args || _noArgs);
  }

  public async delete(path: string, args: PostArgs): Promise<any> {
    return this._fetch(path, "DELETE", args || _noArgs);
  }
}

function _rethrow(e: any, code: number, message: string): MError {
  // if e implements the apiError interface, rethrow it:
  if (e && e.code !== null && e.message !== null) throw e;
  throw { code, message, data: e };
}
