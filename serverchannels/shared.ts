import type { Obj } from "../servercalls/shared";

export type ServerChannelClient<User extends Obj> = {
  id: string;
  user: User | null;
};

export type ServerChannelDef<User extends Obj, Incoming extends Obj> = {
  id: string;
  published: boolean;
  auth: boolean;
  description?: string;
  sendLatestOnConnect?: boolean;
  keepOpen?: boolean;

  /**
   * this is to allow typescript to infer
   * types for handling incoming messages
   */
  _typeIncoming?: Incoming;
};

export type SharedServerChannelDefs = {
  [channelId: string]: _SharedServerChannelDef<any, any>;
};

type _SharedServerChannelDef<
  Incoming extends { [key: string]: any },
  Outgoing extends { [key: string]: any }
> = {
  auth?: boolean;
  description?: string;
  sendLatestOnConnect?: boolean;

  /**
   * this is to allow typescript to infer
   * types for handling incoming messages
   */
  _typeIncoming: Incoming;
  _typeOutgoing: Outgoing;
};

export function sharedServerChannel<
  Incoming extends { [key: string]: any },
  Outgoing extends { [key: string]: any }
>(p?: {
  auth?: boolean;
  description?: string;
  sendLatestOnConnect?: boolean;
}): _SharedServerChannelDef<Incoming, Outgoing> {
  return {
    ...(p ?? {}),

    _typeIncoming: {} as any as Incoming,
    _typeOutgoing: {} as any as Outgoing,
  };
}
