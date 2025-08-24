import React, { useEffect, useMemo, useRef, useState } from "react";
import { connectSocket, getSocket } from "./lib/socket";

/** ---------- Types ---------- */
export type SlotStatus = {
  capacity_mm: number;
  available: boolean;
  door_closed: boolean;
  slot?: number | string;
  node?: string;
};

type MqttMsg = { topic: string; payload: string };

/** ---------- Helpers ---------- */
function topicKeyFrom(topic: string) {
  // สมมติรูปแบบ: smartlocker/{node}/slot/{slot}/{status|warning}
  const parts = topic.split("/");
  const node = parts[1] || "C01";
  const slot = parts[3] || "1";
  return { key: `${node}-${slot}`, node, slot };
}

/** ---------- Component ---------- */
export default function SmartLockerDashboard() {
  // connection
  const [socketConnected, setSocketConnected] = useState(false);

  // form states (แทนตัวแปรที่ error: nodeId, slot, role)
  const [nodeId, setNodeId] = useState("C01");
  const [slot, setSlot] = useState("1");
  const [role, setRole] = useState<"student" | "professor" | "admin">("admin");

  // messages/log
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);

  // slots map (แทน setSlots / slots ที่ error)
  const [statusByKey, setStatusByKey] = useState<Record<string, SlotStatus>>({});

  // connect socket once
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
    const s = connectSocket(apiUrl);

    const onConnect = () => {
      setSocketConnected(true);
      setLog((prev) => [`[socket] connected`, ...prev].slice(0, 500));
    };
    const onDisconnect = () => {
      setSocketConnected(false);
      setLog((prev) => [`[socket] disconnected`, ...prev].slice(0, 500));
    };
    const onMqttMsg = (m: MqttMsg) => {
      setLog((prev) => [`[mqtt] ${m.topic} — ${m.payload}`, ...prev].slice(0, 500));

      // ถ้า payload เป็น JSON ที่มีฟิลด์สถานะ ให้เก็บลง map เพื่อแสดงผล
      try {
        const { key, node, slot } = topicKeyFrom(m.topic);
        const parsed = JSON.parse(m.payload) as Partial<SlotStatus>;
        setStatusByKey((prev) => ({
          ...prev,
          [key]: {
            capacity_mm: Number(parsed.capacity_mm ?? 0),
            available: Boolean(parsed.available ?? false),
            door_closed: Boolean(parsed.door_closed ?? true),
            node: String(parsed.node ?? node),
            slot: String(parsed.slot ?? slot),
          },
        }));
      } catch {
        // payload ไม่ใช่ JSON ก็ข้ามไป แต่อย่างน้อย log ให้ดู
      }
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("mqtt_msg", onMqttMsg);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("mqtt_msg", onMqttMsg);
    };
  }, []);

  // auto scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0; // เรา prepend log ด้านบน
    }
  }, [log]);

  /** publish คำสั่งไป MQTT ผ่าน server bridge */
  function sendCommand(action: "open" | "close") {
    // NOTE: ทำ ACL ตาม role ที่ฝั่ง server/mqttBridge.ts
    const payload = JSON.stringify({ action, role });
    const topic = `smartlocker/${nodeId}/slot/${slot}/command`;
    try {
      getSocket().emit("publish", { topic, message: payload });
      setLog((prev) => [`[publish] ${topic} — ${payload}`, ...prev].slice(0, 500));
    } catch (e) {
      setLog((prev) => [`[error] cannot publish: ${String(e)}`, ...prev].slice(0, 500));
    }
  }

  const statusList = useMemo(
    () =>
      Object.entries(statusByKey).map(([key, st]) => ({
        key,
        node: st.node ?? "C01",
        slot: String(st.slot ?? "1"),
        available: st.available,
        door: st.door_closed ? "closed" : "open",
        capacity: st.capacity_mm,
      })),
    [statusByKey]
  );

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <header>
        <h1>SmartLocker Dashboard</h1>
        <p>Socket: {socketConnected ? "connected" : "disconnected"}</p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <div style={{ border: "1px solid #444", borderRadius: 12, padding: 12 }}>
          <h3>Send Command</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Node ID
              <input
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
                placeholder="C01"
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Slot
              <input
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                placeholder="1"
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value as any)} style={{ width: "100%" }}>
                <option value="student">student</option>
                <option value="professor">professor</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => sendCommand("open")}>Open Door</button>
              <button onClick={() => sendCommand("close")}>Close Door</button>
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #444", borderRadius: 12, padding: 12 }}>
          <h3>Latest Slots</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {statusList.length === 0 && <div>No slot status yet.</div>}
            {statusList.map((s) => (
              <div
                key={s.key}
                style={{
                  border: "1px solid #666",
                  borderRadius: 10,
                  padding: 8,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div>
                  <div>
                    <b>{s.key}</b> — Node {s.node} / Slot {s.slot}
                  </div>
                  <div>
                    {s.available ? "available" : "busy"} | door: {s.door} | {s.capacity} mm
                  </div>
                </div>
                <button onClick={() => {
                  setNodeId(s.node);
                  setSlot(String(s.slot));
                }}>
                  Control
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: "1px solid #444", borderRadius: 12, padding: 12 }}>
          <h3>Log</h3>
          <div
            ref={logRef}
            style={{
              height: 260,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {log.map((l, idx) => (
              <div key={idx} style={{ fontFamily: "monospace", fontSize: 12 }}>
                {l}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button onClick={() => setLog([])}>Clear</button>
            <button onClick={() => navigator.clipboard.writeText(log.join("\n"))}>Copy</button>
          </div>
        </div>
      </section>
    </div>
  );
}
