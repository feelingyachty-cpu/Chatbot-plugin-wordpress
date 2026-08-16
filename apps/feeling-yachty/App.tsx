import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { checkoutUrl, fetchFleet, fetchYacht, sendTalkMessage } from './src/api';
import { fetchMe, loadCachedUser, loadSettings, loadToken } from './src/auth';
import { featuredYachts, filterAndSort, yachtsByIds, type SizeBand, type SortKey, type StyleFilter } from './src/browse';
import { CITIES, GHL_FORM, type City } from './src/config';
import { t } from './src/i18n';
import { ProfileTab } from './src/ProfileTab';
import { promoYachts } from './src/promo';
import { loadRecentIds, loadSavedIds, pushRecentId, saveSavedIds } from './src/saved';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import type { Colors } from './src/theme';
import type { AppSettings, AppUser, Booking, Yacht } from './src/types';
import { CheckoutWeb } from './src/ui/CheckoutWeb';
import { FeaturedReel } from './src/ui/FeaturedReel';
import { FilterBar } from './src/ui/FilterBar';
import { PressScale } from './src/ui/PressScale';
import { FeedSkeleton } from './src/ui/Shimmer';
import { TabBar } from './src/ui/TabBar';
import { MiniCard, YachtCard } from './src/ui/YachtCard';
import { YachtDetail } from './src/ui/YachtDetail';

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
        <Text style={{ color: '#FDF2D0', fontWeight: '800', letterSpacing: 2 }}>FEELING YACHTY</Text>
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [size, setSize] = useState<SizeBand>('all');
  const [style, setStyle] = useState<StyleFilter>('all');
  const [sort, setSort] = useState<SortKey>('featured');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<Yacht | null>(null);
  const [bookDuration, setBookDuration] = useState('');
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
    loadSavedIds().then(setSavedIds);
    loadRecentIds().then(setRecentIds);
  }, []);

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
      if (!alive) return;
      if (live?.user) {
        setUser(live.user);
        setBookings(live.bookings);
        if (live.user.settings) await applyRemote(live.user.settings);
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
    if (next) setCity(next);
  }, [settings.defaultCity]);

  const loadFleet = useCallback(
    async (soft?: boolean) => {
      if (!soft) setLoading(true);
      setError('');
      try {
        const rows = await fetchFleet(city.fleet);
        setYachts(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load yachts');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [city.fleet]
  );

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  const browse = useMemo(
    () => filterAndSort(yachts, { query, size, style, sort, savedIds, pinkOnly: false }),
    [yachts, query, size, style, sort, savedIds]
  );
  const promos = useMemo(() => promoYachts(yachts), [yachts]);
  const promoFiltered = useMemo(
    () => filterAndSort(yachts, { query, size, style: style === 'saved' ? 'saved' : 'all', sort, savedIds, pinkOnly: true }),
    [yachts, query, size, style, sort, savedIds]
  );
  const featured = useMemo(() => featuredYachts(browse, 8), [browse]);
  const recent = useMemo(() => yachtsByIds(yachts, recentIds), [yachts, recentIds]);

  async function openYacht(yacht: Yacht) {
    const nextRecent = await pushRecentId(yacht.id);
    setRecentIds(nextRecent);
    try {
      const full = await fetchYacht(yacht.id);
      setSelected(full);
    } catch {
      setSelected(yacht);
    }
    setOverlay('yacht');
  }

  async function toggleSave(id: number) {
    const next = savedIds.includes(id) ? savedIds.filter((x) => x !== id) : [id, ...savedIds];
    setSavedIds(next);
    await saveSavedIds(next);
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

  const cardLabels = {
    promoLabel: t(lang, 'promoOnly'),
    fromLabel: t(lang, 'fromPrice'),
    seePricesLabel: t(lang, 'seePrices'),
    hoursLabel: t(lang, 'hoursLabel'),
    hideHoursLabel: t(lang, 'hideHoursLabel'),
    guestsLabel: t(lang, 'guestsShort'),
  };

  function renderYacht(item: Yacht, promo?: boolean) {
    return (
      <YachtCard
        yacht={item}
        colors={colors}
        compact={settings.compactCards}
        showPrice={settings.showPrices}
        query={query}
        expanded={expandedId === item.id}
        saved={savedIds.includes(item.id)}
        promo={promo}
        onPress={() => openYacht(item)}
        onToggleHours={() => setExpandedId(expandedId === item.id ? null : item.id)}
        onToggleSave={() => toggleSave(item.id)}
        {...cardLabels}
      />
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
              <Text style={[styles.cityPillText, city.slug === item.slug && styles.cityPillTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {overlay === 'checkout' && selected && (
        <CheckoutWeb
          uri={checkoutUrl(selected, {
            duration: bookDuration,
            guests: user?.typical_guests || undefined,
          })}
          colors={colors}
          lang={lang}
          onBack={() => setOverlay('yacht')}
        />
      )}

      {overlay === 'ghl-form' && (
        <View style={styles.flex}>
          <View style={styles.topBar}>
            <Pressable onPress={() => setOverlay(null)}>
              <Text style={styles.back}>‹ Talk</Text>
            </Pressable>
            <Text style={styles.topTitle}>Live form</Text>
            <View style={{ width: 56 }} />
          </View>
          <WebView source={{ uri: GHL_FORM }} style={styles.flex} />
        </View>
      )}

      {overlay === 'yacht' && selected && (
        <YachtDetail
          yacht={selected}
          colors={colors}
          lang={lang}
          onBack={() => setOverlay(null)}
          onBook={(duration) => {
            setBookDuration(duration || '');
            setOverlay('checkout');
          }}
          onTalk={() => {
            setTab('talk');
            setOverlay(null);
          }}
        />
      )}

      {!overlay && tab === 'yachts' && (
        <View style={styles.flex}>
          <Text style={styles.trust}>
            {t(lang, 'trustLine', { n: browse.length || yachts.length, city: city.label })}
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t(lang, 'search')}
            placeholderTextColor={colors.muted}
            style={styles.search}
          />
          <FilterBar
            colors={colors}
            size={size}
            style={style}
            sort={sort}
            savedCount={savedIds.length}
            onSize={setSize}
            onStyle={setStyle}
            onSort={setSort}
          />
          {loading && <FeedSkeleton colors={colors} />}
          {!!error && <Text style={styles.error}>{error}</Text>}
          {!loading && !error && (
            <FlatList
              data={browse}
              keyExtractor={(item) => String(item.id)}
              extraData={`${expandedId}-${savedIds.join(',')}-${query}`}
              initialNumToRender={8}
              windowSize={7}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadFleet(true);
                  }}
                  tintColor={colors.pink}
                />
              }
              contentContainerStyle={{ paddingBottom: 88 }}
              ListHeaderComponent={
                <View>
                  <Text style={styles.valueNote}>{t(lang, 'valueNote')}</Text>
                  {!!promos.length && (
                    <Pressable onPress={() => setTab('promos')} style={styles.promoJump}>
                      <Text style={styles.promoJumpText}>
                        {t(lang, 'seeAllPromos')} · {promos.length}
                      </Text>
                    </Pressable>
                  )}
                  <FeaturedReel
                    yachts={featured}
                    colors={colors}
                    kicker={t(lang, 'featuredKicker')}
                    title={t(lang, 'featuredTitle')}
                    onPress={openYacht}
                  />
                  {!!recent.length && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.reelTitle}>{t(lang, 'continueBrowsing')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {recent.map((y) => (
                          <MiniCard key={`r-${y.id}`} yacht={y} colors={colors} onPress={() => openYacht(y)} />
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  <Text style={styles.listLead}>{t(lang, 'available', { n: browse.length, city: city.label })}</Text>
                </View>
              }
              ListEmptyComponent={<Text style={styles.empty}>{t(lang, 'noMatch')}</Text>}
              renderItem={({ item }) => renderYacht(item)}
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
          {loading && <FeedSkeleton colors={colors} />}
          {!loading && (
            <FlatList
              data={promoFiltered}
              keyExtractor={(item) => String(item.id)}
              extraData={`${expandedId}-${savedIds.join(',')}`}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadFleet(true);
                  }}
                  tintColor={colors.pink}
                />
              }
              contentContainerStyle={{ paddingBottom: 88 }}
              ListHeaderComponent={
                <FeaturedReel
                  yachts={featuredYachts(promos, 8)}
                  colors={colors}
                  kicker={t(lang, 'pinkReelKicker')}
                  title={t(lang, 'pinkReelTitle')}
                  onPress={openYacht}
                />
              }
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {city.slug === 'panama' ? t(lang, 'promoEmptyPanama') : t(lang, 'promoEmptyMiami')}
                </Text>
              }
              renderItem={({ item }) => renderYacht(item, true)}
            />
          )}
        </View>
      )}

      {!overlay && tab === 'talk' && (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View style={styles.talkHero}>
              <Text style={styles.talkKicker}>24/7 LIVE</Text>
              <Text style={styles.talkTitle}>{t(lang, 'talkTitle')}</Text>
              <Text style={styles.talkLead}>{t(lang, 'talkLead')}</Text>
            </View>

            <PressScale onPress={openPreferredContact}>
              <View style={styles.book}>
                <Text style={styles.bookText}>
                  {settings.preferredContact === 'call'
                    ? t(lang, 'callTeam')
                    : settings.preferredContact === 'sms'
                      ? t(lang, 'textTeam')
                      : t(lang, 'waTeam')}
                </Text>
              </View>
            </PressScale>

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
            {talkState === 'sent' && <Text style={styles.ok}>{t(lang, 'talkSent')}</Text>}
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
              if (nextBookings) setBookings(nextBookings);
              if (next?.settings) applyRemote(next.settings);
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

      {!overlay && tab !== 'talk' && tab !== 'profile' && (
        <Pressable style={styles.fab} onPress={openPreferredContact}>
          <Text style={styles.fabText}>{t(lang, 'liveHelp')}</Text>
        </Pressable>
      )}

      {!overlay && (
        <TabBar
          tab={tab}
          onTab={setTab}
          colors={colors}
          promoCount={promos.length}
          labels={{
            yachts: t(lang, 'yachts'),
            promos: t(lang, 'promos'),
            talk: t(lang, 'talk'),
            profile: t(lang, 'profile'),
          }}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.navyDeep },
    flex: { flex: 1, backgroundColor: colors.paper },
    header: {
      backgroundColor: colors.navyDeep,
      paddingHorizontal: 14,
      paddingBottom: 10,
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
    trust: {
      color: colors.pink,
      fontWeight: '700',
      fontSize: 12,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    valueNote: { color: colors.muted, paddingHorizontal: 16, marginBottom: 10, lineHeight: 18 },
    promoJump: {
      marginHorizontal: 16,
      marginBottom: 14,
      backgroundColor: colors.navy,
      borderRadius: 14,
      padding: 12,
    },
    promoJumpText: { color: colors.cream, fontWeight: '800', textAlign: 'center' },
    reelTitle: { color: colors.ink, fontWeight: '800', fontSize: 18, paddingHorizontal: 16, marginBottom: 10 },
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
      margin: 12,
      marginBottom: 8,
      backgroundColor: colors.white,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: colors.line,
      color: colors.ink,
    },
    listLead: { color: colors.muted, marginBottom: 12, fontWeight: '700', paddingHorizontal: 16, marginTop: 8 },
    empty: { color: colors.muted, padding: 24, textAlign: 'center' },
    error: { color: colors.pink, padding: 16, textAlign: 'center' },
    ok: { color: '#1db36a', paddingTop: 12, textAlign: 'center', fontWeight: '700' },
    promoBanner: {
      margin: 16,
      marginBottom: 8,
      backgroundColor: colors.navy,
      borderRadius: 16,
      padding: 16,
    },
    promoBannerKicker: { color: colors.pink, fontWeight: '800', letterSpacing: 1, fontSize: 11 },
    promoBannerTitle: { color: colors.white, fontWeight: '800', fontSize: 20, marginTop: 6 },
    promoBannerBody: { color: '#d7e6f5', marginTop: 8, lineHeight: 20 },
    section: { marginTop: 20, marginBottom: 8, color: colors.pink, fontWeight: '800' },
    book: { backgroundColor: colors.pink, borderRadius: 14, padding: 16, marginTop: 16 },
    bookText: { color: colors.white, fontWeight: '800', textAlign: 'center', fontSize: 17 },
    talkHero: { backgroundColor: colors.navy, borderRadius: 20, padding: 18, marginBottom: 8 },
    talkKicker: { color: colors.pink, fontWeight: '800', letterSpacing: 1.2, fontSize: 11 },
    talkTitle: { fontSize: 26, fontWeight: '800', color: colors.white, marginTop: 6 },
    talkLead: { color: '#d7e6f5', marginTop: 8, lineHeight: 20 },
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
    fab: {
      position: 'absolute',
      right: 14,
      bottom: 78,
      backgroundColor: colors.pink,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 12,
      maxWidth: 220,
    },
    fabText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  });
}
