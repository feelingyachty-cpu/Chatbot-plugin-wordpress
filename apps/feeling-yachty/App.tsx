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
import { fetchFleet, fetchYacht, sendTalkMessage } from './src/api';
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
import { AccountTab } from './src/ui/AccountTab';
import { FeaturedReel } from './src/ui/FeaturedReel';
import { FilterBar } from './src/ui/FilterBar';
import { PressScale } from './src/ui/PressScale';
import { FeedSkeleton } from './src/ui/Shimmer';
import { TabBar } from './src/ui/TabBar';
import { MiniCard, YachtCard } from './src/ui/YachtCard';
import { YachtDetail } from './src/ui/YachtDetail';
import { YachtWeb } from './src/ui/YachtWeb';

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
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [city, setCity] = useState<City>(defaultCity);
  const [yachts, setYachts] = useState<Yacht[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [size, setSize] = useState<SizeBand>('all');
  const [style, setStyle] = useState<StyleFilter>('all');
  const [sort, setSort] = useState<SortKey>('price_asc');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<Yacht | null>(null);
  const [talkYacht, setTalkYacht] = useState<Yacht | null>(null);
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
        yacht_id: talkYacht?.id,
        yacht_title: talkYacht?.title,
        product_url: talkYacht?.product_url,
        duration: bookDuration || undefined,
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
    captainIncludedLabel: t(lang, 'captainIncluded'),
  };

  const browseControls = (
    <View>
      <View style={styles.discovery}>
        <Text style={styles.discoveryKicker}>{t(lang, 'browseKicker')}</Text>
        <Text style={styles.discoveryTitle}>{t(lang, 'browseTitle')}</Text>
        <Text style={styles.discoveryLead}>{t(lang, 'browseLead')}</Text>
        <View style={styles.trustRow}>
          <View style={styles.liveDot} />
          <Text style={styles.trust}>
            {t(lang, 'trustLine', { n: browse.length || yachts.length, city: city.label })}
          </Text>
        </View>
        <View style={styles.searchShell}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t(lang, 'search')}
            placeholderTextColor={colors.muted}
            style={styles.search}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} style={styles.clearSearch}>
              <Text style={styles.clearSearchText}>×</Text>
            </Pressable>
          )}
        </View>
      </View>
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
    </View>
  );

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
        <View style={styles.headerTop}>
          <Image source={require('./assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerText}>
            <Text style={styles.brand}>{t(lang, 'brand')}</Text>
            <Text style={styles.sub}>{t(lang, 'tagline')}</Text>
          </View>
          <Pressable onPress={() => setTab('talk')} style={styles.concierge}>
            <View style={styles.liveDot} />
            <Text style={styles.conciergeText}>24/7</Text>
          </Pressable>
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
        <YachtWeb
          yacht={selected}
          colors={colors}
          lang={lang}
          cityPath={city.fleet}
          savedIds={savedIds}
          duration={bookDuration}
          guests={user?.typical_guests || undefined}
          onBack={() => setOverlay('yacht')}
          onDone={() => setOverlay(null)}
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
            setTalkYacht(selected);
            if (!message.trim()) {
              setMessage(`I want ${selected.title}${selected.size_ft ? `, ${selected.size_ft} ft` : ''}.`);
            }
            setTab('talk');
            setOverlay(null);
          }}
        />
      )}

      {!overlay && tab === 'yachts' && (
        <View style={styles.flex}>
          {loading && (
            <ScrollView>
              {browseControls}
              <FeedSkeleton colors={colors} />
            </ScrollView>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
          {!loading && !error && city.slug === 'panama' && yachts.length === 0 && (
            <View style={{ padding: 20 }}>
              <Text style={[styles.talkTitle, { color: colors.ink }]}>{t(lang, 'panamaEmptyTitle')}</Text>
              <Text style={[styles.talkLead, { color: colors.muted }]}>{t(lang, 'panamaEmptyBody')}</Text>
              <PressScale onPress={openPreferredContact}>
                <View style={styles.book}>
                  <Text style={styles.bookText}>{t(lang, 'waTeam')}</Text>
                </View>
              </PressScale>
            </View>
          )}
          {!loading && !error && !(city.slug === 'panama' && yachts.length === 0) && (
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
                  {browseControls}
                  {!!promos.length && (
                    <Pressable onPress={() => setTab('promos')} style={styles.promoJump}>
                      <Text style={styles.promoJumpIcon}>✦</Text>
                      <Text style={styles.promoJumpText}>
                        {t(lang, 'seeAllPromos')} · {promos.length}
                      </Text>
                      <Text style={styles.promoJumpArrow}>›</Text>
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

      {!overlay && tab === 'profile' && !accountSettingsOpen && (
        <View style={styles.flex}>
          <AccountTab
            colors={colors}
            lang={lang}
            url={user?.account_url}
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
            onOpenSettings={() => setAccountSettingsOpen(true)}
          />
        </View>
      )}

      {!overlay && tab === 'profile' && accountSettingsOpen && (
        <View style={styles.flex}>
          <ProfileTab
            pane="settings"
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
            onBackToAccount={() => setAccountSettingsOpen(false)}
          />
        </View>
      )}

      {!overlay && tab !== 'talk' && tab !== 'profile' && (
        <Pressable style={styles.fab} onPress={openPreferredContact}>
          <Text style={styles.fabText}>{t(lang, 'liveHelp')}</Text>
        </Pressable>
      )}

      {!overlay && (
        <View style={{ height: 78 }} />
      )}

      {!overlay && (
        <TabBar
          tab={tab}
          onTab={(next) => {
            setTab(next);
            if (next !== 'profile') {
              setAccountSettingsOpen(false);
            }
          }}
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
    safe: { flex: 1, backgroundColor: colors.paper },
    flex: { flex: 1, backgroundColor: colors.paper },
    header: {
      backgroundColor: colors.navyDeep,
      paddingHorizontal: 18,
      paddingBottom: 14,
      paddingTop: 6,
      gap: 12,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    logo: { width: 46, height: 46 },
    headerText: { flex: 1 },
    brand: { color: colors.cream, fontWeight: '900', letterSpacing: 1.6, fontSize: 13 },
    sub: { color: '#9CB2C1', fontSize: 11, marginTop: 3 },
    concierge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    conciergeText: { color: colors.white, fontSize: 11, fontWeight: '900' },
    citySwitch: { flexDirection: 'row', backgroundColor: colors.navy, borderRadius: 14, padding: 4 },
    cityPill: { flex: 1, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11 },
    cityPillOn: { backgroundColor: colors.pink },
    cityPillText: { color: '#9CB2C1', fontWeight: '800', fontSize: 12 },
    cityPillTextOn: { color: colors.white },
    discovery: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 14 },
    discoveryKicker: { color: colors.pink, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
    discoveryTitle: { color: colors.ink, fontSize: 30, lineHeight: 34, fontWeight: '900', marginTop: 8, letterSpacing: -0.7 },
    discoveryLead: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8, maxWidth: 350 },
    trustRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#39D98A' },
    trust: { color: colors.ink, fontWeight: '800', fontSize: 11, flex: 1 },
    searchShell: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 18,
      backgroundColor: colors.white,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 14,
      shadowColor: colors.navyDeep,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    searchIcon: { color: colors.pink, fontWeight: '900', fontSize: 22, marginRight: 8, transform: [{ rotate: '-20deg' }] },
    clearSearch: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
    clearSearchText: { color: colors.muted, fontSize: 18, lineHeight: 20 },
    promoJump: {
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 22,
      backgroundColor: '#FFE8F1',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    promoJumpIcon: { color: colors.pink, fontSize: 17 },
    promoJumpText: { color: colors.ink, fontWeight: '800', flex: 1 },
    promoJumpArrow: { color: colors.pink, fontSize: 24, lineHeight: 24 },
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
      flex: 1,
      paddingVertical: 14,
      color: colors.ink,
      fontSize: 14,
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
      left: 14,
      right: undefined,
      bottom: 96,
      zIndex: 30,
      backgroundColor: colors.pink,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 12,
      maxWidth: 220,
      shadowColor: colors.pink,
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    fabText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  });
}
