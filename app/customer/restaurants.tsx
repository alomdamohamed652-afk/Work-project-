import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

type Restaurant = { id: string; name: string; area?: string | null; address?: string | null; latitude?: number | null; longitude?: number | null };

export default function Restaurants() {
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const [query, setQuery] = useState(String(params.q || ""));
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (term = query) => {
    try {
      setError("");
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) { router.replace("/auth"); return; }
      const suffix = term.trim() ? `?q=${encodeURIComponent(term.trim())}` : "";
      const response = await fetch(`${API_URL}/api/restaurants${suffix}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحميل المطاعم");
      setRestaurants(data.restaurants || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل المطاعم");
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(String(params.q || "")); }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>→</Text></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.title}>المطاعم</Text><Text style={styles.subtitle}>اختار مطعمك وابدأ طلبك</Text></View>
        </View>
        <View style={styles.search}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => load()} placeholder="ابحث عن مطعم" placeholderTextColor={theme.muted} style={styles.input} textAlign="right" /><Pressable onPress={() => load()} style={styles.searchButton}><Text style={styles.searchButtonText}>بحث</Text></Pressable></View>
        {params.category ? <Text style={styles.filter}>قسم: {params.category}</Text> : null}
        {loading ? <View style={styles.center}><ActivityIndicator color={theme.primary} /><Text style={styles.muted}>بنجيبلك المطاعم...</Text></View> : error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable onPress={() => load()} style={styles.retry}><Text style={styles.retryText}>إعادة المحاولة</Text></Pressable></View> : restaurants.length === 0 ? <View style={styles.center}><Text style={styles.emptyIcon}>🍽️</Text><Text style={styles.emptyTitle}>لسه مفيش مطاعم متاحة</Text><Text style={styles.muted}>هنعرض المطاعم هنا أول ما تتفعل.</Text></View> : restaurants.map((restaurant) => <Pressable key={restaurant.id} style={styles.card}><View style={styles.avatar}><Text style={styles.avatarText}>🍴</Text></View><View style={styles.cardInfo}><Text style={styles.cardTitle}>{restaurant.name}</Text><Text style={styles.cardText}>{restaurant.area || restaurant.address || "الموقع غير محدد"}</Text><Text style={styles.open}>● متاح للطلبات</Text></View><Text style={styles.chevron}>‹</Text></Pressable>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:theme.background}, content:{padding:18,paddingBottom:35}, header:{flexDirection:"row-reverse",alignItems:"center",gap:12,marginBottom:18}, back:{width:44,height:44,borderRadius:14,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,alignItems:"center",justifyContent:"center"}, backText:{fontSize:24,color:theme.text}, title:{fontSize:28,fontWeight:"900",color:theme.text,textAlign:"right"}, subtitle:{fontSize:12,color:theme.muted,textAlign:"right",marginTop:3}, search:{height:52,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:16,flexDirection:"row-reverse",alignItems:"center",paddingLeft:6,marginBottom:14}, input:{flex:1,color:theme.text,paddingHorizontal:14}, searchButton:{height:42,paddingHorizontal:16,borderRadius:12,backgroundColor:theme.primary,alignItems:"center",justifyContent:"center"}, searchButtonText:{color:"#fff",fontWeight:"900"}, filter:{color:theme.primary,fontSize:12,fontWeight:"800",textAlign:"right",marginBottom:10}, card:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:19,padding:14,flexDirection:"row-reverse",alignItems:"center",gap:12,marginBottom:10}, avatar:{width:58,height:58,borderRadius:18,backgroundColor:theme.background,alignItems:"center",justifyContent:"center"}, avatarText:{fontSize:27}, cardInfo:{flex:1}, cardTitle:{color:theme.text,fontSize:16,fontWeight:"900",textAlign:"right"}, cardText:{color:theme.muted,fontSize:11,textAlign:"right",marginTop:4}, open:{color:"#16834A",fontSize:10,fontWeight:"800",textAlign:"right",marginTop:5}, chevron:{color:theme.muted,fontSize:27}, center:{alignItems:"center",justifyContent:"center",paddingVertical:80,gap:8}, muted:{color:theme.muted,fontSize:12}, error:{color:theme.danger,textAlign:"center",fontWeight:"800"}, retry:{marginTop:8,paddingHorizontal:18,paddingVertical:10,borderRadius:12,backgroundColor:theme.primary}, retryText:{color:"#fff",fontWeight:"800"}, emptyIcon:{fontSize:42}, emptyTitle:{color:theme.text,fontSize:17,fontWeight:"900"} });
