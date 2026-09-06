import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {router} from 'expo-router';
import {useEffect,useState} from 'react';
import {Alert,Image,Modal,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {theme} from '@/constants/theme';

const API=(process.env.EXPO_PUBLIC_API_URL||'').replace(/\/$/,'');
const DESTINATIONS=[
  ['كل الجهات','/customer/restaurants'],['المفضلة','/customer/favorites'],
  ['المحفظة','/customer/wallet'],['طلباتي','/customer/tracking'],['الدعم','/customer/support']
] as const;

export default function AdminBanners(){
  const [items,setItems]=useState<any[]>([]);
  const [editing,setEditing]=useState<any>(null);
  const [title,setTitle]=useState(''),[subtitle,setSubtitle]=useState('');
  const [imageUrl,setImageUrl]=useState(''),[actionLabel,setActionLabel]=useState(''),[actionRoute,setActionRoute]=useState('/customer/restaurants');
  const [startsAt,setStartsAt]=useState(''),[expiresAt,setExpiresAt]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');

  const auth=async()=>({Authorization:'Bearer '+await AsyncStorage.getItem('auth_token')});
  const read=async(r:Response)=>{try{return await r.json()}catch{return {error:'تعذر قراءة رد الخادم'}}};
  const reset=()=>{setEditing(null);setTitle('');setSubtitle('');setImageUrl('');setActionLabel('');setActionRoute('/customer/restaurants');setStartsAt('');setExpiresAt('');setError('')};

  const load=async()=>{try{const r=await fetch(API+'/api/admin/banners',{headers:await auth()}),d=await read(r);if(!r.ok)throw Error(d.error||'تعذر تحميل البانرات');setItems(d.banners||[])}catch(e){setError(e instanceof Error?e.message:'تعذر التحميل')}};
  useEffect(()=>{load()},[]);

  const uploadImage=async()=>{
    try{
      const p=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,quality:.72,base64:true});
      if(p.canceled)return;
      const a=p.assets?.[0];
      if(!a?.base64)throw Error('تعذر قراءة الصورة');
      setBusy(true);
      const r=await fetch(API+'/api/media/upload',{method:'POST',headers:{...(await auth()),'Content-Type':'application/json'},body:JSON.stringify({mimeType:a.mimeType||'image/jpeg',base64:a.base64})});
      const d=await read(r);if(!r.ok)throw Error(d.error||'تعذر رفع الصورة');
      setImageUrl(API+d.url);
    }catch(e){setError(e instanceof Error?e.message:'تعذر رفع الصورة')}finally{setBusy(false)}
  };

  const payload=()=>({title:title.trim(),subtitle:subtitle.trim()||null,imageUrl:imageUrl.trim(),actionLabel:actionLabel.trim()||null,actionRoute:actionRoute.trim()||null,startsAt:startsAt.trim()||null,expiresAt:expiresAt.trim()||null});
  const save=async()=>{
    if(!title.trim())return setError('اكتب عنوان البانر');
    if(!imageUrl.trim())return setError('أضف صورة للبانر');
    try{setBusy(true);setError('');const headers={...(await auth()),'Content-Type':'application/json'};
      const r=await fetch(API+(editing?'/api/admin/banners/'+editing.id:'/api/admin/banners'),{method:editing?'PATCH':'POST',headers,body:JSON.stringify({...payload(),sortOrder:editing?.sort_order??items.length})});
      const d=await read(r);if(!r.ok)throw Error(d.error||'تعذر الحفظ');reset();await load();
    }catch(e){setError(e instanceof Error?e.message:'تعذر الحفظ')}finally{setBusy(false)}
  };
  const edit=(x:any)=>{setEditing(x);setTitle(x.title||'');setSubtitle(x.subtitle||'');setImageUrl(x.image_url||'');setActionLabel(x.action_label||'');setActionRoute(x.action_route||'/customer/restaurants');setStartsAt(x.starts_at?String(x.starts_at).slice(0,16):'');setExpiresAt(x.expires_at?String(x.expires_at).slice(0,16):'');setError('')};
  const patch=async(x:any,b:any)=>{const r=await fetch(API+'/api/admin/banners/'+x.id,{method:'PATCH',headers:{...(await auth()),'Content-Type':'application/json'},body:JSON.stringify(b)}),d=await read(r);if(!r.ok)throw Error(d.error||'تعذر التعديل')};
  const toggle=async(x:any)=>{try{await patch(x,{isActive:!x.is_active});load()}catch(e){setError(e instanceof Error?e.message:'تعذر تغيير الحالة')}};
  const move=async(x:any,delta:number)=>{const sorted=[...items].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));const i=sorted.findIndex(v=>v.id===x.id),j=i+delta;if(j<0||j>=sorted.length)return;try{await patch(sorted[i],{sortOrder:sorted[j].sort_order});await patch(sorted[j],{sortOrder:sorted[i].sort_order});load()}catch(e){setError(e instanceof Error?e.message:'تعذر تغيير الترتيب')}};
  const remove=(x:any)=>Alert.alert('حذف البانر','سيختفي من الصفحة الرئيسية.',[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:async()=>{try{const r=await fetch(API+'/api/admin/banners/'+x.id,{method:'DELETE',headers:await auth()}),d=await read(r);if(!r.ok)throw Error(d.error||'تعذر الحذف');load()}catch(e){setError(e instanceof Error?e.message:'تعذر الحذف')}}}]);

  const Form=()=> <View style={s.card}>
    <Text style={s.section}>{editing?'تعديل البانر':'بانر جديد'}</Text>
    <Text style={s.hint}>هذه هي البانرات الحقيقية التي تظهر أعلى الصفحة الرئيسية للعميل.</Text>
    <TextInput value={title} onChangeText={setTitle} placeholder="عنوان البانر" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
    <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="وصف مختصر (اختياري)" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
    {imageUrl?<Image source={{uri:imageUrl}} style={s.preview}/>:<View style={s.imageEmpty}><Text>لم يتم اختيار صورة</Text></View>}
    <View style={s.imageActions}><Pressable onPress={uploadImage} style={s.secondary}><Text style={s.secondaryText}>📷 اختيار ورفع صورة</Text></Pressable><Pressable onPress={()=>setImageUrl('')} style={s.secondary}><Text style={s.deleteText}>إزالة</Text></Pressable></View>
    <TextInput value={imageUrl} onChangeText={setImageUrl} placeholder="أو رابط صورة مباشر" placeholderTextColor={theme.muted} style={s.input} autoCapitalize="none"/>
    <TextInput value={actionLabel} onChangeText={setActionLabel} placeholder="نص الزر (مثال: اطلب الآن)" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
    <Text style={s.hint}>عند الضغط يفتح:</Text>
    <View style={s.routes}>{DESTINATIONS.map(([label,path])=><Pressable key={path} onPress={()=>setActionRoute(path)} style={[s.route,actionRoute===path&&s.routeOn]}><Text style={actionRoute===path?s.routeOnText:s.routeText}>{label}</Text></Pressable>)}</View>
    <TextInput value={actionRoute} onChangeText={setActionRoute} placeholder="/customer/..." placeholderTextColor={theme.muted} style={s.input} autoCapitalize="none"/>
    <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="بداية: YYYY-MM-DDTHH:MM (اختياري)" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
    <TextInput value={expiresAt} onChangeText={setExpiresAt} placeholder="نهاية: YYYY-MM-DDTHH:MM (اختياري)" placeholderTextColor={theme.muted} style={s.input} textAlign="right"/>
    <Pressable disabled={busy} onPress={save} style={[s.primary,busy&&{opacity:.6}]}><Text style={s.primaryText}>{busy?'جاري الحفظ...':editing?'حفظ التعديلات':'إضافة البانر'}</Text></Pressable>
    {editing&&<Pressable onPress={reset} style={s.cancel}><Text style={s.cancelText}>إلغاء التعديل</Text></Pressable>}
  </View>;

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <Pressable onPress={()=>router.back()} style={s.back}><Text style={s.backText}>←</Text></Pressable>
    <Text style={s.title}>إدارة البانرات</Text><Text style={s.sub}>أضف، عدّل، أوقف ورتّب البانرات التي تظهر فعليًا للعميل.</Text>
    <Form/>{error?<Text style={s.error}>{error}</Text>:null}
    <Text style={s.listTitle}>البانرات الحالية</Text>
    {[...items].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order)).map((x,i)=><View key={x.id} style={[s.item,!x.is_active&&s.off]}>
      <Image source={{uri:x.image_url}} style={s.thumb}/><View style={{flex:1}}><Text style={s.name}>{x.title}</Text><Text style={s.meta}>{x.subtitle||'بدون وصف'} • {x.is_active?'ظاهر':'مخفي'}</Text>
      <View style={s.actions}><Pressable onPress={()=>move(x,-1)} style={s.action}><Text>↑</Text></Pressable><Pressable onPress={()=>move(x,1)} style={s.action}><Text>↓</Text></Pressable><Pressable onPress={()=>edit(x)} style={s.action}><Text style={s.editText}>تعديل</Text></Pressable><Pressable onPress={()=>remove(x)} style={s.action}><Text style={s.deleteText}>حذف</Text></Pressable></View></View><Switch value={Boolean(x.is_active)} onValueChange={()=>toggle(x)}/></View>)}
  </ScrollView></SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:theme.background},page:{padding:17,paddingBottom:40},back:{width:42,height:42,borderRadius:13,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},backText:{fontSize:21,color:theme.text},
 title:{color:theme.text,fontSize:27,fontWeight:'900',textAlign:'right',marginTop:13},sub:{color:theme.muted,fontSize:10,lineHeight:17,textAlign:'right',marginTop:5},card:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:20,padding:14,marginTop:15},section:{color:theme.text,fontSize:16,fontWeight:'900',textAlign:'right',marginBottom:7},hint:{color:theme.muted,fontSize:9,textAlign:'right',marginBottom:7},input:{borderWidth:1,borderColor:theme.border,borderRadius:13,backgroundColor:theme.background,color:theme.text,minHeight:47,paddingHorizontal:12,marginBottom:8},preview:{width:'100%',height:150,borderRadius:15,marginBottom:8},imageEmpty:{height:110,borderRadius:14,backgroundColor:theme.surfaceAlt,alignItems:'center',justifyContent:'center',marginBottom:8},imageActions:{flexDirection:'row-reverse',gap:7,marginBottom:8},secondary:{flex:1,height:42,borderRadius:12,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},secondaryText:{color:theme.primary,fontSize:10,fontWeight:'900'},routes:{flexDirection:'row-reverse',flexWrap:'wrap',gap:6,marginBottom:8},route:{paddingHorizontal:10,paddingVertical:8,borderWidth:1,borderColor:theme.border,borderRadius:10},routeOn:{backgroundColor:theme.primary,borderColor:theme.primary},routeText:{color:theme.text,fontSize:9,fontWeight:'800'},routeOnText:{color:'#fff',fontSize:9,fontWeight:'900'},primary:{height:50,borderRadius:14,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center',marginTop:4},primaryText:{color:'#fff',fontWeight:'900'},cancel:{padding:11,alignItems:'center'},cancelText:{color:theme.muted,fontWeight:'900',fontSize:10},error:{color:theme.danger,textAlign:'right',fontSize:10,fontWeight:'900',marginTop:9},listTitle:{color:theme.text,fontSize:18,fontWeight:'900',textAlign:'right',marginTop:20,marginBottom:9},item:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:17,padding:10,marginBottom:9,flexDirection:'row-reverse',alignItems:'center',gap:9},off:{opacity:.55},thumb:{width:72,height:72,borderRadius:13,backgroundColor:theme.surfaceAlt},name:{color:theme.text,fontWeight:'900',textAlign:'right'},meta:{color:theme.muted,fontSize:9,textAlign:'right',marginTop:4},actions:{flexDirection:'row-reverse',gap:5,marginTop:7},action:{paddingHorizontal:8,paddingVertical:6,borderRadius:8,backgroundColor:theme.background},editText:{color:theme.primary,fontSize:9,fontWeight:'900'},deleteText:{color:theme.danger,fontSize:9,fontWeight:'900'}
});