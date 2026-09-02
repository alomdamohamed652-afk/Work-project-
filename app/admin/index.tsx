import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

export default function AdminHome() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>لوحة الإدارة</Text>
      <Text style={styles.title}>مرحبًا، مدير النظام</Text>

      <View style={styles.stats}>
        <Stat label="طلبات اليوم" value="0" />
        <Stat label="مندوبون متصلون" value="0" />
        <Stat label="طلبات تحتاج تدخل" value="0" />
      </View>

      <Text style={styles.section}>الإدارة</Text>
      {cards.map(([icon, title, description]) => (
        <Pressable key={title} style={styles.card} onPress={() => {
          if (title === "المستخدمون") router.push("/admin/users");
          if (title === "الإعدادات") router.push("/admin/settings");
        }}>
          <Text style={styles.icon}>{icon}</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardText}>{description}</Text>
          </View>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background },
  content: { padding: 22, paddingTop: 62 },
  eyebrow: { color: theme.muted, textAlign: "right", fontSize: 14 },
  title: { color: theme.text, textAlign: "right", fontSize: 28, fontWeight: "800", marginTop: 5, marginBottom: 22 },
  stats: { flexDirection: "row-reverse", gap: 8, marginBottom: 28 },
  stat: { flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.border },
  statValue: { fontSize: 24, fontWeight: "800", textAlign: "right" },
  statLabel: { fontSize: 12, color: theme.muted, textAlign: "right", marginTop: 5 },
  section: { fontSize: 20, fontWeight: "800", textAlign: "right", marginBottom: 12 },
  card: { backgroundColor: theme.surface, borderRadius: 17, padding: 17, marginBottom: 10, flexDirection: "row-reverse", alignItems: "center", borderWidth: 1, borderColor: theme.border },
  icon: { fontSize: 25, width: 42, textAlign: "center" },
  cardBody: { flex: 1, paddingHorizontal: 10 },
  cardTitle: { fontSize: 17, fontWeight: "700", textAlign: "right" },
  cardText: { color: theme.muted, marginTop: 4, textAlign: "right" },
  arrow: { fontSize: 27, color: theme.muted }
});