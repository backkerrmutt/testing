import { Server, Socket } from 'socket.io';
import mqtt from 'mqtt';

type PublishPayload = { topic: string; message: string };

export function setupMqttBridge(io: Server) {
  const url = mustEnv('MQTT_URL');
  const username = mustEnv('MQTT_USERNAME');
  const password = mustEnv('MQTT_PASSWORD');
  const subTopics = (process.env.SUB_TOPICS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const client = mqtt.connect(url, {
    username,
    password,
    reconnectPeriod: 2000,
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
    io.emit('mqtt_msg', { topic, payload: payload.toString() });
  });

  client.on('error', (e) => console.error('[mqtt] error', e));

  io.on('connection', (socket: Socket) => {
    socket.on('publish', (body: PublishPayload) => {
      if (!body?.topic || typeof body.message !== 'string') return;
      // TODO: auth/ACL ก่อน publish
      client.publish(body.topic, body.message);
    });
  });
}

function mustEnv(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
}
