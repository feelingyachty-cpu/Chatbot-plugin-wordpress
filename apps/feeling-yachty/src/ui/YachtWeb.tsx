import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { durationSlug } from '../api';
import { isStoreOrigin } from '../config';
import { t } from '../i18n';
import { useLayout } from '../layout';
import {
  bookingBootstrap,
  chromeCss,
  defaultBookingPrefill,
  extrasBookingUrl,
  orderNumberFrom,
  siteCartUrl,
  siteCheckoutUrl,
} from '../store';
import type { Colors } from '../theme';
import type { Yacht } from '../types';
import { Button } from './Button';
import { FleetImage } from './FleetImage';
import { OrderReceived } from './OrderReceived';
import { WebFrame } from './WebFrame';

type Pane = 'yacht' | 'cart' | 'checkout';
type Phase = 'store' | 'thanks';

/**
 * In-app extras + cart + checkout chrome around the WooCommerce product page.
 * The yacht photo above the WebView must fill its frame (cover) — never
 * letterbox on a navy slab, which read as heavy black bars on phones.
 */
export function YachtWeb({
  yacht,
  colors,
  lang,
  cityPath,
  savedIds,
  startOnCart,
  duration,
  guests,
  bottomInset = 0,
  onBack,
  onDone,
  onCartCount,
}: {
  yacht: Yacht;
  colors: Colors;
  lang: string;
  cityPath?: string;
  savedIds?: number[];
  startOnCart?: boolean;
  duration?: string;
  guests?: number;
  bottomInset?: number;
  onBack: () => void;
  onDone?: () => void;
  onCartCount?: (n: number) => void;
}) {
  const layout = useLayout();
  const [phase, setPhase] = useState<Phase>('store');
  const [pane, setPane] = useState<Pane>(startOnCart ? 'cart' : 'yacht');
  const [chrome, setChrome] = useState<Pane>(startOnCart ? 'cart' : 'yacht');
  const [reloadKey, setReloadKey] = useState(0);
  const [prefill, setPrefill] = useState(() => {
    const base = defaultBookingPrefill(yacht);
    return {
      ...base,
      duration: duration || base.duration,
      guests: guests || base.guests,
    };
  });
  const [orderNo, setOrderNo] = useState('');
  const [blocked, setBlocked] = useState(false);
  const pricingLen = Array.isArray(yacht.pricing) ? yacht.pricing.length : 0;

  useEffect(() => {
    const base = defaultBookingPrefill(yacht);
    setPrefill((prev) => ({
      date: prev.date || base.date,
      time: prev.time || base.time,
      duration: duration || prev.duration || base.duration,
      guests: guests || prev.guests || base.guests,
    }));
  }, [yacht.id, duration, guests, pricingLen]);

  const extrasUrl = useMemo(
    () =>
      extrasBookingUrl(yacht, {
        cityPath,
        date: prefill.date,
        time: prefill.time,
        duration: prefill.duration,
        guests: prefill.guests,
        savedIds,
      }),
    [yacht, cityPath, prefill, savedIds]
  );

  const frameUrl =
    pane === 'cart' ? siteCartUrl() : pane === 'checkout' ? siteCheckoutUrl() : extrasUrl;

  useEffect(() => {
    setBlocked(false);
  }, [frameUrl]);

  const title =
    phase === 'thanks'
      ? t(lang, 'orderDoneTitle')
      : chrome === 'cart'
        ? t(lang, 'yourCart')
        : chrome === 'checkout'
          ? t(lang, 'secureCheckout')
          : yacht.title;

  const hasYacht = yacht.id > 0;

  const goPane = useCallback((next: Pane) => {
    setPhase('store');
    setPane(next);
    setChrome(next);
    setBlocked(false);
    setReloadKey((k) => k + 1);
  }, []);

  const handleBack = useCallback(() => {
    if (phase === 'thanks') {
      (onDone || onBack)();
      return;
    }
    if (phase === 'store' && (chrome === 'cart' || chrome === 'checkout') && hasYacht) {
      goPane('yacht');
      return;
    }
    onBack();
  }, [phase, chrome, hasYacht, goPane, onBack, onDone]);

  const onOrder = useCallback(
    (raw: string) => {
      setOrderNo(orderNumberFrom(raw) || orderNo);
      setPhase('thanks');
    },
    [orderNo]
  );

  const onStoreMessage = useCallback(
    (data: { fy?: string; page?: string; count?: number; order?: string }) => {
      if (!data?.fy || data.fy === 'nogallery' || data.fy === 'boot') {
        return;
      }
      if (data.fy === 'back') {
        handleBack();
        return;
      }
      if (data.fy === 'browse') {
        (onDone || onBack)();
        return;
      }
      if (data.fy === 'checkout' || data.page === 'checkout') {
        setPhase('store');
        setChrome('checkout');
        return;
      }
      if (data.fy === 'cart' && data.page === 'cart') {
        setPhase('store');
        setChrome('cart');
      }
      if (data.fy === 'cart' && typeof data.count === 'number') {
        onCartCount?.(Math.max(0, Math.floor(data.count)));
      }
      if (data.fy === 'order') {
        onOrder(String(data.order || ''));
      }
    },
    [handleBack, onBack, onDone, onCartCount, onOrder]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (!isStoreOrigin(event.origin)) {
        return;
      }
      onStoreMessage(event.data as { fy?: string; page?: string; count?: number; order?: string });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onStoreMessage]);

  const injected = useMemo(
    () =>
      bookingBootstrap(chromeCss(colors), {
        date: prefill.date || '',
        time: prefill.time || '',
        duration: durationSlug(prefill.duration),
        guests: prefill.guests || 0,
      }),
    [colors, prefill]
  );

  const showExtrasHero = !startOnCart && chrome === 'yacht' && phase === 'store' && !blocked;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingBottom: bottomInset }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginHorizontal: layout.gutter + layout.sideInset,
          marginTop: 4,
          marginBottom: 6,
          paddingHorizontal: 6,
          paddingVertical: 4,
        }}
      >
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t(lang, 'back')}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: colors.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: -2 }}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 16 }}>
          {title}
        </Text>
        {phase !== 'thanks' && (
          <Pressable
            onPress={() => {
              if (chrome === 'cart' || chrome === 'checkout') {
                if (hasYacht) {
                  goPane('yacht');
                } else {
                  onBack();
                }
                return;
              }
              goPane('cart');
            }}
            accessibilityRole="button"
            accessibilityLabel={chrome === 'yacht' ? t(lang, 'viewCart') : hasYacht ? t(lang, 'backToYacht') : t(lang, 'back')}
            hitSlop={10}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: 38,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: chrome !== 'yacht' ? colors.pink : colors.ink,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: '800', fontSize: 13 }}>
              {chrome !== 'yacht' ? (hasYacht ? t(lang, 'backToYacht') : t(lang, 'back')) : t(lang, 'viewCart')}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={{ flex: 1, minHeight: 0 }}>
        {phase === 'thanks' ? (
          <OrderReceived
            colors={colors}
            lang={lang}
            orderNo={orderNo}
            yacht={yacht}
            duration={prefill.duration}
            guests={prefill.guests}
            date={prefill.date}
            time={prefill.time}
            onClose={onDone || onBack}
          />
        ) : blocked ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>
              {t(lang, 'secureCheckout')}
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
              {t(lang, 'checkoutError')}
            </Text>
            <Button
              label={pane === 'yacht' ? t(lang, 'continueToOptions') : t(lang, 'continueToCheckout')}
              colors={colors}
              size="lg"
              full
              onPress={() => Linking.openURL(pane === 'yacht' ? extrasUrl : siteCheckoutUrl())}
              style={{ marginTop: 18 }}
            />
            <Button
              label={t(lang, 'yourCart')}
              colors={colors}
              variant="ghost"
              full
              onPress={() => Linking.openURL(siteCartUrl())}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <View style={{ flex: 1, minHeight: 0 }}>
            {showExtrasHero ? (
              <View style={{ flexShrink: 0, zIndex: 2, backgroundColor: colors.paper }}>
                <View
                  style={{
                    backgroundColor: colors.tint,
                    paddingHorizontal: layout.gutter + layout.sideInset,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 14 }}>{t(lang, 'addOnsTitle')}</Text>
                  <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {t(lang, 'addOnsHint')}
                  </Text>
                </View>
                {!!yacht.image_url && (
                  <View
                    style={{
                      marginHorizontal: layout.gutter + layout.sideInset,
                      marginTop: 8,
                      marginBottom: 6,
                      height: layout.isWide ? 200 : 168,
                      borderRadius: 14,
                      overflow: 'hidden',
                      backgroundColor: colors.line,
                    }}
                  >
                    <FleetImage
                      uri={yacht.image_url}
                      maxWidth={900}
                      resizeMode="cover"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                )}
              </View>
            ) : null}
            <View
              style={{
                flex: 1,
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: 0,
                minHeight: 280,
                position: 'relative',
              }}
            >
              <WebFrame
                key={`${frameUrl}#${reloadKey}`}
                url={frameUrl}
                colors={colors}
                title={title}
                injectedJavaScript={injected}
                onBlocked={() => setBlocked(true)}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
