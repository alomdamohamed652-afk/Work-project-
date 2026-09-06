import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

const API = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const readJson = async (r: Response) => { const text = await r.text(); try { return JSON.parse(text); } catch { return { error: 'تعذر قراءة رد الخادم' }; } };

export default function Operations() {
  const [data, setData] = useState<any>({ flags: [], tiers: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const t = await AsyncStorage.getItem('auth_token');
      const h = { Authorization: `Bearer ${t}` };
      const [r, tier] = await Promise.all([
        fetch(API + '/api/operations/admin/home', { headers: h }),
        fetch(API + '/api/operations/admin/tiers', { headers: h }),
      ]);
      const a = await readJson(r), b = await readJson(tier);
      if (!r.ok) throw new Error(a.error || 'تعذر تحميل إعدادات الواجهة');
      if (!tier.ok) throw new Error(b.error || 'تعذر تحميل الفئات');
      setData({ flags: a.flags || [], tiers: b.tiers || [] });
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحميل الإعدادات'); }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (f: any) => {
    setBusy(true);
    try {
      const t = await AsyncStorage.getItem('auth_token');
      const r = await fetch(API + '/api/operations/admin/home/flags/' + encodeURIComponent(f.key), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ enabled: !f.is_enabled, config: f.config }),
      });
      const d = await readJson(r);
      if (!r.ok) throw new Error(d.error || 'تعذر الحفظ');
      load();
    } catch (e) { Alert.alert('خطأ', e instanceof Error ? e.message : 'تعذر الحفظ'); }
    finally { setBusy(false); }
  };

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => router.replace('/admin')} style={s.back}><Text style={s.backText}>←</Text></Pressable>
      <Text style={s.title}>مركز إدارة النظام</Text>
      <Text style={s.sub}>كل إعداد له مكان واضح. استخدم البطاقات التالية بدل البحث بين شاشات غير مفهومة.</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <Section title="ما يظهر للعميل">
        <ToggleRow title="البانرات والإعلانات" sub="الرسائل البارزة في الواجهة الرئيسية" value={data.flags.find((x:any)=>x.key==='home_banners')} onToggle={toggle} disabled={busy}/>
        <ToggleRow title="التصنيفات" sub="الأقسام الأساسية التي تظهر للعميل" value={data.flags.find((x:any)=>x.key==='home_categories')} onToggle={toggle} disabled={busy}/>
        <ToggleRow title="الفئات والمستويات" sub="نظام العضوية والتقدم الشهري" value={data.flags.find((x:any)=>x.key==='home_membership')} onToggle={toggle} disabled={busy}/>
        <ToggleRow title="الأقسام المخصصة" sub="الأقسام التي تنشئها من لوحة التحكم" value={data.flags.find((x:any)=>x.key==='home_custom_sections')} onToggle={toggle} disabled={busy}/>
        <ToggleRow title="العروض المنبثقة" sub="رسائل وعروض تظهر عند الحاجة" value={data.flags.find((x:any)=>x.key==='home_popups')} onToggle={toggle} disabled={busy}/>
        <Nav title="تنظيم الصفحة الرئيسية" sub="إضافة قسم، اختيار وجهته، ترتيبه وإظهاره أو إخفاؤه" path="/admin/home-builder"/>
      </Section>

      <Section title="التشغيل والمناطق">
        <Nav title="المحافظات والمراكز ونطاق التوصيل" sub="تنظيم المحافظات والمراكز وتحديد دوائر الخدمة المسموح للطلبات داخلها" path="/admin/locations"/>
        <Nav title="الفئات والمستويات" sub="الترقية، الحفاظ على المستوى والمزايا" path="/admin/tiers"/>
        <Nav title="المكافآت" sub="خصومات وشحن مجاني ورصيد وقسائم" path="/admin/rewards"/>
      </Section>

      <Section title="الحسابات والدعم والرقابة">
        <Nav title="إدارة الحسابات" sub="العملاء والدليفيري والمطاعم والموظفون وصلاحياتهم" path="/admin/users"/>
        <Nav title="حسابات العملاء والمحافظ" sub="إضافة رصيد أو خصمه ومراجعة العمليات" path="/admin/customer-accounts"/>
        <Nav title="الدعم" sub="المحادثات وطلبات المساعدة" path="/admin/support"/>
        <Nav title="الموظفون" sub="بيانات العمل والمكتب والصلاحيات التشغيلية" path="/admin/employees"/>
        <Nav title="سجل المراجعة" sub="متابعة العمليات المهمة — للسوبر أدمن" path="/admin/audit"/>
      </Section>
    </ScrollView>
  </SafeAreaView>;
}
function Section(p:any){return <View style={{marginTop:20}}><Text style={s.section}>{p.title}</Text>{p.children}</View>}
function ToggleRow({title,sub,value,onToggle,disabled}:{title:string;sub:string;value:any;onToggle:(x:any)=>void;disabled:boolean}) {
  if (!value) return null;
  return <View style={s.row}><Switch value={Boolean(value.is_enabled)} onValueChange={()=>onToggle(value)} disabled={disabled}/><View style={{flex:1}}><Text style={s.rowTitle}>{title}</Text><Text style={s.rowSub}>{sub}</Text></View></View>;
}
function Nav({title,sub,path}:{title:string;sub:string;path:string}){return <Pressable onPress={()=>router.push(path as any)} style={s.card}><Text style={s.arrow}>‹</Text><View style={{flex:1}}><Text style={s.cardTitle}>{title}</Text><Text style={s.cardSub}>{sub}</Text></View></Pressable>}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:theme.background},page:{padding:18,paddingBottom:112},
 back:{width:44,height:44,borderRadius:14,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},backText:{fontSize:22,color:theme.text},
 title:{fontSize:28,fontWeight:'900',color:theme.text,textAlign:'right',marginTop:15},sub:{fontSize:11,color:theme.muted,textAlign:'right',marginTop:4,lineHeight:18},error:{color:theme.danger,textAlign:'right',marginTop:10},
 section:{fontSize:18,fontWeight:'900',color:theme.text,textAlign:'right',marginBottom:9},
 row:{minHeight:64,borderRadius:16,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:13,marginBottom:7,gap:12},
 rowTitle:{color:theme.text,fontWeight:'900',fontSize:13,textAlign:'right'},rowSub:{color:theme.muted,fontSize:9,textAlign:'right',marginTop:3},
 card:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:17,padding:14,marginBottom:8,flexDirection:'row',alignItems:'center'},arrow:{color:theme.muted,fontSize:26,marginRight:8},cardTitle:{color:theme.text,fontWeight:'900',fontSize:14,textAlign:'right'},cardSub:{color:theme.muted,fontSize:10,textAlign:'right',marginTop:3}
});