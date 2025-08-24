import React, { useEffect, useMemo, useRef, useState } from "react";
import { SmartlockerMQTT, type SlotStatus } from "../services/mqttClient";

const emptySlot: SlotStatus = { capacity_mm: 0, available: false, door_closed: true };

function Led({ on, label }: { on: boolean; label: string }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div title={label} aria-label={label}
        style={{ width:12,height:12,borderRadius:9999,boxShadow:'0 0 4px rgba(0,0,0,.25)', background: on ? '#22c55e' : '#ef4444' }}/>
      <span style={{fontSize:12,color:'#334155'}}>{label}</span>
    </div>
  );
}

function CapacityGauge({ value, max = 300 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
      <div style={{position:'relative',width:96,height:96}}>
        <svg viewBox="0 0 36 36" width="100%" height="100%">
          <path stroke="currentColor" strokeWidth="3.8" fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            style={{color:'#e5e7eb'}}/>
          <path stroke="currentColor" strokeWidth="3.8" fill="none" strokeLinecap="round"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            style={{color:'#3b82f6', strokeDasharray: `${pct}, 100`}}/>
          <text x="18" y="20.35" textAnchor="middle" style={{fill:'#111827',fontSize:8}}>
            {value} mm
          </text>
        </svg>
      </div>
      <div style={{fontSize:12,color:'#475569',marginTop:4}}>0 → {max} mm</div>
    </div>
  );
}

export default function SmartLockerDashboard() {
  // ---- ENV / Form ----
  const [brokerUrl, setBrokerUrl] = useState(import.meta.env.VITE_MQTT_URL || "wss://<YOUR_CLUSTER_HOST>:8884/mqtt");
  const [username, setUsername] = useState(import.meta.env.VITE_MQTT_USERNAME || "web_app");
  const [password, setPassword] = useState(import.meta.env.VITE_MQTT_PASSWORD || "Web_1234");

  const [nodeId, setNodeId] = useState("C01");
  const [role, setRole] = useState<"student" | "professor" | "admin">("student");
  const [slot, setSlot] = useState("1");

  // ---- UI state ----
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [slots, setSlots] = useState<Record<string, SlotStatus>>({
    "1": emptySlot, "2": emptySlot, "3": emptySlot, "4": emptySlot,
  });

  // ---- MQTT service instance ----
  const mqttRef = useRef<SmartlockerMQTT | null>(null);

  function appendLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 300));
  }

  const handleStatusMessage = (topic: string, data: SlotStatus) => {
    const parts = topic.split("/");
    const slotNum = parts[3] || data.slot?.toString() || "?";
    setSlots((prev) => ({ ...prev, [slotNum]: { ...emptySlot, ...data } }));
  };

  function connect() {
    if (mqttRef.current) mqttRef.current.disconnect();
    const svc = new SmartlockerMQTT({
      onConnect: () => setConnected(true),
      onClose:   () => setConnected(false),
      onError:   (e) => appendLog(`❌ ${e.message}`),
      onStatusMessage: handleStatusMessage,
      onLog: (l) => appendLog(l),
    });
    mqttRef.current = svc;
    svc.connect(brokerUrl, username, password, nodeId);
  }

  function disconnect() {
    mqttRef.current?.disconnect();
    setConnected(false);
    appendLog("🔌 Disconnected by user");
  }

  function publishCommand(kind: "open" | "unlock") {
    if (!mqttRef.current || !connected) return appendLog("⚠️ Not connected");
    mqttRef.current.publishCommand(nodeId, slot, kind, role);
  }

  useEffect(() => () => mqttRef.current?.disconnect(), []);

  return (
    <div style={{maxWidth: 1100, margin: '0 auto'}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h1 style={{fontWeight:700,fontSize:24}}>SmartLocker MQTT Dashboard</h1>
        <div style={{fontSize:12,color:'#475569'}}>Vite + React + TS + HiveMQ Cloud</div>
      </header>

      {/* Connect */}
      <section style={{background:'#fff',borderRadius:16,boxShadow:'0 2px 10px rgba(0,0,0,.04)',padding:16,marginBottom:16}}>
        <div style={{display:'grid',gap:12,gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))'}}>
          <label style={{display:'flex',flexDirection:'column',gap:6}}>
            <span style={{fontSize:12,fontWeight:600}}>Broker WS URL</span>
            <input value={brokerUrl} onChange={(e)=>setBrokerUrl(e.target.value)}
              placeholder="wss://<YOUR_CLUSTER_HOST>:8884/mqtt"
              style={{border:'1px solid #cbd5e1',borderRadius:8,padding:'8px 12px'}} />
          </label>
          <label style={{display:'flex',flexDirection:'column',gap:6}}>
            <span style={{fontSize:12,fontWeight:600}}>Username</span>
            <input value={username} onChange={(e)=>setUsername(e.target.value)}
              placeholder="web_app"
              style={{border:'1px solid #cbd5e1',borderRadius:8,padding:'8px 12px'}} />
          </label>
          <label style={{display:'flex',flexDirection:'column',gap:6}}>
            <span style={{fontSize:12,fontWeight:600}}>Password</span>
            <input value={password} onChange={(e)=>setPassword(e.target.value)}
              type="password" placeholder="••••••"
              style={{border:'1px solid #cbd5e1',borderRadius:8,padding:'8px 12px'}} />
          </label>
          <label style={{display:'flex',flexDirection:'column',gap:6}}>
            <span style={{fontSize:12,fontWeight:600}}>Node ID</span>
            <input value={nodeId} onChange={(e)=>setNodeId(e.target.value)}
              style={{border:'1px solid #cbd5e1',borderRadius:8,padding:'8px 12px'}} />
          </label>
          <label style={{display:'flex',flexDirection:'column',gap:6}}>
            <span style={{fontSize:12,fontWeight:600}}>Slot</span>
            <select value={slot} onChange={(e)=>setSlot(e.target.value)}
              style={{border:'1px solid #cbd5e1',borderRadius:8,padding:'8px 12px'}}>
              <option value="1">1</option><option value="2">2</option>
              <option value="3">3</option><option value="4">4</option>
            </select>
          </label>
          <label style={{display:'flex',flexDirection:'column',gap:6}}>
            <span style={{fontSize:12,fontWeight:600}}>Role</span>
            <select value={role} onChange={(e)=>setRole(e.target.value as any)}
              style={{border:'1px solid #cbd5e1',borderRadius:8,padding:'8px 12px'}}>
              <option value="student">student</option>
              <option value="professor">professor</option>
              <option value="admin">admin</option>
            </select>
          </label>
        </div>

        <div style={{marginTop:12, display:'flex', gap:8, flexWrap:'wrap'}}>
          {!connected ? (
            <button onClick={connect} style={{padding:'8px 14px',borderRadius:12,background:'#2563eb',color:'#fff',border:'none'}}>Connect</button>
          ) : (
            <button onClick={disconnect} style={{padding:'8px 14px',borderRadius:12,background:'#334155',color:'#fff',border:'none'}}>Disconnect</button>
          )}

          <button onClick={()=>publishCommand("open")} disabled={!connected}
            style={{padding:'8px 14px',borderRadius:12,border:'none',
              background: connected ? '#059669' : '#cbd5e1', color: connected ? '#fff' : '#64748b'}}>
            OPEN
          </button>

          <button onClick={()=>publishCommand("unlock")} disabled={!connected}
            style={{padding:'8px 14px',borderRadius:12,border:'none',
              background: connected ? '#d97706' : '#cbd5e1', color: connected ? '#fff' : '#64748b'}}>
            UNLOCK
          </button>
        </div>
      </section>

      {/* Slots */}
      <section style={{display:'grid',gap:12,gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',marginBottom:16}}>
        {["1","2","3","4"].map((k) => {
          const s = slots[k] || emptySlot;
          return (
            <div key={k} style={{background:'#fff',borderRadius:16,boxShadow:'0 2px 10px rgba(0,0,0,.04)',padding:16,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h2 style={{fontWeight:600,fontSize:16}}>Slot {k}</h2>
                <span style={{fontSize:12,color:'#64748b'}}>Node {nodeId}</span>
              </div>
              <CapacityGauge value={Math.round(s.capacity_mm||0)} max={300}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <Led on={!!s.available} label="Available" />
                <Led on={!!s.door_closed} label="Door Closed" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Log */}
      <section style={{background:'#fff',borderRadius:16,boxShadow:'0 2px 10px rgba(0,0,0,.04)',padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <h3 style={{fontWeight:600}}>Live Log</h3>
          <button onClick={()=>setLog([])} style={{padding:'6px 10px',borderRadius:10,border:'1px solid #e2e8f0',background:'#f1f5f9'}}>Clear</button>
        </div>
        <div style={{height:220,overflow:'auto',border:'1px solid #e2e8f0',borderRadius:10,padding:8,background:'#f8fafc'}}>
          {log.length===0 ? (
            <div style={{fontSize:12,color:'#64748b'}}>No messages yet</div>
          ) : (
            <ul style={{display:'grid',gap:4,fontSize:12,fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas'}}>
              {log.map((l,i)=><li key={i}>{l}</li>)}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
