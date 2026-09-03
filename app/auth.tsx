import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { fonts } from "@/constants/fonts";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

export default function Auth() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const valid = /^01\d{9}$/.test(phone.replace(/[\s-]/g, ""));

  const continueToApp = async () => {
    if (!valid || loading) return;
    if (!API_URL) {
      setError("رابط الخادم غير مضبوط. أضف EXPO_PUBLIC_API_URL ثم أعد تشغيل Expo.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/continue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/[\s-]/g, "") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تسجيل الدخول");

      await AsyncStorage.multiSet([
        ["auth_token", data.token],
        ["auth_user", JSON.stringify(data.user)],
      ]);

      router.replace(data.user.role === "admin" ? "/admin" : "/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.helper}>سيتم التحقق من الحساب من الخادم. رمز OTP هنضيفه لاحقًا.</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable onPress={() => router.push("/register")} style={styles.registerButton}><Text style={styles.registerText}>إنشاء حساب جديد</Text></Pressable>
          <Pressable disabled={!valid || loading} onPress={continueToApp} style={({ pressed }) => [styles.button, (!valid || loading) && styles.disabled, pressed && styles.pressed]}>
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
  backText: { fontSize: 24, color: theme.text, fontWeight: fonts.weight.medium },
  header: { alignItems: "center" },
  logo: { width: 58, height: 58, borderRadius: 18, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  logoText: { color: "#fff", fontSize: 30, fontWeight: fonts.weight.heavy },
  title: { color: theme.text, fontSize: 31, fontWeight: fonts.weight.heavy, textAlign: "center" },
  subtitle: { color: theme.muted, fontSize: fonts.size.md, fontWeight: fonts.weight.regular, marginTop: 9, textAlign: "center" },
  form: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 18 },
  label: { color: theme.text, fontSize: fonts.size.md, fontWeight: fonts.weight.bold, textAlign: "right", marginBottom: 9 },
  input: { minHeight: 56, borderWidth: 1, borderColor: theme.border, borderRadius: 15, paddingHorizontal: 16, color: theme.text, fontSize: fonts.size.lg, fontWeight: fonts.weight.regular, backgroundColor: theme.background },
  helper: { color: theme.muted, fontSize: fonts.size.xs, fontWeight: fonts.weight.regular, lineHeight: 19, textAlign: "right", marginTop: 9 },
  error: { color: theme.danger, fontSize: fonts.size.xs, fontWeight: fonts.weight.medium, lineHeight: 19, textAlign: "right", marginTop: 9 },
  button: { minHeight: 56, borderRadius: 15, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", marginTop: 17 },
  buttonText: { color: "#fff", fontSize: fonts.size.lg, fontWeight: fonts.weight.bold, textAlign: "center" },
  registerButton: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center", marginTop: 10 },
  registerText: { color: theme.text, fontSize: fonts.size.md, fontWeight: fonts.weight.bold },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  footer: { color: theme.muted, fontSize: fonts.size.xs, fontWeight: fonts.weight.regular, textAlign: "center", paddingBottom: 14 }
});
