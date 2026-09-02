import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>وصّلني</Text>
      <Text style={styles.title}>اطلب بسهولة، والباقي علينا</Text>
      <Text style={styles.subtitle}>
        مطاعمك المفضلة، توصيل سريع، وتتبع طلبك خطوة بخطوة.
      </Text>
      <Pressable style={styles.button} onPress={() => router.push("/auth")}>
        <Text style={styles.buttonText}>ابدأ الآن</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: "#fff", direction: "rtl" },
  logo: { fontSize: 38, fontWeight: "800", textAlign: "center", marginBottom: 18 },
  title: { fontSize: 25, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 16, lineHeight: 26, textAlign: "center", color: "#666", marginBottom: 28 },
  button: { backgroundColor: "#111", borderRadius: 14, minHeight: 54, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" }
});