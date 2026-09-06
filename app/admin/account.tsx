import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

const API=(process.env.EXPO_PUBLIC_API_URL||'').replace(/\/$/,'');
const readJson=async(r:Response)=>{const text=await r.text();try{return JSON.parse(text)}catch{return {error:'تعذر قراءة رد الخادم'}}};

export default function AdminAccount(){
 const [user,setUser]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{try{setLoading(true);setError('');const t=await AsyncStorage.getItem('auth_token');const r=await fetch(API+'/api/auth/me',{headers:{Authorization:`Bearer ${t}`}}),d=await readJson(r);if(!r.ok)throw Error(d.error||'تعذر تحميل الحساب');setUser(d.user)}catch(e){setError(e instanceof Error?e.message:'تعذر تحميل الحساب')}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const logout=()=>Alert.alert('تسجيل الخروج','هل تريد تسجيل الخروج من حساب الإدارة؟',[{text:'إلغاء',style:'cancel'},{text:'تسجيل الخروج',style:'destructive',onPress:async()=>{await AsyncStorage.removeItem('auth_token');router.replace('/auth')}}]);
 if(loading)return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={theme.primary}/></View></SafeAreaView>;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <Text style={s.title}>حسابي</Text>
  <Text style={s.sub}>التحكم في حساب الإدارة والخروج من النظام.</Text>
  {error?<Text style={s.error}>{error}</Text>:null}
  <View style={s.profile}>
   <View style={s.avatar}><Text style={s.avatarText}>{user?.full_name?.slice(0,1)||'A'}</Text></View>
   <Text style={s.name}>{user?.full_name||'حساب الإدارة'}</Text>
   <Text style={s.contact}>{user?.phone||user?.email||''}</Text>
   <View style={s.role}><Text style={s.roleText}>{user?.role==='super_admin'?'سوبر أدمن':'أدمن'}</Text></View>
  </View>
  <View style={s.group}>
   <Pressable onPress={()=>router.push('/admin/users')} style={s.row}><Text style={s.arrow}>‹</Text><View style={{flex:1}}><Text style={s.rowTitle}>التحكم في الحسابات والصلاحيات</Text><Text style={s.rowSub}>إدارة المستخدمين وتحديد الصلاحيات. السوبر أدمن يستطيع إدارة حسابات الأدمن.</Text></View></Pressable>
   <Pressable onPress={()=>router.push('/admin/employees')} style={s.row}><Text style={s.arrow}>‹</Text><View style={{flex:1}}><Text style={s.rowTitle}>بيانات الموظفين</Text><Text style={s.rowSub}>المكتب والوظيفة والبيانات التشغيلية.</Text></View></Pressable>
   <Pressable onPress={()=>router.push('/admin/support')} style={s.row}><Text style={s.arrow}>‹</Text><View style={{flex:1}}><Text style={s.rowTitle}>الدعم</Text><Text style={s.rowSub}>فتح وإدارة محادثات الدعم.</Text></View></Pressable>
  </View>
  <Pressable onPress={logout} style={s.logout}><Text style={s.logoutText}>تسجيل الخروج</Text></Pressable>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:theme.background},page:{padding:18,paddingTop:22,paddingBottom:32},
 center:{flex:1,alignItems:'center',justifyContent:'center'},title:{fontSize:29,fontWeight:'900',color:theme.text,textAlign:'right'},sub:{color:theme.muted,fontSize:11,textAlign:'right',marginTop:4},
 profile:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:22,padding:18,alignItems:'center',marginTop:16},avatar:{width:68,height:68,borderRadius:22,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center'},avatarText:{fontSize:26,fontWeight:'900',color:'#fff'},name:{color:theme.text,fontWeight:'900',fontSize:19,marginTop:10},contact:{color:theme.muted,fontSize:11,marginTop:4},role:{marginTop:10,backgroundColor:theme.primarySoft,borderRadius:20,paddingHorizontal:12,paddingVertical:6},roleText:{color:theme.primary,fontSize:10,fontWeight:'900'},
 group:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:18,overflow:'hidden',marginTop:16},row:{minHeight:72,padding:13,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:theme.border},arrow:{color:theme.muted,fontSize:25,marginRight:8},rowTitle:{color:theme.text,fontWeight:'900',textAlign:'right',fontSize:13},rowSub:{color:theme.muted,fontSize:9,textAlign:'right',marginTop:3,lineHeight:14},
 logout:{height:50,borderRadius:14,backgroundColor:theme.dangerSoft,alignItems:'center',justifyContent:'center',marginTop:16},logoutText:{color:theme.danger,fontWeight:'900'},error:{color:theme.danger,textAlign:'right',marginTop:10}
});