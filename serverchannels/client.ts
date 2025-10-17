import { logger } from "../src/util/log";
import type { SharedServerChannelDefs } from "./shared";

export type ServerChannelClientInterface<Incoming extends Dict<any>> = {
  cancel: () => void;
  send: (data: Incoming) => void;
};

export type ServerChannelClientProps<Outgoing extends Dict<any>> = {
  channel: string;
  onMessage: (data: Outgoing) => void;
  reconnectOnFail?: boolean;
};

export type ServerChannelsClient<Shared extends SharedServerChannelDefs> = {
  listen: (
    p: ServerChannelClientProps<any>
  ) => ServerChannelClientInterface<any>;
  shared: {
    [K in keyof Shared]: (
      p: Omit<ServerChannelClientProps<Shared[K]["_typeOutgoing"]>, "channel">
    ) => ServerChannelClientInterface<Shared[K]["_typeIncoming"]>;
  };
};

export function useServerChannels<
  Shared extends SharedServerChannelDefs
>(options?: {
  port?: number | string;
  host?: string;
  shared?: Shared;
}): { serverChannels: ServerChannelsClient<Shared> } {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = options?.host ?? window.location.hostname;
  const port = options?.port ?? window.location.port;

  return {
    serverChannels: {
      listen: (p) => {
        return _createClient(protocol, host, `${port}`, p);
      },
      shared: options?.shared
        ? (Object.fromEntries(
            Object.entries(options.shared).map(([channelId, def]) => [
              channelId,
              (p: Omit<ServerChannelClientProps<any>, "channel">) =>
                _createClient(protocol, host, `${port}`, {
                  ...p,
                  channel: channelId,
                }),
            ])
          ) as any)
        : ({} as any),
    },
  };
}

function _createClient(
  protocol: string,
  server: string,
  port: string,
  props: ServerChannelClientProps<any>
): ServerChannelClientInterface<any> {
  let ws: WebSocket | null = null;
  let reconnectDelay = props.reconnectOnFail ?? true ? 1000 : 0;

  function connect() {
    ws = new WebSocket(
      `${protocol}://${server}:${port}/ServerChannel/${props.channel}`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      props.onMessage(data);
    };

    ws.onclose = () => {
      if (reconnectDelay >= 0) {
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(5 * 60 * 1000, reconnectDelay * 2);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  connect();

  return {
    send: (data) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      } else {
        logger.warning(
          `ServerChannelClient: WebSocket not connected, cannot send message to channel ${props.channel}`
        );
      }
    },
    cancel: () => {
      reconnectDelay = -1;
      ws?.close();
    },
  };
}
