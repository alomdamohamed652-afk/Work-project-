import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

const cards = [
  ["📦", "الطلبات", "إدارة الطلبات ومتابعتها"],
  ["🛵", "الدليفري", "المندوبون والحركة والحسابات"],
  ["🏪", "المطاعم", "المطاعم والمنيو والعروض"],
  ["👥", "المستخدمون", "تعيين الأدوار والصلاحيات"],
  ["💰", "المالية", "التسويات والعهد والسلف"],
  ["📢", "التسويق", "العروض والإشعارات والكوبونات"],
  ["⚙️", "الإعدادات", "التوصيل والدفع والدعم"],
];

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\\/$/, "");

export default function AdminHome() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (!token || !API_URL) {
          router.replace("/auth");
          return;
        }
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || data.user?.role !== "admin") {
          router.replace("/home");
          return;
        }
      } catch {
        router.replace("/auth");
        return;
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>جاري التحقق من صلاحيات الإدارة...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View><Text style={styles.eyebrow}>لوحة الإدارة</Text><Text style={styles.title}>مرحبًا، مدير النظام</Text></View>
          <View style={styles.adminBadge}><Text style={styles.adminIcon}>A</Text></View>
        </View>

        <View style={styles.stats}>
          <Stat label="طلبات اليوم" value="0" />
          <Stat label="مندوبون متصلون" value="0" />
          <Stat label="تحتاج تدخل" value="0" />
        </View>

        <Text style={styles.section}>الوصول السريع</Text>
        {cards.map(([icon, title, description]) => {
          const enabled = title === "المستخدمون" || title === "الإعدادات";
          return (
            <Pressable
              key={title}
              disabled={!enabled}
              onPress={() => {
                if (title === "المستخدمون") router.push("/admin/users");
                if (title === "الإعدادات") router.push("/admin/settings");
              }}
              style={({ pressed }) => [styles.card, !enabled && styles.disabledCard, pressed && styles.pressed]}
            >
              <View style={styles.cardIcon}><Text>{icon}</Text></View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardText}>{enabled ? description : "سيتم تفعيلها مع ربط البيانات."}</Text>
              </View>
              <Text style={styles.arrow}>{enabled ? "‹" : "•"}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: theme.muted, marginTop: 12, textAlign: "center" },
  page: { flex: 1 },
  content: { padding: 20, paddingBottom: 35 },
  top: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  eyebrow: { color: theme.muted, fontSize: 12, textAlign: "right", marginBottom: 4 },
  title: { color: theme.text, fontSize: 26, fontWeight: "900", textAlign: "right" },
  adminBadge: { width: 48, height: 48, borderRadius: 16, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  adminIcon: { color: "#fff", fontSize: 19, fontWeight: "900" },
  stats: { flexDirection: "row-reverse", gap: 9, marginBottom: 28 },
  stat: { flex: 1, minHeight: 88, backgroundColor: theme.surface, borderRadius: 17, padding: 12, borderWidth: 1, borderColor: theme.border },
  statValue: { color: theme.text, fontSize: 23, fontWeight: "900", textAlign: "right" },
  statLabel: { color: theme.muted, fontSize: 11, textAlign: "right", marginTop: 7 },
  section: { color: theme.text, fontSize: 19, fontWeight: "900", textAlign: "right", marginBottom: 12 },
  card: { backgroundColor: theme.surface, borderRadius: 18, padding: 15, marginBottom: 10, flexDirection: "row-reverse", alignItems: "center", borderWidth: 1, borderColor: theme.border },
  disabledCard: { opacity: 0.58 },
  pressed: { opacity: 0.8 },
  cardIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: theme.background, alignItems: "center", justifyContent: "center", fontSize: 22 },
  cardBody: { flex: 1, paddingHorizontal: 11 },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: "800", textAlign: "right" },
  cardText: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: "right" },
  arrow: { color: theme.muted, fontSize: 25, width: 20, textAlign: "center" }
});