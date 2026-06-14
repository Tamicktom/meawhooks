type TunnelSocket = {
  send: (data: string | ArrayBuffer | Uint8Array) => void;
};

const tunnels = new Map<string, TunnelSocket>();
const socketTunnels = new Map<TunnelSocket, string>();

export function getTunnelSocket(tunnel: string): TunnelSocket | undefined {
  return tunnels.get(tunnel);
}

export function registerTunnel(
  tunnel: string,
  socket: TunnelSocket,
): { ok: true } | { ok: false; reason: "taken" | "already_registered" } {
  const existing = tunnels.get(tunnel);
  const existingTunnelForSocket = socketTunnels.get(socket);

  if (existingTunnelForSocket && existingTunnelForSocket !== tunnel) {
    return { ok: false, reason: "already_registered" };
  }

  if (existing && existing !== socket) {
    return { ok: false, reason: "taken" };
  }

  tunnels.set(tunnel, socket);
  socketTunnels.set(socket, tunnel);

  return { ok: true };
}

export function unregisterSocket(socket: TunnelSocket): void {
  const tunnel = socketTunnels.get(socket);

  if (!tunnel) {
    return;
  }

  const current = tunnels.get(tunnel);

  if (current === socket) {
    tunnels.delete(tunnel);
  }

  socketTunnels.delete(socket);
}

/** @internal — test cleanup only */
export function resetStore(): void {
  tunnels.clear();
  socketTunnels.clear();
}
