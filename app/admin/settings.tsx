import { ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";

const settings = [
  ["🚚", "أسعار التوصيل", "تحديد التسعير حسب المسافة والمناطق"],
  ["💳", "طرق الدفع", "COD والدفع الإلكتروني"],
  ["☎️", "الدعم وWhatsApp", "أرقام الدعم وساعات العمل"],
  ["🏆", "البونص", "قواعد مكافآت الدليفري"],
  ["📢", "الإشعارات", "إعدادات Push والحملات"],
];

export default function AdminSettings() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>إعدادات المنصة</Text>
      <Text style={styles.subtitle}>كل القيم المتغيرة تُدار من هنا ولا تُثبت داخل التطبيق.</Text>
      {settings.map(([icon, title, desc]) => (
        <View key={title} style={styles.card}>
          <Text style={styles.icon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.desc}>{desc}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background },
  content: { padding: 22, paddingTop: 62 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "right" },
  subtitle: { color: theme.muted, lineHeight: 24, textAlign: "right", marginVertical: 10 },
  card: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: theme.surface, borderRadius: 17, padding: 18, marginTop: 10, borderWidth: 1, borderColor: theme.border },
  icon: { fontSize: 24, width: 45, textAlign: "center" },
  cardTitle: { fontSize: 17, fontWeight: "700", textAlign: "right" },
  desc: { color: theme.muted, marginTop: 5, textAlign: "right" }
});