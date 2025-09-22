/**
 * a simple error object that can be returned by functions
 */
export interface MError {
  code: number;
  message: string;
  data?: any;
}

function _err(code: number, message: string): (e?: any) => MError {
  return (e) => ({ code, message, data: e ?? undefined });
}

/**
 * a collection of error functions. each function
 * returns an object with a code, message, and optional data field.
 */
export const err = {
  invalidParameter: _err(400, "invalid parameter"),
  badRequest: _err(400, "bad request"),
  notFound: _err(404, "not found"),
  notAuthorized: _err(401, "not authorized"),
  internalError: _err(500, "internal error"),
  notImplemented: _err(501, "not implemented"),
  notAllowed: _err(405, "not allowed"),
  notAcceptable: _err(406, "not acceptable"),
  conflict: _err(409, "conflict"),
  tooManyRequests: _err(429, "too many requests"),
  serverUnavailable: _err(503, "server unavailable"),
};

/**
 * send an error response to the client
 * @param res the express response object
 * @param error an error object. take a look at the `err` object for some pre-made errors
 */
export function sendError(res: any, error: any) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error
  ) {
    let sCode = typeof error.code === "number" ? error.code : 500;
    sCode = Math.round(Math.max(Math.min(sCode, 599), 400));
    res.status(sCode).json(error);
    return;
  }
  res.status(500).json({
    code: 500,
    message: "an unknown error has occurred",
    cause: error,
  });
}
