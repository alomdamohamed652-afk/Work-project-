import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

export default function Landing() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logo}><Text style={styles.logoText}>و</Text></View>
          <Text style={styles.brandName}>وصّلني</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.badge}><Text style={styles.badgeText}>توصيل محلي أسرع</Text></View>
          <Text style={styles.title}>اطلب بسهولة،{"\n"}والباقي علينا.</Text>
          <Text style={styles.subtitle}>مطاعمك المفضلة، توصيل موثوق، وتتبع طلبك من لحظة التأكيد حتى باب بيتك.</Text>
          <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={() => router.push("/auth")}>
            <Text style={styles.primaryText}>ابدأ الآن</Text>
            <Text style={styles.primaryArrow}>←</Text>
          </Pressable>
        </View>

        <View style={styles.features}>
          <Feature icon="⚡" title="سريع" text="توصيل في أقرب وقت" />
          <Feature icon="📍" title="متابعة" text="اعرف مكان طلبك" />
          <Feature icon="🛡️" title="موثوق" text="خدمة آمنة وواضحة" />
        </View>
        <Text style={styles.footer}>وصّلني • خدمة توصيل محلية</Text>
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <View style={styles.feature}><Text style={styles.featureIcon}>{icon}</Text><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, justifyContent: "space-between" },
  brand: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 13, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 23, fontWeight: "900" },
  brandName: { color: theme.text, fontSize: 22, fontWeight: "900" },
  hero: { alignItems: "flex-end", width: "100%" },
  badge: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, marginBottom: 18 },
  badgeText: { color: theme.primary, fontSize: 13, fontWeight: "700" },
  title: { color: theme.text, fontSize: 42, lineHeight: 50, fontWeight: "900", textAlign: "right", width: "100%" },
  subtitle: { color: theme.muted, fontSize: 16, lineHeight: 27, textAlign: "right", marginTop: 16, width: "100%" },
  primary: { marginTop: 26, width: "100%", minHeight: 58, borderRadius: 17, backgroundColor: theme.primary, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 12 },
  pressed: { opacity: 0.82 },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  primaryArrow: { color: "#fff", fontSize: 20 },
  features: { flexDirection: "row-reverse", gap: 9 },
  feature: { flex: 1, minHeight: 112, backgroundColor: theme.surface, borderRadius: 17, borderWidth: 1, borderColor: theme.border, padding: 12, alignItems: "center" },
  featureIcon: { fontSize: 22, marginBottom: 5 },
  featureTitle: { color: theme.text, fontSize: 14, fontWeight: "800" },
  featureText: { color: theme.muted, fontSize: 11, textAlign: "center", marginTop: 5, lineHeight: 16 },
  footer: { color: theme.muted, fontSize: 12, textAlign: "center" }
});