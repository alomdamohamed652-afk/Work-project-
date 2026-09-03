import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { fonts } from "@/constants/fonts";

const cards = [
  ["📦", "الطلبات", "إدارة الطلبات ومتابعتها"],
  ["🛵", "الدليفري", "المندوبون والحركة والحسابات"],
  ["🏪", "المطاعم", "المطاعم والمنيو والعروض"],
  ["👥", "المستخدمون", "تعيين الأدوار والصلاحيات"],
  ["💰", "المالية", "التسويات والعهد والسلف"],
  ["📢", "التسويق", "العروض والإشعارات والكوبونات"],
  ["⚙️", "الإعدادات", "التوصيل والدفع والدعم"],
];

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

type Stats = {
  users: number;
  activeDrivers: number;
  activeRestaurants: number;
  activeCategories: number;
};

export default function AdminHome() {
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (!token || !API_URL) { router.replace("/auth"); return; }

        const meResponse = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const me = await meResponse.json();
        if (!meResponse.ok || me.user?.role !== "admin") { router.replace("/home"); return; }

        const statsResponse = await fetch(`${API_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const statsData = await statsResponse.json();
        if (!statsResponse.ok) throw new Error(statsData.error || "تعذر تحميل الإحصائيات");
        setStats(statsData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "تعذر تحميل البيانات");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator size="large" color={theme.primary} /><Text style={styles.loadingText}>جاري تحميل لوحة الإدارة...</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View><Text style={styles.eyebrow}>لوحة الإدارة</Text><Text style={styles.title}>مرحبًا، مدير النظام</Text></View>
          <View style={styles.adminBadge}><Text style={styles.adminIcon}>A</Text></View>
        </View>

        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

        <View style={styles.stats}>
          <Stat label="إجمالي المستخدمين" value={stats?.users ?? 0} />
          <Stat label="مندوبون نشطون" value={stats?.activeDrivers ?? 0} />
          <Stat label="مطاعم نشطة" value={stats?.activeRestaurants ?? 0} />
        </View>

        <Text style={styles.section}>الوصول السريع</Text>
        {cards.map(([icon, title, description]) => {
          const enabled = title === "الطلبات" || title === "المستخدمون" || title === "الإعدادات" || title === "الدليفري";
          return <Pressable key={title} disabled={!enabled} onPress={() => {
            if (title === "الطلبات") router.push("/admin/orders");
            if (title === "المستخدمون") router.push("/admin/users");
            if (title === "الإعدادات") router.push("/admin/settings");
            if (title === "الدليفري") router.push("/admin/drivers");
          }} style={({ pressed }) => [styles.card, !enabled && styles.disabledCard, pressed && styles.pressed]}>
            <View style={styles.cardIcon}><Text style={styles.iconText}>{icon}</Text></View>
            <View style={styles.cardBody}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{enabled ? description : "سيتم تفعيلها مع ربط البيانات."}</Text></View>
            <Text style={styles.arrow}>{enabled ? "‹" : "•"}</Text>
          </Pressable>;
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe:{ flex:1, backgroundColor:theme.background }, loading:{ flex:1, alignItems:"center", justifyContent:"center", padding:24 }, loadingText:{ color:theme.muted, fontSize:fonts.size.md, fontWeight:fonts.weight.regular, marginTop:12 },
  page:{ flex:1 }, content:{ padding:20, paddingBottom:35 }, top:{ flexDirection:"row-reverse", justifyContent:"space-between", alignItems:"center", marginBottom:22 },
  eyebrow:{ color:theme.muted, fontSize:fonts.size.xs, fontWeight:fonts.weight.semibold, textAlign:"right", marginBottom:4 }, title:{ color:theme.text, fontSize:26, fontWeight:fonts.weight.heavy, textAlign:"right" },
  adminBadge:{ width:48, height:48, borderRadius:16, backgroundColor:theme.primary, alignItems:"center", justifyContent:"center" }, adminIcon:{ color:"#fff", fontSize:19, fontWeight:fonts.weight.heavy },
  stats:{ flexDirection:"row-reverse", gap:9, marginBottom:28 }, stat:{ flex:1, minHeight:88, backgroundColor:theme.surface, borderRadius:17, padding:12, borderWidth:1, borderColor:theme.border }, statValue:{ color:theme.text, fontSize:23, fontWeight:fonts.weight.heavy, textAlign:"right" }, statLabel:{ color:theme.muted, fontSize:fonts.size.xs, fontWeight:fonts.weight.regular, textAlign:"right", marginTop:7 },
  section:{ color:theme.text, fontSize:fonts.size.xl, fontWeight:fonts.weight.heavy, textAlign:"right", marginBottom:12 }, card:{ backgroundColor:theme.surface, borderRadius:18, padding:15, marginBottom:10, flexDirection:"row-reverse", alignItems:"center", borderWidth:1, borderColor:theme.border }, disabledCard:{ opacity:0.58 }, pressed:{ opacity:0.8 },
  cardIcon:{ width:46, height:46, borderRadius:14, backgroundColor:theme.background, alignItems:"center", justifyContent:"center" }, iconText:{ fontSize:22 }, cardBody:{ flex:1, paddingHorizontal:11 }, cardTitle:{ color:theme.text, fontSize:fonts.size.lg, fontWeight:fonts.weight.bold, textAlign:"right" }, cardText:{ color:theme.muted, fontSize:fonts.size.xs, fontWeight:fonts.weight.regular, lineHeight:18, marginTop:4, textAlign:"right" }, arrow:{ color:theme.muted, fontSize:25, width:20, textAlign:"center" },
  error:{ backgroundColor:"#FDECEC", borderRadius:14, padding:12, marginBottom:12 }, errorText:{ color:"#B42318", textAlign:"right", fontSize:12, lineHeight:19 }
});
