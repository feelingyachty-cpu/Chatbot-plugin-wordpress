import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { checkoutUrl, fetchFleet, fetchYacht, money, startingTotal } from './src/api';
import { CITIES, type City } from './src/config';
import { colors } from './src/theme';
import type { Yacht } from './src/types';

type Screen = 'home' | 'fleet' | 'yacht' | 'checkout' | 'contact';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [city, setCity] = useState<City>(CITIES[0]);
  const [yachts, setYachts] = useState<Yacht[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [pinkOnly, setPinkOnly] = useState(false);
  const [selected, setSelected] = useState<Yacht | null>(null);

  useEffect(() => {
    if (screen !== 'fleet') {
      return;
    }
    let alive = true;
    setLoading(true);
    setError('');
    fetchFleet(city.fleet)
      .then((rows) => {
        if (alive) {
          setYachts(rows);
        }
      })
      .catch((err: Error) => {
        if (alive) {
          setError(err.message || 'Could not load yachts');
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [screen, city.fleet]);

  const visible = useMemo(() => {
    return yachts.filter((yacht) => {
      if (pinkOnly && !yacht.is_pink) {
        return false;
      }
      if (!query.trim()) {
        return true;
      }
      const hay = `${yacht.title} ${yacht.size_ft || ''}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
  }, [yachts, query, pinkOnly]);

  async function openYacht(yacht: Yacht) {
    setLoading(true);
    try {
      const full = await fetchYacht(yacht.id);
      setSelected(full);
      setScreen('yacht');
    } catch {
      setSelected(yacht);
      setScreen('yacht');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      {screen === 'home' && (
        <View style={styles.cover}>
          <Text style={styles.kicker}>FEELING YACHTY</Text>
          <Text style={styles.h1}>Book a yacht{'\n'}in Miami or Panama</Text>
          <Text style={styles.lead}>Same boats and same WooCommerce checkout as the website. Message us in WhatsApp or by phone — that inbox is GoHighLevel, not a chatbot.</Text>
          {CITIES.map((item) => (
            <Pressable
              key={item.slug}
              style={styles.cityBtn}
              onPress={() => {
                setCity(item);
                setQuery('');
                setPinkOnly(false);
                setScreen('fleet');
              }}
            >
              <Text style={styles.cityBtnText}>{item.label} fleet</Text>
            </Pressable>
          ))}
          <Pressable style={styles.linkBtn} onPress={() => setScreen('contact')}>
            <Text style={styles.linkBtnText}>Call or WhatsApp</Text>
          </Pressable>
        </View>
      )}

      {screen === 'fleet' && (
        <View style={styles.flex}>
          <View style={styles.top}>
            <Pressable onPress={() => setScreen('home')}><Text style={styles.back}>‹ Cities</Text></Pressable>
            <Text style={styles.topTitle}>{city.label}</Text>
            <Pressable onPress={() => setScreen('contact')}><Text style={styles.back}>Help</Text></Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or size"
            placeholderTextColor={colors.muted}
            style={styles.search}
          />
          <Pressable style={[styles.chip, pinkOnly && styles.chipOn]} onPress={() => setPinkOnly((v) => !v)}>
            <Text style={[styles.chipText, pinkOnly && styles.chipTextOn]}>Pink yachts only</Text>
          </Pressable>
          {loading && <ActivityIndicator color={colors.pink} style={{ marginTop: 24 }} />}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <FlatList
            data={visible}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            renderItem={({ item }) => {
              const start = startingTotal(item);
              return (
                <Pressable style={styles.card} onPress={() => openYacht(item)}>
                  {!!item.image_url && <Image source={{ uri: item.image_url }} style={styles.cardImg} />}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardMeta}>
                      {item.size_ft ? `${item.size_ft} ft` : ''}
                      {item.capacity_max ? ` · ${item.capacity_max} guests` : ''}
                      {item.is_pink ? ' · Pink' : ''}
                    </Text>
                    <Text style={styles.cardPrice}>
                      {start ? `From ${money(start.amount)} · ${start.duration}` : 'See trip prices'}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {screen === 'yacht' && selected && (
        <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.top}>
            <Pressable onPress={() => setScreen('fleet')}><Text style={styles.back}>‹ Fleet</Text></Pressable>
            <Text style={styles.topTitle} numberOfLines={1}>Yacht</Text>
            <View style={{ width: 48 }} />
          </View>
          {!!selected.image_url && <Image source={{ uri: selected.image_url }} style={styles.hero} />}
          <View style={{ padding: 16 }}>
            <Text style={styles.yachtTitle}>{selected.title}</Text>
            <Text style={styles.cardMeta}>
              {selected.size_ft ? `${selected.size_ft} ft` : ''}
              {selected.capacity_max ? ` · up to ${selected.capacity_max} guests` : ''}
            </Text>
            {!!selected.marina?.title && (
              <Text style={styles.marina}>Meet at {selected.marina.title}</Text>
            )}
            {!!selected.special_desc && <Text style={styles.blurb}>{stripHtml(selected.special_desc)}</Text>}
            <Text style={styles.section}>Trip totals</Text>
            {(selected.pricing || [])
              .filter((row) => (row.type || 'price') === 'price')
              .map((row, idx) => (
                <View key={`${row.duration}-${idx}`} style={styles.priceRow}>
                  <Text style={styles.priceDur}>{row.duration}</Text>
                  <Text style={styles.priceAmt}>{money(Number(row.price || 0))}</Text>
                </View>
              ))}
            <Pressable
              style={styles.book}
              onPress={() => setScreen('checkout')}
              disabled={!checkoutUrl(selected)}
            >
              <Text style={styles.bookText}>Book on WooCommerce</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => setScreen('contact')}>
              <Text style={styles.secondaryText}>Questions? WhatsApp the team</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {screen === 'checkout' && selected && (
        <View style={styles.flex}>
          <View style={styles.top}>
            <Pressable onPress={() => setScreen('yacht')}><Text style={styles.back}>‹ Yacht</Text></Pressable>
            <Text style={styles.topTitle}>Checkout</Text>
            <View style={{ width: 48 }} />
          </View>
          <WebView source={{ uri: checkoutUrl(selected) }} style={styles.flex} />
        </View>
      )}

      {screen === 'contact' && (
        <View style={styles.cover}>
          <Pressable onPress={() => setScreen('home')}><Text style={[styles.back, { color: '#ffb3d2' }]}>‹ Home</Text></Pressable>
          <Text style={styles.h1}>Talk to the team</Text>
          <Text style={styles.lead}>GoHighLevel handles every text, WhatsApp, email, and call. This app does not include a chatbot.</Text>
          <Pressable style={styles.cityBtn} onPress={() => Linking.openURL(`tel:${city.phone}`)}>
            <Text style={styles.cityBtnText}>Call {city.label}</Text>
          </Pressable>
          <Pressable
            style={styles.cityBtn}
            onPress={() => Linking.openURL(`https://wa.me/${city.whatsapp}?text=${encodeURIComponent('Hi Feeling Yachty! I am looking at yachts in the app.')}`)}
          >
            <Text style={styles.cityBtnText}>WhatsApp {city.label}</Text>
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={() => Linking.openURL(`sms:${city.phone}`)}>
            <Text style={styles.linkBtnText}>SMS</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navyDeep },
  flex: { flex: 1, backgroundColor: colors.paper },
  cover: { flex: 1, backgroundColor: colors.navyDeep, padding: 24, justifyContent: 'center' },
  kicker: { color: colors.pink, fontWeight: '800', letterSpacing: 1.4, marginBottom: 12 },
  h1: { color: colors.white, fontSize: 34, fontWeight: '800', lineHeight: 38, marginBottom: 12 },
  lead: { color: '#d7e6f5', fontSize: 16, marginBottom: 28, lineHeight: 22 },
  cityBtn: { backgroundColor: colors.pink, borderRadius: 14, padding: 16, marginBottom: 12 },
  cityBtnText: { color: colors.white, fontWeight: '800', fontSize: 18, textAlign: 'center' },
  linkBtn: { padding: 12 },
  linkBtnText: { color: '#ffb3d2', textAlign: 'center', fontWeight: '700' },
  top: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: { color: colors.white, fontWeight: '800', fontSize: 16 },
  back: { color: '#ffb3d2', fontWeight: '700' },
  search: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
  },
  chip: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.pink,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: colors.pink },
  chipText: { color: colors.pink, fontWeight: '700' },
  chipTextOn: { color: colors.white },
  error: { color: colors.pink, padding: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardImg: { width: '100%', height: 170, backgroundColor: colors.navy },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  cardMeta: { color: colors.muted, marginTop: 4 },
  cardPrice: { color: colors.pink, fontWeight: '800', marginTop: 8 },
  hero: { width: '100%', height: 220, backgroundColor: colors.navy },
  yachtTitle: { fontSize: 24, fontWeight: '800', color: colors.ink },
  marina: { marginTop: 8, color: colors.navy, fontWeight: '700' },
  blurb: { marginTop: 12, color: colors.ink, lineHeight: 20 },
  section: { marginTop: 20, marginBottom: 8, color: colors.pink, fontWeight: '800' },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  priceDur: { color: colors.ink },
  priceAmt: { fontWeight: '800', color: colors.navy },
  book: { backgroundColor: colors.pink, borderRadius: 14, padding: 16, marginTop: 22 },
  bookText: { color: colors.white, fontWeight: '800', textAlign: 'center', fontSize: 17 },
  secondary: { padding: 14 },
  secondaryText: { color: colors.pink, textAlign: 'center', fontWeight: '700' },
});
