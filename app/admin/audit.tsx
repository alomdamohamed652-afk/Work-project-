import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const API = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const readJson = async (r: Response) => {
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { error: r.ok ? 'استجابة غير مفهومة من الخادم' : `تعذر الاتصال بالخدمة (HTTP ${r.status})` }; }
};

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headers = async () => ({ Authorization: `Bearer ${await AsyncStorage.getItem('auth_token')}` });

  const load = async () => {
    try {
      setLoading(true); setError('');
      const h = await headers();
      const meResponse = await fetch(API + '/api/auth/me', { headers: h });
      const me = await readJson(meResponse);
      if (!meResponse.ok) throw new Error(me.error || 'تعذر التحقق من الحساب');
      const currentRole = String(me.user?.role || '');
      setRole(currentRole);
      if (currentRole !== 'super_admin') throw new Error(`سجل المراجعة متاح للسوبر أدمن فقط. الصلاحية الحالية: ${currentRole || 'غير معروفة'}`);

      const p = new URLSearchParams();
      if (q.trim()) p.set('q', q.trim());
      if (from.trim()) p.set('from', from.trim());
      if (to.trim()) p.set('to', to.trim());

      const r = await fetch(API + '/api/operations/admin/audit?' + p.toString(), { headers: h });
      const d = await readJson(r);
      if (!r.ok) throw new Error(d.error || 'تعذر تحميل سجل المراجعة');
      setLogs(d.logs || []);
    } catch (e) {
      setLogs([]);
      setError(e instanceof Error ? e.message : 'تعذر تحميل السجل');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const del = async () => {
    if (!from || !to) return Alert.alert('تنبيه', 'حدد تاريخ البداية والنهاية أولًا');
    try {
      const r = await fetch(API + '/api/operations/admin/audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(await headers()) },
        body: JSON.stringify({ from, to }),
      });
      const d = await readJson(r);
      if (!r.ok) return Alert.alert('ممنوع', d.error || 'تعذر حذف السجلات');
      Alert.alert('تم', `تم حذف ${d.deleted || 0} سجل`);
      load();
    } catch (e) { Alert.alert('خطأ', e instanceof Error ? e.message : 'تعذر تنفيذ العملية'); }
  };

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.replace('/admin/operations')} style={s.back}><Text style={s.backText}>←</Text></Pressable>
      <Text style={s.title}>سجل المراجعة</Text>
      <Text style={s.sub}>متابعة العمليات المهمة داخل النظام. الصفحة تتحقق من الصلاحية الحالية قبل طلب السجل.</Text>
      {role ? <View style={s.role}><Text style={s.roleText}>الصلاحية الحالية: {role === 'super_admin' ? 'سوبر أدمن' : role}</Text></View> : null}
      {error ? <View style={s.errorBox}><Text style={s.error}>{error}</Text></View> : null}

      {role === 'super_admin' && <View style={s.card}>
        <Text style={s.label}>البحث والتصفية</Text>
        <TextInput value={q} onChangeText={setQ} placeholder="اسم / هاتف / ID / مسار" placeholderTextColor={theme.muted} style={s.input} textAlign="right" />
        <View style={s.row}>
          <TextInput value={from} onChangeText={setFrom} placeholder="من: 2026-05-01" placeholderTextColor={theme.muted} style={s.date} />
          <TextInput value={to} onChangeText={setTo} placeholder="إلى: 2026-08-01" placeholderTextColor={theme.muted} style={s.date} />
        </View>
        <View style={s.row}>
          <Pressable onPress={load} style={s.primary}><Text style={s.primaryText}>بحث</Text></Pressable>
          <Pressable onPress={del} style={s.danger}><Text style={s.dangerText}>حذف فترة قديمة</Text></Pressable>
        </View>
      </View>}

      {loading ? <View style={s.loading}><ActivityIndicator color={theme.primary} /><Text style={s.sub}>جاري التحميل...</Text></View> : null}
      {!loading && role === 'super_admin' && !logs.length && !error ? <Text style={s.empty}>لا توجد سجلات مطابقة حاليًا.</Text> : null}
      {logs.map(x => <View key={x.id} style={s.log}>
        <Text style={s.action}>{x.action}</Text>
        <Text style={s.meta}>{x.actor_name || 'System'} • {x.actor_phone || ''}</Text>
        <Text style={s.meta}>{x.module} • {x.entity_id || '-'}</Text>
        <Text style={s.time}>{new Date(x.created_at).toLocaleString('ar-EG')}</Text>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.background}, page:{padding:18,paddingBottom:110},
  back:{width:44,height:44,borderRadius:14,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},backText:{fontSize:22,color:theme.text},
  title:{fontSize:29,fontWeight:'900',color:theme.text,textAlign:'right',marginTop:15},sub:{fontSize:11,color:theme.muted,textAlign:'right',lineHeight:18},
  role:{backgroundColor:theme.primarySoft,borderRadius:12,padding:10,marginTop:10},roleText:{color:theme.primary,fontWeight:'900',textAlign:'right',fontSize:11},
  card:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:19,padding:13,marginTop:12},label:{color:theme.text,fontWeight:'900',textAlign:'right',marginBottom:8},
  input:{height:46,borderWidth:1,borderColor:theme.border,borderRadius:12,color:theme.text,paddingHorizontal:12,backgroundColor:theme.background,marginBottom:8},
  row:{flexDirection:'row-reverse',gap:7,marginBottom:7},date:{flex:1,height:44,borderWidth:1,borderColor:theme.border,borderRadius:12,color:theme.text,paddingHorizontal:9,backgroundColor:theme.background,fontSize:10},
  primary:{flex:1,height:44,borderRadius:12,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center'},primaryText:{color:'#fff',fontWeight:'900'},
  danger:{flex:1,height:44,borderRadius:12,backgroundColor:theme.dangerSoft,alignItems:'center',justifyContent:'center'},dangerText:{color:theme.danger,fontWeight:'900'},
  errorBox:{backgroundColor:theme.dangerSoft,borderRadius:14,padding:11,marginTop:10},error:{color:theme.danger,textAlign:'right',fontSize:11},
  loading:{alignItems:'center',paddingVertical:35,gap:8},empty:{color:theme.muted,textAlign:'center',paddingVertical:30},
  log:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:16,padding:12,marginTop:7},action:{color:theme.text,fontWeight:'900',textAlign:'right'},meta:{color:theme.muted,fontSize:10,textAlign:'right',marginTop:4},time:{color:theme.muted,fontSize:9,textAlign:'right',marginTop:6},
});