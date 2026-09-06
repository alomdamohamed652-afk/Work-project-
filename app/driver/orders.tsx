import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

export default function DriverOrders(){
 useEffect(()=>{const id=setTimeout(()=>router.replace('/driver'),0);return()=>clearTimeout(id)},[]);
 return <SafeAreaView style={s.safe}><View style={s.page}><ActivityIndicator color={theme.primary}/><Text style={s.title}>مركز الطلبات</Text><Text style={s.sub}>تم توحيد إدارة الطلبات داخل مركز التوصيل.</Text></View></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:theme.background},page:{flex:1,alignItems:'center',justifyContent:'center',gap:10,padding:24},title:{color:theme.text,fontSize:18,fontWeight:'900'},sub:{color:theme.muted,fontSize:11,textAlign:'center'}});