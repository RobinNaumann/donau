export type ServerCalls = { [key: string]: ServerCall<any, any> };
export interface ServerCall<I extends { [k: string]: any }, O> {
  path?: string;
  auth?: boolean;
  args: { [K in keyof I]: I[K] };
  return: O;
}

export function serverCall<I extends { [k: string]: any }, O>(p?: {
  auth?: boolean;
  path?: string;
}): ServerCall<I, O> {
  return (p ?? {}) as ServerCall<I, O>;
}

export type Obj = { [key: string]: any };
