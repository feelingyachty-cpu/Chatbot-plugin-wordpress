import { Image, Pressable, Text, View } from 'react-native';
import { listedTotal, money, startingListed } from '../api';
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
  captainIncludedLabel,
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
  captainIncludedLabel: string;
  onPress: () => void;
  onToggleHours?: () => void;
  onToggleSave?: () => void;
}) {
  const start = startingListed(yacht);
  const rows = (yacht.pricing || []).filter((row) => (row.type || 'price') === 'price' && row.price != null);
  const lowest = start?.amount;
  const imageH = compact ? 0 : 224;

  return (
    <View
      style={{
        marginBottom: 20,
        marginHorizontal: 18,
        backgroundColor: colors.card,
        borderRadius: 26,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: saved ? colors.pinkHot : colors.line,
        shadowColor: colors.navyDeep,
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      }}
    >
        {!!yacht.image_url && !compact && (
          <View style={{ height: imageH, backgroundColor: colors.navy }}>
            <PressScale onPress={onPress}>
              <View style={{ height: imageH }}>
                <Image source={{ uri: yacht.image_url }} style={{ width: '100%', height: '100%' }} />
                <View style={{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', gap: 6 }}>
                  {promo && <Chip colors={colors} text={promoLabel} hot />}
                  {!!yacht.size_ft && <Chip colors={colors} text={`${yacht.size_ft} ft`} />}
                </View>
              </View>
            </PressScale>
            {onToggleSave && (
              <Pressable
                onPress={onToggleSave}
                hitSlop={10}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: saved ? colors.pink : 'rgba(6,24,36,0.68)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                <Text style={{ color: colors.white, fontSize: 20 }}>{saved ? '♥' : '♡'}</Text>
              </Pressable>
            )}
          </View>
        )}

        <Pressable onPress={onPress} style={{ padding: 16, flexDirection: compact ? 'row' : 'column', gap: 12 }}>
          {!!yacht.image_url && compact && (
            <Image source={{ uri: yacht.image_url }} style={{ width: 88, height: 88, borderRadius: 16, backgroundColor: colors.navy }} />
          )}
          <View style={{ flex: 1 }}>
            <HighlightText
              text={yacht.title}
              query={query}
              style={{ fontSize: compact ? 17 : 22, lineHeight: compact ? 21 : 27, fontWeight: '900', color: colors.ink }}
              highlightStyle={{ backgroundColor: '#FFE3F0', color: colors.pink }}
            />
            <Text style={{ color: colors.muted, marginTop: 7, fontWeight: '700', fontSize: 13 }}>
              {yacht.size_ft ? `${yacht.size_ft} ft` : ''}
              {yacht.capacity_max ? ` · ${yacht.capacity_max} ${guestsLabel}` : ''}
              {yacht.marina?.title ? ` · ${yacht.marina.title}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
              {!!yacht.captain_included && <MetaPill colors={colors} text={captainIncludedLabel} />}
              {!!yacht.rating && <MetaPill colors={colors} text={`★ ${yacht.rating}`} hot />}
            </View>
            {showPrice !== false && (
              <Text style={{ color: colors.pink, fontWeight: '900', marginTop: 14, fontSize: compact ? 14 : 17 }}>
                {start
                  ? fromLabel.replace('{price}', money(start.amount)).replace('{duration}', start.duration)
                  : seePricesLabel}
              </Text>
            )}
          </View>
        </Pressable>
        {!!onToggleHours && rows.length > 0 && (
          <Pressable
            onPress={onToggleHours}
            style={{
              marginHorizontal: 16,
              marginBottom: expanded ? 8 : 16,
              borderTopWidth: 1,
              borderTopColor: colors.line,
              paddingTop: 13,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: colors.ink, fontWeight: '900' }}>{expanded ? hideHoursLabel : hoursLabel}</Text>
            <Text style={{ color: colors.pink, fontWeight: '900', fontSize: 18 }}>{expanded ? '−' : '+'}</Text>
          </Pressable>
        )}

        {expanded && rows.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {rows.map((row, idx) => {
              // Same listed figure as the card header and YachtDetail —
              // raw row.price is the boat-only cost and would contradict
              // the "From" line right above these rows.
              const amt = listedTotal(yacht, row.duration) ?? Number(row.price || 0);
              const best = lowest != null && amt === lowest;
              return (
                <View
                  key={`${row.duration}-${idx}`}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 9,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    marginBottom: 4,
                    backgroundColor: best ? '#FFE5F0' : colors.paper,
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
        backgroundColor: hot ? colors.pink : 'rgba(6,24,36,0.72)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: colors.white, fontWeight: '900', fontSize: 11 }}>{text}</Text>
    </View>
  );
}

function MetaPill({ colors, text, hot }: { colors: Colors; text: string; hot?: boolean }) {
  return (
    <View style={{ backgroundColor: hot ? '#FFE5F0' : colors.paper, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: hot ? colors.pink : colors.ink, fontWeight: '800', fontSize: 11 }}>{text}</Text>
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
  const start = startingListed(yacht);
  return (
    <PressScale onPress={onPress} style={{ width, marginRight: 12 }}>
      <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: colors.navy }}>
        {!!yacht.image_url && <Image source={{ uri: yacht.image_url }} style={{ width, height: 110 }} />}
        <View style={{ padding: 11, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderTopWidth: 0, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
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
