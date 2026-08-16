import { Pressable, ScrollView, Text, View } from 'react-native';
import type { SizeBand, SortKey, StyleFilter } from '../browse';
import { SIZE_CHIPS, SORT_CHIPS, STYLE_CHIPS } from '../browse';
import type { Colors } from '../theme';

function ChipRow<T extends string>({
  items,
  value,
  onChange,
  colors,
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  colors: Colors;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 18 }}>
      {items.map((item) => {
        const on = item.id === value;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 12,
              backgroundColor: on ? colors.navy : colors.white,
              borderWidth: 1,
              borderColor: on ? colors.navy : colors.line,
            }}
          >
            <Text style={{ color: on ? colors.white : colors.ink, fontWeight: '800', fontSize: 12 }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function FilterBar({
  colors,
  size,
  style,
  sort,
  savedCount,
  onSize,
  onStyle,
  onSort,
}: {
  colors: Colors;
  size: SizeBand;
  style: StyleFilter;
  sort: SortKey;
  savedCount: number;
  onSize: (v: SizeBand) => void;
  onStyle: (v: StyleFilter) => void;
  onSort: (v: SortKey) => void;
}) {
  const styles = STYLE_CHIPS.map((c) =>
    c.id === 'saved' ? { ...c, label: savedCount ? `Saved ${savedCount}` : c.label } : c
  );
  return (
    <View style={{ gap: 9, paddingLeft: 18, paddingBottom: 12 }}>
      <ChipRow items={SIZE_CHIPS} value={size} onChange={onSize} colors={colors} />
      <ChipRow items={styles} value={style} onChange={onStyle} colors={colors} />
      <ChipRow items={SORT_CHIPS} value={sort} onChange={onSort} colors={colors} />
    </View>
  );
}
