import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

export default function Auth() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const valid = phone.replaceAll(" ", "").replaceAll("-", "").length >= 10;

  const continueToHome = () => {
    if (!valid) return;
    setLoading(true);
    setTimeout(() => router.replace("/home"), 350);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>→</Text></Pressable>
        <View style={styles.header}>
          <View style={styles.logo}><Text style={styles.logoText}>و</Text></View>
          <Text style={styles.title}>أهلاً بيك</Text>
          <Text style={styles.subtitle}>سجّل دخولك برقم الموبايل للمتابعة.</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="01XXXXXXXXX" placeholderTextColor="#A0A0A0" keyboardType="phone-pad" textAlign="right" style={styles.input} maxLength={11} />
          <Text style={styles.helper}>سيتم إنشاء حساب عميل جديد تلقائيًا عند أول استخدام.</Text>
          <Pressable disabled={!valid || loading} onPress={continueToHome} style={({ pressed }) => [styles.button, (!valid || loading) && styles.disabled, pressed && styles.pressed]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>متابعة</Text>}
          </Pressable>
        </View>
        <Text style={styles.footer}>بمتابعة الاستخدام، أنت توافق على شروط الخدمة.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  page: { flex: 1, paddingHorizontal: 24, paddingTop: 8, justifyContent: "space-between" },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  backText: { fontSize: 24, color: theme.text },
  header: { alignItems: "center" },
  logo: { width: 58, height: 58, borderRadius: 18, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  logoText: { color: "#fff", fontSize: 30, fontWeight: "900" },
  title: { color: theme.text, fontSize: 31, fontWeight: "900", textAlign: "center" },
  subtitle: { color: theme.muted, fontSize: 15, marginTop: 9, textAlign: "center" },
  form: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 18 },
  label: { color: theme.text, fontSize: 14, fontWeight: "800", textAlign: "right", marginBottom: 9 },
  input: { minHeight: 56, borderWidth: 1, borderColor: theme.border, borderRadius: 15, paddingHorizontal: 16, color: theme.text, fontSize: 16, backgroundColor: theme.background },
  helper: { color: theme.muted, fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 9 },
  button: { minHeight: 56, borderRadius: 15, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", marginTop: 17 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  footer: { color: theme.muted, fontSize: 11, textAlign: "center", paddingBottom: 14 }
});