import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { API_BASE } from '../config';
import { t } from '../i18n';
import { useLayout } from '../layout';
import { ProfileTab } from '../ProfileTab';
import { accountBootstrap, accountChromeCss, withAppMode } from '../store';
import type { Colors } from '../theme';
import type { AppUser, Booking } from '../types';
import { WebFrame } from './WebFrame';

/**
 * Account tab opens the full charter account immediately.
 * App preferences live behind Account settings — never as the default screen.
 *
 * Expo web cannot iframe feelingyachty.com (Cloudflare X-Frame-Options), so
 * the native Woo login / charters screen is the account itself on web.
 * Native apps keep the My Account WebView.
 */
export function AccountTab({
  colors,
  lang,
  url,
  user,
  bookings,
  loading,
  onUser,
  onLogout,
  onOpenSettings,
}: {
  colors: Colors;
  lang: string;
  url?: string;
  user: AppUser | null;
  bookings: Booking[];
  loading: boolean;
  onUser: (user: AppUser | null, bookings?: Booking[]) => void;
  onLogout: () => Promise<void>;
  onOpenSettings: () => void;
}) {
  const layout = useLayout();
  const accountUrl = withAppMode(url || `${API_BASE}/my-account/`);
  const [blocked, setBlocked] = useState(Platform.OS === 'web');
  const injected = accountBootstrap(accountChromeCss(colors));

  useEffect(() => {
    setBlocked(Platform.OS === 'web');
  }, [accountUrl]);

  const accountBody = (
    <ProfileTab
      pane="account"
      user={user}
      bookings={bookings}
      loading={loading}
      onUser={onUser}
      onLogout={onLogout}
      onOpenSettings={onOpenSettings}
    />
  );

  if (blocked) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }}>{accountBody}</View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginHorizontal: layout.gutter + layout.sideInset,
          marginTop: 6,
          marginBottom: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: colors.white,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.line,
          shadowColor: colors.navyDeep,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      >
        <Text style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 16 }}>
          {t(lang, 'accountTitle')}
        </Text>
        <Pressable
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel={t(lang, 'accountSettings')}
          hitSlop={10}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 38,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: colors.tint,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 12 }}>
            {t(lang, 'accountSettings')}
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, minHeight: 0 }}>
        <WebFrame
          key={accountUrl}
          url={accountUrl}
          colors={colors}
          title={t(lang, 'accountTitle')}
          injectedJavaScript={injected}
          onBlocked={() => setBlocked(true)}
        />
      </View>
    </View>
  );
}
