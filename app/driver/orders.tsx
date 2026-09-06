import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';

const API=(process.env.EXPO_PUBLIC_API_URL||'').replace(/\/$/,'');
const labels:any={assigned:'تم إسناد الطلب',picked_up:'تم الاستلام من المطعم',on_the_way:'في الطريق للعميل',delivered:'تم التسليم',cancelled:'ملغي',ready:'جاهز للاستلام'};

export default function DriverOrders(){
 const [available,setAvailable]=useState<any[]>([]);
 const [mine,setMine]=useState<any[]>([]);
 const [tab,setTab]=useState<'new'|'current'|'history'>('new');
 const [loading,setLoading]=useState(true);
 const [refreshing,setRefreshing]=useState(false);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  try{
   setError('');const t=await AsyncStorage.getItem('auth_token');const h={Authorization:`Bearer ${t}`};
   const [a,b]=await Promise.all([fetch(API+'/api/orders/driver/available',{headers:h}),fetch(API+'/api/orders/driver/mine',{headers:h})]);
   const ad=await a.json(),bd=await b.json();
   if(!a.ok)throw Error(ad.error||'تعذر تحميل الطلبات الجديدة');
   if(!b.ok)throw Error(bd.error||'تعذر تحميل طلباتك');
   setAvailable(ad.orders||[]);setMine(bd.orders||[]);
  }catch(e){setError(e instanceof Error?e.message:'تعذر تحميل الطلبات')}finally{setLoading(false);setRefreshing(false)}
 },[]);
 useEffect(()=>{load();const id=setInterval(load,5000);return()=>clearInterval(id)},[load]);
 const claim=async(id:string)=>{try{const t=await AsyncStorage.getItem('auth_token');const r=await fetch(API+'/api/orders/'+id+'/claim',{method:'PATCH',headers:{Authorization:`Bearer ${t}`}});const d=await r.json();if(!r.ok)throw Error(d.error||'تعذر استلام الطلب');setTab('current');load()}catch(e){setError(e instanceof Error?e.message:'تعذر استلام الطلب')}};
 const current=mine.filter(x=>['assigned','picked_up','on_the_way'].includes(x.status));
 const history=mine.filter(x=>['delivered','cancelled'].includes(x.status));
 const list=tab==='new'?available:tab==='current'?current:history;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load()}}/>} showsVerticalScrollIndicator={false}>
  <View style={s.head}><Pressable onPress={()=>router.replace('/driver')} style={s.back}><Text style={s.backText}>→</Text></Pressable><View style={{flex:1}}><Text style={s.title}>الطلبات</Text><Text style={s.sub}>طلبات جديدة، الطلبات الحالية، وسجل التوصيل.</Text></View></View>
  <View style={s.tabs}>{[['new','طلبات جديدة',available.length],['current','طلبات حالية',current.length],['history','السجل',history.length]].map(([key,label,count]:any)=><Pressable key={key} onPress={()=>setTab(key)} style={[s.tab,tab===key&&s.tabOn]}><View style={s.tabLabel}>{key==='new'&&count>0?<View style={s.badge}><Text style={s.badgeText}>{count>99?'99+':count}</Text></View>:null}<Text style={tab===key?s.tabTextOn:s.tabText}>{label}</Text></View></Pressable>)}</View>
  {error?<Text style={s.error}>{error}</Text>:null}
  {loading?<View style={s.loading}><ActivityIndicator color={theme.primary}/><Text style={s.sub}>جاري تحميل الطلبات...</Text></View>:!list.length?<View style={s.empty}><Text style={s.emptyTitle}>{tab==='new'?'لا توجد طلبات جديدة الآن':tab==='current'?'لا توجد طلبات حالية':'لا يوجد سجل بعد'}</Text><Text style={s.sub}>اسحب للتحديث أو انتظر وصول طلب جديد.</Text></View>:list.map(o=><View key={o.id} style={s.card}><View style={s.cardTop}><Text style={s.order}>#{String(o.id).slice(0,8)}</Text><View style={{flex:1}}><Text style={s.name}>{o.restaurant_name||'مطعم'}</Text><Text style={s.meta}>{o.customer_name||'العميل'} • {Number(o.total_amount||0).toFixed(0)} ج.م</Text></View></View><View style={s.info}><Text style={s.status}>{labels[o.status]||o.status}</Text><Text style={s.meta}>التحصيل: {Number(o.cash_due||0).toFixed(0)} ج.م</Text></View>{tab==='new'?<Pressable onPress={()=>claim(o.id)} style={s.primary}><Text style={s.primaryText}>قبول واستلام الطلب</Text></Pressable>:tab==='current'?<Pressable onPress={()=>router.replace('/driver')} style={s.secondary}><Text style={s.secondaryText}>فتح مركز التوصيل</Text></Pressable>:null}</View>)}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:theme.background},page:{padding:16,paddingBottom:112},head:{flexDirection:'row-reverse',alignItems:'center',gap:10,marginBottom:12},back:{width:44,height:44,borderRadius:14,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},backText:{fontSize:22,color:theme.text},title:{fontSize:27,fontWeight:'900',color:theme.text,textAlign:'right'},sub:{fontSize:10,color:theme.muted,textAlign:'right',marginTop:4},tabs:{flexDirection:'row-reverse',padding:4,borderRadius:15,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,marginBottom:10},tab:{flex:1,height:40,borderRadius:11,alignItems:'center',justifyContent:'center'},tabOn:{backgroundColor:theme.primary},tabLabel:{flexDirection:'row-reverse',alignItems:'center',gap:4},tabText:{fontSize:9,color:theme.muted,fontWeight:'800'},tabTextOn:{fontSize:9,color:'#fff',fontWeight:'900'},badge:{minWidth:16,height:16,borderRadius:8,backgroundColor:theme.danger,alignItems:'center',justifyContent:'center',paddingHorizontal:3},badgeText:{fontSize:8,color:'#fff',fontWeight:'900'},error:{color:theme.danger,textAlign:'right',fontSize:11,marginBottom:8},loading:{alignItems:'center',paddingVertical:40,gap:8},empty:{backgroundColor:theme.surface,borderRadius:18,padding:28,alignItems:'center'},emptyTitle:{color:theme.text,fontWeight:'900',fontSize:13},card:{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:18,padding:13,marginBottom:8},cardTop:{flexDirection:'row-reverse',gap:9},order:{fontSize:9,color:theme.muted},name:{fontSize:14,fontWeight:'900',color:theme.text,textAlign:'right'},meta:{fontSize:9,color:theme.muted,textAlign:'right',marginTop:3},info:{backgroundColor:theme.background,borderRadius:12,padding:10,marginTop:10,flexDirection:'row-reverse',justifyContent:'space-between'},status:{fontSize:10,fontWeight:'900',color:theme.primary},primary:{height:45,borderRadius:13,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center',marginTop:10},primaryText:{color:'#fff',fontWeight:'900'},secondary:{height:43,borderRadius:13,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center',marginTop:10},secondaryText:{color:theme.text,fontWeight:'900',fontSize:11}
});