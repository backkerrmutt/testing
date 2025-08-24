import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { setupMqttBridge } from './mqttBridge.js';

const app = express();
app.use(cors({
  origin: (process.env.ALLOW_ORIGIN ?? '*').split(','),
  credentials: true
}));

app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ ok: true });
});


const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: (process.env.ALLOW_ORIGIN ?? '*').split(',') }
});

// Hook: MQTT <-> Socket.IO
setupMqttBridge(io);

const PORT = Number(process.env.PORT ?? 8080);
server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
