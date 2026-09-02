import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>أهلاً بيك 👋</Text>
      <Text style={styles.search}>🔎 ابحث عن مطعم أو أكلة</Text>
      <Text style={styles.section}>🔥 عروض اليوم</Text>
      <View style={styles.card}><Text style={styles.cardTitle}>خصومات قريبة منك</Text><Text style={styles.cardText}>العروض والتصنيفات ستُدار من لوحة الإدارة.</Text></View>
      <Text style={styles.section}>🍔 التصنيفات</Text>
      <Text style={styles.categories}>برجر   بيتزا   مشويات   حلويات   مشروبات</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 70, backgroundColor: "#fff" },
  greeting: { fontSize: 26, fontWeight: "800", textAlign: "right", marginBottom: 22 },
  search: { backgroundColor: "#f3f3f3", padding: 18, borderRadius: 14, textAlign: "right", color: "#666", marginBottom: 28 },
  section: { fontSize: 20, fontWeight: "800", textAlign: "right", marginBottom: 14 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 18, padding: 20, marginBottom: 28 },
  cardTitle: { fontSize: 18, fontWeight: "700", textAlign: "right", marginBottom: 8 },
  cardText: { color: "#666", textAlign: "right", lineHeight: 23 },
  categories: { fontSize: 16, lineHeight: 34, textAlign: "right" }
});