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
    { id: 'yachts', icon: '◆' },
    { id: 'promos', icon: '✦' },
    { id: 'talk', icon: '◈' },
    { id: 'profile', icon: '●' },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.navyDeep,
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 6,
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
              paddingVertical: 8,
              borderRadius: 14,
              backgroundColor: active ? colors.pink : colors.navy,
              alignItems: 'center',
            }}
          >
            <View>
              <Text style={{ color: active ? colors.white : colors.muted, textAlign: 'center', fontSize: 12 }}>
                {item.icon}
              </Text>
              {item.id === 'promos' && !!promoCount && (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -16,
                    backgroundColor: colors.cream,
                    borderRadius: 8,
                    minWidth: 16,
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: colors.navyDeep, fontSize: 9, fontWeight: '800', textAlign: 'center' }}>
                    {promoCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{
                color: active ? colors.white : colors.muted,
                fontWeight: '800',
                fontSize: 11,
                marginTop: 2,
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
