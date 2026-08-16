import { Dimensions, FlatList, Image, Text, View } from 'react-native';
import { money, startingTotal } from '../api';
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
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: colors.pink, fontWeight: '800', letterSpacing: 1, fontSize: 11, paddingHorizontal: 16 }}>
        {kicker}
      </Text>
      <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 20, paddingHorizontal: 16, marginBottom: 10 }}>
        {title}
      </Text>
      <FlatList
        horizontal
        data={yachts}
        keyExtractor={(item) => `feat-${item.id}`}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          const start = startingTotal(item);
          return (
            <PressScale onPress={() => onPress(item)} style={{ width: CARD_W, marginRight: 12 }}>
              <View style={{ height: 196, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.navy }}>
                {!!item.image_url && <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} />}
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, backgroundColor: 'rgba(8,16,24,0.58)' }} />
                <View style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
                  <Text style={{ color: colors.white, fontWeight: '800', fontSize: 18 }}>{item.title}</Text>
                  <Text style={{ color: colors.cream, marginTop: 4, fontWeight: '700' }}>
                    {item.size_ft ? `${item.size_ft} ft` : ''}
                    {start ? ` · ${money(start.amount)}` : ''}
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
