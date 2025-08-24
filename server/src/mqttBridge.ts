import { Server } from 'socket.io';
import mqtt from 'mqtt';

type PublishPayload = { topic: string; message: string };

export function setupMqttBridge(io: Server) {
  const url = mustEnv('MQTT_URL');
  const username = mustEnv('MQTT_USERNAME');
  const password = mustEnv('MQTT_PASSWORD');
  const subTopics = (process.env.SUB_TOPICS ?? '').split(',').filter(Boolean);

  const client = mqtt.connect(url, {
    username, password,
    reconnectPeriod: 2000
  });

  client.on('connect', () => {
    console.log('[mqtt] connected');
    if (subTopics.length) {
      client.subscribe(subTopics, (err) => {
        if (err) console.error('[mqtt] subscribe error', err);
        else console.log('[mqtt] subscribed:', subTopics);
      });
    }
  });

  client.on('message', (topic, payload) => {
    const data = payload.toString();
    io.emit('mqtt_msg', { topic, payload: data });
  });

  client.on('error', (e) => console.error('[mqtt] error', e));

  // รับ event จากเว็บ → publish ออก MQTT (ใส่ ACL/role check ตรงนี้ได้)
  io.on('connection', (socket: import("socket.io").Socket) => {
  socket.on('publish', (body: PublishPayload) => {
    if (!body?.topic || typeof body.message !== 'string') return;
    client.publish(body.topic, body.message);
    });
  });
}

function mustEnv(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
}
