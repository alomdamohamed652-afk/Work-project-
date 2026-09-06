import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

const API = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

function Stars({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <View style={styles.stars}>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}><Text style={[styles.star, n <= value && styles.starOn]}>★</Text></Pressable>)}</View>;
}

export default function RateOrder() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [restaurantComment, setRestaurantComment] = useState('');
  const [driverComment, setDriverComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token || !orderId) throw new Error('الطلب غير محدد');
        const r = await fetch(`${API}/api/orders/mine`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'تعذر تحميل الطلب');
        const found = (d.orders || []).find((x: any) => x.id === orderId);
        if (!found) throw new Error('الطلب غير موجود');
        if (found.status !== 'delivered') throw new Error('يمكن تقييم الطلب بعد التسليم فقط');
        setOrder(found);
      } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحميل الطلب'); }
      finally { setLoading(false); }
    })();
  }, [orderId]);

  const submit = async () => {
    if (!orderId || (!restaurantRating && !driverRating)) { setError('اختار تقييمًا واحدًا على الأقل'); return; }
    setSaving(true); setError('');
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const r = await fetch(`${API}/api/ratings/order/${orderId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurantRating: restaurantRating || null, driverRating: driverRating || null, restaurantComment, driverComment }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'تعذر حفظ التقييم');
      router.back();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ التقييم'); }
    finally { setSaving(false); }
  };

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>رجوع</Text></Pressable><Text style={styles.title}>قيّم تجربتك</Text>{loading ? <View style={styles.center}><ActivityIndicator color={theme.primary} /></View> : error && !order ? <Text style={styles.error}>{error}</Text> : order ? <View style={styles.card}><Text style={styles.order}>طلب #{order.id.slice(0, 8)}</Text><Text style={styles.name}>{order.restaurant_name || 'المطعم'}</Text><Text style={styles.label}>تقييم المطعم</Text><Stars value={restaurantRating} onChange={setRestaurantRating} /><TextInput value={restaurantComment} onChangeText={setRestaurantComment} placeholder="تعليق اختياري عن المطعم" placeholderTextColor={theme.muted} style={styles.input} multiline maxLength={1000} textAlign="right" />{order.driver_id ? <><Text style={styles.label}>تقييم المندوب</Text><Stars value={driverRating} onChange={setDriverRating} /><TextInput value={driverComment} onChangeText={setDriverComment} placeholder="تعليق اختياري عن المندوب" placeholderTextColor={theme.muted} style={styles.input} multiline maxLength={1000} textAlign="right" /></> : null}{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable disabled={saving} onPress={submit} style={[styles.submit, saving && styles.disabled]}><Text style={styles.submitText}>{saving ? 'جارٍ الحفظ...' : 'إرسال التقييم'}</Text></Pressable></View> : null}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.background }, page: { padding: 18, paddingBottom: 40 }, back: { alignSelf: 'flex-end', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 }, backText: { color: theme.text, fontWeight: '800' }, title: { color: theme.text, fontSize: 28, fontWeight: '900', textAlign: 'right', marginVertical: 18 }, center: { paddingVertical: 100, alignItems: 'center' }, card: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 16 }, order: { color: theme.muted, fontSize: 10, textAlign: 'right' }, name: { color: theme.text, fontSize: 20, fontWeight: '900', textAlign: 'right', marginTop: 5 }, label: { color: theme.text, fontWeight: '900', textAlign: 'right', marginTop: 22 }, stars: { flexDirection: 'row', justifyContent: 'center', gap: 9, marginVertical: 10 }, star: { color: theme.border, fontSize: 39 }, starOn: { color: theme.primary }, input: { minHeight: 76, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 12, color: theme.text, marginTop: 7, textAlignVertical: 'top' }, submit: { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18 }, disabled: { opacity: 0.6 }, submitText: { color: '#fff', fontWeight: '900' }, error: { color: theme.danger, fontWeight: '800', textAlign: 'right', marginTop: 12 } });