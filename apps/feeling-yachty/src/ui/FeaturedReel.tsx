import { Dimensions, FlatList, Image, Text, View } from 'react-native';
import { money, startingListed } from '../api';
import type { Colors } from '../theme';
import type { Yacht } from '../types';
import { PressScale } from './PressScale';

const CARD_W = Dimensions.get('window').width - 56;

export function FeaturedReel({
  yachts,
  colors,
  kicker,
  title,
  onPress,
}: {
  yachts: Yacht[];
  colors: Colors;
  kicker: string;
  title: string;
  onPress: (yacht: Yacht) => void;
}) {
  if (!yachts.length) return null;
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: colors.pink, fontWeight: '900', letterSpacing: 1.7, fontSize: 10, paddingHorizontal: 18 }}>
        {kicker}
      </Text>
      <Text style={{ color: colors.ink, fontWeight: '900', fontSize: 22, paddingHorizontal: 18, marginTop: 4, marginBottom: 12, letterSpacing: -0.3 }}>
        {title}
      </Text>
      <FlatList
        horizontal
        data={yachts}
        keyExtractor={(item) => `feat-${item.id}`}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 18 }}
        renderItem={({ item }) => {
          const start = startingListed(item);
          return (
            <PressScale onPress={() => onPress(item)} style={{ width: CARD_W, marginRight: 12 }}>
              <View style={{ height: 222, borderRadius: 26, overflow: 'hidden', backgroundColor: colors.line }}>
                {!!item.image_url && (
                  <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                )}
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 112, backgroundColor: 'rgba(18,10,34,0.55)' }} />
                <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                  <Text style={{ color: colors.white, fontWeight: '900', fontSize: 21, letterSpacing: -0.2 }}>{item.title}</Text>
                  <Text style={{ color: colors.cream, marginTop: 6, fontWeight: '800', fontSize: 13 }}>
                    {item.size_ft ? `${item.size_ft} ft` : ''}
                    {start ? ` · ${money(start.amount)}` : ''}
                    {item.rating ? ` · ★ ${item.rating}` : ''}
                  </Text>
                </View>
              </View>
            </PressScale>
          );
        }}
      />
    </View>
  );
}
