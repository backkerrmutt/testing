import mqtt from 'mqtt';
import { Server } from 'socket.io';

export function setupMqttBridge(io: Server) {
  const url = process.env.MQTT_URL!;
  const username = process.env.MQTT_USERNAME!;
  const password = process.env.MQTT_PASSWORD!;

  const client = mqtt.connect(url, {
    username,
    password,
    reconnectPeriod: 2000
  });

  client.on('connect', () => {
    console.log('[MQTT] connected');
    // subscribe topic ที่ต้องการ แล้วส่งต่อไปยัง client ทาง Socket.IO
    client.subscribe('smartlocker/+/slot/+/status');
  });

  client.on('message', (topic, payload) => {
    io.emit('mqtt_msg', { topic, payload: payload.toString() });
  });

  // รับคำสั่งจากหน้าเว็บ แล้ว publish ออก MQTT
  io.on('connection', (socket) => {
    socket.on('publish', ({ topic, message }) => {
      // เพิ่ม ACL/check role ตรงนี้ให้รัดกุม
      client.publish(topic, message);
    });
  });

  client.on('error', (err) => console.error('[MQTT] error', err));
}
