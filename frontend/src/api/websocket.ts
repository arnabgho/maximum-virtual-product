type EventHandler = (event: { type: string; data: Record<string, unknown> }) => void;

export class ProjectWebSocket {
  private ws: WebSocket | null = null;
  private handlers: EventHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : window.location.host;
    this.ws = new WebSocket(`${protocol}//${host}/ws/projects/${this.projectId}`);

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        this.handlers.forEach((h) => h(parsed));
      } catch {
        // ignore invalid messages
      }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  onEvent(handler: EventHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null; // prevent onclose from scheduling reconnect
      this.ws.close();
      this.ws = null;
    }
  }
}
