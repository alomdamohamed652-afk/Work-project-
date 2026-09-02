export type AppRole = "customer" | "driver" | "restaurant" | "staff" | "admin";
export type AccountStatus = "active" | "suspended" | "pending";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  status: AccountStatus;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};