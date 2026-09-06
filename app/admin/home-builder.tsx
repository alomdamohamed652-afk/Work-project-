import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

const API=(process.env.EXPO_PUBLIC_API_URL||'').replace(/\/$/,'');
const TYPES=[['custom','قسم عادي','عنوان ومحتوى قابلان للتخصيص'],['banner','بانر','رسالة بارزة أعلى الصفحة'],['popup','نافذة','رسالة تظهر للمستخدم']] as const;
const DESTINATIONS=[
  ['restaurants','استكشاف المطاعم','/customer/restaurants'],
  ['favorites','المفضلة','/customer/favorites'],
  ['wallet','المحفظة','/customer/wallet'],
  ['orders','طلباتي','/customer/tracking'],
  ['support','الدعم','/customer/support'],
] as const;

export default function Builder(){
  const [sections,setSections]=useState<any[]>([]);
  const [title,setTitle]=useState('');
  const [subtitle,setSubtitle]=useState('');
  const [button,setButton]=useState('');
  const [route,setRoute]=useState('/customer/restaurants');
  const [type,setType]=useState<string>('custom');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const token=()=>AsyncStorage.getItem('auth_token');
  const read=async(r:Response)=>{try{return await r.json()}catch{return {error:'تعذر قراءة رد الخادم'}}};

  const load=async()=>{
    try{
      const t=await token();
      const r=await fetch(API+'/api/operations/admin/home',{headers:{Authorization:`Bearer ${t}`}});
      const d=await read(r);
      if(!r.ok)throw Error(d.error||'تعذر تحميل الإعدادات');
      setSections(d.sections||[]);
    }catch(e){setError(e instanceof Error?e.message:'تعذر تحميل إعدادات الشاشة');}
  };
  useEffect(()=>{load()},[]);

  const add=async()=>{
    if(!title.trim())return setError('اكتب اسمًا واضحًا للقسم');
    try{
      setBusy(true);setError('');
      const t=await token();
      const r=await fetch(API+'/api/operations/admin/home/sections',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},
        body:JSON.stringify({
          sectionType:type,
          title:title.trim(),
          subtitle:subtitle.trim(),
          payload:{items:[{title:title.trim(),button:button.trim()||'فتح القسم',route}]},
          sortOrder:sections.length,
        }),
      });
      const d=await read(r);
      if(!r.ok)throw Error(d.error||'تعذر إضافة القسم');
      setTitle('');setSubtitle('');setButton('');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'تعذر إضافة القسم');}
    finally{setBusy(false);}
  };

  const patch=async(id:string,body:any)=>{
    const t=await token();
    const r=await fetch(API+'/api/operations/admin/home/sections/'+id,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(body)});
    const d=await read(r);
    if(!r.ok)throw Error(d.error||'تعذر التحديث');
  };

  const toggle=async(x:any)=>{try{await patch(x.id,{isActive:!x.is_active});load()}catch(e){setError(e instanceof Error?e.message:'تعذر تغيير الحالة');}};
  const move=async(x:any,delta:number)=>{
    const sorted=[...sections].sort((a,b)=>a.sort_order-b.sort_order);
    const i=sorted.findIndex(v=>v.id===x.id),j=i+delta;
    if(j<0||j>=sorted.length)return;
    try{
      await patch(sorted[i].id,{sortOrder:sorted[j].sort_order});
      await patch(sorted[j].id,{sortOrder:sorted[i].sort_order});
      load();
    }catch(e){setError(e instanceof Error?e.message:'تعذر تغيير الترتيب');}
  };
  const remove=(x:any)=>Alert.alert('حذف القسم','سيختفي هذا القسم من الصفحة الرئيسية للعملاء.',[
    {text:'إلغاء',style:'cancel'},
    {text:'حذف',style:'destructive',onPress:async()=>{try{const t=await token();const r=await fetch(API+'/api/operations/admin/home/sections/'+x.id,{method:'DELETE',headers:{Authorization:`Bearer ${t}`}});if(!r.ok)throw Error((await read(r)).error);load()}catch(e){setError(e instanceof Error?e.message:'تعذر الحذف');}}},
  ]);

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Pressable onPress={()=>router.replace('/admin')} style={s.back}><Text style={s.backText}>←</Text></Pressable>
      <Text style={s.title}>تنظيم الواجهة الرئيسية</Text>
      <Text style={s.sub}>هنا أنت تتحكم في ما يظهر للعميل: اسم القسم، نوعه، وترتيبه والوجهة التي يفتحها. لا تحتاج لكتابة مسارات تقنية.</Text>

      <View style={s.card}>
        <Text style={s.section}>1. اختر شكل القسم</Text>
        {TYPES.map(([value,label,desc])=><Pressable key={value} onPress={()=>setType(value)} style={[s.choice,type===value&&s.choiceOn]}>
          <View style={{flex:1}}><Text style={[s.choiceTitle,type===value&&s.choiceTitleOn]}>{label}</Text><Text style={[s.choiceDesc,type===value&&s.choiceDescOn]}>{desc}</Text></View>
          <Text style={[s.check,type===value&&s.checkOn]}>{type===value?'✓':'○'}</Text>
        </Pressable>)}

        <Text style={s.section}>2. محتوى القسم</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="مثال: عروض اليوم" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
        <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="وصف مختصر اختياري" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
        <TextInput value={button} onChangeText={setButton} placeholder="اسم الزر اختياري — مثال: شاهد الكل" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>

        <Text style={s.section}>3. عند الضغط يفتح</Text>
        <View style={s.destinations}>
          {DESTINATIONS.map(([key,label,path])=><Pressable key={key} onPress={()=>setRoute(path)} style={[s.destination,route===path&&s.destinationOn]}>
            <Text style={route===path?s.destinationTextOn:s.destinationText}>{label}</Text>
          </Pressable>)}
        </View>
        <Text style={s.hint}>الوجهة الحالية: {DESTINATIONS.find(x=>x[2]===route)?.[1]||'مخصصة'}</Text>

        <Pressable disabled={busy} onPress={add} style={[s.primary,busy&&{opacity:.6}]}><Text style={s.primaryText}>{busy?'جاري الحفظ...':'إضافة القسم إلى الرئيسية'}</Text></Pressable>
      </View>

      {error?<Text style={s.error}>{error}</Text>:null}
      <Text style={s.currentTitle}>الأقسام الحالية</Text>
      {[...sections].sort((a,b)=>a.sort_order-b.sort_order).map((x,i)=>(
        <View key={x.id} style={[s.item,!x.is_active&&s.itemOff]}>
          <View style={s.itemTop}>
            <View style={s.order}><Text style={s.orderText}>{i+1}</Text></View>
            <View style={{flex:1}}><Text style={s.name}>{x.title||'بدون عنوان'}</Text><Text style={s.meta}>{x.section_type==='banner'?'بانر':x.section_type==='popup'?'نافذة':'قسم'} • {x.is_active?'ظاهر للعميل':'مخفي'}</Text></View>
          </View>
          <Text style={s.meta}>الزر: {x.payload?.items?.[0]?.button||'فتح القسم'} • الوجهة: {DESTINATIONS.find(d=>d[2]===x.payload?.items?.[0]?.route)?.[1]||'وجهة مخصصة'}</Text>
          <View style={s.actions}>
            <Pressable onPress={()=>move(x,-1)} style={s.actionBtn}><Text style={s.actionText}>رفع ↑</Text></Pressable>
            <Pressable onPress={()=>move(x,1)} style={s.actionBtn}><Text style={s.actionText}>خفض ↓</Text></Pressable>
            <Pressable onPress={()=>toggle(x)} style={s.actionBtn}><Text style={x.is_active?s.stopText:s.enableText}>{x.is_active?'إخفاء':'إظهار'}</Text></Pressable>
            <Pressable onPress={()=>remove(x)} style={s.actionBtn}><Text style={s.deleteText}>حذف</Text></Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.background},page:{padding:17,paddingTop:18,paddingBottom:28},
  back:{width:42,height:42,borderRadius:13,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},backText:{fontSize:21,color:theme.text},
  title:{fontSize:26,fontWeight:'900',color:theme.text,textAlign:'right',marginTop:14},sub:{color:theme.muted,fontSize:11,textAlign:'right',lineHeight:18,marginTop:5},
  card:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:19,padding:14,marginTop:14},section:{color:theme.text,fontSize:14,fontWeight:'900',textAlign:'right',marginTop:12,marginBottom:8},
  choice:{borderWidth:1,borderColor:theme.border,borderRadius:13,padding:11,marginBottom:7,flexDirection:'row-reverse',alignItems:'center',gap:9},choiceOn:{backgroundColor:theme.primarySoft,borderColor:theme.primary},
  choiceTitle:{color:theme.text,fontWeight:'900',textAlign:'right'},choiceTitleOn:{color:theme.primary},choiceDesc:{color:theme.muted,fontSize:9,textAlign:'right',marginTop:3},choiceDescOn:{color:theme.text},
  check:{color:theme.muted,fontSize:18},checkOn:{color:theme.primary},input:{height:47,borderWidth:1,borderColor:theme.border,borderRadius:12,backgroundColor:theme.background,color:theme.text,paddingHorizontal:12,marginBottom:7},
  destinations:{flexDirection:'row-reverse',flexWrap:'wrap',gap:7},destination:{paddingHorizontal:11,paddingVertical:9,borderRadius:11,borderWidth:1,borderColor:theme.border},destinationOn:{backgroundColor:theme.primary,borderColor:theme.primary},
  destinationText:{color:theme.text,fontSize:10,fontWeight:'800'},destinationTextOn:{color:'#fff',fontSize:10,fontWeight:'900'},hint:{color:theme.muted,fontSize:9,textAlign:'right',marginTop:9},
  primary:{height:48,borderRadius:13,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center',marginTop:13},primaryText:{color:'#fff',fontWeight:'900'},
  error:{color:theme.danger,fontSize:11,textAlign:'right',marginTop:9},currentTitle:{color:theme.text,fontSize:17,fontWeight:'900',textAlign:'right',marginTop:20,marginBottom:9},
  item:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:16,padding:12,marginBottom:8},itemOff:{opacity:.6},itemTop:{flexDirection:'row-reverse',alignItems:'center',gap:9},
  order:{width:30,height:30,borderRadius:10,backgroundColor:theme.background,alignItems:'center',justifyContent:'center'},orderText:{color:theme.primary,fontWeight:'900'},name:{color:theme.text,fontWeight:'900',textAlign:'right'},meta:{color:theme.muted,fontSize:9,textAlign:'right',marginTop:4},
  actions:{flexDirection:'row-reverse',flexWrap:'wrap',gap:7,marginTop:10},actionBtn:{paddingHorizontal:10,paddingVertical:8,borderRadius:10,backgroundColor:theme.background},actionText:{color:theme.text,fontSize:10,fontWeight:'900'},stopText:{color:theme.warning,fontSize:10,fontWeight:'900'},enableText:{color:theme.success,fontSize:10,fontWeight:'900'},deleteText:{color:theme.danger,fontSize:10,fontWeight:'900'},
});