import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { money } from '../api';
import { t } from '../i18n';
import type { Colors } from '../theme';
import type { Yacht } from '../types';
import { PressScale } from './PressScale';

export function YachtDetail({
  yacht,
  colors,
  lang,
  onBack,
  onBook,
  onTalk,
}: {
  yacht: Yacht;
  colors: Colors;
  lang: string;
  onBack: () => void;
  onBook: (duration?: string) => void;
  onTalk: () => void;
}) {
  const rows = useMemo(
    () => (yacht.pricing || []).filter((row) => (row.type || 'price') === 'price' && row.price != null),
    [yacht.pricing]
  );
  const [picked, setPicked] = useState(0);
  const selected = rows[picked] || rows[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ height: 280, backgroundColor: colors.navy }}>
          {!!yacht.image_url && <Image source={{ uri: yacht.image_url }} style={{ width: '100%', height: '100%' }} />}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, backgroundColor: 'rgba(8,16,24,0.55)' }} />
          <Pressable
            onPress={onBack}
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              backgroundColor: 'rgba(8,16,24,0.65)',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: '800' }}>‹ {t(lang, 'yachts')}</Text>
          </Pressable>
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
            {yacht.is_pink && (
              <Text
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: colors.pink,
                  color: colors.white,
                  fontWeight: '800',
                  fontSize: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  marginBottom: 8,
                  overflow: 'hidden',
                }}
              >
                {t(lang, 'pinkPromo')}
              </Text>
            )}
            <Text style={{ color: colors.white, fontWeight: '800', fontSize: 26 }}>{yacht.title}</Text>
            <Text style={{ color: colors.cream, marginTop: 4, fontWeight: '700' }}>
              {yacht.size_ft ? `${yacht.size_ft} ft` : ''}
              {yacht.capacity_max ? ` · ${t(lang, 'upToGuests', { n: yacht.capacity_max })}` : ''}
            </Text>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {!!yacht.marina?.title && (
            <Text style={{ color: colors.navy, fontWeight: '700', marginBottom: 10 }}>
              {t(lang, 'meetAt', { marina: yacht.marina.title })}
            </Text>
          )}
          {!!yacht.special_desc && (
            <Text style={{ color: colors.ink, lineHeight: 22, marginBottom: 8 }}>{stripHtml(yacht.special_desc)}</Text>
          )}

          <Text style={{ marginTop: 12, marginBottom: 10, color: colors.pink, fontWeight: '800' }}>
            {t(lang, 'tripTotals')}
          </Text>
          <Text style={{ color: colors.muted, marginBottom: 12 }}>{t(lang, 'hoursHint')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {rows.map((row, idx) => {
              const on = idx === picked;
              return (
                <Pressable
                  key={`${row.duration}-${idx}`}
                  onPress={() => setPicked(idx)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: on ? colors.pink : colors.white,
                    borderWidth: 1,
                    borderColor: on ? colors.pink : colors.line,
                  }}
                >
                  <Text style={{ color: on ? colors.white : colors.ink, fontWeight: '800', fontSize: 12 }}>
                    {row.duration}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {rows.map((row, idx) => {
            const on = idx === picked;
            return (
              <Pressable
                key={`row-${row.duration}-${idx}`}
                onPress={() => setPicked(idx)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  marginBottom: 6,
                  backgroundColor: on ? '#ffe3f0' : colors.white,
                  borderWidth: 1,
                  borderColor: on ? colors.pink : colors.line,
                }}
              >
                <Text style={{ color: colors.ink, fontWeight: on ? '800' : '600' }}>{row.duration}</Text>
                <Text style={{ color: on ? colors.pink : colors.navy, fontWeight: '800' }}>
                  {money(Number(row.price || 0))}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.navyDeep,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>
            {selected?.duration || t(lang, 'tripTotals')}
          </Text>
          <Text style={{ color: colors.white, fontWeight: '800', fontSize: 20 }}>
            {selected ? money(Number(selected.price || 0)) : '—'}
          </Text>
        </View>
        <PressScale onPress={onTalk}>
          <View style={{ backgroundColor: colors.navy, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14 }}>
            <Text style={{ color: colors.white, fontWeight: '800' }}>{t(lang, 'talk')}</Text>
          </View>
        </PressScale>
        <PressScale onPress={() => onBook(selected?.duration)}>
          <View style={{ backgroundColor: colors.pink, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14 }}>
            <Text style={{ color: colors.white, fontWeight: '800' }}>{t(lang, 'bookYacht')}</Text>
          </View>
        </PressScale>
      </View>
    </View>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
