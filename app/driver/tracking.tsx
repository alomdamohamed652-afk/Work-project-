import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";
import { startDriverLocation, stopDriverLocation } from "@/lib/driverLocation";

export default function DriverTracking() {
  const [status, setStatus] = useState("جاري تجهيز GPS...");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await startDriverLocation();
        if (alive) setStatus("الدليفري متصل — يتم تحديث الموقع");
      } catch (e) {
        if (alive) setStatus(e instanceof Error ? e.message : "تعذر تشغيل GPS");
      }
    })();
    return () => {
      alive = false;
      stopDriverLocation().catch(() => {});
    };
  }, []);
  return <View style={styles.page}><View style={styles.dot}/><Text style={styles.title}>تتبع الدليفري</Text><Text style={styles.status}>{status}</Text><Text style={styles.note}>يتم إرسال الموقع عبر نظام GPS المركزي للمندوب.</Text><ActivityIndicator color={theme.primary} style={{marginTop:20}}/></View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:theme.background,alignItems:"center",justifyContent:"center",padding:30},dot:{width:22,height:22,borderRadius:11,backgroundColor:"#25A55F"},title:{fontSize:28,fontWeight:"900",color:theme.text,marginTop:18},status:{fontSize:15,fontWeight:"800",color:theme.text,marginTop:9,textAlign:"center"},note:{fontSize:12,color:theme.muted,textAlign:"center",marginTop:8}});