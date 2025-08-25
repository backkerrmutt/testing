import { useMemo, useState } from "react";
import {
  Box, Button, Card, CardContent, Chip, Divider, FormControl, Grid,
  InputLabel, MenuItem, Select, SelectChangeEvent, Stack, TextField, Typography
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DoorFrontIcon from "@mui/icons-material/DoorFront";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useLockerSocket } from "./hooks/useLockerSocket";



export default function Dashboard() {
  const [role, setRole] = useState<Role>("student");
  const { connected, statusByKey, nodes, slotsByNode, sendCommand } = useLockerSocket(role);

  // state ของตัวเลือก
  const [node, setNode] = useState<string>("");
  const [slot, setSlot] = useState<number | "">("");

  // เผื่อกรณีไม่มีสถานะเข้ามา ยังอยากใส่มือ
  const [manualNode, setManualNode] = useState("");
  const [manualSlot, setManualSlot] = useState<number | "">("");

  const currentNode = node || manualNode;
  const currentSlot = (slot === "" ? manualSlot : slot) as number | "";

  const canOpenSlot = role === "student" || role === "professor" || role === "admin";
  const canOpenDoor = role === "professor" || role === "admin";
  const canUnlockDoor = role === "professor" || role === "admin";

  const selectedKey = useMemo(() => {
    if (!currentNode || currentSlot === "") return null;
    return `${currentNode}-${currentSlot}`;
  }, [currentNode, currentSlot]);

  const selectedStatus = selectedKey ? statusByKey[selectedKey] : undefined;

  const handleRole = (e: SelectChangeEvent) => setRole(e.target.value as Role);

  function doOpenSlot() {
    if (!currentNode || currentSlot === "") return;
    sendCommand(currentNode, Number(currentSlot), "openSlot");
  }
  function doOpenDoor() {
    if (!currentNode || currentSlot === "") return;
    sendCommand(currentNode, Number(currentSlot), "openDoor");
  }
  function doUnlockDoor() {
    if (!currentNode || currentSlot === "") return;
    sendCommand(currentNode, Number(currentSlot), "unlockDoor");
  }

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight={700}>SmartLocker Dashboard</Typography>
        <Chip
          label={connected ? "Bridge Connected" : "Disconnected"}
          color={connected ? "success" : "default"}
          icon={<CheckCircleIcon />}
          variant={connected ? "filled" : "outlined"}
        />
      </Stack>

      <Grid container spacing={2}>
        {/* Controls */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700}>Controls</Typography>
              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="role">Role</InputLabel>
                  <Select labelId="role" label="Role" value={role} onChange={handleRole}>
                    <MenuItem value="student">student</MenuItem>
                    <MenuItem value="professor">professor</MenuItem>
                    <MenuItem value="admin">admin</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="node">Node</InputLabel>
                    <Select
                      labelId="node" label="Node"
                      value={node} onChange={(e) => { setNode(e.target.value); setManualNode(""); setSlot(""); }}
                    >
                      {nodes.length === 0 && <MenuItem value=""><em>— empty —</em></MenuItem>}
                      {nodes.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel id="slot">Slot</InputLabel>
                    <Select
                      labelId="slot" label="Slot"
                      value={slot === "" ? "" : String(slot)}
                      onChange={(e) => setSlot(Number(e.target.value))}
                      disabled={!node}
                    >
                      {!node && <MenuItem value=""><em>— select node first —</em></MenuItem>}
                      {node && (slotsByNode[node] || []).map((s) =>
                        <MenuItem key={s} value={String(s)}>{s}</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Stack>

                <Typography variant="body2" color="text.secondary">หรือกรอกเอง (เผื่อยังไม่มี status มา)</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="Manual Node" fullWidth value={manualNode}
                             onChange={(e) => { setManualNode(e.target.value); setNode(""); }} />
                  <TextField label="Manual Slot" type="number" fullWidth value={manualSlot}
                             onChange={(e) => { setManualSlot(e.target.value === "" ? "" : Number(e.target.value)); setSlot(""); }} />
                </Stack>

                <Divider />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    fullWidth variant="contained"
                    onClick={doOpenSlot}
                    disabled={!canOpenSlot || !currentNode || currentSlot === ""}
                  >
                    Open Slot
                  </Button>
                  <Button
                    fullWidth variant="outlined"
                    startIcon={<DoorFrontIcon />}
                    onClick={doOpenDoor}
                    disabled={!canOpenDoor || !currentNode || currentSlot === ""}
                  >
                    Open Door
                  </Button>
                  <Button
                    fullWidth variant="outlined"
                    startIcon={<LockOpenIcon />}
                    onClick={doUnlockDoor}
                    disabled={!canUnlockDoor || !currentNode || currentSlot === ""}
                  >
                    Unlock Door
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Live status table */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700}>Live Status</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ maxHeight: 520, overflow: "auto" }}>
                {Object.entries(statusByKey).length === 0 ? (
                  <Typography color="text.secondary">Waiting for status…</Typography>
                ) : (
                  <Grid container spacing={1} columns={12}>
                    {Object.entries(statusByKey).map(([key, st]) => {
                      const [n, s] = key.split("-");
                      return (
                        <Grid item key={key} xs={12} sm={6} lg={4}>
                          <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography fontWeight={700}>{n}</Typography>
                                <Chip size="small" label={`Slot ${s}`} />
                              </Stack>
                              <Typography variant="body2" mt={1}>
                                Capacity: <b>{st.capacity_mm} mm</b>
                              </Typography>
                              <Typography variant="body2">
                                Available: <b>{st.available ? "Yes" : "No"}</b>
                              </Typography>
                              <Typography variant="body2">
                                Door Closed: <b>{st.door_closed ? "Yes" : "No"}</b>
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Box>

              {selectedStatus && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Selected: <b>{currentNode}</b> / <b>Slot {currentSlot}</b> — Capacity <b>{selectedStatus.capacity_mm} mm</b>,
                    Available <b>{selectedStatus.available ? "Yes" : "No"}</b>, Door Closed <b>{selectedStatus.door_closed ? "Yes" : "No"}</b>
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
