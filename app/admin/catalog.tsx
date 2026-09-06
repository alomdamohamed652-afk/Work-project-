import AsyncStorage from 'expo-secure-store';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

const API=(process.env.EXPO_PUBLIC_API_URL||'').replace(/\/$/,'');
const read=async(r:Response)=>{try{return await r.json()}catch{return {error:'تعذر قراءة رد الخادم'}}};

export default function Catalog(){
  const [tab,setTab]=useState('banners');
  const [banners,setBanners]=useState<any[]>([]);
  const [tiers,setTiers]=useState<any[]>([]);
  const [badges,setBadges]=useState<any[]>([]);
  const [title,setTitle]=useState(''),[subtitle,setSubtitle]=useState(''),[image,setImage]=useState(''),[action,setAction]=useState('');
  const [tierName,setTierName]=useState(''),[tierOrders,setTierOrders]=useState('');
  const [badgeName,setBadgeName]=useState(''),[badgeIcon,setBadgeIcon]=useState('🏷️'),[badgeDescription,setBadgeDescription]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const token=()=>AsyncStorage.getItemAsync('auth_token');

  const load=async()=>{try{setError('');const t=await token();const[x,y,z]=await Promise.all([
    fetch(API+'/api/admin/catalog/banners',{headers:{Authorization:`Bearer ${t}`}}),
    fetch(API+'/api/admin/catalog/tiers',{headers:{Authorization:`Bearer ${t}`}}),
    fetch(API+'/api/admin/catalog/badges',{headers:{Authorization:`Bearer ${t}`}})
  ]);const[a,b,c]=await Promise.all([read(x),read(y),read(z)]);if(!x.ok||!y.ok||!z.ok)throw Error(a.error||b.error||c.error||'تعذر تحميل المحتوى');setBanners(a.banners||[]);setTiers(b.tiers||[]);setBadges(c.badges||[])}catch(e){setError(e instanceof Error?e.message:'تعذر تحميل المحتوى')}};
  useEffect(()=>{load()},[]);

  const request=async(path:string,method:string,body?:any)=>{const r=await fetch(API+path,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${await token()}`},body:body===undefined?undefined:JSON.stringify(body)}),d=await read(r);if(!r.ok)throw Error(d.error||'تعذر تنفيذ العملية');return d};
  const run=async(fn:()=>Promise<void>)=>{try{setBusy(true);setError('');await fn()}catch(e){setError(e instanceof Error?e.message:'تعذر تنفيذ العملية')}finally{setBusy(false)}};

  const addBanner=()=>run(async()=>{await request('/api/admin/catalog/banners','POST',{title,subtitle,imageUrl:image,actionLabel:action});setTitle('');setSubtitle('');setImage('');setAction('');await load()});
  const addTier=()=>run(async()=>{await request('/api/admin/catalog/tiers','POST',{name:tierName,monthlyOrders:Number(tierOrders)});setTierName('');setTierOrders('');await load()});
  const addBadge=()=>run(async()=>{if(!badgeName.trim())throw Error('اكتب اسم البادج');await request('/api/admin/catalog/badges','POST',{name:badgeName,icon:badgeIcon,description:badgeDescription});setBadgeName('');setBadgeIcon('🏷️');setBadgeDescription('');await load()});
  const editBadge=(x:any)=>Alert.prompt?.('تعديل البادج','اكتب الاسم الجديد',async name=>{if(name?.trim())await run(async()=>{await request('/api/admin/catalog/badges/'+x.id,'PATCH',{name:name.trim()});await load()})},'plain-text',x.name);
  const toggleBadge=(x:any)=>run(async()=>{await request('/api/admin/catalog/badges/'+x.id,'PATCH',{isActive:!x.is_active});await load()});
  const deleteBadge=(x:any)=>Alert.alert('حذف البادج',`سيتم حذفه من جميع المطاعم.\n${x.name}`,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:()=>run(async()=>{await request('/api/admin/catalog/badges/'+x.id,'DELETE');await load()})}]);

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Pressable onPress={()=>router.replace('/admin')} style={s.back}><Text style={s.backText}>←</Text></Pressable>
    <Text style={s.title}>واجهة المتجر والمحتوى</Text>
    <Text style={s.sub}>هنا تُنشئ البانرات والفئات وبادجات المطاعم. لإسناد بادج لمطعم: إدارة المطاعم ← افتح المطعم ← التصنيفات والبادجات.</Text>
    <View style={s.tabs}>{[['banners','البانرات'],['tiers','الفئات الشهرية'],['badges','بادجات المطاعم']].map(x=><Pressable key={x[0]} onPress={()=>setTab(x[0])} style={[s.tab,tab===x[0]&&s.on]}><Text style={tab===x[0]?s.onText:s.text}>{x[1]}</Text></Pressable>)}</View>
    {error?<Text style={s.error}>{error}</Text>:null}

    {tab==='banners'?<><Hint text="البانر يحتاج عنوانًا وصورة ورابطًا اختياريًا للوجهة."/><Field value={title} set={setTitle} ph="عنوان البانر"/><Field value={subtitle} set={setSubtitle} ph="وصف مختصر"/><Field value={image} set={setImage} ph="رابط صورة البانر (URL)"/><Field value={action} set={setAction} ph="اسم زر البانر"/><Pressable disabled={busy} onPress={addBanner} style={s.primary}><Text style={s.btn}>+ إضافة بانر</Text></Pressable>{banners.map(x=><View key={x.id} style={s.card}><Text style={s.name}>{x.title}</Text><Text style={s.muted}>{x.subtitle||'بدون وصف'}</Text></View>)}</>
    :tab==='tiers'?<><Hint text="هذه مستويات العميل الشهرية، وليست بادجات للمطاعم."/><Field value={tierName} set={setTierName} ph="اسم الفئة مثل الذهبية"/><Field value={tierOrders} set={setTierOrders} ph="عدد الطلبات الشهري"/><Pressable disabled={busy} onPress={addTier} style={s.primary}><Text style={s.btn}>+ إضافة فئة</Text></Pressable>{tiers.map(x=><View key={x.id} style={s.card}><Text style={s.name}>{x.name}</Text><Text style={s.muted}>{x.monthly_orders} طلب شهريًا • {x.badge_label||''}</Text></View>)}</>
    :<><Hint text="1) أنشئ البادج هنا. 2) افتح المطعم من إدارة المطاعم. 3) اختر التصنيفات والبادجات لإسناده للمطعم."/><Field value={badgeName} set={setBadgeName} ph="اسم البادج — مثال: الأكثر طلبًا"/><Field value={badgeIcon} set={setBadgeIcon} ph="الأيقونة — مثال: 🔥"/><Field value={badgeDescription} set={setBadgeDescription} ph="وصف البادج (اختياري)"/><Pressable disabled={busy} onPress={addBadge} style={s.primary}><Text style={s.btn}>+ إنشاء بادج</Text></Pressable>{badges.map(x=><View key={x.id} style={[s.card,!x.is_active&&s.off]}><Text style={s.name}>{x.icon||'🏷️'} {x.name}</Text><Text style={s.muted}>{x.description||'بدون وصف'} • {x.is_active?'نشط':'مخفي'}</Text><View style={s.actions}><Pressable onPress={()=>editBadge(x)} style={s.action}><Text style={s.actionText}>تعديل الاسم</Text></Pressable><Pressable onPress={()=>toggleBadge(x)} style={s.action}><Text style={x.is_active?s.warn:s.good}>{x.is_active?'إخفاء':'إظهار'}</Text></Pressable><Pressable onPress={()=>deleteBadge(x)} style={s.action}><Text style={s.bad}>حذف</Text></Pressable></View></View>)}</>}
  </ScrollView></SafeAreaView>
}
function Field({value,set,ph}:{value:string;set:(v:string)=>void;ph:string}){return <TextInput value={value} onChangeText={set} placeholder={ph} placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>}
function Hint({text}:{text:string}){return <View style={s.hint}><Text style={s.hintText}>{text}</Text></View>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:theme.background},content:{padding:18,paddingTop:22,paddingBottom:50},back:{width:42,height:42,borderRadius:13,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},backText:{fontSize:23,color:theme.text},title:{color:theme.text,fontSize:27,fontWeight:'900',textAlign:'right',marginTop:15},sub:{color:theme.muted,textAlign:'right',fontSize:11,lineHeight:18,marginTop:4,marginBottom:12},tabs:{flexDirection:'row-reverse',gap:7,marginBottom:12},tab:{flex:1,padding:11,borderRadius:12,borderWidth:1,borderColor:theme.border,alignItems:'center',backgroundColor:theme.surface},on:{backgroundColor:theme.primary,borderColor:theme.primary},text:{color:theme.text,fontSize:10,fontWeight:'800'},onText:{color:'#fff',fontSize:10,fontWeight:'900'},hint:{backgroundColor:theme.primarySoft,borderRadius:13,padding:11,marginBottom:9},hintText:{color:theme.primary,fontSize:10,lineHeight:16,textAlign:'right',fontWeight:'800'},input:{height:49,borderRadius:13,borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface,color:theme.text,paddingHorizontal:13,marginBottom:8},primary:{height:48,borderRadius:13,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center',marginBottom:10},btn:{color:'#fff',fontWeight:'900'},card:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:15,padding:13,marginBottom:8},off:{opacity:.55},name:{color:theme.text,fontWeight:'900',textAlign:'right'},muted:{color:theme.muted,fontSize:10,textAlign:'right',marginTop:4},actions:{flexDirection:'row-reverse',gap:7,marginTop:10},action:{paddingHorizontal:10,paddingVertical:8,borderRadius:10,backgroundColor:theme.background},actionText:{color:theme.text,fontSize:9,fontWeight:'900'},warn:{color:theme.warning,fontSize:9,fontWeight:'900'},good:{color:theme.success,fontSize:9,fontWeight:'900'},bad:{color:theme.danger,fontSize:9,fontWeight:'900'},error:{color:theme.danger,textAlign:'right',marginBottom:8}});
