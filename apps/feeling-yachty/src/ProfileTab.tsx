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
}: {
  user: AppUser | null;
  bookings: Booking[];
  loading: boolean;
  onUser: (user: AppUser | null) => void;
  onLogout: () => Promise<void>;
}) {
  const { colors, settings, patchSettings } = useTheme();
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
      onUser(next);
      setEdit(next);
      setPassword('');
      setOk(mode === 'register' ? 'WooCommerce account created.' : 'Welcome back.');
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
      setOk('Profile saved to your WooCommerce account.');
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
        setError('Photo access is needed to set a profile picture.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.55,
        base64: true,
      });
      if (picked.canceled || !picked.assets?.[0]?.base64) {
        return;
      }
      const asset = picked.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      setBusy(true);
      const next = await uploadPhoto(`data:${mime};base64,${asset.base64}`);
      onUser(next);
      setEdit(next);
      setOk('Photo saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update photo.');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !user) {
    return <ActivityIndicator color={colors.pink} style={{ marginTop: 40 }} />;
  }

  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.h1}>Your charter account</Text>
        <Text style={styles.lead}>
          This is a real WooCommerce customer account — the same login used on feelingyachty.com for My Charters,
          deposits, and invoices. No chatbot.
        </Text>
        <View style={styles.row}>
          <Pressable style={[styles.pill, mode === 'login' && styles.pillOn]} onPress={() => setMode('login')}>
            <Text style={[styles.pillText, mode === 'login' && styles.pillTextOn]}>Log in</Text>
          </Pressable>
          <Pressable style={[styles.pill, mode === 'register' && styles.pillOn]} onPress={() => setMode('register')}>
            <Text style={[styles.pillText, mode === 'register' && styles.pillTextOn]}>Create account</Text>
          </Pressable>
        </View>
        {mode === 'register' && (
          <>
            <TextInput value={first} onChangeText={setFirst} placeholder="First name" placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput value={last} onChangeText={setLast} placeholder="Last name" placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput value={phone} onChangeText={setPhone} placeholder="Mobile number" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={styles.input} />
            <Text style={styles.label}>Home fleet</Text>
            <View style={styles.row}>
              {(['miami', 'panama'] as const).map((r) => (
                <Pressable key={r} style={[styles.pill, region === r && styles.pillOn]} onPress={() => setRegion(r)}>
                  <Text style={[styles.pillText, region === r && styles.pillTextOn]}>{r === 'miami' ? 'Miami' : 'Panama'}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'register' ? 'Password (8+ characters)' : 'Password'}
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
        />
        <Pressable style={styles.book} onPress={onAuth} disabled={busy}>
          <Text style={styles.bookText}>{busy ? 'Please wait…' : mode === 'register' ? 'Create WooCommerce account' : 'Log in'}</Text>
        </Pressable>
        {!!ok && <Text style={styles.ok}>{ok}</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.hint}>
          Already booked as a guest? Create an account with the same email, then claim the order from My Account on the
          website.
        </Text>
      </ScrollView>
    );
  }

  const u = edit || user;

  return (
    <ScrollView contentContainerStyle={styles.pad}>
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
            <Text style={styles.link}>Change profile photo</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.section}>Profile</Text>
      <TextInput value={u.first_name || ''} onChangeText={(v) => setEdit({ ...u, first_name: v })} placeholder="First name" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput value={u.last_name || ''} onChangeText={(v) => setEdit({ ...u, last_name: v })} placeholder="Last name" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput value={u.display_name || ''} onChangeText={(v) => setEdit({ ...u, display_name: v })} placeholder="Display name (reviews)" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput value={u.phone || ''} onChangeText={(v) => setEdit({ ...u, phone: v })} placeholder="Mobile" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={styles.input} />
      <Text style={styles.label}>Home fleet</Text>
      <View style={styles.row}>
        {(['miami', 'panama'] as const).map((r) => (
          <Pressable key={r} style={[styles.pill, (u.region || 'miami') === r && styles.pillOn]} onPress={() => setEdit({ ...u, region: r })}>
            <Text style={[styles.pillText, (u.region || 'miami') === r && styles.pillTextOn]}>{r === 'miami' ? 'Miami' : 'Panama'}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={u.occasion || ''} onChangeText={(v) => setEdit({ ...u, occasion: v })} placeholder="Typical occasion (birthday, corporate…)" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput
        value={u.typical_guests ? String(u.typical_guests) : ''}
        onChangeText={(v) => setEdit({ ...u, typical_guests: Number(v.replace(/[^0-9]/g, '')) || 0 })}
        placeholder="Typical guest count"
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        style={styles.input}
      />
      <TextInput
        value={u.notes || ''}
        onChangeText={(v) => setEdit({ ...u, notes: v })}
        placeholder="Notes for the team (allergies, marina preference…)"
        placeholderTextColor={colors.muted}
        multiline
        style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
      />

      <Text style={styles.section}>Billing</Text>
      <TextInput
        value={u.billing?.address_1 || ''}
        onChangeText={(v) => setEdit({ ...u, billing: { ...u.billing, address_1: v } })}
        placeholder="Street address"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <TextInput
        value={u.billing?.city || ''}
        onChangeText={(v) => setEdit({ ...u, billing: { ...u.billing, city: v } })}
        placeholder="City"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <View style={styles.split}>
        <TextInput
          value={u.billing?.state || ''}
          onChangeText={(v) => setEdit({ ...u, billing: { ...u.billing, state: v } })}
          placeholder="State"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.half]}
        />
        <TextInput
          value={u.billing?.postcode || ''}
          onChangeText={(v) => setEdit({ ...u, billing: { ...u.billing, postcode: v } })}
          placeholder="ZIP / postal"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.half]}
        />
      </View>
      <TextInput
        value={u.billing?.country || ''}
        onChangeText={(v) => setEdit({ ...u, billing: { ...u.billing, country: v } })}
        placeholder="Country (US, PA…)"
        placeholderTextColor={colors.muted}
        autoCapitalize="characters"
        style={styles.input}
      />

      <Pressable style={styles.book} onPress={onSaveProfile} disabled={busy}>
        <Text style={styles.bookText}>{busy ? 'Saving…' : 'Save profile'}</Text>
      </Pressable>
      {!!ok && <Text style={styles.ok}>{ok}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.section}>My charters</Text>
      {bookings.length === 0 ? (
        <Text style={styles.lead}>No WooCommerce orders on this account yet. Book a yacht and it will show here.</Text>
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
          <Text style={styles.link}>Open My Account on the website</Text>
        </Pressable>
      )}

      <Text style={styles.section}>Experience</Text>
      <Toggle
        colors={colors}
        label="Prefill Talk with my name and phone"
        value={settings.prefillTalk}
        onValueChange={(v) => patchSettings({ prefillTalk: v }, true)}
      />
      <Toggle
        colors={colors}
        label="Show trip totals on yacht cards"
        value={settings.showPrices}
        onValueChange={(v) => patchSettings({ showPrices: v }, true)}
      />
      <Toggle
        colors={colors}
        label="Compact yacht cards"
        value={settings.compactCards}
        onValueChange={(v) => patchSettings({ compactCards: v }, true)}
      />
      <Text style={styles.label}>Default city</Text>
      <View style={styles.row}>
        {(['miami', 'panama'] as const).map((c) => (
          <Pressable key={c} style={[styles.pill, settings.defaultCity === c && styles.pillOn]} onPress={() => patchSettings({ defaultCity: c }, true)}>
            <Text style={[styles.pillText, settings.defaultCity === c && styles.pillTextOn]}>{c === 'miami' ? 'Miami' : 'Panama'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Preferred live contact</Text>
      <View style={styles.row}>
        {(['whatsapp', 'call', 'sms'] as const).map((c) => (
          <Pressable key={c} style={[styles.pill, settings.preferredContact === c && styles.pillOn]} onPress={() => patchSettings({ preferredContact: c }, true)}>
            <Text style={[styles.pillText, settings.preferredContact === c && styles.pillTextOn]}>{c === 'whatsapp' ? 'WhatsApp' : c === 'call' ? 'Call' : 'SMS'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Language</Text>
      <View style={styles.row}>
        {(['en', 'es'] as const).map((c) => (
          <Pressable key={c} style={[styles.pill, settings.language === c && styles.pillOn]} onPress={() => patchSettings({ language: c }, true)}>
            <Text style={[styles.pillText, settings.language === c && styles.pillTextOn]}>{c === 'en' ? 'English' : 'Español'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>App colors</Text>
      <Text style={styles.lead}>Pick a look. It stays on this phone and syncs to your WooCommerce profile.</Text>
      <View style={styles.themeGrid}>
        {THEME_LABELS.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.themeCard, settings.themeId === t.id && styles.themeCardOn]}
            onPress={() => patchSettings({ themeId: t.id }, true)}
          >
            <Text style={styles.themeName}>{t.label}</Text>
            <Text style={styles.themeHint}>{t.hint}</Text>
          </Pressable>
        ))}
      </View>
      {settings.themeId === 'custom' && (
        <>
          <Text style={styles.label}>Accent</Text>
          <View style={styles.swatches}>
            {ACCENT_SWATCHES.map((hex) => (
              <Pressable
                key={hex}
                onPress={() => patchSettings({ customAccent: hex }, true)}
                style={[styles.swatch, { backgroundColor: hex }, settings.customAccent === hex && styles.swatchOn]}
              />
            ))}
          </View>
          <Text style={styles.label}>Header</Text>
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

      <Pressable
        style={styles.secondary}
        onPress={async () => {
          await logoutAccount();
          await onLogout();
        }}
      >
        <Text style={styles.secondaryText}>Log out</Text>
      </Pressable>
    </ScrollView>
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
