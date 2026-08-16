import { Image, Pressable, Text, View } from 'react-native';
import { money, startingTotal } from '../api';
import type { Colors } from '../theme';
import type { Yacht } from '../types';
import { HighlightText } from './HighlightText';
import { PressScale } from './PressScale';

export function YachtCard({
  yacht,
  colors,
  compact,
  showPrice,
  query,
  expanded,
  saved,
  promo,
  promoLabel,
  fromLabel,
  seePricesLabel,
  hoursLabel,
  hideHoursLabel,
  guestsLabel,
  onPress,
  onToggleHours,
  onToggleSave,
}: {
  yacht: Yacht;
  colors: Colors;
  compact?: boolean;
  showPrice?: boolean;
  query?: string;
  expanded?: boolean;
  saved?: boolean;
  promo?: boolean;
  promoLabel: string;
  fromLabel: string;
  seePricesLabel: string;
  hoursLabel: string;
  hideHoursLabel: string;
  guestsLabel: string;
  onPress: () => void;
  onToggleHours?: () => void;
  onToggleSave?: () => void;
}) {
  const start = startingTotal(yacht);
  const rows = (yacht.pricing || []).filter((row) => (row.type || 'price') === 'price' && row.price != null);
  const lowest = start?.amount;
  const imageH = compact ? 0 : promo ? 230 : 200;

  return (
    <View
      style={{
        marginBottom: 16,
        marginHorizontal: 16,
        backgroundColor: colors.card,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: promo || saved ? 2 : 1,
        borderColor: promo ? colors.pink : saved ? colors.pinkHot : colors.line,
      }}
    >
        {!!yacht.image_url && !compact && (
          <View style={{ height: imageH, backgroundColor: colors.navy }}>
            <PressScale onPress={onPress}>
              <View style={{ height: imageH }}>
                <Image source={{ uri: yacht.image_url }} style={{ width: '100%', height: '100%' }} />
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 110,
                    backgroundColor: 'rgba(8,16,24,0.55)',
                  }}
                />
                <View style={{ position: 'absolute', left: 12, right: 56, bottom: 12 }}>
                  <HighlightText
                    text={yacht.title}
                    query={query}
                    style={{ color: colors.white, fontWeight: '800', fontSize: 20 }}
                    highlightStyle={{ backgroundColor: colors.pink, color: colors.white }}
                  />
                  {showPrice !== false && (
                    <Text style={{ color: colors.cream, fontWeight: '800', marginTop: 4, fontSize: 14 }}>
                      {start
                        ? fromLabel.replace('{price}', money(start.amount)).replace('{duration}', start.duration)
                        : seePricesLabel}
                    </Text>
                  )}
                </View>
                <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxWidth: '78%' }}>
                  {promo && <Chip colors={colors} text={promoLabel} hot />}
                  {!!yacht.size_ft && <Chip colors={colors} text={`${yacht.size_ft} ft`} />}
                  {!!yacht.capacity_max && <Chip colors={colors} text={`${yacht.capacity_max} ${guestsLabel}`} />}
                  {!!yacht.captain_included && <Chip colors={colors} text="Captain" />}
                  {!!yacht.rating && <Chip colors={colors} text={`★ ${yacht.rating}`} hot />}
                </View>
              </View>
            </PressScale>
            {onToggleSave && (
              <Pressable
                onPress={onToggleSave}
                hitSlop={10}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: saved ? colors.pink : 'rgba(8,16,24,0.55)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                <Text style={{ color: colors.white, fontSize: 16 }}>{saved ? '♥' : '♡'}</Text>
              </Pressable>
            )}
          </View>
        )}

        <Pressable onPress={onPress} style={{ padding: 12, flexDirection: compact ? 'row' : 'column', gap: 10 }}>
          {!!yacht.image_url && compact && (
            <Image source={{ uri: yacht.image_url }} style={{ width: 78, height: 78, borderRadius: 12, backgroundColor: colors.navy }} />
          )}
          <View style={{ flex: 1 }}>
            {compact && (
              <HighlightText
                text={yacht.title}
                query={query}
                style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}
                highlightStyle={{ backgroundColor: '#ffe3f0', color: colors.pink }}
              />
            )}
            <Text style={{ color: colors.muted, marginTop: compact ? 4 : 0, fontWeight: '600' }}>
              {yacht.size_ft ? `${yacht.size_ft} ft` : ''}
              {yacht.capacity_max ? ` · ${yacht.capacity_max} ${guestsLabel}` : ''}
              {yacht.marina?.title ? ` · ${yacht.marina.title}` : ''}
              {yacht.rating ? ` · ★ ${yacht.rating}` : ''}
            </Text>
            {compact && showPrice !== false && (
              <Text style={{ color: colors.pink, fontWeight: '800', marginTop: 6 }}>
                {start
                  ? fromLabel.replace('{price}', money(start.amount)).replace('{duration}', start.duration)
                  : seePricesLabel}
              </Text>
            )}
          </View>
        </Pressable>
        {!!onToggleHours && rows.length > 0 && (
          <Pressable onPress={onToggleHours} style={{ paddingHorizontal: 12, paddingBottom: expanded ? 4 : 12 }}>
            <Text style={{ color: colors.pink, fontWeight: '800' }}>{expanded ? hideHoursLabel : hoursLabel}</Text>
          </Pressable>
        )}

        {expanded && rows.length > 0 && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            {rows.map((row, idx) => {
              const amt = Number(row.price || 0);
              const best = lowest != null && amt === lowest;
              return (
                <View
                  key={`${row.duration}-${idx}`}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 9,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    marginBottom: 4,
                    backgroundColor: best ? '#ffe3f0' : colors.paper,
                  }}
                >
                  <Text style={{ color: colors.ink, fontWeight: best ? '800' : '600' }}>{row.duration}</Text>
                  <Text style={{ color: best ? colors.pink : colors.navy, fontWeight: '800' }}>{money(amt)}</Text>
                </View>
              );
            })}
          </View>
        )}
    </View>
  );
}

function Chip({ colors, text, hot }: { colors: Colors; text: string; hot?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: hot ? colors.pink : 'rgba(8,16,24,0.55)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: colors.white, fontWeight: '800', fontSize: 11 }}>{text}</Text>
    </View>
  );
}

export function MiniCard({
  yacht,
  colors,
  onPress,
  width = 168,
}: {
  yacht: Yacht;
  colors: Colors;
  onPress: () => void;
  width?: number;
}) {
  const start = startingTotal(yacht);
  return (
    <PressScale onPress={onPress} style={{ width, marginRight: 12 }}>
      <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.navy }}>
        {!!yacht.image_url && <Image source={{ uri: yacht.image_url }} style={{ width, height: 110 }} />}
        <View style={{ padding: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <Text numberOfLines={1} style={{ fontWeight: '800', color: colors.ink }}>
            {yacht.title}
          </Text>
          <Text style={{ color: colors.pink, fontWeight: '700', marginTop: 4, fontSize: 12 }}>
            {start ? money(start.amount) : '—'}
            {yacht.size_ft ? ` · ${yacht.size_ft} ft` : ''}
          </Text>
        </View>
      </View>
    </PressScale>
  );
}
