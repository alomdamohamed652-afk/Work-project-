import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@/constants/theme";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

const fields = [
  ["delivery_base", "سعر التوصيل الأساسي", "جنيه"],
  ["delivery_per_km", "سعر كل كيلومتر إضافي", "جنيه"],
  ["support_phone", "رقم الدعم", ""],
  ["whatsapp", "رقم WhatsApp", ""],
  ["bonus_per_order", "بونص المندوب لكل طلب", "جنيه"],
] as const;

const toggles = [
  ["cash_on_delivery", "الدفع عند الاستلام"],
  ["online_payment", "الدفع الإلكتروني"],
  ["notifications_enabled", "الإشعارات"],
] as const;

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setMessage("");
      const token = await AsyncStorage.getItem("auth_token");
      if (!token || !API_URL) return;
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الإعدادات");
      const next: Record<string, string> = {};
      for (const item of data.settings || []) next[item.key] = item.value;
      setValues(next);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "تعذر تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setValue = (key: string, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
  };

  const toggle = (key: string) => {
    setValue(key, values[key] === "true" ? "false" : "true");
  };

  const save = async () => {
    try {
      setSaving(true);
      setMessage("");
      const token = await AsyncStorage.getItem("auth_token");
      if (!token || !API_URL) throw new Error("رابط الخادم غير مضبوط");
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الإعدادات");
      const next: Record<string, string> = {};
      for (const item of data.settings || []) next[item.key] = item.value;
      setValues(next);
      setMessage("تم حفظ الإعدادات بنجاح");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "تعذر حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={theme.primary} /><Text style={styles.muted}>جاري تحميل الإعدادات...</Text></View>;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>إعدادات المنصة</Text>
      <Text style={styles.subtitle}>القيم دي محفوظة في قاعدة البيانات، وأي تغيير هنا ينعكس على النظام.</Text>

      <Text style={styles.section}>التوصيل والدعم</Text>
      {fields.map(([key, title, unit]) => (
        <View key={key} style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={values[key] ?? ""}
              onChangeText={value => setValue(key, value)}
              placeholder="غير محدد"
              placeholderTextColor="#A0A0A0"
              keyboardType={key.includes("phone") || key === "whatsapp" ? "phone-pad" : "decimal-pad"}
              style={styles.input}
              textAlign="right"
            />
            {!!unit && <Text style={styles.unit}>{unit}</Text>}
          </View>
        </View>
      ))}

      <Text style={styles.section}>طرق الدفع والإشعارات</Text>
      {toggles.map(([key, title]) => {
        const enabled = values[key] === "true";
        return (
          <Pressable key={key} onPress={() => toggle(key)} style={styles.toggleCard}>
            <View style={[styles.switch, enabled && styles.switchOn]}>
              <View style={[styles.knob, enabled && styles.knobOn]} />
            </View>
            <Text style={styles.toggleTitle}>{title}</Text>
          </Pressable>
        );
      })}

      {!!message && <Text style={styles.message}>{message}</Text>}

      <Pressable disabled={saving} onPress={save} style={[styles.save, saving && styles.disabled]}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>حفظ الإعدادات</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, paddingTop: 55, paddingBottom: 40 },
  title: { color: theme.text, fontSize: 29, fontWeight: "900", textAlign: "right" },
  subtitle: { color: theme.muted, lineHeight: 23, textAlign: "right", marginTop: 7, marginBottom: 18 },
  section: { color: theme.text, fontSize: 19, fontWeight: "900", textAlign: "right", marginTop: 8, marginBottom: 10 },
  card: { backgroundColor: theme.surface, borderRadius: 17, padding: 15, marginBottom: 9, borderWidth: 1, borderColor: theme.border },
  cardTitle: { color: theme.text, fontSize: 15, fontWeight: "800", textAlign: "right", marginBottom: 9 },
  inputRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: theme.border, borderRadius: 13, paddingHorizontal: 13, color: theme.text, backgroundColor: theme.background, fontSize: 15 },
  unit: { color: theme.muted, fontSize: 12, width: 40, textAlign: "center" },
  toggleCard: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.surface, borderRadius: 17, padding: 16, marginBottom: 9, borderWidth: 1, borderColor: theme.border },
  toggleTitle: { color: theme.text, fontSize: 15, fontWeight: "800" },
  switch: { width: 48, height: 28, borderRadius: 20, backgroundColor: "#D7D7D7", padding: 3, justifyContent: "center", alignItems: "flex-start" },
  switchOn: { backgroundColor: theme.primary, alignItems: "flex-end" },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },
  save: { minHeight: 54, borderRadius: 15, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", marginTop: 10 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  message: { color: theme.text, textAlign: "right", fontSize: 12, marginTop: 10 },
  loading: { flex: 1, backgroundColor: theme.background, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: theme.muted, fontSize: 13 }
});
