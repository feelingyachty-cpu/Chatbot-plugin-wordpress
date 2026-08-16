import { Pressable, Text, View } from 'react-native';
import type { Colors } from '../theme';

type Tab = 'yachts' | 'promos' | 'talk' | 'profile';

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
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.white,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 10,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        shadowColor: colors.navyDeep,
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -5 },
        elevation: 12,
      }}
    >
      {items.map((item) => {
        const active = tab === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onTab(item.id)}
            style={{
              flex: 1,
              paddingVertical: 3,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 34,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? '#FFE5F0' : 'transparent',
              }}
            >
              <Text style={{ color: active ? colors.pink : colors.muted, textAlign: 'center', fontSize: 16, fontWeight: '900' }}>
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
  );
}
