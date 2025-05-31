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
