import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type SlotStatus = {
  capacity_mm: number;
  available: boolean;
  door_closed: boolean;
};

type LockerUpdate = {
  node: string;
  slot: number;
  type: "status" | "warning" | "command";
  payload: any;
};

export type Role = "student" | "professor" | "admin";

export function useLockerSocket(role: Role) {
  const [connected, setConnected] = useState(false);
  const [statusByKey, setStatusByKey] = useState<Record<string, SlotStatus>>({});
  const sockRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url = import.meta.env.VITE_BRIDGE_WS || "http://localhost:8080";
    const s: Socket = io(url, {
      transports: ["websocket"],
      // ส่ง role ไปที่ bridge (ในจริงควรใช้ JWT)
      auth: { role },
    });
    sockRef.current = s;

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("locker:update", (ev: LockerUpdate) => {
      if (ev.type === "status" && ev.payload) {
        const key = `${ev.node}-${ev.slot}`;
        setStatusByKey((prev) => ({ ...prev, [key]: ev.payload as SlotStatus }));
      }
    });

    return () => {
      s.close();
      sockRef.current = null;
    };
  }, [role]);

  function sendCommand(node: string, slot: number, action: string, payload?: any) {
    if (!sockRef.current) return;
    sockRef.current.emit("locker:command", { node, slot, action, payload });
  }

  const nodes = useMemo(() => {
    const set = new Set<string>();
    Object.keys(statusByKey).forEach((k) => set.add(k.split("-")[0]));
    return Array.from(set).sort();
  }, [statusByKey]);

  const slotsByNode = useMemo(() => {
    const map: Record<string, number[]> = {};
    Object.entries(statusByKey).forEach(([k]) => {
      const [node, slotStr] = k.split("-");
      const slot = Number(slotStr);
      map[node] = map[node] || [];
      if (!map[node].includes(slot)) map[node].push(slot);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a - b));
    return map;
  }, [statusByKey]);

  return { connected, statusByKey, nodes, slotsByNode, sendCommand };
}
