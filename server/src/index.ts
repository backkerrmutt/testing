import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { setupMqttBridge } from './mqttBridge.js'; // <- .js สำคัญเมื่อใช้ ESM

const app = express();
app.use(cors({
  origin: (process.env.ALLOW_ORIGIN ?? '*').split(','),
  credentials: true,
}));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: (process.env.ALLOW_ORIGIN ?? '*').split(',') },
});

setupMqttBridge(io);

const PORT = Number(process.env.PORT ?? 8080);
server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
