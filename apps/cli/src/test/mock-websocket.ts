type WebSocketListener = (event?: Event) => void;

export class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState: number = WebSocket.CONNECTING;
  sent: string[] = [];

  private listeners: Record<string, Set<WebSocketListener>> = {
    open: new Set(),
    message: new Set(),
    close: new Set(),
    error: new Set(),
  };

  constructor(url: string, _protocols?: string | string[]) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: WebSocketListener) {
    this.listeners[type]?.add(listener);
  }

  removeEventListener(type: string, listener: WebSocketListener) {
    this.listeners[type]?.delete(listener);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.emit("close");
  }

  simulateOpen() {
    this.readyState = WebSocket.OPEN;
    this.emit("open");
  }

  simulateMessage(data: unknown) {
    const messageEvent = {
      data: typeof data === "string" ? data : JSON.stringify(data),
    } as MessageEvent;

    this.emit("message", messageEvent);
  }

  simulateError() {
    this.emit("error");
  }

  simulateClose() {
    this.close();
  }

  static reset() {
    MockWebSocket.instances = [];
  }

  static latest() {
    const instance = MockWebSocket.instances.at(-1);

    if (!instance) {
      throw new Error("No MockWebSocket instance found");
    }

    return instance;
  }

  private emit(type: string, event?: Event) {
    for (const listener of this.listeners[type] ?? []) {
      listener(event);
    }
  }
}

export function installMockWebSocket() {
  MockWebSocket.reset();
  globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
}

export function restoreWebSocket(original: typeof WebSocket) {
  globalThis.WebSocket = original;
  MockWebSocket.reset();
}
