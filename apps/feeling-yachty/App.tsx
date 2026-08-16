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
import { fetchMe, loadCachedUser, loadSettings, loadToken } from './src/auth';
import { CITIES, GHL_FORM, type City } from './src/config';
import { t } from './src/i18n';
import { ProfileTab } from './src/ProfileTab';
import { browseYachts, promoYachts } from './src/promo';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import type { Colors } from './src/theme';
import type { AppSettings, AppUser, Booking, Yacht } from './src/types';

type Tab = 'yachts' | 'promos' | 'talk' | 'profile';
type Overlay = null | 'yacht' | 'checkout' | 'ghl-form';

export default function App() {
  const [boot, setBoot] = useState<AppSettings | null>(null);
  useEffect(() => {
    loadSettings().then(setBoot);
  }, []);
  if (!boot) {
    return (
      <View style={{ flex: 1, backgroundColor: '#081018', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#e11d74" />
      </View>
    );
  }
  return (
    <ThemeProvider initial={boot}>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { colors, settings, applyRemote } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const lang = settings.language;
  const defaultCity = CITIES.find((c) => c.slug === settings.defaultCity) || CITIES[0];

  const [tab, setTab] = useState<Tab>('yachts');
  const [city, setCity] = useState<City>(defaultCity);
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

  const [user, setUser] = useState<AppUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await loadCachedUser();
      if (alive && cached) {
        setUser(cached);
        if (settings.prefillTalk) {
          setName(cached.display_name || `${cached.first_name || ''} ${cached.last_name || ''}`.trim());
          setPhone(cached.phone || '');
          setEmail(cached.email || '');
        }
      }
      const live = await fetchMe();
      if (!alive) {
        return;
      }
      if (live?.user) {
        setUser(live.user);
        setBookings(live.bookings);
        if (live.user.settings) {
          await applyRemote(live.user.settings);
        }
        if (settings.prefillTalk) {
          setName(live.user.display_name || `${live.user.first_name || ''} ${live.user.last_name || ''}`.trim());
          setPhone(live.user.phone || '');
          setEmail(live.user.email || '');
        }
      } else if (!(await loadToken())) {
        setUser(null);
        setBookings([]);
      }
      setProfileLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [settings.prefillTalk]);

  useEffect(() => {
    const next = CITIES.find((c) => c.slug === settings.defaultCity);
    if (next) {
      setCity(next);
    }
  }, [settings.defaultCity]);

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
      setTalkError(t(lang, 'talkRequired'));
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

  function openPreferredContact() {
    if (settings.preferredContact === 'call') {
      Linking.openURL(`tel:${city.phone}`);
      return;
    }
    if (settings.preferredContact === 'sms') {
      Linking.openURL(`sms:${city.phone}`);
      return;
    }
    Linking.openURL(
      `https://wa.me/${city.whatsapp}?text=${encodeURIComponent(
        `Hi Feeling Yachty! I am in the ${city.label} app and want to talk live.`
      )}`
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Image source={require('./assets/logo.png')} style={styles.logo} />
        <View style={styles.headerText}>
          <Text style={styles.brand}>{t(lang, 'brand')}</Text>
          <Text style={styles.sub}>{t(lang, 'tagline')}</Text>
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
            {selected.is_pink && <Text style={styles.promoTag}>{t(lang, 'pinkPromo')}</Text>}
            <Text style={styles.yachtTitle}>{selected.title}</Text>
            <Text style={styles.meta}>
              {selected.size_ft ? `${selected.size_ft} ft` : ''}
              {selected.capacity_max ? ` · up to ${selected.capacity_max} guests` : ''}
            </Text>
            {!!selected.marina?.title && (
              <Text style={styles.marina}>{t(lang, 'meetAt', { marina: selected.marina.title })}</Text>
            )}
            {!!selected.special_desc && (
              <Text style={styles.blurb}>{stripHtml(selected.special_desc)}</Text>
            )}
            <Text style={styles.section}>{t(lang, 'tripTotals')}</Text>
            {(selected.pricing || [])
              .filter((row) => (row.type || 'price') === 'price')
              .map((row, idx) => (
                <View key={`${row.duration}-${idx}`} style={styles.priceRow}>
                  <Text style={styles.priceDur}>{row.duration}</Text>
                  <Text style={styles.priceAmt}>{money(Number(row.price || 0))}</Text>
                </View>
              ))}
            <Pressable style={styles.book} onPress={() => setOverlay('checkout')}>
              <Text style={styles.bookText}>{t(lang, 'bookYacht')}</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => { setTab('talk'); setOverlay(null); }}>
              <Text style={styles.secondaryText}>{t(lang, 'questionsTalk')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {!overlay && tab === 'yachts' && (
        <View style={styles.flex}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t(lang, 'search')}
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
                <Text style={styles.listLead}>{t(lang, 'available', { n: browse.length, city: city.label })}</Text>
              }
              ListEmptyComponent={<Text style={styles.empty}>{t(lang, 'noMatch')}</Text>}
              renderItem={({ item }) => (
                <YachtCard
                  yacht={item}
                  colors={colors}
                  compact={settings.compactCards}
                  showPrice={settings.showPrices}
                  promoLabel={t(lang, 'promoOnly')}
                  fromLabel={t(lang, 'fromPrice')}
                  seePricesLabel={t(lang, 'seePrices')}
                  onPress={() => openYacht(item)}
                />
              )}
            />
          )}
        </View>
      )}

      {!overlay && tab === 'promos' && (
        <View style={styles.flex}>
          <View style={styles.promoBanner}>
            <Text style={styles.promoBannerKicker}>{t(lang, 'promoKicker')}</Text>
            <Text style={styles.promoBannerTitle}>{t(lang, 'promoTitle')}</Text>
            <Text style={styles.promoBannerBody}>{t(lang, 'promoBody')}</Text>
          </View>
          {loading && <ActivityIndicator color={colors.pink} style={{ marginTop: 28 }} />}
          {!loading && (
            <FlatList
              data={promos}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {city.slug === 'panama' ? t(lang, 'promoEmptyPanama') : t(lang, 'promoEmptyMiami')}
                </Text>
              }
              renderItem={({ item }) => (
                <YachtCard
                  yacht={item}
                  promo
                  colors={colors}
                  compact={settings.compactCards}
                  showPrice={settings.showPrices}
                  promoLabel={t(lang, 'promoOnly')}
                  fromLabel={t(lang, 'fromPrice')}
                  seePricesLabel={t(lang, 'seePrices')}
                  onPress={() => openYacht(item)}
                />
              )}
            />
          )}
        </View>
      )}

      {!overlay && tab === 'talk' && (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <Text style={styles.talkTitle}>{t(lang, 'talkTitle')}</Text>
            <Text style={styles.talkLead}>{t(lang, 'talkLead')}</Text>

            <Pressable style={styles.book} onPress={openPreferredContact}>
              <Text style={styles.bookText}>
                {settings.preferredContact === 'call'
                  ? t(lang, 'callTeam')
                  : settings.preferredContact === 'sms'
                    ? t(lang, 'textTeam')
                    : t(lang, 'waTeam')}
              </Text>
            </Pressable>

            <View style={styles.liveRow}>
              <Pressable style={styles.liveBtn} onPress={() => Linking.openURL(`tel:${city.phone}`)}>
                <Text style={styles.liveBtnText}>{t(lang, 'call')}</Text>
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
                <Text style={styles.liveBtnText}>{t(lang, 'whatsapp')}</Text>
              </Pressable>
              <Pressable style={styles.liveBtn} onPress={() => Linking.openURL(`sms:${city.phone}`)}>
                <Text style={styles.liveBtnText}>{t(lang, 'sms')}</Text>
              </Pressable>
            </View>

            <Pressable style={styles.ghlLink} onPress={() => setOverlay('ghl-form')}>
              <Text style={styles.ghlLinkText}>{t(lang, 'ghlForm')}</Text>
            </Pressable>

            <Text style={styles.section}>{t(lang, 'messageNow')}</Text>
            <TextInput value={name} onChangeText={setName} placeholder={t(lang, 'yourName')} placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput value={phone} onChangeText={setPhone} placeholder={t(lang, 'mobile')} placeholderTextColor={colors.muted} keyboardType="phone-pad" style={styles.input} />
            <TextInput value={email} onChangeText={setEmail} placeholder={t(lang, 'emailOptional')} placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t(lang, 'helpPlaceholder')}
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
            />
            <Pressable style={styles.book} onPress={onSendTalk} disabled={talkState === 'sending'}>
              <Text style={styles.bookText}>{talkState === 'sending' ? t(lang, 'sending') : t(lang, 'sendTeam')}</Text>
            </Pressable>
            {talkState === 'sent' && (
              <Text style={styles.ok}>{t(lang, 'talkSent')}</Text>
            )}
            {talkState === 'error' && <Text style={styles.error}>{talkError}</Text>}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {!overlay && tab === 'profile' && (
        <View style={styles.flex}>
          <ProfileTab
            user={user}
            bookings={bookings}
            loading={profileLoading}
            onUser={(next, nextBookings) => {
              setUser(next);
              if (nextBookings) {
                setBookings(nextBookings);
              }
              if (next?.settings) {
                applyRemote(next.settings);
              }
              if (next && settings.prefillTalk) {
                setName(next.display_name || `${next.first_name || ''} ${next.last_name || ''}`.trim());
                setPhone(next.phone || '');
                setEmail(next.email || '');
              }
            }}
            onLogout={async () => {
              setUser(null);
              setBookings([]);
            }}
          />
        </View>
      )}

      {!overlay && (
        <View style={styles.tabs}>
          <TabBtn label={t(lang, 'yachts')} active={tab === 'yachts'} onPress={() => setTab('yachts')} colors={colors} />
          <TabBtn label={t(lang, 'promos')} active={tab === 'promos'} onPress={() => setTab('promos')} colors={colors} />
          <TabBtn label={t(lang, 'talk')} active={tab === 'talk'} onPress={() => setTab('talk')} colors={colors} />
          <TabBtn label={t(lang, 'profile')} active={tab === 'profile'} onPress={() => setTab('profile')} colors={colors} />
        </View>
      )}
    </SafeAreaView>
  );
}

function TabBtn({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: Colors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: active ? colors.pink : colors.navy,
      }}
    >
      <Text style={{ color: active ? colors.white : colors.muted, fontWeight: '800', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

function YachtCard({
  yacht,
  onPress,
  promo,
  colors,
  compact,
  showPrice,
  promoLabel,
  fromLabel,
  seePricesLabel,
}: {
  yacht: Yacht;
  onPress: () => void;
  promo?: boolean;
  colors: Colors;
  compact?: boolean;
  showPrice?: boolean;
  promoLabel: string;
  fromLabel: string;
  seePricesLabel: string;
}) {
  const start = startingTotal(yacht);
  return (
    <Pressable
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 14,
        borderWidth: promo ? 2 : 1,
        borderColor: promo ? colors.pink : colors.line,
      }}
      onPress={onPress}
    >
      {!!yacht.image_url && !compact && (
        <Image source={{ uri: yacht.image_url }} style={{ width: '100%', height: 168, backgroundColor: colors.navy }} />
      )}
      <View style={{ padding: 12, flexDirection: compact ? 'row' : 'column', gap: 10 }}>
        {!!yacht.image_url && compact && (
          <Image source={{ uri: yacht.image_url }} style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: colors.navy }} />
        )}
        <View style={{ flex: 1 }}>
          {promo && (
            <Text
              style={{
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
              }}
            >
              {promoLabel}
            </Text>
          )}
          <Text style={{ fontSize: compact ? 16 : 17, fontWeight: '800', color: colors.ink }}>{yacht.title}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            {yacht.size_ft ? `${yacht.size_ft} ft` : ''}
            {yacht.capacity_max ? ` · ${yacht.capacity_max} guests` : ''}
          </Text>
          {showPrice !== false && (
            <Text style={{ color: colors.pink, fontWeight: '800', marginTop: 8 }}>
              {start
                ? fromLabel.replace('{price}', money(start.amount)).replace('{duration}', start.duration)
                : seePricesLabel}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
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
    citySwitch: { flexDirection: 'row', backgroundColor: colors.navy, borderRadius: 999, padding: 3 },
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
    liveRow: { flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 12 },
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
    meta: { color: colors.muted, marginTop: 4 },
  });
}
