import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { API_BASE } from '../config';
import { t } from '../i18n';
import { useLayout } from '../layout';
import { accountBootstrap, accountChromeCss, withAppMode } from '../store';
import type { Colors } from '../theme';
import { Button } from './Button';
import { WebFrame } from './WebFrame';

/**
 * Account tab opens the full WooCommerce My Account page immediately.
 * App preferences live behind the Settings button — never as the default screen.
 */
export function AccountTab({
  colors,
  lang,
  url,
  onOpenSettings,
}: {
  colors: Colors;
  lang: string;
  url?: string;
  onOpenSettings: () => void;
}) {
  const layout = useLayout();
  const accountUrl = withAppMode(url || `${API_BASE}/my-account/`);
  const [blocked, setBlocked] = useState(false);
  const injected = accountBootstrap(accountChromeCss(colors));

  useEffect(() => {
    setBlocked(false);
  }, [accountUrl]);

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
        {blocked ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>
              {t(lang, 'accountWebErrorTitle')}
            </Text>
            <Text
              style={{
                color: colors.muted,
                marginTop: 10,
                lineHeight: 20,
                textAlign: 'center',
                fontWeight: '600',
              }}
            >
              {t(lang, 'accountWebErrorBody')}
            </Text>
            <Button
              label={t(lang, 'manageAccount')}
              colors={colors}
              size="lg"
              full
              onPress={() => Linking.openURL(accountUrl)}
              style={{ marginTop: 18 }}
            />
            <Button
              label={t(lang, 'accountSettings')}
              colors={colors}
              variant="ghost"
              full
              onPress={onOpenSettings}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <View style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <WebFrame
              key={accountUrl}
              url={accountUrl}
              colors={colors}
              title={t(lang, 'accountTitle')}
              injectedJavaScript={injected}
              onBlocked={() => setBlocked(true)}
            />
          </View>
        )}
      </View>
    </View>
  );
}
