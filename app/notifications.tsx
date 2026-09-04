import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
type Notification = { id: string; title: string; body: string; type?: string; data?: unknown; is_read: boolean; created_at: string };

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) return router.replace("/auth");
      const r = await fetch(API_URL + "/api/notifications/mine", { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "تعذر تحميل الإشعارات");
      setItems(Array.isArray(d.notifications) ? d.notifications : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل الإشعارات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const read = async (id: string) => {
    const token = await AsyncStorage.getItem("auth_token");
    if (!token) return;
    await fetch(API_URL + `/api/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const readAll = async () => {
    const token = await AsyncStorage.getItem("auth_token");
    if (!token) return;
    await fetch(API_URL + "/api/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const formatDate = (value: string) => new Date(value).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={theme.primary} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} contentContainerStyle={s.content}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.back}><Text style={s.backText}>→</Text></Pressable>
        <View style={{ flex: 1 }}><Text style={s.title}>الإشعارات</Text><Text style={s.sub}>{items.filter(n => !n.is_read).length} غير مقروء</Text></View>
        {items.some(n => !n.is_read) && <Pressable onPress={readAll} style={s.readAll}><Text style={s.readAllText}>قراءة الكل</Text></Pressable>}
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
      {!items.length ? <View style={s.empty}><Text style={s.icon}>🔔</Text><Text style={s.emptyTitle}>مفيش إشعارات</Text><Text style={s.muted}>هتظهر هنا تحديثات الطلب والعروض والتنبيهات المهمة.</Text></View> : items.map(n => <Pressable key={n.id} onPress={() => read(n.id)} style={[s.card, !n.is_read && s.unread]}>
        <View style={s.dot}>{!n.is_read && <View style={s.dotInner} />}</View>
        <View style={{ flex: 1 }}><Text style={s.cardTitle}>{n.title}</Text><Text style={s.body}>{n.body}</Text><Text style={s.date}>{formatDate(n.created_at)}</Text></View>
      </Pressable>)}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background }, content: { padding: 18, paddingBottom: 40 },
  head: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 18 }, back: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }, backText: { color: theme.text, fontSize: 24 },
  title: { color: theme.text, fontSize: 27, fontWeight: "900", textAlign: "right" }, sub: { color: theme.muted, fontSize: 11, textAlign: "right", marginTop: 3 }, readAll: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 11 }, readAllText: { color: theme.primary, fontSize: 11, fontWeight: "900" },
  card: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 11, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 17, padding: 14, marginBottom: 9 }, unread: { borderColor: theme.primary }, dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, alignItems: "center", justifyContent: "center", backgroundColor: theme.border }, dotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.primary }, cardTitle: { color: theme.text, fontSize: 15, fontWeight: "900", textAlign: "right" }, body: { color: theme.muted, fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 4 }, date: { color: theme.muted, fontSize: 10, textAlign: "right", marginTop: 8 }, error: { color: theme.danger, textAlign: "right", fontWeight: "800", marginBottom: 10 }, empty: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 35, alignItems: "center", marginTop: 25 }, icon: { fontSize: 45 }, emptyTitle: { color: theme.text, fontSize: 19, fontWeight: "900", marginTop: 8 }, muted: { color: theme.muted, fontSize: 12, textAlign: "center", marginTop: 6 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }
});
