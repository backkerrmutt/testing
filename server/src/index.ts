import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { setupMqttBridge } from './mqttBridge';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.ALLOW_ORIGIN?.split(',') ?? '*' }
});

// สร้าง bridge MQTT ↔ Socket.IO
setupMqttBridge(io);

// health check
app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
