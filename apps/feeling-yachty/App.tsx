import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { checkoutUrl, fetchFleet, fetchYacht, money, sendTalkMessage, startingTotal } from './src/api';
import { CITIES, GHL_FORM, type City } from './src/config';
import { browseYachts, promoYachts } from './src/promo';
import { colors } from './src/theme';
import type { Yacht } from './src/types';

type Tab = 'yachts' | 'promos' | 'talk';
type Overlay = null | 'yacht' | 'checkout' | 'ghl-form';

export default function App() {
  const [tab, setTab] = useState<Tab>('yachts');
  const [city, setCity] = useState<City>(CITIES[0]);
  const [yachts, setYachts] = useState<Yacht[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Yacht | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [talkState, setTalkState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [talkError, setTalkError] = useState('');

  useEffect(() => {
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
  }, [city.fleet]);

  const browse = useMemo(() => {
    const list = browseYachts(yachts);
    if (!query.trim()) {
      return list;
    }
    const q = query.trim().toLowerCase();
    return list.filter((y) => `${y.title} ${y.size_ft || ''}`.toLowerCase().includes(q));
  }, [yachts, query]);

  const promos = useMemo(() => promoYachts(yachts), [yachts]);

  async function openYacht(yacht: Yacht) {
    try {
      const full = await fetchYacht(yacht.id);
      setSelected(full);
    } catch {
      setSelected(yacht);
    }
    setOverlay('yacht');
  }

  async function onSendTalk() {
    if (!name.trim() || !phone.trim() || !message.trim()) {
      setTalkState('error');
      setTalkError('Name, phone, and a message are required.');
      return;
    }
    setTalkState('sending');
    setTalkError('');
    try {
      await sendTalkMessage({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        message: message.trim(),
        city: city.label,
      });
      setTalkState('sent');
      setMessage('');
    } catch (err) {
      setTalkState('error');
      setTalkError(err instanceof Error ? err.message : 'Please try WhatsApp.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Image source={require('./assets/logo.png')} style={styles.logo} />
        <View style={styles.headerText}>
          <Text style={styles.brand}>FEELING YACHTY</Text>
          <Text style={styles.sub}>Miami & Panama yacht charters</Text>
        </View>
        <View style={styles.citySwitch}>
          {CITIES.map((item) => (
            <Pressable
              key={item.slug}
              onPress={() => setCity(item)}
              style={[styles.cityPill, city.slug === item.slug && styles.cityPillOn]}
            >
              <Text style={[styles.cityPillText, city.slug === item.slug && styles.cityPillTextOn]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {overlay === 'checkout' && selected && (
        <View style={styles.flex}>
          <View style={styles.topBar}>
            <Pressable onPress={() => setOverlay('yacht')}><Text style={styles.back}>‹ Yacht</Text></Pressable>
            <Text style={styles.topTitle}>Book</Text>
            <View style={{ width: 56 }} />
          </View>
          <WebView source={{ uri: checkoutUrl(selected) }} style={styles.flex} />
        </View>
      )}

      {overlay === 'ghl-form' && (
        <View style={styles.flex}>
          <View style={styles.topBar}>
            <Pressable onPress={() => setOverlay(null)}><Text style={styles.back}>‹ Talk</Text></Pressable>
            <Text style={styles.topTitle}>Live form</Text>
            <View style={{ width: 56 }} />
          </View>
          <WebView source={{ uri: GHL_FORM }} style={styles.flex} />
        </View>
      )}

      {overlay === 'yacht' && selected && (
        <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.topBar}>
            <Pressable onPress={() => setOverlay(null)}><Text style={styles.back}>‹ Back</Text></Pressable>
            <Text style={styles.topTitle}>Yacht</Text>
            <View style={{ width: 56 }} />
          </View>
          {!!selected.image_url && <Image source={{ uri: selected.image_url }} style={styles.hero} />}
          <View style={{ padding: 16 }}>
            {selected.is_pink && <Text style={styles.promoTag}>PINK PROMO</Text>}
            <Text style={styles.yachtTitle}>{selected.title}</Text>
            <Text style={styles.meta}>
              {selected.size_ft ? `${selected.size_ft} ft` : ''}
              {selected.capacity_max ? ` · up to ${selected.capacity_max} guests` : ''}
            </Text>
            {!!selected.marina?.title && (
              <Text style={styles.marina}>Meet at {selected.marina.title}</Text>
            )}
            {!!selected.special_desc && (
              <Text style={styles.blurb}>{stripHtml(selected.special_desc)}</Text>
            )}
            <Text style={styles.section}>Trip totals</Text>
            {(selected.pricing || [])
              .filter((row) => (row.type || 'price') === 'price')
              .map((row, idx) => (
                <View key={`${row.duration}-${idx}`} style={styles.priceRow}>
                  <Text style={styles.priceDur}>{row.duration}</Text>
                  <Text style={styles.priceAmt}>{money(Number(row.price || 0))}</Text>
                </View>
              ))}
            <Pressable style={styles.book} onPress={() => setOverlay('checkout')}>
              <Text style={styles.bookText}>Book this yacht</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => { setTab('talk'); setOverlay(null); }}>
              <Text style={styles.secondaryText}>Questions? Talk to us live</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {!overlay && tab === 'yachts' && (
        <View style={styles.flex}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or size"
            placeholderTextColor={colors.muted}
            style={styles.search}
          />
          {loading && <ActivityIndicator color={colors.pink} style={{ marginTop: 28 }} />}
          {!!error && <Text style={styles.error}>{error}</Text>}
          {!loading && !error && (
            <FlatList
              data={browse}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              ListHeaderComponent={
                <Text style={styles.listLead}>{browse.length} yachts available in {city.label}</Text>
              }
              ListEmptyComponent={<Text style={styles.empty}>No yachts match that search.</Text>}
              renderItem={({ item }) => <YachtCard yacht={item} onPress={() => openYacht(item)} />}
            />
          )}
        </View>
      )}

      {!overlay && tab === 'promos' && (
        <View style={styles.flex}>
          <View style={styles.promoBanner}>
            <Text style={styles.promoBannerKicker}>PINK PROMO FLEET</Text>
            <Text style={styles.promoBannerTitle}>Special yachts — only in this tab</Text>
            <Text style={styles.promoBannerBody}>
              These boats do not appear in Browse. They are the pink / promo fleet guests ask for first.
            </Text>
          </View>
          {loading && <ActivityIndicator color={colors.pink} style={{ marginTop: 28 }} />}
          {!loading && (
            <FlatList
              data={promos}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {city.slug === 'panama'
                    ? 'Panama promos are coming. Talk to us live and we will send options.'
                    : 'No promo yachts loaded. Pull to refresh or Talk to us.'}
                </Text>
              }
              renderItem={({ item }) => <YachtCard yacht={item} promo onPress={() => openYacht(item)} />}
            />
          )}
        </View>
      )}

      {!overlay && tab === 'talk' && (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <Text style={styles.talkTitle}>Speak with us live</Text>
            <Text style={styles.talkLead}>
              This goes straight into GoHighLevel — the same inbox as our website texts, WhatsApp, and calls. No chatbot.
            </Text>

            <View style={styles.liveRow}>
              <Pressable style={styles.liveBtn} onPress={() => Linking.openURL(`tel:${city.phone}`)}>
                <Text style={styles.liveBtnText}>Call</Text>
              </Pressable>
              <Pressable
                style={styles.liveBtn}
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/${city.whatsapp}?text=${encodeURIComponent(
                      `Hi Feeling Yachty! I am in the ${city.label} app and want to talk live.`
                    )}`
                  )
                }
              >
                <Text style={styles.liveBtnText}>WhatsApp</Text>
              </Pressable>
              <Pressable style={styles.liveBtn} onPress={() => Linking.openURL(`sms:${city.phone}`)}>
                <Text style={styles.liveBtnText}>SMS</Text>
              </Pressable>
            </View>

            <Pressable style={styles.ghlLink} onPress={() => setOverlay('ghl-form')}>
              <Text style={styles.ghlLinkText}>Open the live GHL form</Text>
            </Pressable>

            <Text style={styles.section}>Or message the inbox now</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput value={phone} onChangeText={setPhone} placeholder="Mobile number" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={styles.input} />
            <TextInput value={email} onChangeText={setEmail} placeholder="Email (optional)" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="How can we help? Date, guests, budget…"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
            />
            <Pressable style={styles.book} onPress={onSendTalk} disabled={talkState === 'sending'}>
              <Text style={styles.bookText}>{talkState === 'sending' ? 'Sending…' : 'Send to the team'}</Text>
            </Pressable>
            {talkState === 'sent' && (
              <Text style={styles.ok}>Got it. A specialist will reply in GHL / SMS / WhatsApp.</Text>
            )}
            {talkState === 'error' && <Text style={styles.error}>{talkError}</Text>}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {!overlay && (
        <View style={styles.tabs}>
          <TabBtn label="Yachts" active={tab === 'yachts'} onPress={() => setTab('yachts')} />
          <TabBtn label="Promos" active={tab === 'promos'} onPress={() => setTab('promos')} />
          <TabBtn label="Talk" active={tab === 'talk'} onPress={() => setTab('talk')} />
        </View>
      )}
    </SafeAreaView>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabOn]}>
      <Text style={[styles.tabText, active && styles.tabTextOn]}>{label}</Text>
    </Pressable>
  );
}

function YachtCard({ yacht, onPress, promo }: { yacht: Yacht; onPress: () => void; promo?: boolean }) {
  const start = startingTotal(yacht);
  return (
    <Pressable style={[styles.card, promo && styles.cardPromo]} onPress={onPress}>
      {!!yacht.image_url && <Image source={{ uri: yacht.image_url }} style={styles.cardImg} />}
      <View style={styles.cardBody}>
        {promo && <Text style={styles.promoTag}>PROMO ONLY</Text>}
        <Text style={styles.cardTitle}>{yacht.title}</Text>
        <Text style={styles.meta}>
          {yacht.size_ft ? `${yacht.size_ft} ft` : ''}
          {yacht.capacity_max ? ` · ${yacht.capacity_max} guests` : ''}
        </Text>
        <Text style={styles.cardPrice}>
          {start ? `From ${money(start.amount)} · ${start.duration}` : 'See trip prices'}
        </Text>
      </View>
    </Pressable>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navyDeep },
  flex: { flex: 1, backgroundColor: colors.paper },
  header: {
    backgroundColor: colors.navyDeep,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: { width: 52, height: 52, borderRadius: 26 },
  headerText: { flex: 1 },
  brand: { color: colors.cream, fontWeight: '800', letterSpacing: 1, fontSize: 13 },
  sub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  citySwitch: { flexDirection: 'row', backgroundColor: '#12263a', borderRadius: 999, padding: 3 },
  cityPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  cityPillOn: { backgroundColor: colors.pink },
  cityPillText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  cityPillTextOn: { color: colors.white },
  topBar: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: { color: colors.white, fontWeight: '800' },
  back: { color: '#ffb3d2', fontWeight: '700' },
  search: {
    margin: 16,
    marginBottom: 4,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
  },
  listLead: { color: colors.muted, marginBottom: 12, fontWeight: '600' },
  empty: { color: colors.muted, padding: 24, textAlign: 'center' },
  error: { color: colors.pink, padding: 16, textAlign: 'center' },
  ok: { color: '#1db36a', paddingTop: 12, textAlign: 'center', fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardPromo: { borderColor: colors.pink, borderWidth: 2 },
  cardImg: { width: '100%', height: 168, backgroundColor: colors.navy },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4 },
  cardPrice: { color: colors.pink, fontWeight: '800', marginTop: 8 },
  promoTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pink,
    color: colors.white,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
    overflow: 'hidden',
  },
  promoBanner: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: colors.navy,
    borderRadius: 16,
    padding: 16,
  },
  promoBannerKicker: { color: colors.pink, fontWeight: '800', letterSpacing: 1, fontSize: 11 },
  promoBannerTitle: { color: colors.white, fontWeight: '800', fontSize: 20, marginTop: 6 },
  promoBannerBody: { color: '#d7e6f5', marginTop: 8, lineHeight: 20 },
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
  book: { backgroundColor: colors.pink, borderRadius: 14, padding: 16, marginTop: 20 },
  bookText: { color: colors.white, fontWeight: '800', textAlign: 'center', fontSize: 17 },
  secondary: { padding: 14 },
  secondaryText: { color: colors.pink, textAlign: 'center', fontWeight: '700' },
  talkTitle: { fontSize: 26, fontWeight: '800', color: colors.ink },
  talkLead: { color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  liveRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  liveBtn: { flex: 1, backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 14 },
  liveBtnText: { color: colors.white, fontWeight: '800', textAlign: 'center' },
  ghlLink: { paddingVertical: 10, marginBottom: 8 },
  ghlLinkText: { color: colors.pink, fontWeight: '700', textAlign: 'center' },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: colors.ink,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.navyDeep,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#12263a' },
  tabOn: { backgroundColor: colors.pink },
  tabText: { color: colors.muted, fontWeight: '800', textAlign: 'center' },
  tabTextOn: { color: colors.white },
});
