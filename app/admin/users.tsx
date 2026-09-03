import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\\/$/, "");

type User = {
  id: string; full_name: string; phone?: string | null; email?: string | null;
  role: "customer" | "driver" | "restaurant" | "staff" | "admin";
  status: "active" | "suspended" | "pending";
};

const roles = [
  ["customer", "عميل"], ["driver", "دليفري"], ["restaurant", "مطعم"],
  ["staff", "موظف"], ["admin", "أدمن"],
] as const;

export default function UsersAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) return router.replace("/auth");
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الحسابات");
      setUsers(data.users || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل الحسابات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRole = async (user: User, role: User["role"]) => {
    if (role === user.role) return;
    try {
      setBusy(user.id);
      const token = await AsyncStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحديث الصلاحية");
      setUsers(current => current.map(item => item.id === user.id ? data.user : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحديث الصلاحية");
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (user: User) => {
    const status = user.status === "active" ? "suspended" : "active";
    try {
      setBusy(user.id);
      const token = await AsyncStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحديث حالة الحساب");
      setUsers(current => current.map(item => item.id === user.id ? data.user : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحديث حالة الحساب");
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>→</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>المستخدمون</Text>
          <Text style={styles.subtitle}>إدارة الحسابات والأدوار من لوحة الأدمن</Text>
        </View>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

      {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={theme.primary} /><Text style={styles.muted}>جاري تحميل الحسابات...</Text></View> :
        users.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>لا توجد حسابات</Text><Text style={styles.muted}>أول حساب يدخل برقم الأدمن سيظهر هنا.</Text></View> :
        users.map(user => (
          <View key={user.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{user.full_name?.slice(0,1) || "؟"}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{user.full_name || "بدون اسم"}</Text>
                <Text style={styles.phone}>{user.phone || user.email || "بدون وسيلة تواصل"}</Text>
              </View>
              <View style={[styles.status, user.status !== "active" && styles.statusOff]}>
                <Text style={styles.statusText}>{user.status === "active" ? "نشط" : user.status === "suspended" ? "موقوف" : "معلق"}</Text>
              </View>
            </View>

            <Text style={styles.label}>الصلاحية</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roles}>
              {roles.map(([value, label]) => (
                <Pressable key={value} disabled={busy === user.id || (user.role === "admin" && value !== "admin")}
                  onPress={() => updateRole(user, value)}
                  style={[styles.role, user.role === value && styles.roleSelected]}>
                  <Text style={[styles.roleText, user.role === value && styles.roleTextSelected]}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable disabled={busy === user.id || user.role === "admin"} onPress={() => toggleStatus(user)} style={styles.action}>
              {busy === user.id ? <ActivityIndicator color={theme.primary} /> :
                <Text style={styles.actionText}>{user.status === "active" ? "إيقاف الحساب" : "تفعيل الحساب"}</Text>}
            </Pressable>
          </View>
        ))
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, paddingTop: 55, paddingBottom: 40 },
  header: { flexDirection: "row-reverse", alignItems: "center", gap: 12, marginBottom: 18 },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 23, color: theme.text },
  title: { color: theme.text, fontSize: 28, fontWeight: "900", textAlign: "right" },
  subtitle: { color: theme.muted, fontSize: 12, marginTop: 4, textAlign: "right" },
  card: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 19, padding: 15, marginBottom: 12 },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  name: { color: theme.text, fontSize: 16, fontWeight: "800", textAlign: "right" },
  phone: { color: theme.muted, fontSize: 12, marginTop: 4, textAlign: "right" },
  status: { backgroundColor: "#E8F7EE", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  statusOff: { backgroundColor: "#F4E8E8" },
  statusText: { color: theme.text, fontSize: 10, fontWeight: "800" },
  label: { color: theme.muted, fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: 15, marginBottom: 8 },
  roles: { flexDirection: "row-reverse", gap: 7 },
  role: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  roleSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  roleText: { color: theme.text, fontSize: 12, fontWeight: "700" },
  roleTextSelected: { color: "#fff" },
  action: { minHeight: 43, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center", marginTop: 12 },
  actionText: { color: theme.text, fontWeight: "800", fontSize: 13 },
  loading: { alignItems: "center", paddingVertical: 70, gap: 12 },
  empty: { backgroundColor: theme.surface, borderRadius: 18, padding: 30, alignItems: "center" },
  emptyTitle: { color: theme.text, fontSize: 18, fontWeight: "900", marginBottom: 7 },
  muted: { color: theme.muted, textAlign: "center", fontSize: 12 },
  error: { backgroundColor: "#FDECEC", borderRadius: 14, padding: 12, marginBottom: 12 },
  errorText: { color: "#B42318", textAlign: "right", fontSize: 12, lineHeight: 19 }
});
