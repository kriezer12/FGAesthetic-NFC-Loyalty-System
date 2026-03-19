export type EquipmentStatus = "active" | "maintenance" | "out_of_order";

export interface Equipment {
  id: string;
  name: string;
  description: string | null;
  serial_number: string | null;
  status: EquipmentStatus;
  last_maintained_at: string | null;
  branch_id: string;
  created_at: string;
  updated_at: string;
  branch?: { name: string };
}
