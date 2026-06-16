type TunnelSocket = {
  send: (data: string | ArrayBuffer | Uint8Array) => void;
};

const tunnels = new Map<string, Set<TunnelSocket>>();
const socketTunnels = new Map<TunnelSocket, string>();

export function getTunnelSockets(tunnel: string): TunnelSocket[] {
  const sockets = tunnels.get(tunnel);

  if (!sockets) {
    return [];
  }

  return [...sockets];
}

export function registerTunnel(
  tunnel: string,
  socket: TunnelSocket,
): { ok: true } | { ok: false; reason: "already_registered" } {
  const existingTunnelForSocket = socketTunnels.get(socket);

  if (existingTunnelForSocket && existingTunnelForSocket !== tunnel) {
    return { ok: false, reason: "already_registered" };
  }

  let sockets = tunnels.get(tunnel);

  if (!sockets) {
    sockets = new Set();
    tunnels.set(tunnel, sockets);
  }

  sockets.add(socket);
  socketTunnels.set(socket, tunnel);

  return { ok: true };
}

export function unregisterSocket(socket: TunnelSocket): void {
  const tunnel = socketTunnels.get(socket);

  if (!tunnel) {
    return;
  }

  const sockets = tunnels.get(tunnel);

  if (sockets) {
    sockets.delete(socket);

    if (sockets.size === 0) {
      tunnels.delete(tunnel);
    }
  }

  socketTunnels.delete(socket);
}

/** @internal — test cleanup only */
export function resetStore(): void {
  tunnels.clear();
  socketTunnels.clear();
}
