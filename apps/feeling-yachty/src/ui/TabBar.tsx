import { Platform, Pressable, Text, View } from 'react-native';
import type { Colors } from '../theme';

type Tab = 'yachts' | 'promos' | 'talk' | 'profile';

/**
 * Light floating tab bar — deliberately not navy/black.
 * Staging previously shipped a navyDeep pill that read as a heavy black bar.
 */
export function TabBar({
  tab,
  onTab,
  colors,
  labels,
  promoCount,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  colors: Colors;
  labels: Record<Tab, string>;
  promoCount?: number;
}) {
  const items: { id: Tab; icon: string }[] = [
    { id: 'yachts', icon: '◈' },
    { id: 'promos', icon: '✦' },
    { id: 'talk', icon: '◎' },
    { id: 'profile', icon: '○' },
  ];
  const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : null;
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingBottom: 10,
        zIndex: 100,
        elevation: 40,
        ...(Platform.OS === 'web' ? { pointerEvents: 'box-none' as const } : null),
      }}
    >
      <View
        style={{
          width: '92%',
          maxWidth: 480,
          flexDirection: 'row',
          backgroundColor: colors.white,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.line,
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: 8,
          shadowColor: colors.navyDeep,
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
          ...(Platform.OS === 'web' ? { pointerEvents: 'auto' as const } : null),
        }}
      >
        {items.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onTab(item.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              hitSlop={6}
              style={{
                flex: 1,
                minHeight: 52,
                paddingVertical: 3,
                alignItems: 'center',
                justifyContent: 'center',
                ...webPointer,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? colors.tint : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: active ? colors.pink : colors.muted,
                    textAlign: 'center',
                    fontSize: 16,
                    fontWeight: '900',
                  }}
                >
                  {item.icon}
                </Text>
                {item.id === 'promos' && !!promoCount && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -10,
                      backgroundColor: colors.pink,
                      borderRadius: 8,
                      minWidth: 16,
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: colors.white, fontSize: 9, fontWeight: '900', textAlign: 'center' }}>
                      {promoCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{
                  color: active ? colors.ink : colors.muted,
                  fontWeight: active ? '900' : '700',
                  fontSize: 11,
                  marginTop: 3,
                }}
              >
                {labels[item.id]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
