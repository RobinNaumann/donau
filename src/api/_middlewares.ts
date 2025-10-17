import { sendError, type DonauAuth, type express } from "../../server";

/**
 * a middleware that extracts the socket information from the request and adds it to the request object
 * This usefule for filtering the request based on the remote address or port.
 * It adds the following properties to the request object:
 * - `req.remoteAddress`: the remote address of the request
 * - `req.remotePort`: the remote port of the request
 */
export function _remoteExtractMiddleware() {
  return (req: express.Request, _: any, next: express.NextFunction) => {
    (req as any).socketInfo = {
      remoteAddress: req.socket.remoteAddress,
      remotePort: req.socket.remotePort,
    };
    next();
  };
}

/**
 * a middleware that adds the user defined authentication logic.
 * it also passes the user object to the request object as:
 * - `req.user`: the user object
 * @param auth
 * @returns
 */
export function _authMiddleware<U>(auth: DonauAuth<U>) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      (req as any).user = await auth.authGuard(req);
      next();
    } catch (e) {
      sendError(res, e);
    }
  };
}
