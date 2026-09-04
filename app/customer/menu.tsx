import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
const KEY = "customer_cart";

type Item = {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
};

type CartItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
};

type Cart = {
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
};

type Restaurant = {
  id: string;
  name: string;
  area?: string | null;
  address?: string | null;
};

export default function CustomerMenu() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId?: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadMenu = async () => {
      try {
        setLoading(true);
        setError("");

        if (!restaurantId) {
          throw new Error("لم يتم تحديد المطعم");
        }

        const token = await AsyncStorage.getItem("auth_token");
        if (!token) {
          router.replace("/auth");
          return;
        }

        const response = await fetch(
          `${API_URL}/api/menu/restaurant/${encodeURIComponent(restaurantId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "تعذر تحميل المنيو");
        }

        if (!mounted) return;

        setRestaurant(data.restaurant || null);
        setItems(Array.isArray(data.items) ? data.items : []);

        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          try {
            const cart: Cart = JSON.parse(raw);
            if (cart.restaurantId === restaurantId && Array.isArray(cart.items)) {
              setCount(
                cart.items.reduce(
                  (total, cartItem) => total + Number(cartItem.quantity || 0),
                  0
                )
              );
            }
          } catch {
            await AsyncStorage.removeItem(KEY);
          }
        }
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "تعذر تحميل المنيو");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadMenu();

    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  const add = async (item: Item) => {
    try {
      if (!restaurantId) return;

      setError("");

      const raw = await AsyncStorage.getItem(KEY);
      let cart: Cart = {
        restaurantId: String(restaurantId),
        restaurantName: restaurant?.name || "",
        items: [],
      };

      if (raw) {
        try {
          cart = JSON.parse(raw);
        } catch {
          cart = {
            restaurantId: String(restaurantId),
            restaurantName: restaurant?.name || "",
            items: [],
          };
        }
      }

      if (cart.restaurantId !== String(restaurantId) && cart.items.length > 0) {
        setError("السلة فيها منتجات من مطعم آخر. افتح السلة وأكمل الطلب أولًا.");
        return;
      }

      cart.restaurantId = String(restaurantId);
      cart.restaurantName = restaurant?.name || cart.restaurantName || "";
      cart.items = Array.isArray(cart.items) ? cart.items : [];

      const existing = cart.items.find((cartItem) => cartItem.id === item.id);

      if (existing) {
        existing.quantity = Number(existing.quantity || 0) + 1;
      } else {
        cart.items.push({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          quantity: 1,
        });
      }

      await AsyncStorage.setItem(KEY, JSON.stringify(cart));
      setCount(
        cart.items.reduce(
          (total, cartItem) => total + Number(cartItem.quantity || 0),
          0
        )
      );
    } catch {
      setError("تعذر إضافة المنتج للسلة");
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>→</Text>
          </Pressable>

          <View style={s.headerInfo}>
            <Text style={s.title}>{restaurant?.name || "منيو المطعم"}</Text>
            <Text style={s.sub}>
              {restaurant?.area || restaurant?.address || ""}
            </Text>
          </View>
        </View>

        {count > 0 && (
          <Pressable
            onPress={() => router.push("/customer/cart")}
            style={s.cart}
          >
            <Text style={s.cartText}>🛒 السلة ({count})</Text>
          </Pressable>
        )}

        {loading && (
          <View style={s.center}>
            <ActivityIndicator color={theme.primary} />
            <Text style={s.muted}>بنحمّل المنيو...</Text>
          </View>
        )}

        {!loading && error !== "" && (
          <View style={s.center}>
            <Text style={s.error}>{error}</Text>
          </View>
        )}

        {!loading && error === "" && items.length === 0 && (
          <View style={s.center}>
            <Text style={s.emptyIcon}>🍽️</Text>
            <Text style={s.emptyTitle}>المنيو لسه بتتجهز</Text>
            <Text style={s.muted}>
              المطعم لم يضف منتجات متاحة حتى الآن.
            </Text>
          </View>
        )}

        {!loading && error === "" && items.length > 0 && (
          <View>
            {items.map((item) => (
              <View key={item.id} style={s.item}>
                <View style={s.itemIcon}>
                  <Text style={s.foodIcon}>🍔</Text>
                </View>

                <View style={s.body}>
                  <Text style={s.name}>{item.name}</Text>
                  {item.description ? (
                    <Text style={s.desc}>{item.description}</Text>
                  ) : null}
                  <Text style={s.price}>
                    {Number(item.price).toFixed(2)} ج.م
                  </Text>
                </View>

                <Pressable onPress={() => add(item)} style={s.add}>
                  <Text style={s.addText}>+</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 18,
    paddingBottom: 35,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 24,
    color: theme.text,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: theme.text,
    textAlign: "right",
  },
  sub: {
    fontSize: 11,
    color: theme.muted,
    textAlign: "right",
    marginTop: 3,
  },
  cart: {
    backgroundColor: theme.primary,
    borderRadius: 15,
    padding: 13,
    marginBottom: 14,
    alignItems: "center",
  },
  cartText: {
    color: "#fff",
    fontWeight: "900",
  },
  item: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 11,
    marginBottom: 10,
  },
  itemIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  foodIcon: {
    fontSize: 25,
  },
  body: {
    flex: 1,
  },
  name: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
  },
  desc: {
    color: theme.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 4,
    lineHeight: 15,
  },
  price: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 6,
  },
  add: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "700",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    gap: 9,
  },
  muted: {
    color: theme.muted,
    fontSize: 12,
  },
  error: {
    color: theme.danger,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: 45,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "900",
  },
});
