import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

const API=(process.env.EXPO_PUBLIC_API_URL||'').replace(/\/$/,'');
const TYPES=[['custom','قسم بطاقات','عدة عناصر قابلة للضغط'],['banner','بانر','رسالة أو عرض بارز'],['popup','نافذة','رسالة تظهر للمستخدم']] as const;
const LAYOUTS=[['horizontal','بطاقات أفقية'],['grid','شبكة'],['single','عنصر واحد']] as const;
const DESTINATIONS=[
  ['restaurants','كل المطاعم والجهات','/customer/restaurants'],
  ['pharmacies','قسم الصيدليات','/customer/restaurants?merchantType=pharmacy'],
  ['supermarkets','قسم السوبر ماركت','/customer/restaurants?merchantType=supermarket'],
  ['groceries','قسم البقالة','/customer/restaurants?merchantType=grocery'],
  ['butcher','قسم الجزارة','/customer/restaurants?merchantType=butcher'],
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
  const [itemImage,setItemImage]=useState('');
  const [itemTitle,setItemTitle]=useState('');
  const [items,setItems]=useState<any[]>([]);
  const [layout,setLayout]=useState('horizontal');
  const [route,setRoute]=useState('/customer/restaurants');
  const [type,setType]=useState<string>('custom');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [editing,setEditing]=useState<any>(null);
  const [startsAt,setStartsAt]=useState('');
  const [expiresAt,setExpiresAt]=useState('');

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

  const addItem=()=>{if(!itemTitle.trim())return setError('اكتب اسم العنصر');setItems(x=>[...x,{title:itemTitle.trim(),button:button.trim()||'فتح القسم',route,image:itemImage.trim()||null}]);setItemTitle('');setButton('');setItemImage('');};
  const removeItem=(i:number)=>setItems(x=>x.filter((_,index)=>index!==i));

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
          payload:{layout,items:items.length?items:[{title:itemTitle.trim()||title.trim(),button:button.trim()||'فتح القسم',route,image:itemImage.trim()||null}]},
          sortOrder:sections.length,
          startsAt:startsAt.trim()||null,
          expiresAt:expiresAt.trim()||null,
        }),
      });
      const d=await read(r);
      if(!r.ok)throw Error(d.error||'تعذر إضافة القسم');
      setTitle('');setSubtitle('');setItemTitle('');setButton('');setItemImage('');setItems([]);setLayout('horizontal');setStartsAt('');setExpiresAt('');
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
  const openEdit=(x:any)=>{const p=x.payload||{};setEditing(x);setTitle(x.title||'');setSubtitle(x.subtitle||'');setType(x.section_type||'custom');setItems(p.items||[]);setLayout(p.layout||'horizontal');setStartsAt(x.starts_at?String(x.starts_at).slice(0,16):'');setExpiresAt(x.expires_at?String(x.expires_at).slice(0,16):'');setItemTitle('');setButton('');setItemImage('');setRoute(p.items?.[0]?.route||'/customer/restaurants');};
  const saveEdit=async()=>{if(!editing)return;if(!title.trim())return setError('اكتب اسم القسم');try{setBusy(true);await patch(editing.id,{title:title.trim(),subtitle:subtitle.trim(),payload:{layout,items},startsAt:startsAt.trim()||null,expiresAt:expiresAt.trim()||null});setEditing(null);setTitle('');setSubtitle('');setItems([]);setStartsAt('');setExpiresAt('');await load()}catch(e){setError(e instanceof Error?e.message:'تعذر حفظ التعديل')}finally{setBusy(false)}};
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
      <Text style={s.sub}>هنا أنت تتحكم في ما يظهر للعميل: اسم القسم، صورته، نوعه، ترتيبه والوجهة التي يفتحها. لا تحتاج لكتابة مسارات تقنية؛ اختر مثلًا «قسم الصيدليات» وسيتم الفلترة تلقائيًا.</Text>

      <View style={s.card}>
        <Text style={s.section}>1. اختر شكل القسم</Text>
        {TYPES.map(([value,label,desc])=><Pressable key={value} onPress={()=>setType(value)} style={[s.choice,type===value&&s.choiceOn]}>
          <View style={{flex:1}}><Text style={[s.choiceTitle,type===value&&s.choiceTitleOn]}>{label}</Text><Text style={[s.choiceDesc,type===value&&s.choiceDescOn]}>{desc}</Text></View>
          <Text style={[s.check,type===value&&s.checkOn]}>{type===value?'✓':'○'}</Text>
        </Pressable>)}

        <Text style={s.section}>2. محتوى القسم</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="مثال: عروض اليوم" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
        <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="وصف مختصر اختياري" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
        <TextInput value={itemTitle} onChangeText={setItemTitle} placeholder="اسم العنصر — مثال: صيدليات قريبة" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
        <TextInput value={button} onChangeText={setButton} placeholder="اسم الزر — مثال: عرض الصيدليات" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
        <TextInput value={itemImage} onChangeText={setItemImage} placeholder="رابط صورة للعنصر (اختياري)" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
        <Text style={s.hint}>العناصر داخل القسم يمكن أن يكون لكل واحد منها صورة مستقلة.</Text>

        <Text style={s.section}>3. عند الضغط يفتح</Text>
        <View style={s.destinations}>
          {DESTINATIONS.map(([key,label,path])=><Pressable key={key} onPress={()=>setRoute(path)} style={[s.destination,route===path&&s.destinationOn]}>
            <Text style={route===path?s.destinationTextOn:s.destinationText}>{label}</Text>
          </Pressable>)}
        </View>
        <Text style={s.hint}>الوجهة الحالية: {DESTINATIONS.find(x=>x[2]===route)?.[1]||'مخصصة'}. مثال: لو اخترت «قسم الصيدليات» سيفتح العميل قائمة الجهات مفلترة على الصيدليات.</Text>
        <Text style={s.section}>4. عناصر القسم</Text>
        <Text style={s.hint}>يمكنك إضافة أكثر من بطاقة. كل بطاقة لها صورة وزر ووجهة مستقلة.</Text>
        <Pressable onPress={addItem} style={s.secondary}><Text style={s.secondaryText}>+ إضافة العنصر الحالي للقسم</Text></Pressable>
        {items.map((it,i)=><View key={i} style={s.preview}><View style={{flex:1}}><Text style={s.previewTitle}>{i+1}. {it.title}</Text><Text style={s.meta}>الزر: {it.button} • {DESTINATIONS.find(d=>d[2]===it.route)?.[1]||'وجهة مخصصة'} • {it.image?'بصورة':'بدون صورة'}</Text></View><Pressable onPress={()=>removeItem(i)}><Text style={s.deleteText}>حذف</Text></Pressable></View>)}
        <Text style={s.section}>5. شكل العرض</Text>
        <View style={s.destinations}>{LAYOUTS.map(([value,label])=><Pressable key={value} onPress={()=>setLayout(value)} style={[s.destination,layout===value&&s.destinationOn]}><Text style={layout===value?s.destinationTextOn:s.destinationText}>{label}</Text></Pressable>)}</View>
        <Text style={s.section}>6. وقت النشر (اختياري)</Text>
        <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="بداية العرض: YYYY-MM-DDTHH:MM" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
        <TextInput value={expiresAt} onChangeText={setExpiresAt} placeholder="نهاية العرض: YYYY-MM-DDTHH:MM" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
        <Pressable disabled={busy} onPress={add} style={[s.primary,busy&&{opacity:.6}]}><Text style={s.primaryText}>{busy?'جاري الحفظ...':items.length?'حفظ القسم وعناصره':'إضافة القسم إلى الرئيسية'}</Text></Pressable>
      </View>

      {error?<Text style={s.error}>{error}</Text>:null}
      <Text style={s.currentTitle}>الأقسام الحالية</Text>
      {[...sections].sort((a,b)=>a.sort_order-b.sort_order).map((x,i)=>(
        <View key={x.id} style={[s.item,!x.is_active&&s.itemOff]}>
          <View style={s.itemTop}>
            <View style={s.order}><Text style={s.orderText}>{i+1}</Text></View>
            <View style={{flex:1}}><Text style={s.name}>{x.title||'بدون عنوان'}</Text><Text style={s.meta}>{x.section_type==='banner'?'بانر':x.section_type==='popup'?'نافذة':'قسم'} • {x.is_active?'ظاهر للعميل':'مخفي'}</Text></View>
          </View>
          <Text style={s.meta}>الزر: {x.payload?.items?.[0]?.button||'فتح القسم'} • الوجهة: {DESTINATIONS.find(d=>d[2]===x.payload?.items?.[0]?.route)?.[1]||'وجهة مخصصة'} • {x.payload?.items?.[0]?.image?'به صورة':'بدون صورة'}</Text>
          <View style={s.actions}>
            <Pressable onPress={()=>move(x,-1)} style={s.actionBtn}><Text style={s.actionText}>رفع ↑</Text></Pressable>
            <Pressable onPress={()=>move(x,1)} style={s.actionBtn}><Text style={s.actionText}>خفض ↓</Text></Pressable>
            <Pressable onPress={()=>toggle(x)} style={s.actionBtn}><Text style={x.is_active?s.stopText:s.enableText}>{x.is_active?'إخفاء':'إظهار'}</Text></Pressable>
            <Pressable onPress={()=>openEdit(x)} style={s.actionBtn}><Text style={s.actionText}>تعديل</Text></Pressable>
            <Pressable onPress={()=>remove(x)} style={s.actionBtn}><Text style={s.deleteText}>حذف</Text></Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
    <Modal visible={Boolean(editing)} animationType="slide" onRequestClose={()=>setEditing(null)}><SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><View style={s.editHead}><Pressable onPress={()=>setEditing(null)} style={s.back}><Text style={s.backText}>×</Text></Pressable><Text style={s.title}>تعديل القسم</Text></View><View style={s.card}><TextInput value={title} onChangeText={setTitle} placeholder="اسم القسم" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/><TextInput value={subtitle} onChangeText={setSubtitle} placeholder="الوصف" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/><Text style={s.section}>العناصر</Text>{items.map((it,i)=><View key={i} style={s.preview}><View style={{flex:1}}><Text style={s.previewTitle}>{it.title}</Text><Text style={s.meta}>{it.button} • {DESTINATIONS.find(d=>d[2]===it.route)?.[1]||'وجهة مخصصة'}</Text></View><Pressable onPress={()=>removeItem(i)}><Text style={s.deleteText}>حذف</Text></Pressable></View>)}<TextInput value={itemTitle} onChangeText={setItemTitle} placeholder="اسم عنصر جديد" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/><TextInput value={button} onChangeText={setButton} placeholder="اسم الزر" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/><TextInput value={itemImage} onChangeText={setItemImage} placeholder="رابط الصورة" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/><View style={s.destinations}>{DESTINATIONS.map(([key,label,path])=><Pressable key={key} onPress={()=>setRoute(path)} style={[s.destination,route===path&&s.destinationOn]}><Text style={route===path?s.destinationTextOn:s.destinationText}>{label}</Text></Pressable>)}</View><Pressable onPress={addItem} style={s.secondary}><Text style={s.secondaryText}>+ إضافة عنصر</Text></Pressable><Text style={s.section}>شكل العرض</Text><View style={s.destinations}>{LAYOUTS.map(([value,label])=><Pressable key={value} onPress={()=>setLayout(value)} style={[s.destination,layout===value&&s.destinationOn]}><Text style={layout===value?s.destinationTextOn:s.destinationText}>{label}</Text></Pressable>)}</View><Text style={s.section}>وقت النشر</Text><TextInput value={startsAt} onChangeText={setStartsAt} placeholder="بداية: YYYY-MM-DDTHH:MM" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/><TextInput value={expiresAt} onChangeText={setExpiresAt} placeholder="نهاية: YYYY-MM-DDTHH:MM" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/><Pressable disabled={busy} onPress={saveEdit} style={s.primary}><Text style={s.primaryText}>{busy?'جاري الحفظ...':'حفظ التعديلات'}</Text></Pressable></View></ScrollView></SafeAreaView></Modal>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.background},page:{padding:17,paddingTop:18,paddingBottom:28},editHead:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center'},
  back:{width:42,height:42,borderRadius:13,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},backText:{fontSize:21,color:theme.text},
  title:{fontSize:26,fontWeight:'900',color:theme.text,textAlign:'right',marginTop:14},sub:{color:theme.muted,fontSize:11,textAlign:'right',lineHeight:18,marginTop:5},
  card:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:19,padding:14,marginTop:14},section:{color:theme.text,fontSize:14,fontWeight:'900',textAlign:'right',marginTop:12,marginBottom:8},
  choice:{borderWidth:1,borderColor:theme.border,borderRadius:13,padding:11,marginBottom:7,flexDirection:'row-reverse',alignItems:'center',gap:9},choiceOn:{backgroundColor:theme.primarySoft,borderColor:theme.primary},
  choiceTitle:{color:theme.text,fontWeight:'900',textAlign:'right'},choiceTitleOn:{color:theme.primary},choiceDesc:{color:theme.muted,fontSize:9,textAlign:'right',marginTop:3},choiceDescOn:{color:theme.text},
  check:{color:theme.muted,fontSize:18},checkOn:{color:theme.primary},input:{height:47,borderWidth:1,borderColor:theme.border,borderRadius:12,backgroundColor:theme.background,color:theme.text,paddingHorizontal:12,marginBottom:7},
  destinations:{flexDirection:'row-reverse',flexWrap:'wrap',gap:7},destination:{paddingHorizontal:11,paddingVertical:9,borderRadius:11,borderWidth:1,borderColor:theme.border},destinationOn:{backgroundColor:theme.primary,borderColor:theme.primary},
  destinationText:{color:theme.text,fontSize:10,fontWeight:'800'},destinationTextOn:{color:'#fff',fontSize:10,fontWeight:'900'},hint:{color:theme.muted,fontSize:9,textAlign:'right',marginTop:9},
  primary:{height:48,borderRadius:13,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center',marginTop:13},primaryText:{color:'#fff',fontWeight:'900'},secondary:{height:43,borderRadius:12,borderWidth:1,borderColor:theme.primary,alignItems:'center',justifyContent:'center',marginTop:8},secondaryText:{color:theme.primary,fontWeight:'900',fontSize:11},preview:{flexDirection:'row-reverse',alignItems:'center',gap:8,borderRadius:11,backgroundColor:theme.background,padding:10,marginTop:6},previewTitle:{color:theme.text,fontSize:11,fontWeight:'900',textAlign:'right'},
  error:{color:theme.danger,fontSize:11,textAlign:'right',marginTop:9},currentTitle:{color:theme.text,fontSize:17,fontWeight:'900',textAlign:'right',marginTop:20,marginBottom:9},
  item:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:16,padding:12,marginBottom:8},itemOff:{opacity:.6},itemTop:{flexDirection:'row-reverse',alignItems:'center',gap:9},
  order:{width:30,height:30,borderRadius:10,backgroundColor:theme.background,alignItems:'center',justifyContent:'center'},orderText:{color:theme.primary,fontWeight:'900'},name:{color:theme.text,fontWeight:'900',textAlign:'right'},meta:{color:theme.muted,fontSize:9,textAlign:'right',marginTop:4},
  actions:{flexDirection:'row-reverse',flexWrap:'wrap',gap:7,marginTop:10},actionBtn:{paddingHorizontal:10,paddingVertical:8,borderRadius:10,backgroundColor:theme.background},actionText:{color:theme.text,fontSize:10,fontWeight:'900'},stopText:{color:theme.warning,fontSize:10,fontWeight:'900'},enableText:{color:theme.success,fontSize:10,fontWeight:'900'},deleteText:{color:theme.danger,fontSize:10,fontWeight:'900'},
});