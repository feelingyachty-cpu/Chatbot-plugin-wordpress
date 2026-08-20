import { ScrollView, Text, View } from 'react-native';
import { t } from '../i18n';
import { prettyDate, prettyTime } from '../store';
import { useLayout } from '../layout';
import type { Colors } from '../theme';
import type { Yacht } from '../types';
import { Button } from './Button';

function DetailRow({ colors, label, value }: { colors: Colors; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
      <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 13 }}>{label}</Text>
      <Text
        style={{
          color: colors.ink,
          fontWeight: '800',
          fontSize: 13,
          flexShrink: 1,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function OrderReceived({
  colors,
  lang,
  orderNo,
  yacht,
  duration,
  guests,
  date,
  time,
  onClose,
}: {
  colors: Colors;
  lang: string;
  orderNo?: string;
  yacht: Pick<Yacht, 'title'>;
  duration?: string;
  guests?: number;
  date?: string;
  time?: string;
  onClose: () => void;
}) {
  const layout = useLayout();

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 28,
        paddingHorizontal: 28 + layout.sideInset,
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
      }}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 40, color: colors.pink }}>✓</Text>
      </View>
      <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 26, textAlign: 'center' }}>
        {t(lang, 'orderDoneTitle')}
      </Text>
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 21 }}>
        {t(lang, 'orderDoneBody')}
      </Text>
      <View
        style={{
          alignSelf: 'stretch',
          backgroundColor: colors.card,
          borderRadius: 18,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.line,
          marginTop: 24,
        }}
      >
        {!!orderNo && <DetailRow colors={colors} label={t(lang, 'orderNumber')} value={`#${orderNo}`} />}
        {!!yacht.title && <DetailRow colors={colors} label={t(lang, 'yachts')} value={yacht.title} />}
        {!!date && <DetailRow colors={colors} label={t(lang, 'selectDate')} value={prettyDate(date, lang)} />}
        {!!time && <DetailRow colors={colors} label={t(lang, 'startTime')} value={prettyTime(time)} />}
        {!!duration && <DetailRow colors={colors} label={t(lang, 'charterLength')} value={duration} />}
        {!!guests && <DetailRow colors={colors} label={t(lang, 'guestCount')} value={String(guests)} />}
        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 8 }} />
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{t(lang, 'receiptTotalsNote')}</Text>
      </View>
      <Button
        label={t(lang, 'backToYachts')}
        colors={colors}
        size="lg"
        full
        onPress={onClose}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}
