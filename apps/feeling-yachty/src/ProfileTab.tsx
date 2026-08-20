import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  loginAccount,
  logoutAccount,
  registerAccount,
  updateAccount,
  uploadPhoto,
} from './auth';
import { t } from './i18n';
import { ACCENT_SWATCHES, HEADER_SWATCHES, THEME_LABELS } from './theme';
import type { Colors } from './theme';
import { useTheme } from './ThemeContext';
import type { AppUser, Booking } from './types';

type Mode = 'login' | 'register';

export function ProfileTab({
  user,
  bookings,
  loading,
  onUser,
  onLogout,
  onBackToAccount,
  onOpenSettings,
  pane = 'account',
}: {
  user: AppUser | null;
  bookings: Booking[];
  loading: boolean;
  onUser: (user: AppUser | null, bookings?: Booking[]) => void;
  onLogout: () => Promise<void>;
  onBackToAccount?: () => void;
  onOpenSettings?: () => void;
  pane?: 'account' | 'settings';
}) {
  const { colors, settings } = useTheme();
  const lang = settings.language;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState<'miami' | 'panama'>('miami');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [edit, setEdit] = useState<AppUser | null>(user);

  useEffect(() => {
    if (user) {
      setEdit(user);
    }
  }, [user]);

  async function onAuth() {
    setBusy(true);
    setError('');
    setOk('');
    try {
      if (mode === 'register') {
        if (!first.trim()) {
          throw new Error(t(lang, 'firstRequired'));
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          throw new Error(t(lang, 'emailRequired'));
        }
        if (password.length < 8) {
          throw new Error(t(lang, 'passwordRequired'));
        }
      } else if (!email.trim() || !password) {
        throw new Error(t(lang, 'authRequired'));
      }
      const next =
        mode === 'register'
          ? await registerAccount({
              email: email.trim(),
              password,
              first_name: first.trim(),
              last_name: last.trim(),
              phone: phone.trim(),
              region,
            })
          : await loginAccount(email.trim(), password);
      onUser(next.user, next.bookings);
      setEdit(next.user);
      setPassword('');
      setOk(mode === 'register' ? t(lang, 'accountCreated') : t(lang, 'welcomeBack'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProfile() {
    if (!edit) {
      return;
    }
    setBusy(true);
    setError('');
    setOk('');
    try {
      const next = await updateAccount({
        first_name: edit.first_name,
        last_name: edit.last_name,
        display_name: edit.display_name,
        phone: edit.phone,
        region: edit.region,
        notes: edit.notes,
        occasion: edit.occasion,
        typical_guests: edit.typical_guests,
        billing: edit.billing,
        settings,
      });
      onUser(next);
      setEdit(next);
      setOk(t(lang, 'profileSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function onPickPhoto() {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(t(lang, 'needPhoto'));
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      if (picked.canceled || !picked.assets?.[0]?.base64) {
        return;
      }
      const asset = picked.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      if ((asset.base64 || '').length > 420000) {
        setError(t(lang, 'photoLarge'));
        return;
      }
      setBusy(true);
      const next = await uploadPhoto(`data:${mime};base64,${asset.base64}`);
      onUser(next);
      setEdit(next);
      setOk(t(lang, 'photoSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update photo.');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !user && pane === 'account') {
    return <ActivityIndicator color={colors.pink} style={{ marginTop: 40 }} />;
  }

  const settingsButton = !!onOpenSettings && pane === 'account' && (
    <Pressable
      onPress={onOpenSettings}
      accessibilityRole="button"
      accessibilityLabel={t(lang, 'accountSettings')}
      hitSlop={10}
      style={styles.settingsChip}
    >
      <Text style={styles.settingsChipText}>{t(lang, 'accountSettings')}</Text>
    </Pressable>
  );

  if (pane === 'settings') {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        {!!onBackToAccount && (
          <Pressable onPress={onBackToAccount} hitSlop={10} style={styles.backRow}>
            <Text style={styles.backLink}>‹ {t(lang, 'backToAccount')}</Text>
          </Pressable>
        )}
        <Text style={styles.h1}>{t(lang, 'accountSettings')}</Text>
        <Text style={styles.lead}>{t(lang, 'settingsLead')}</Text>
        <SettingsPane lang={lang} colors={colors} />
      </ScrollView>
    );
  }

  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.titleRow}>
          <Text style={[styles.h1, { flex: 1 }]}>{t(lang, 'accountTitle')}</Text>
          {settingsButton}
        </View>
        <Text style={styles.lead}>{t(lang, 'accountLead')}</Text>
        <View style={styles.row}>
          <Pressable style={[styles.pill, mode === 'login' && styles.pillOn]} onPress={() => setMode('login')}>
            <Text style={[styles.pillText, mode === 'login' && styles.pillTextOn]}>{t(lang, 'logIn')}</Text>
          </Pressable>
          <Pressable style={[styles.pill, mode === 'register' && styles.pillOn]} onPress={() => setMode('register')}>
            <Text style={[styles.pillText, mode === 'register' && styles.pillTextOn]}>{t(lang, 'createAccount')}</Text>
          </Pressable>
        </View>
        {mode === 'register' && (
          <>
            <TextInput value={first} onChangeText={setFirst} placeholder={t(lang, 'firstName')} placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput value={last} onChangeText={setLast} placeholder={t(lang, 'lastName')} placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput value={phone} onChangeText={setPhone} placeholder={t(lang, 'mobile')} placeholderTextColor={colors.muted} keyboardType="phone-pad" style={styles.input} />
            <Text style={styles.label}>{t(lang, 'homeFleet')}</Text>
            <View style={styles.row}>
              {(['miami', 'panama'] as const).map((r) => (
                <Pressable key={r} style={[styles.pill, region === r && styles.pillOn]} onPress={() => setRegion(r)}>
                  <Text style={[styles.pillText, region === r && styles.pillTextOn]}>{t(lang, r)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t(lang, 'email')}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'register' ? t(lang, 'passwordHint') : t(lang, 'password')}
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
        />
        <Pressable style={styles.book} onPress={onAuth} disabled={busy}>
          <Text style={styles.bookText}>{busy ? t(lang, 'pleaseWait') : mode === 'register' ? t(lang, 'createWoo') : t(lang, 'logIn')}</Text>
        </Pressable>
        {!!ok && <Text style={styles.ok}>{ok}</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={() => Linking.openURL('https://feelingyachty.com/my-account/lost-password/')}>
          <Text style={styles.link}>{t(lang, 'forgotPassword')}</Text>
        </Pressable>
        <Text style={styles.hint}>{t(lang, 'guestHint')}</Text>
      </ScrollView>
    );
  }

  const u = edit || user;

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.titleRow}>
        <Text style={[styles.h1, { flex: 1 }]}>{t(lang, 'accountTitle')}</Text>
        {settingsButton}
      </View>
      <View style={styles.heroCard}>
        <Pressable onPress={onPickPhoto}>
          {u.photo_url ? (
            <Image source={{ uri: u.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={styles.avatarLetter}>{(u.first_name || u.email || '?').slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Guest'}</Text>
          <Text style={styles.lead}>{u.email}</Text>
          <Text style={styles.woo}>WooCommerce customer #{u.woo_id || u.id}</Text>
          <Pressable onPress={onPickPhoto}>
            <Text style={styles.link}>{t(lang, 'changePhoto')}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.section}>{t(lang, 'profile')}</Text>
      <TextInput value={u.first_name || ''} onChangeText={(v) => setEdit({ ...u, first_name: v })} placeholder={t(lang, 'firstName')} placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput value={u.last_name || ''} onChangeText={(v) => setEdit({ ...u, last_name: v })} placeholder={t(lang, 'lastName')} placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput value={u.display_name || ''} onChangeText={(v) => setEdit({ ...u, display_name: v })} placeholder={t(lang, 'displayName')} placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput value={u.phone || ''} onChangeText={(v) => setEdit({ ...u, phone: v })} placeholder={t(lang, 'mobile')} placeholderTextColor={colors.muted} keyboardType="phone-pad" style={styles.input} />
      <Text style={styles.label}>{t(lang, 'homeFleet')}</Text>
      <View style={styles.row}>
        {(['miami', 'panama'] as const).map((r) => (
          <Pressable key={r} style={[styles.pill, (u.region || 'miami') === r && styles.pillOn]} onPress={() => setEdit({ ...u, region: r })}>
            <Text style={[styles.pillText, (u.region || 'miami') === r && styles.pillTextOn]}>{t(lang, r)}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={u.occasion || ''} onChangeText={(v) => setEdit({ ...u, occasion: v })} placeholder={t(lang, 'occasion')} placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput
        value={u.typical_guests ? String(u.typical_guests) : ''}
        onChangeText={(v) => setEdit({ ...u, typical_guests: Number(v.replace(/[^0-9]/g, '')) || 0 })}
        placeholder={t(lang, 'guests')}
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        style={styles.input}
      />
      <TextInput
        value={u.notes || ''}
        onChangeText={(v) => setEdit({ ...u, notes: v })}
        placeholder={t(lang, 'notes')}
        placeholderTextColor={colors.muted}
        multiline
        style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
      />

      <Text style={styles.section}>{t(lang, 'billing')}</Text>
      <TextInput
        value={u.billing?.address_1 || ''}
        onChangeText={(v) => setEdit({ ...u, billing: { ...u.billing, address_1: v } })}
        placeholder={t(lang, 'street')}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <TextInput
        value={u.billing?.city || ''}
        onChangeText={(v) => setEdit({ ...u, billing: { ...u.billing, city: v } })}
        placeholder={t(lang, 'city')}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <View style={styles.split}>
        <TextInput
          value={u.billing?.state || ''}
          onChangeText={(v) => setEdit({ ...u, billing: { ...u.billing, state: v } })}
          placeholder={t(lang, 'state')}
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.half]}
        />
        <TextInput
          value={u.billing?.postcode || ''}
          onChangeText={(v) => setEdit({ ...u, billing: { ...u.billing, postcode: v } })}
          placeholder={t(lang, 'zip')}
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.half]}
        />
      </View>
      <TextInput
        value={u.billing?.country || ''}
        onChangeText={(v) => setEdit({ ...u, billing: { ...u.billing, country: v } })}
        placeholder={t(lang, 'country')}
        placeholderTextColor={colors.muted}
        autoCapitalize="characters"
        style={styles.input}
      />

      <Pressable style={styles.book} onPress={onSaveProfile} disabled={busy}>
        <Text style={styles.bookText}>{busy ? t(lang, 'saving') : t(lang, 'saveProfile')}</Text>
      </Pressable>
      {!!ok && <Text style={styles.ok}>{ok}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.section}>{t(lang, 'myCharters')}</Text>
      {bookings.length === 0 ? (
        <Text style={styles.lead}>{t(lang, 'noOrders')}</Text>
      ) : (
        bookings.map((b) => (
          <View key={b.order_id} style={styles.order}>
            <Text style={styles.orderTitle}>Order #{b.order_no || b.order_id}</Text>
            <Text style={styles.lead}>
              {(b.status || '').replace(/-/g, ' ')} · ${Number(b.total || 0).toLocaleString()}
            </Text>
            {(b.lines || []).map((line, i) => (
              <Text key={`${b.order_id}-${i}`} style={styles.line}>
                {line.name}
                {line.date ? ` · ${line.date}` : ''}
                {line.duration ? ` · ${line.duration}` : ''}
              </Text>
            ))}
          </View>
        ))
      )}
      {!!user.account_url && (
        <Pressable onPress={() => Linking.openURL(user.account_url as string)}>
          <Text style={styles.link}>{t(lang, 'openAccount')}</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.secondary}
        onPress={async () => {
          await logoutAccount();
          await onLogout();
        }}
      >
        <Text style={styles.secondaryText}>{t(lang, 'logOut')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function SettingsPane({ lang, colors }: { lang: string; colors: Colors }) {
  const { settings, patchSettings } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <>
      <Text style={styles.section}>{t(lang, 'experience')}</Text>
      <Toggle
        colors={colors}
        label={t(lang, 'prefillTalk')}
        value={settings.prefillTalk}
        onValueChange={(v) => patchSettings({ prefillTalk: v }, true)}
      />
      <Toggle
        colors={colors}
        label={t(lang, 'showPrices')}
        value={settings.showPrices}
        onValueChange={(v) => patchSettings({ showPrices: v }, true)}
      />
      <Toggle
        colors={colors}
        label={t(lang, 'compactCards')}
        value={settings.compactCards}
        onValueChange={(v) => patchSettings({ compactCards: v }, true)}
      />
      <Text style={styles.label}>{t(lang, 'defaultCity')}</Text>
      <View style={styles.row}>
        {(['miami', 'panama'] as const).map((c) => (
          <Pressable key={c} style={[styles.pill, settings.defaultCity === c && styles.pillOn]} onPress={() => patchSettings({ defaultCity: c }, true)}>
            <Text style={[styles.pillText, settings.defaultCity === c && styles.pillTextOn]}>{t(lang, c)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>{t(lang, 'preferredContact')}</Text>
      <View style={styles.row}>
        {(['whatsapp', 'call', 'sms'] as const).map((c) => (
          <Pressable key={c} style={[styles.pill, settings.preferredContact === c && styles.pillOn]} onPress={() => patchSettings({ preferredContact: c }, true)}>
            <Text style={[styles.pillText, settings.preferredContact === c && styles.pillTextOn]}>{t(lang, c)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>{t(lang, 'language')}</Text>
      <View style={styles.row}>
        {(['en', 'es'] as const).map((c) => (
          <Pressable key={c} style={[styles.pill, settings.language === c && styles.pillOn]} onPress={() => patchSettings({ language: c }, true)}>
            <Text style={[styles.pillText, settings.language === c && styles.pillTextOn]}>{c === 'en' ? t(lang, 'english') : t(lang, 'spanish')}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>{t(lang, 'appColors')}</Text>
      <Text style={styles.lead}>{t(lang, 'colorsLead')}</Text>
      <View style={styles.themeGrid}>
        {THEME_LABELS.map((theme) => (
          <Pressable
            key={theme.id}
            style={[styles.themeCard, settings.themeId === theme.id && styles.themeCardOn]}
            onPress={() => patchSettings({ themeId: theme.id }, true)}
          >
            <Text style={styles.themeName}>{theme.label}</Text>
            <Text style={styles.themeHint}>{theme.hint}</Text>
          </Pressable>
        ))}
      </View>
      {settings.themeId === 'custom' && (
        <>
          <Text style={styles.label}>{t(lang, 'accent')}</Text>
          <View style={styles.swatches}>
            {ACCENT_SWATCHES.map((hex) => (
              <Pressable
                key={hex}
                onPress={() => patchSettings({ customAccent: hex }, true)}
                style={[styles.swatch, { backgroundColor: hex }, settings.customAccent === hex && styles.swatchOn]}
              />
            ))}
          </View>
          <Text style={styles.label}>{t(lang, 'header')}</Text>
          <View style={styles.swatches}>
            {HEADER_SWATCHES.map((hex) => (
              <Pressable
                key={hex}
                onPress={() => patchSettings({ customHeader: hex }, true)}
                style={[styles.swatch, { backgroundColor: hex }, settings.customHeader === hex && styles.swatchOn]}
              />
            ))}
          </View>
        </>
      )}
    </>
  );
}

function Toggle({
  label,
  value,
  onValueChange,
  colors,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: Colors;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Text style={{ color: colors.ink, flex: 1, paddingRight: 12, fontWeight: '600' }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.pink }} />
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    pad: { padding: 16, paddingBottom: 40 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    settingsChip: {
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.tint,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsChipText: { color: colors.ink, fontWeight: '800', fontSize: 12 },
    backRow: { marginBottom: 10, alignSelf: 'flex-start' },
    backLink: { color: colors.pink, fontWeight: '800', fontSize: 14 },
    h1: { fontSize: 24, fontWeight: '800', color: colors.ink },
    lead: { color: colors.muted, marginTop: 6, marginBottom: 12, lineHeight: 20 },
    hint: { color: colors.muted, marginTop: 16, lineHeight: 20 },
    woo: { color: colors.pink, fontWeight: '700', marginTop: 4, fontSize: 12 },
    label: { color: colors.pink, fontWeight: '800', marginBottom: 8, marginTop: 8 },
    section: { marginTop: 22, marginBottom: 10, color: colors.pink, fontWeight: '800', fontSize: 16 },
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
    row: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    split: { flexDirection: 'row', gap: 8 },
    half: { flex: 1 },
    pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
    pillOn: { backgroundColor: colors.pink, borderColor: colors.pink },
    pillText: { color: colors.muted, fontWeight: '800' },
    pillTextOn: { color: colors.white },
    book: { backgroundColor: colors.pink, borderRadius: 14, padding: 16, marginTop: 8 },
    bookText: { color: colors.white, fontWeight: '800', textAlign: 'center', fontSize: 16 },
    secondary: { padding: 16, marginTop: 20 },
    secondaryText: { color: colors.pink, textAlign: 'center', fontWeight: '800' },
    ok: { color: '#1db36a', paddingTop: 12, textAlign: 'center', fontWeight: '700' },
    error: { color: colors.pink, paddingTop: 12, textAlign: 'center' },
    link: { color: colors.pink, fontWeight: '700', marginTop: 8 },
    heroCard: {
      flexDirection: 'row',
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.line,
      marginBottom: 8,
    },
    avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.navy },
    avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { color: colors.cream, fontWeight: '800', fontSize: 28 },
    order: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.line,
      marginBottom: 10,
    },
    orderTitle: { fontWeight: '800', color: colors.ink },
    line: { color: colors.ink, marginTop: 4 },
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    themeCard: {
      width: '47%',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.line,
    },
    themeCardOn: { borderColor: colors.pink, borderWidth: 2 },
    themeName: { fontWeight: '800', color: colors.ink },
    themeHint: { color: colors.muted, marginTop: 4, fontSize: 12 },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
    swatchOn: { borderColor: colors.ink },
  });
}
