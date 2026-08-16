import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { t } from '../i18n';
import type { Colors } from '../theme';

const CHROME_MOBILE =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

export function CheckoutWeb({
  uri,
  colors,
  lang,
  onBack,
}: {
  uri: string;
  colors: Colors;
  lang: string;
  onBack: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  function openBrowser() {
    Linking.openURL(uri);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View
        style={{
          backgroundColor: colors.navy,
          paddingHorizontal: 12,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Pressable onPress={onBack}>
          <Text style={{ color: '#ffb3d2', fontWeight: '700' }}>‹ Yacht</Text>
        </Pressable>
        <Text style={{ color: colors.white, fontWeight: '800' }}>{t(lang, 'bookYacht')}</Text>
        <Pressable onPress={openBrowser}>
          <Text style={{ color: colors.cream, fontWeight: '700', fontSize: 12 }}>{t(lang, 'openBrowser')}</Text>
        </Pressable>
      </View>
      <Text style={{ color: colors.muted, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12 }}>
        {t(lang, 'checkoutHint')}
      </Text>
      {failed ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>
            {t(lang, 'checkoutError')}
          </Text>
          <Pressable
            onPress={openBrowser}
            style={{ marginTop: 16, backgroundColor: colors.pink, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14 }}
          >
            <Text style={{ color: colors.white, fontWeight: '800' }}>{t(lang, 'openWooCheckout')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri }}
            style={{ flex: 1 }}
            userAgent={CHROME_MOBILE}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            startInLoadingState
            setSupportMultipleWindows={false}
            originWhitelist={['*']}
            onLoadEnd={() => setLoading(false)}
            onError={() => setFailed(true)}
            onHttpError={(event) => {
              if (event.nativeEvent.statusCode >= 400) {
                setFailed(true);
              }
            }}
          />
          {loading && (
            <View style={{ position: 'absolute', left: 0, right: 0, top: 40, alignItems: 'center' }}>
              <ActivityIndicator color={colors.pink} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}
