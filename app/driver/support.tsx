import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';

const API=(process.env.EXPO_PUBLIC_API_URL||'').replace(/\/$/,'');
const readJson=async(r:Response)=>{const t=await r.text();try{return JSON.parse(t)}catch{return {error:'تعذر قراءة رد الخادم'}}};
const categories=[['general','استفسار عام','💬'],['delivery','مشكلة أثناء التوصيل','🚚'],['payment','مشكلة مالية أو تسوية','💳'],['call','طلب التواصل مع الإدارة','📞'],['complaint','شكوى','📝']];

export default function DriverSupport(){
 const [conversations,setConversations]=useState<any[]>([]);
 const [selected,setSelected]=useState<any>(null);
 const [messages,setMessages]=useState<any[]>([]);
 const [body,setBody]=useState('');
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const headers=async()=>({Authorization:`Bearer ${await AsyncStorage.getItem('auth_token')}`});

 const load=async()=>{
  try{
   setLoading(true);setError('');
   const r=await fetch(API+'/api/operations/support/conversations',{headers:await headers()});
   const d=await readJson(r);if(!r.ok)throw Error(d.error||'تعذر تحميل محادثات الدعم');
   setConversations(d.conversations||[]);
  }catch(e){setError(e instanceof Error?e.message:'تعذر تحميل الدعم')}finally{setLoading(false)}
 };
 const open=async(c:any)=>{
  try{setSelected(c);const r=await fetch(API+'/api/operations/support/conversations/'+c.id+'/messages',{headers:await headers()});const d=await readJson(r);if(!r.ok)throw Error(d.error||'تعذر فتح المحادثة');setMessages(d.messages||[])}
  catch(e){setError(e instanceof Error?e.message:'تعذر فتح المحادثة')}
 };
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(!selected)return;const id=setInterval(()=>open(selected),4000);return()=>clearInterval(id)},[selected?.id]);

 const start=async(category:string)=>{
  try{setBusy(true);setError('');const r=await fetch(API+'/api/operations/support/conversations',{method:'POST',headers:{'Content-Type':'application/json',...(await headers())},body:JSON.stringify({category})});const d=await readJson(r);if(!r.ok)throw Error(d.error||'تعذر بدء المحادثة');await load();await open(d.conversation)}
  catch(e){setError(e instanceof Error?e.message:'تعذر بدء المحادثة')}finally{setBusy(false)}
 };
 const send=async()=>{
  if(!body.trim()||!selected)return;
  try{setBusy(true);const r=await fetch(API+'/api/operations/support/conversations/'+selected.id+'/messages',{method:'POST',headers:{'Content-Type':'application/json',...(await headers())},body:JSON.stringify({body:body.trim()})});const d=await readJson(r);if(!r.ok)throw Error(d.error||'تعذر إرسال الرسالة');setBody('');await open(selected)}
  catch(e){Alert.alert('خطأ',e instanceof Error?e.message:'تعذر إرسال الرسالة')}finally{setBusy(false)}
 };

 if(selected)return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
  <View style={s.chatPage}><View style={s.head}><Pressable onPress={()=>setSelected(null)} style={s.back}><Text style={s.backText}>→</Text></Pressable><View style={{flex:1}}><Text style={s.title}>الدعم</Text><Text style={s.sub}>محادثة مباشرة مع فريق التشغيل</Text></View></View>
  <ScrollView style={{flex:1}} contentContainerStyle={s.messages} keyboardShouldPersistTaps="handled">{messages.map(m=><View key={m.id} style={[s.bubble,m.sender_role==='driver'?s.mine:s.theirs]}><Text style={[s.bubbleText,m.sender_role==='driver'&&s.mineText]}>{m.body}</Text></View>)}</ScrollView>
  <View style={s.composer}><TextInput value={body} onChangeText={setBody} placeholder="اكتب رسالتك..." placeholderTextColor={theme.muted} style={s.input} textAlign="right" multiline/><Pressable disabled={busy} onPress={send} style={s.send}><Text style={s.sendText}>إرسال</Text></Pressable></View>
  </View></KeyboardAvoidingView></SafeAreaView>;

 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
  <View style={s.head}><Pressable onPress={()=>router.replace('/driver')} style={s.back}><Text style={s.backText}>→</Text></Pressable><View style={{flex:1}}><Text style={s.title}>الدعم والمساعدة</Text><Text style={s.sub}>تواصل مع الإدارة بخصوص التوصيل أو الحساب أو أي مشكلة تشغيلية.</Text></View></View>
  {error?<Text style={s.error}>{error}</Text>:null}
  <Text style={s.section}>ابدأ طلب دعم</Text>
  <View style={s.grid}>{categories.map(([key,label,icon])=><Pressable key={key} disabled={busy} onPress={()=>start(key)} style={s.card}><Text style={s.icon}>{icon}</Text><Text style={s.cardTitle}>{label}</Text><Text style={s.arrow}>‹</Text></Pressable>)}</View>
  <Text style={s.section}>محادثاتي</Text>
  {loading?<ActivityIndicator color={theme.primary}/>:conversations.length?conversations.map(c=><Pressable key={c.id} onPress={()=>open(c)} style={s.convo}><View style={{flex:1}}><Text style={s.cardTitle}>{categories.find(x=>x[0]===c.category)?.[1]||'طلب دعم'}</Text><Text style={s.sub}>{c.needs_reply?'بانتظار رد الإدارة':'المحادثة مفتوحة'}</Text></View><View style={[s.statusDot,c.needs_reply&&s.waitDot]}/></Pressable>):<Text style={s.empty}>لا توجد محادثات سابقة.</Text>}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:theme.background},page:{padding:18,paddingBottom:112},chatPage:{flex:1,padding:18},head:{flexDirection:'row-reverse',alignItems:'center',gap:10,marginBottom:12},back:{width:44,height:44,borderRadius:14,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},backText:{fontSize:22,color:theme.text},title:{fontSize:27,fontWeight:'900',color:theme.text,textAlign:'right'},sub:{fontSize:10,color:theme.muted,textAlign:'right',marginTop:4,lineHeight:16},section:{fontSize:17,fontWeight:'900',color:theme.text,textAlign:'right',marginTop:16,marginBottom:8},grid:{gap:8},card:{minHeight:60,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:17,padding:13,flexDirection:'row-reverse',alignItems:'center',gap:10},icon:{fontSize:21,width:30,textAlign:'center'},cardTitle:{color:theme.text,fontWeight:'900',fontSize:12,textAlign:'right',flex:1},arrow:{fontSize:23,color:theme.muted},convo:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:16,padding:13,marginBottom:7,flexDirection:'row-reverse',alignItems:'center',gap:9},statusDot:{width:9,height:9,borderRadius:5,backgroundColor:theme.success},waitDot:{backgroundColor:theme.warning},empty:{color:theme.muted,textAlign:'center',paddingVertical:20},error:{color:theme.danger,textAlign:'right',fontSize:11,marginBottom:8},messages:{paddingVertical:8,gap:8},bubble:{maxWidth:'82%',padding:12,borderRadius:16},mine:{alignSelf:'flex-end',backgroundColor:theme.primary},theirs:{alignSelf:'flex-start',backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border},bubbleText:{color:theme.text,fontSize:13,textAlign:'right'},mineText:{color:'#fff'},composer:{flexDirection:'row-reverse',gap:7,paddingTop:8},input:{flex:1,minHeight:48,maxHeight:100,borderRadius:14,borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface,color:theme.text,paddingHorizontal:12,paddingVertical:10},send:{height:48,paddingHorizontal:15,borderRadius:14,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center'},sendText:{color:'#fff',fontWeight:'900'}
});