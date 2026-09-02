import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";

export default function UsersAdmin() {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>المستخدمون</Text>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>تعيين الأدوار</Text>
        <Text style={styles.noticeText}>سيتم ربط هذه الشاشة ببيانات Supabase لتغيير Role وStatus من حساب الـSuper Admin فقط.</Text>
      </View>
      <Text style={styles.empty}>لا توجد حسابات محملة حاليًا.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background, padding: 22, paddingTop: 62 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "right", marginBottom: 20 },
  notice: { backgroundColor: theme.surface, borderRadius: 17, padding: 18, borderWidth: 1, borderColor: theme.border },
  noticeTitle: { fontSize: 18, fontWeight: "800", textAlign: "right" },
  noticeText: { color: theme.muted, lineHeight: 24, textAlign: "right", marginTop: 8 },
  empty: { color: theme.muted, textAlign: "center", marginTop: 50 }
});