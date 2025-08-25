import express from "express";
import http from "http";
import { Server } from "socket.io";
import mqtt from "mqtt";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (process.env.ALLOW_ORIGIN || "*").split(","),
    credentials: true,
  },
});

const mqttUrl = process.env.MQTT_URL!;
const client = mqtt.connect(mqttUrl, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

client.on("connect", () => {
  console.log("[MQTT] connected:", mqttUrl);
  const topics = (process.env.SUB_TOPICS || "smartlocker/+/slot/+/status,smartlocker/+/slot/+/warning")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  topics.forEach((t) => client.subscribe(t));
  console.log("[MQTT] subscribed:", topics);
});

client.on("message", (topic, payload) => {
  const msgStr = payload.toString();
  const parts = topic.split("/"); // smartlocker/{node}/slot/{slot}/{type}
  const ev = {
    node: parts[1],
    slot: Number(parts[3]),
    type: parts[4] as "status" | "warning" | "command",
    payload: safeJSON(msgStr) ?? msgStr,
  };
  io.emit("locker:update", ev);
});

type Role = "student" | "professor" | "admin";

const ALLOW: Record<Role, string[]> = {
  student:   ["openSlot"],
  professor: ["openSlot", "openDoor", "unlockDoor"],
  admin:     ["openSlot", "openDoor", "unlockDoor"],
};

io.on("connection", (socket) => {
  // รับ role จาก auth (เดโม่) — โปรดเปลี่ยนเป็น JWT จริงในโปรดักชัน
  const role = (socket.handshake.auth?.role || "student") as Role;
  console.log("[WS] client connected, role =", role);

  socket.on("locker:command", (cmd: { node: string; slot: number; action: string; payload?: any }) => {
    if (!ALLOW[role]?.includes(cmd.action)) {
      console.warn(`[GUARD] role=${role} not allowed for action=${cmd.action}`);
      return; // ปัดตก
    }
    if (!cmd.node || typeof cmd.slot !== "number") return;

    const topic = `smartlocker/${cmd.node}/slot/${cmd.slot}/command`;
    const body = JSON.stringify({ action: cmd.action, ...cmd.payload });
    client.publish(topic, body);
    console.log("[PUB]", topic, body);
  });
});

app.get("/health", (_, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 8080);
server.listen(port, () => console.log(`bridge on :${port}`));

function safeJSON(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}
