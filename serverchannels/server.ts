import { WebSocket, WebSocketServer } from "ws";
import type { Obj } from "../servercalls/shared";
import { uniqueAlphaNum } from "../src/api/_api_utils";
import type { DonauAuth } from "../src/auth/auth";
import { logger } from "../src/util/log";

import type { ServerChannelClient, SharedServerChannelDefs } from "./shared";

export type ServerChannel<
  User extends Obj,
  Outgoing extends Obj,
  Incoming extends Obj = {}
> = {
  definition: _ServerChannelDef<User, Incoming>;
  send: (message: Outgoing) => void;
  close: () => void;
};

type ServerChannelServerHandlers<
  User extends Dict<any>,
  Cs extends SharedServerChannelDefs
> = {
  [K in keyof Cs]: (
    message: Cs[K] extends {
      _typeIncoming: infer Incoming;
    }
      ? Incoming
      : never,
    client: ServerChannelClient<User>
  ) => void;
};

type _ServerChannelStateChannel<User extends Obj, Incoming extends Obj> = {
  config: ServerChannel<User, any, Incoming>;
  latest: any;
  onMessage?: (client: ServerChannelClient<User>, message: Incoming) => void;
};

type _ServerChannelState<User extends Obj> = {
  clients: { [clientId: string]: _ServerChannelClient<User> };
  channels: {
    [channelId: string]: _ServerChannelStateChannel<User, any>;
  };
  subscriptions: { [channelId: string]: string[] };
};

type _ServerChannelClient<User extends Obj> = ServerChannelClient<User> & {
  ws: WebSocket;
};

type _ServerChannelDef<User extends Obj, Incoming extends Obj> = {
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

type _SharedServerChannels<
  User extends Dict<any>,
  Shared extends SharedServerChannelDefs
> = {
  [K in keyof Shared]: Omit<
    ServerChannel<
      User,
      Shared[K] extends {
        _typeIncoming: infer Outgoing extends { [key: string]: any };
      }
        ? Outgoing
        : never,
      Shared[K] extends {
        _typeIncoming: infer Incoming extends { [key: string]: any };
      }
        ? Incoming
        : never
    >,
    "close"
  >;
};

export class ServerChannelServer<
  User extends Record<string, any> = {},
  Shared extends SharedServerChannelDefs = {}
> {
  private _shared: _SharedServerChannels<User, Shared> = null as any;
  public get shared() {
    if (!this._shared)
      throw new Error("shared not initialized. Call handleShared");
    return this._shared;
  }

  private _server: WebSocketServer | null = null;
  private _state: _ServerChannelState<User> = {
    channels: {},
    clients: {},
    subscriptions: {},
  };

  private auth: DonauAuth<User> | null = null;
  private sharedChannels: Shared = {} as Shared;

  constructor(p: { auth?: DonauAuth<User>; sharedChannels: Shared }) {
    if (p.auth) this.auth = p.auth;
    this.sharedChannels = p.sharedChannels;
  }

  /**
   * create a new ServerChannel channel. If the channel already exists, an error is thrown.
   * If you don't provide an id, a random one will be generated.
   * @param p
   */
  public openChannel<
    Incoming extends { [key: string]: any },
    Outgoing extends { [key: string]: any }
  >(
    p: Partial<_ServerChannelDef<User, Incoming>>,
    onMessage?: (client: ServerChannelClient<User>, message: Incoming) => void
  ): ServerChannel<User, Outgoing, Incoming> {
    const id = uniqueAlphaNum(Object.keys(this._state.channels), 15, "auto_");

    const channel: ServerChannel<User, Outgoing, Incoming> = {
      definition: {
        ...p,
        id: p.id ?? id,
        published: p.published ?? false,
        auth: p.auth ?? false,
        description: p.description ?? "",
      },
      send: (message) => {
        this._send(channel.definition.id, message);
      },
      close: () => {
        this._closeChannel(channel.definition.id);
      },
    };
    if (this._state.channels[channel.definition.id]) {
      throw new Error(`Channel ${channel.definition.id} already exists`);
    }
    this._state.channels[channel.definition.id] = {
      config: channel,
      onMessage,
      latest: null,
    };
    return channel;
  }

  public handleShared(
    handlers: ServerChannelServerHandlers<User, Shared>
  ): void {
    const shared: any = {};
    for (const [channelId, channelDef] of Object.entries(this.sharedChannels)) {
      const channel = this.openChannel(
        { ...channelDef, published: true, keepOpen: true, id: channelId },
        (client, message) => {
          handlers?.[channelId]?.(message, client);
        }
      );
      shared[channelId] = channel;
    }
    this._shared = shared;
  }

  /**
   * delete a ServerChannel channel by id. Will also try to disconnect all clients from that channel.
   * @param id the id of the channel to delete
   */
  private _closeChannel(id: string) {
    if (!this._state.channels[id]) {
      throw new Error(`Channel ${id} does not exist`);
    }

    if (this._state.channels[id].config.definition.keepOpen) {
      throw new Error(
        `Channel ${id} is marked as keepOpen and cannot be closed`
      );
    }

    // disconnect all clients from this channel
    delete this._state.channels[id];
  }

  private _send(channelId: string, message: any) {
    if (!this._state.channels[channelId]) {
      throw new Error(`Channel ${channelId} does not exist`);
    }

    // store latest message if configured
    const l =
      this._state.channels[channelId].config.definition.sendLatestOnConnect;
    if (l ?? true) this._state.channels[channelId].latest = message;

    const subs = this._state.subscriptions[channelId] || [];

    for (const clientId of subs) {
      const client = this._state.clients[clientId];

      if (WebSocket.CLOSED === (client?.ws.readyState ?? WebSocket.CLOSED)) {
        this._removeClient(clientId);
        continue;
      }

      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  public serve(p: { server: any }) {
    if (!p.server) {
      throw new Error("no server provided to ServerChannelServer.serve");
    }

    if (this._server) {
      throw new Error("ServerChannelServer already initialized");
    }

    this._server = new WebSocketServer({ server: p.server });

    this._server.on("connection", async (ws, req) => {
      let user: User | null = null;
      // check path
      const path = req.url ?? "";
      if (!path.startsWith("/ServerChannel/")) {
        ws.close(1008, "invalid/path");
        return;
      }

      // extract channel id from path
      const channel: string = req.url?.split("/").pop() || "";
      if (!channel || !this._state.channels[channel]) {
        ws.close(1008, "invalid/missing channel");
        return;
      }

      // run auth middleware if configured
      if (this._state.channels[channel].config.definition.auth) {
        if (!this.auth) {
          ws.close(1008, "auth/not-configured");
          return;
        }
        user = await this.auth.authGuard(req as any);
        if (!user) {
          ws.close(1008, "auth/failed");
          return;
        }
      }

      // assign unique id to client
      const clients = Object.keys(this._state.clients);
      const id = uniqueAlphaNum(clients, 15, "client_");

      ws.on("message", (m) => {
        try {
          const msg = JSON.parse(m.toString());
          const ch = this._state.channels[channel];
          if (ch && ch.onMessage) {
            const client = this._state.clients[id];
            if (client) {
              ch.onMessage({ id: client.id, user: client.user }, msg);
            }
          }
        } catch (e) {
          ws.close(1008, "invalid/json");
        }
      });

      ws.on("close", () => {
        this._removeClient(id);
      });

      // add client to state
      this._state.clients[id] = { id, ws, user: user };
      const existingSubs = this._state.subscriptions[channel] ?? [];
      this._state.subscriptions[channel] = [...existingSubs, id];

      logger.debug(
        `DONAU_ServerChannel: client "${id}" connected to channel "${channel}"`
      );

      // send latest message if configured
      const latest = this._state.channels[channel]?.latest;
      if (latest) ws.send(JSON.stringify(latest));
    });

    logger.success("DONAU_SERVERCHANNELS: server running");
  }

  private _removeClient(clientId: string) {
    // remove client from state
    delete this._state.clients[clientId];

    // remove all stale subscriptions
    this._state.subscriptions = Object.fromEntries(
      Object.entries(this._state.subscriptions).map(([channelId, subs]) => [
        channelId,
        subs.filter((cid) => cid !== clientId),
      ])
    );
  }
}
