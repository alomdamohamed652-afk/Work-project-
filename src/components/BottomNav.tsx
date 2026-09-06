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
  return <View style={s.bar}>{items.map(([label,icon,route]:string)=>{
    const active=path===route || path.startsWith(route+'/');
    return <Pressable key={label} onPress={()=>{if(!active)router.replace(route as any)}} style={s.item}>
      <View style={[s.iconWrap,active&&s.activeWrap]}><Text style={[s.icon,active&&s.activeIcon]}>{icon}</Text></View>
      <Text style={[s.label,active&&s.activeLabel]}>{label}</Text>
    </Pressable>;
  })}</View>;
}
export default BottomNav;

const s=StyleSheet.create({
  bar:{height:72,backgroundColor:'rgba(255,255,255,.98)',borderTopWidth:1,borderTopColor:theme.border,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-around',paddingHorizontal:8,paddingBottom:4,elevation:12,shadowColor:'#0F172A',shadowOpacity:.08,shadowRadius:14,shadowOffset:{width:0,height:-4}},
  item:{flex:1,alignItems:'center',justifyContent:'center',height:64},
  iconWrap:{width:42,height:36,borderRadius:14,alignItems:'center',justifyContent:'center'},
  activeWrap:{backgroundColor:theme.primary},
  icon:{fontSize:19,color:theme.muted},
  label:{fontSize:9,color:theme.muted,fontWeight:'800',marginTop:2},
  activeIcon:{color:'#fff'},
  activeLabel:{color:theme.primary,fontWeight:'900'}
});
