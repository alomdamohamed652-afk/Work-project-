import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export const API=(process.env.EXPO_PUBLIC_API_URL||'').replace(/\/$/,'');
type RequestInitSafe=RequestInit&{auth?:boolean};

async function authHeaders(headers?:HeadersInit){
 const token=await AsyncStorage.getItem('auth_token');
 return {...(headers||{}),...(token?{Authorization:'Bearer '+token}:{})};
}

export async function apiFetch(path:string,init:RequestInitSafe={}){
 const {auth=true,headers,...rest}=init;
 const finalHeaders=auth?await authHeaders(headers):headers;
 let response:Response;
 try{response=await fetch(API+path,{...rest,headers:finalHeaders});}
 catch{throw new Error('تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.');}
 if(response.status===401&&auth&&!path.startsWith('/api/auth/')){
   await AsyncStorage.multiRemove(['auth_token','auth_user']);
   router.replace('/auth');
   throw new Error('انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى.');
 }
 return response;
}

export async function apiJson<T=any>(path:string,init:RequestInitSafe={}):Promise<T>{
 const response=await apiFetch(path,init);
 let data:any={};
 try{data=await response.json();}catch{}
 if(!response.ok)throw new Error(data?.error||'تعذر تنفيذ العملية.');
 return data as T;
}