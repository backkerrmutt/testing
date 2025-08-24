export type Role = "student" | "professor" | "admin";

export type SlotStatus = {
  capacity_mm: number;
  available: boolean;
  door_closed: boolean;
  slot?: number;
  node?: string;
};
