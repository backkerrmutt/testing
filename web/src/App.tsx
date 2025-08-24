import { useEffect, useState } from "react";
import { connectSocket, getSocket } from "./lib/socket";

type SlotStatus = {
  capacity_mm: number;
  available: boolean;
  door_closed: boolean;
  slot?: number | string;
  node?: string;
};

type MqttMsg = { topic: string; payload: string };

export default function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<MqttMsg[]>([]);
  const [statusByKey, setStatusByKey] = useState<Record<string, SlotStatus>>({});

  useEffect(() => {
    // ชี้ไปที่ server (ไม่ใช่ broker)
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
    const socket = connectSocket(apiUrl);

    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }
    function onMqttMsg(msg: MqttMsg) {
      setMessages((prev) => [msg, ...prev].slice(0, 200));

      // smartlocker/{node}/slot/{slot}/{status|warning}
      const parts = msg.topic.split("/");
      const node = parts[1] ?? "C01";
      const slot = parts[3] ?? "1";
      const key = `${node}-${slot}`;

      try {
        const parsed = JSON.parse(msg.payload) as Partial<SlotStatus>;
        setStatusByKey((prev) => ({
          ...prev,
          [key]: {
            capacity_mm: Number(parsed.capacity_mm ?? 0),
            available: Boolean(parsed.available ?? false),
            door_closed: Boolean(parsed.door_closed ?? true),
            node: parsed.node ?? node,
            slot: parsed.slot ?? slot,
          },
        }));
      } catch {
        // payload ไม่ใช่ JSON ก็ข้ามไป แต่ยังเก็บ message log ไว้
      }
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("mqtt_msg", onMqttMsg);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("mqtt_msg", onMqttMsg);
    };
  }, []);

  function openDoor(nodeId: string, slotId: string) {
    const topic = `smartlocker/${nodeId}/slot/${slotId}/command`;
    const payload = JSON.stringify({ action: "open" });
    getSocket().emit("publish", { topic, message: payload });
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>SmartLocker Dashboard</h1>
      <p>Socket: {connected ? "connected" : "disconnected"}</p>

      <h2>Latest Messages</h2>
      <ul>
        {messages.slice(0, 10).map((m, i) => (
          <li key={i}>
            <code>{m.topic}</code> — <small>{m.payload}</small>
          </li>
        ))}
      </ul>

      <h2>Status</h2>
      <ul>
        {Object.entries(statusByKey).map(([k, st]) => (
          <li key={k}>
            <b>{k}</b> → {st.available ? "available" : "busy"} |
            {" "}door: {st.door_closed ? "closed" : "open"} |
            {" "}{st.capacity_mm} mm
            <button
              style={{ marginLeft: 8 }}
              onClick={() => openDoor(st.node ?? "C01", String(st.slot ?? "1"))}
            >
              Open Door
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
