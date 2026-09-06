import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

const API = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

export default function Locations() {
  const [data, setData] = useState<any>({ governorates: [], centers: [] });
  const [govName, setGovName] = useState('');
  const [centerName, setCenterName] = useState('');
  const [editingGov, setEditingGov] = useState<any>(null);
  const [editingCenter, setEditingCenter] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null); const [areaName,setAreaName]=useState(''); const [officeId,setOfficeId]=useState(''); const [areaLat,setAreaLat]=useState(''); const [areaLon,setAreaLon]=useState(''); const [radius,setRadius]=useState('');

  const token = () => AsyncStorage.getItem('auth_token');

  const readError = async (r: Response) => {
    try { return (await r.json()).error || 'تعذر تنفيذ العملية'; } catch { return 'تعذر تنفيذ العملية'; }
  };

  const loadAreas=async(id:string)=>{try{const t=await token();const r=await fetch(API+'/api/operations/admin/offices/'+id+'/areas',{headers:{Authorization:'Bearer '+t}});const d=await r.json();setData((x:any)=>({...x,officeAreas:d.areas||[]}))}catch{}};
  const load = async () => {
    try {
      const t = await token();
      const r = await fetch(API + '/api/operations/admin/locations', { headers: { Authorization: `Bearer ${t}` } });
      if (!r.ok) throw Error(await readError(r));
      setData(await r.json());
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'تعذر تحميل المحافظات');
    }
  };

  useEffect(() => { load(); }, []);

  const saveArea=async()=>{if(!officeId||!areaName.trim()||!areaLat||!areaLon||!radius)return Alert.alert('تنبيه','اختار مكتب واكتب اسم المنطقة والإحداثيات ونطاق الخدمة');try{const t=await token();const r=await fetch(API+'/api/operations/admin/offices/'+officeId+'/areas',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify({name:areaName.trim(),centerLatitude:Number(areaLat),centerLongitude:Number(areaLon),radiusMeters:Number(radius)})});if(!r.ok)return Alert.alert('خطأ',await readError(r));setAreaName('');setAreaLat('');setAreaLon('');setRadius('');load()}catch(e){Alert.alert('خطأ','تعذر حفظ نطاق الخدمة')}};

  const saveGovernorate = async () => {
    if (!govName.trim()) return Alert.alert('تنبيه', 'اكتب اسم المحافظة');
    const t = await token();
    const url = editingGov
      ? API + '/api/operations/admin/locations/governorates/' + editingGov.id
      : API + '/api/operations/admin/locations/governorates';
    const r = await fetch(url, {
      method: editingGov ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ name: govName.trim() }),
    });
    if (!r.ok) return Alert.alert('خطأ', await readError(r));
    setGovName('');
    setEditingGov(null);
    load();
  };

  const saveCenter = async (governorate: any) => {
    if (!centerName.trim()) return Alert.alert('تنبيه', 'اكتب اسم المركز أو القسم');
    const t = await token();
    const url = editingCenter
      ? API + '/api/operations/admin/locations/centers/' + editingCenter.id
      : API + '/api/operations/admin/locations/centers';
    const body = editingCenter ? { name: centerName.trim() } : { governorateId: governorate.id, name: centerName.trim() };
    const r = await fetch(url, {
      method: editingCenter ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    });
    if (!r.ok) return Alert.alert('خطأ', await readError(r));
    setCenterName('');
    setEditingCenter(null);
    load();
  };

  const toggle = async (type: string, id: string, value: boolean) => {
    const t = await token();
    const r = await fetch(API + `/api/operations/admin/locations/${type}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ isActive: !value }),
    });
    if (!r.ok) return Alert.alert('خطأ', await readError(r));
    load();
  };

  const remove = (type: string, id: string) => {
    Alert.alert('تأكيد الحذف', 'سيتم حذف العنصر من النظام.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          const t = await token();
          const r = await fetch(API + `/api/operations/admin/locations/${type}/${id}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${t}` },
          });
          if (!r.ok) Alert.alert('خطأ', await readError(r));
          else load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.replace('/admin/operations')} style={s.back}><Text style={s.backText}>←</Text></Pressable>
        <Text style={s.title}>المحافظات والمراكز</Text>
        <Text style={s.sub}>كل محافظة عبارة عن مجموعة قابلة للفتح. افتح المحافظة لتظهر مراكزها وتديرها في مكانها.</Text>

        <View style={s.card}>
          <Text style={s.label}>{editingGov ? 'تعديل محافظة' : 'إضافة محافظة جديدة'}</Text>
          <TextInput value={govName} onChangeText={setGovName} placeholder="مثل: القاهرة" placeholderTextColor={theme.muted} style={s.input} textAlign="right" />
          <View style={s.row}>
            <Pressable onPress={saveGovernorate} style={s.primary}><Text style={s.primaryText}>{editingGov ? 'حفظ التعديل' : 'إضافة المحافظة'}</Text></Pressable>
            {editingGov && <Pressable onPress={() => { setEditingGov(null); setGovName(''); }} style={s.secondary}><Text style={s.secondaryText}>إلغاء</Text></Pressable>}
          </View>
        </View>

        <Text style={s.section}>نطاق التوصيل المسموح</Text>
        <View style={s.card}>
          <Text style={s.sub}>لو لم تضف أي نطاق فلن يتم رفض العميل بسبب موقعه. بعد إضافة نطاق، يتم التحقق من GPS داخل دائرة الخدمة.</Text>
          <Text style={s.label}>المكتب</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{(data.offices||[]).map((o:any)=><Pressable key={o.id} onPress={()=>setOfficeId(o.id);loadAreas(o.id)} style={[s.chip,officeId===o.id&&s.on]}><Text style={officeId===o.id?s.onText:s.chipText}>{o.name}</Text></Pressable>)}</ScrollView>
          {!data.offices?.length&&<Text style={s.warning}>أضف مكتب تشغيل أولًا من إدارة العمليات.</Text>}
          <TextInput value={areaName} onChangeText={setAreaName} placeholder="اسم النطاق: وسط بنها" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
          <TextInput value={areaLat} onChangeText={setAreaLat} placeholder="Latitude مثال: 30.466" keyboardType="decimal-pad" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
          <TextInput value={areaLon} onChangeText={setAreaLon} placeholder="Longitude مثال: 31.184" keyboardType="decimal-pad" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
          <TextInput value={radius} onChangeText={setRadius} placeholder="نصف القطر بالمتر: 5000" keyboardType="numeric" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
          <Pressable onPress={saveArea} style={s.primary}><Text style={s.primaryText}>إضافة نطاق الخدمة</Text></Pressable>
          {officeId&&(data.officeAreas||[]).map((a:any)=><View key={a.id} style={s.areaRow}><Text style={s.meta}>{a.name} • {a.radius_meters} متر</Text><Text style={s.meta}>📍 {a.center_latitude}, {a.center_longitude}</Text></View>)}
        </View>
        <Text style={s.section}>التنظيم الإداري</Text>
        {(data.governorates || []).map((g: any) => {
          const centers = (data.centers || []).filter((c: any) => c.governorate_id === g.id);
          const open = expanded === g.id;
          return (
            <View key={g.id} style={s.govCard}>
              <Pressable onPress={() => { setExpanded(open ? null : g.id); setEditingCenter(null); setCenterName(''); }} style={s.govHead}>
                <Text style={s.chevron}>{open ? '⌃' : '⌄'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.govName}>{g.name}</Text>
                  <Text style={s.meta}>{g.is_active ? 'مفعلة' : 'موقوفة'} • {centers.length} مركز/قسم</Text>
                </View>
              </Pressable>

              <View style={s.govActions}>
                <Pressable onPress={() => toggle('governorates', g.id, g.is_active)} style={s.smallButton}><Text style={g.is_active ? s.stopText : s.enableText}>{g.is_active ? 'إيقاف' : 'تفعيل'}</Text></Pressable>
                <Pressable onPress={() => { setEditingGov(g); setGovName(g.name); }} style={s.smallButton}><Text style={s.editText}>تعديل</Text></Pressable>
                <Pressable onPress={() => remove('governorates', g.id)} style={s.smallButton}><Text style={s.deleteText}>حذف</Text></Pressable>
              </View>

              {open && (
                <View style={s.centersBox}>
                  <Text style={s.centersTitle}>مراكز وأقسام {g.name}</Text>
                  {centers.map((c: any) => (
                    <View key={c.id} style={s.centerRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.centerName}>{c.name}</Text>
                        <Text style={s.meta}>{c.is_active ? 'مفعل' : 'موقوف'}</Text>
                      </View>
                      <View style={s.centerActions}>
                        <Pressable onPress={() => toggle('centers', c.id, c.is_active)}><Text style={c.is_active ? s.stopText : s.enableText}>{c.is_active ? 'إيقاف' : 'تفعيل'}</Text></Pressable>
                        <Pressable onPress={() => { setEditingCenter(c); setCenterName(c.name); }}><Text style={s.editText}>تعديل</Text></Pressable>
                        <Pressable onPress={() => remove('centers', c.id)}><Text style={s.deleteText}>حذف</Text></Pressable>
                      </View>
                    </View>
                  ))}

                  <View style={s.addCenter}>
                    <Text style={s.label}>{editingCenter ? 'تعديل المركز' : 'إضافة مركز/قسم'}</Text>
                    <TextInput value={centerName} onChangeText={setCenterName} placeholder="مثل: مدينة نصر" placeholderTextColor={theme.muted} style={s.input} textAlign="right" />
                    <View style={s.row}>
                      <Pressable onPress={() => saveCenter(g)} style={s.primary}><Text style={s.primaryText}>{editingCenter ? 'حفظ التعديل' : 'إضافة المركز'}</Text></Pressable>
                      {editingCenter && <Pressable onPress={() => { setEditingCenter(null); setCenterName(''); }} style={s.secondary}><Text style={s.secondaryText}>إلغاء</Text></Pressable>}
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.background}, page:{padding:18,paddingBottom:28},
  back:{width:44,height:44,borderRadius:14,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},
  backText:{fontSize:22,color:theme.text}, title:{fontSize:28,fontWeight:'900',color:theme.text,textAlign:'right',marginTop:14},
  sub:{fontSize:11,color:theme.muted,textAlign:'right',lineHeight:18,marginTop:5}, card:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:19,padding:14,marginTop:14},
  label:{color:theme.text,fontWeight:'900',textAlign:'right',marginBottom:8}, input:{height:47,borderWidth:1,borderColor:theme.border,borderRadius:12,backgroundColor:theme.background,color:theme.text,paddingHorizontal:12,marginBottom:8},
  row:{flexDirection:'row-reverse',gap:8}, primary:{flex:1,height:46,borderRadius:12,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center'},
  primaryText:{color:'#fff',fontWeight:'900'}, secondary:{flex:1,height:46,borderRadius:12,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},
  secondaryText:{color:theme.text,fontWeight:'900'}, section:{fontSize:18,fontWeight:'900',color:theme.text,textAlign:'right',marginTop:20,marginBottom:9},
  govCard:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:18,overflow:'hidden',marginBottom:9},
  govHead:{padding:14,flexDirection:'row-reverse',alignItems:'center',gap:10}, chevron:{color:theme.primary,fontSize:22,width:25,textAlign:'center'},
  govName:{color:theme.text,fontSize:16,fontWeight:'900',textAlign:'right'}, meta:{color:theme.muted,fontSize:10,textAlign:'right',marginTop:4},
  govActions:{borderTopWidth:1,borderTopColor:theme.border,padding:10,flexDirection:'row-reverse',gap:7},
  smallButton:{paddingHorizontal:10,paddingVertical:7,borderRadius:10,backgroundColor:theme.background}, stopText:{color:theme.warning,fontSize:10,fontWeight:'900'}, enableText:{color:theme.success,fontSize:10,fontWeight:'900'}, editText:{color:theme.primary,fontSize:10,fontWeight:'900'}, deleteText:{color:theme.danger,fontSize:10,fontWeight:'900'},
  centersBox:{borderTopWidth:1,borderTopColor:theme.border,backgroundColor:theme.background,padding:12}, centersTitle:{color:theme.text,fontWeight:'900',textAlign:'right',marginBottom:8},
  centerRow:{flexDirection:'row-reverse',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:theme.border,gap:8}, centerName:{color:theme.text,textAlign:'right',fontWeight:'800'},
  centerActions:{flexDirection:'row',gap:10}, chips:{gap:7,flexDirection:'row-reverse',paddingVertical:6},chip:{paddingHorizontal:11,paddingVertical:8,borderRadius:12,borderWidth:1,borderColor:theme.border,backgroundColor:theme.background},chipText:{color:theme.text,fontSize:10,fontWeight:'800'},on:{backgroundColor:theme.primary,borderColor:theme.primary},onText:{color:'#fff',fontSize:10,fontWeight:'900'},warning:{color:theme.warning,textAlign:'right',fontSize:10,marginBottom:8},areaRow:{padding:9,borderTopWidth:1,borderTopColor:theme.border}, addCenter:{marginTop:10,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:14,padding:11},
});