import { useEffect, useState } from "react";
import { connectSocket, getSocket } from "./lib/socket";

type SlotStatus = {
  capacity_mm: number;
  available: boolean;
  door_closed: boolean;
  slot?: number;
  node?: string;
};

export default function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Array<{topic:string; payload:string}>>([]);
  const [statusByKey, setStatusByKey] = useState<Record<string, SlotStatus>>({});

  useEffect(() => {
    // ชี้ไปที่ server ของเรา ไม่ใช่ broker
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
    const socket = connectSocket(apiUrl);

    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }
    function onMqttMsg(msg: { topic: string; payload: string }) {
      setMessages((prev) => [msg, ...prev].slice(0, 200));

      try {
        const parsed = JSON.parse(msg.payload);
        // สร้าง key: node/slot จาก topic หรือจาก payload ตามรูปแบบระบบคุณ
        // ตัวอย่างสมมติ:
        const parts = msg.topic.split("/");
        // smartlocker/{node}/slot/{slot}/{status|warning}
        const node = parts[1];
        const slot = parts[3];
        const key = `${node}-${slot}`;
        setStatusByKey((prev) => ({ ...prev, [key]: parsed as SlotStatus }));
      } catch (_) { /* ignore non-JSON */ }
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
          <li key={i}><code>{m.topic}</code> — <small>{m.payload}</small></li>
        ))}
      </ul>

      <h2>Status</h2>
      <ul>
        {Object.entries(statusByKey).map(([k, st]) => (
          <li key={k}>
            <b>{k}</b> → {st.available ? "available" : "busy"} | door: {st.door_closed ? "closed" : "open"} | {st.capacity_mm} mm
            <button style={{ marginLeft: 8 }} onClick={() => openDoor(st.node ?? "C01", String(st.slot ?? "1"))}>
              Open Door
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
