import mqtt, { MqttClient, IClientOptions } from "mqtt";

export type SlotStatus = {
  capacity_mm: number;
  available: boolean;
  door_closed: boolean;
  slot?: number;
  node?: string;
};

export type MQTTHandlers = {
  onConnect?: () => void;
  onClose?: () => void;
  onError?: (err: Error) => void;
  onStatusMessage?: (topic: string, data: SlotStatus) => void;
  onLog?: (line: string) => void;
};

export class SmartlockerMQTT {
  private client: MqttClient | null = null;
  private statusTopic = "";
  private handlers: MQTTHandlers;

  constructor(handlers: MQTTHandlers = {}) {
    this.handlers = handlers;
  }

  connect(brokerUrl: string, username: string, password: string, nodeId: string) {
    this.disconnect();
    this.statusTopic = `smartlocker/${nodeId}/slot/+/status`;

    const opts: IClientOptions = {
      username,
      password,
      clean: true,
      reconnectPeriod: 2000,
      connectTimeout: 20000,
      protocolVersion: 4, // MQTT 3.1.1
    };

    const c = mqtt.connect(brokerUrl, opts);
    this.client = c;

    c.on("connect", () => {
      this.handlers.onLog?.(`✅ Connected to ${brokerUrl} as ${username}`);
      this.handlers.onConnect?.();
      c.subscribe(this.statusTopic, (err) => {
        if (err) this.handlers.onLog?.(`❌ Subscribe error: ${err.message}`);
        else this.handlers.onLog?.(`📡 Subscribed: ${this.statusTopic}`);
      });
    });

    c.on("message", (topic, payload) => {
      const text = payload.toString();
      this.handlers.onLog?.(`📥 ${topic} → ${text}`);
      if (topic.includes("/status")) {
        try {
          const data: SlotStatus = JSON.parse(text);
          this.handlers.onStatusMessage?.(topic, data);
        } catch {
          this.handlers.onLog?.("⚠️ Not JSON payload");
        }
      }
    });

    c.on("error", (err) => {
      this.handlers.onLog?.(`❌ ${err?.message || err}`);
      this.handlers.onError?.(err as any);
    });

    c.on("close", () => {
      this.handlers.onLog?.("🔌 Disconnected");
      this.handlers.onClose?.();
    });
  }

  disconnect() {
    if (this.client) {
      try { this.client.end(true); } catch {}
      this.client = null;
    }
  }

  publishCommand(nodeId: string, slot: string, action: "open"|"unlock", role: string) {
    if (!this.client) throw new Error("Not connected");
    const topic = `smartlocker/${nodeId}/slot/${slot}/command/${action}`;
    const payload = JSON.stringify({ role });
    this.client.publish(topic, payload);
    this.handlers.onLog?.(`📤 ${topic} → ${payload}`);
  }
}
