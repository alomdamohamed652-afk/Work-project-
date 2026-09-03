import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { fonts } from "@/constants/fonts";

const categories = [
  ["🍔", "برجر"], ["🍕", "بيتزا"], ["🥩", "مشويات"], ["🍰", "حلويات"], ["🥤", "مشروبات"]
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={styles.greeting}>أهلاً بيك 👋</Text><Text style={styles.location}>اختر منطقتك للبدء</Text></View>
          <View style={styles.avatar}><Text style={styles.avatarText}>و</Text></View>
        </View>

        <View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><Text style={styles.searchText}>ابحث عن مطعم أو أكلة</Text></View>

        <SectionTitle title="عروض اليوم" />
        <View style={styles.offer}>
          <View style={styles.offerText}>
            <Text style={styles.offerKicker}>خصم مميز</Text>
            <Text style={styles.offerTitle}>خصومات قريبة منك</Text>
            <Text style={styles.offerDesc}>العروض الجديدة هتظهر هنا أول ما تتوفر.</Text>
          </View>
          <Text style={styles.offerEmoji}>🔥</Text>
        </View>

        <SectionTitle title="التصنيفات" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {categories.map(([icon, name]) => (
            <View key={name} style={styles.category}><Text style={styles.categoryIcon}>{icon}</Text><Text style={styles.categoryName}>{name}</Text></View>
          ))}
        </ScrollView>

        <SectionTitle title="قريبًا منك" />
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏪</Text>
          <Text style={styles.emptyTitle}>لسه بنجهز الأماكن القريبة</Text>
          <Text style={styles.emptyText}>بمجرد إضافة المطاعم من لوحة الإدارة هتظهر هنا تلقائيًا.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <View style={styles.sectionRow}><Text style={styles.section}>{title}</Text><Text style={styles.more}>عرض الكل</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  container: { padding: 20, paddingBottom: 35 },
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { color: theme.text, fontSize: fonts.size.xxl, fontWeight: fonts.weight.heavy, textAlign: "right" },
  location: { color: theme.muted, fontSize: fonts.size.xs, fontWeight: fonts.weight.regular, textAlign: "right", marginTop: 5 },
  avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 23, fontWeight: fonts.weight.heavy },
  search: { height: 56, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 17, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 16, marginBottom: 27 },
  searchIcon: { fontSize: 25, color: theme.muted, marginLeft: 10 },
  searchText: { flex: 1, color: "#969696", fontSize: fonts.size.md, fontWeight: fonts.weight.regular, textAlign: "right" },
  sectionRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 3 },
  section: { color: theme.text, fontSize: fonts.size.xl, fontWeight: fonts.weight.heavy, textAlign: "right" },
  more: { color: theme.muted, fontSize: fonts.size.xs, fontWeight: fonts.weight.medium },
  offer: { minHeight: 145, borderRadius: 21, backgroundColor: theme.primary, padding: 20, flexDirection: "row-reverse", alignItems: "center", marginBottom: 27 },
  offerText: { flex: 1, alignItems: "flex-end" },
  offerKicker: { color: "#D0D0D0", fontSize: fonts.size.sm, fontWeight: fonts.weight.bold, textAlign: "right" },
  offerTitle: { color: "#fff", fontSize: 21, fontWeight: fonts.weight.heavy, marginTop: 5, textAlign: "right" },
  offerDesc: { color: "#C4C4C4", fontSize: fonts.size.xs, fontWeight: fonts.weight.regular, lineHeight: 19, marginTop: 7, textAlign: "right" },
  offerEmoji: { fontSize: 43, marginLeft: 12 },
  categories: { gap: 10, paddingBottom: 8, flexDirection: "row-reverse" },
  category: { width: 82, height: 88, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  categoryIcon: { fontSize: 25, marginBottom: 5 },
  categoryName: { color: theme.text, fontSize: fonts.size.sm, fontWeight: fonts.weight.bold, textAlign: "center" },
  empty: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 26, alignItems: "center", marginTop: 2 },
  emptyIcon: { fontSize: 34, marginBottom: 9 },
  emptyTitle: { color: theme.text, fontSize: fonts.size.md, fontWeight: fonts.weight.bold, textAlign: "center" },
  emptyText: { color: theme.muted, fontSize: fonts.size.xs, fontWeight: fonts.weight.regular, lineHeight: 19, textAlign: "center", marginTop: 7 }
});
