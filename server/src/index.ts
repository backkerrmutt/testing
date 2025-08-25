import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { setupMqttBridge } from './mqttBridge.js';

// --- NEW: สร้างตัวแปร corsOrigin ให้รองรับ '*' เป็น boolean true ---
const raw = process.env.ALLOW_ORIGIN ?? '*';
const corsOrigin: true | string[] =
  raw === '*' ? true : raw.split(',').map(s => s.trim());

const app = express();
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// --- DEBUG LOG: ดูว่ามี client ต่อเข้ามาไหม ---
io.on('connection', (socket) => {
  console.log('[io] connection', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('[io] disconnect', socket.id, reason);
  });
});

setupMqttBridge(io);

const PORT = Number(process.env.PORT ?? 8080);
server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
