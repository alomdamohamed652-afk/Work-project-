import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

type Section = "dashboard" | "orders" | "drivers" | "restaurants" | "customers" | "categories" | "offers" | "finance" | "settings";

const sections: { key: Section; title: string; icon: string }[] = [
  { key: "dashboard", title: "الرئيسية", icon: "⌂" },
  { key: "orders", title: "الطلبات", icon: "▣" },
  { key: "drivers", title: "الدليفري", icon: "🛵" },
  { key: "restaurants", title: "المطاعم", icon: "🍽" },
  { key: "customers", title: "العملاء", icon: "👥" },
  { key: "categories", title: "التصنيفات", icon: "▦" },
  { key: "offers", title: "العروض", icon: "٪" },
  { key: "finance", title: "الحسابات والتسويات", icon: "ج" },
  { key: "settings", title: "الإعدادات", icon: "⚙" },
];

export default function Admin() {
  const [section, setSection] = useState<Section>("dashboard");
  const active = useMemo(() => sections.find((x) => x.key === section)!, [section]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.shell}>
        <View style={styles.top}>
          <View>
            <Text style={styles.kicker}>لوحة التحكم</Text>
            <Text style={styles.title}>وصّلني Admin</Text>
          </View>
          <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADM</Text></View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nav}>
          {sections.map((item) => (
            <Pressable key={item.key} onPress={() => setSection(item.key)} style={[styles.navItem, section === item.key && styles.navActive]}>
              <Text style={[styles.navIcon, section === item.key && styles.navActiveText]}>{item.icon}</Text>
              <Text style={[styles.navText, section === item.key && styles.navActiveText]}>{item.title}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>{active.title}</Text>
          {section === "dashboard" ? <Dashboard /> : <Placeholder title={active.title} />}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Dashboard() {
  const cards = [
    ["طلبات اليوم", "0", "طلبات جديدة"],
    ["قيد التوصيل", "0", "مندوبين في طلبات"],
    ["الدليفري النشط", "0", "متاح الآن"],
    ["إجمالي العملاء", "0", "حساب"],
  ];
  return <View>
    <Text style={styles.welcome}>أهلاً بك 👋</Text>
    <Text style={styles.muted}>من هنا هتدير كل تشغيل المكتب في مكان واحد.</Text>
    <View style={styles.grid}>
      {cards.map(([label, value, note]) => <View key={label} style={styles.card}><Text style={styles.cardLabel}>{label}</Text><Text style={styles.cardValue}>{value}</Text><Text style={styles.cardNote}>{note}</Text></View>)}
    </View>
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>إجراءات سريعة</Text>
      {[
        ["＋", "إضافة تصنيف", "أضف مطاعم التصنيف وصورته"],
        ["🛵", "إدارة الدليفري", "الحسابات والنشاط والتسويات"],
        ["٪", "إنشاء عرض", "عرض جديد يظهر للعملاء"],
        ["⚙", "إعدادات المكتب", "التوصيل والدفع والدعم"],
      ].map(([icon, title, note]) => <View key={title} style={styles.action}><Text style={styles.actionIcon}>{icon}</Text><View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionNote}>{note}</Text></View></View>)}
    </View>
  </View>;
}

function Placeholder({ title }: { title: string }) {
  return <View style={styles.empty}><Text style={styles.emptyIcon}>◌</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.muted}>القسم جاهز كواجهة، والخطوة التالية ربط بياناته بالـBackend.</Text></View>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.background}, shell:{flex:1,paddingHorizontal:18},
  top:{paddingTop:8,paddingBottom:16,flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between"},
  kicker:{color:theme.primary,fontSize:12,fontWeight:"800",textAlign:"right"}, title:{color:theme.text,fontSize:25,fontWeight:"900",textAlign:"right",marginTop:2},
  adminBadge:{width:46,height:46,borderRadius:15,backgroundColor:theme.primary,alignItems:"center",justifyContent:"center"},adminBadgeText:{color:"#fff",fontSize:12,fontWeight:"900"},
  nav:{gap:8,paddingBottom:14,flexDirection:"row-reverse"},navItem:{paddingHorizontal:14,paddingVertical:10,borderRadius:14,borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface,alignItems:"center"},navActive:{backgroundColor:theme.primary,borderColor:theme.primary},navIcon:{fontSize:16},navText:{color:theme.text,fontSize:12,fontWeight:"700",marginTop:3},navActiveText:{color:"#fff"},
  content:{paddingBottom:30},sectionTitle:{color:theme.text,fontSize:23,fontWeight:"900",textAlign:"right",marginBottom:14},welcome:{color:theme.text,fontSize:18,fontWeight:"800",textAlign:"right"},muted:{color:theme.muted,fontSize:13,lineHeight:21,textAlign:"right",marginTop:5},
  grid:{flexDirection:"row-reverse",flexWrap:"wrap",gap:10,marginTop:18},card:{width:"48%",minHeight:115,borderRadius:18,borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface,padding:14},cardLabel:{color:theme.muted,fontSize:12,textAlign:"right"},cardValue:{color:theme.text,fontSize:28,fontWeight:"900",textAlign:"right",marginTop:7},cardNote:{color:theme.muted,fontSize:10,textAlign:"right",marginTop:3},
  panel:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:20,padding:16,marginTop:14},panelTitle:{color:theme.text,fontSize:16,fontWeight:"900",textAlign:"right",marginBottom:10},
  action:{flexDirection:"row-reverse",alignItems:"center",paddingVertical:11,borderTopWidth:1,borderTopColor:theme.border},actionIcon:{fontSize:20,width:38,textAlign:"center"},actionCopy:{flex:1},actionTitle:{color:theme.text,fontSize:14,fontWeight:"800",textAlign:"right"},actionNote:{color:theme.muted,fontSize:11,textAlign:"right",marginTop:3},
  empty:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:20,padding:30,alignItems:"center",marginTop:10},emptyIcon:{fontSize:35,color:theme.primary},emptyTitle:{color:theme.text,fontSize:18,fontWeight:"900",marginTop:10}
});
