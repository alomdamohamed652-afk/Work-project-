import { router } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function Auth() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>تسجيل الدخول</Text>
      <Text style={styles.hint}>الحسابات الجديدة تبدأ كعميل تلقائيًا.</Text>
      <TextInput placeholder="رقم الهاتف" keyboardType="phone-pad" style={styles.input} />
      <Pressable style={styles.button} onPress={() => router.replace("/home")}>
        <Text style={styles.buttonText}>متابعة</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  hint: { textAlign: "center", color: "#666", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 14, paddingHorizontal: 16, minHeight: 54, marginBottom: 14, textAlign: "right" },
  button: { backgroundColor: "#111", borderRadius: 14, minHeight: 54, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" }
});