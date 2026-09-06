import{router,usePathname}from'expo-router';
import{Pressable,StyleSheet,Text,View}from'react-native';
import{theme}from'@/constants/theme';

type Role='customer'|'driver'|'restaurant'|'admin';
const maps:any={
  customer:[['الرئيسية','⌂','/home'],['المطاعم','▦','/customer/restaurants'],['السلة','🛒','/customer/cart'],['الطلبات','▣','/customer/tracking'],['حسابي','◯','/customer/profile']],
  driver:[['الرئيسية','⌂','/driver'],['الطلبات','▣','/driver/orders'],['الأرباح','◉','/driver/account'],['حسابي','◯','/account']],
  restaurant:[['الرئيسية','⌂','/restaurant'],['الطلبات','▣','/restaurant/orders'],['المنيو','☷','/restaurant/menu'],['الحساب','◯','/restaurant/profile']],
  admin:[['الرئيسية','⌂','/admin'],['الطلبات','▣','/admin/orders'],['المطاعم','▦','/admin/restaurants'],['الإدارة','⚙','/admin/operations'],['حسابي','◯','/admin/account']]
};

export function BottomNav({role}:{role:Role}){
  const path=usePathname(),items=maps[role]||maps.customer;
  return <View style={s.bar} pointerEvents="auto">{items.map(([label,icon,route]:string)=>{
    const active=path===route || (route==='/admin/account'&&path.startsWith('/admin/account'));
    return <Pressable key={label} onPress={()=>{if(!active)router.replace(route as any)}} style={s.item}>
      <View style={[s.iconWrap,active&&s.activeWrap]}><Text style={[s.icon,active&&s.active]}>{icon}</Text></View>
      <Text style={[s.label,active&&s.active]}>{label}</Text>
    </Pressable>;
  })}</View>;
}
export default BottomNav;

const s=StyleSheet.create({
  bar:{height:76,backgroundColor:theme.surface,borderTopWidth:1,borderTopColor:theme.border,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-around',paddingHorizontal:8,paddingBottom:5,zIndex:20,elevation:8,flexShrink:0},
  item:{flex:1,alignItems:'center',justifyContent:'center',height:68},iconWrap:{width:36,height:36,borderRadius:13,alignItems:'center',justifyContent:'center'},activeWrap:{backgroundColor:theme.primarySoft},icon:{fontSize:20,color:theme.muted},label:{fontSize:8.5,color:theme.muted,fontWeight:'800',marginTop:1},active:{color:theme.primary,fontWeight:'900'}
});