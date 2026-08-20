import { Fragment, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { RADII, type Colors } from '../theme';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'dark' | 'whatsapp';
type ButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ButtonSize, { height: number; padH: number; font: number; radius: number }> = {
  sm: { height: 44, padH: 14, font: 13, radius: RADII.sm },
  md: { height: 50, padH: 18, font: 15, radius: RADII.sm },
  lg: { height: 56, padH: 22, font: 17, radius: RADII.sm },
};

function palette(variant: ButtonVariant, colors: Colors) {
  switch (variant) {
    case 'dark':
      return { bg: colors.info, fg: colors.white, border: 'transparent' };
    case 'outline':
      return { bg: colors.white, fg: colors.ink, border: colors.line };
    case 'ghost':
      return { bg: 'transparent', fg: colors.pink, border: 'transparent' };
    case 'whatsapp':
      return { bg: '#25D366', fg: '#04310F', border: 'transparent' };
    default:
      return { bg: colors.pink, fg: colors.white, border: 'transparent' };
  }
}

export function Button({
  label,
  onPress,
  colors,
  variant = 'primary',
  size = 'md',
  full,
  loading,
  disabled,
  icon,
  subLabel,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  colors: Colors;
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  subLabel?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const metrics = SIZES[size];
  const tone = palette(variant, colors);
  const isDisabled = Boolean(disabled || loading);
  const showShadow = !isDisabled && (variant === 'primary' || variant === 'whatsapp');

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 7,
      tension: 180,
    }).start();
  }

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => !isDisabled && animate(0.97)}
      onPressOut={() => animate(1)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      accessibilityLabel={accessibilityLabel || label}
      hitSlop={size === 'sm' ? 6 : 0}
      style={[full ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, style]}
    >
      <Animated.View
        style={[
          {
            minHeight: subLabel ? metrics.height + 12 : metrics.height,
            paddingHorizontal: variant === 'ghost' ? 0 : metrics.padH,
            paddingVertical: subLabel ? 8 : 0,
            borderRadius: metrics.radius,
            backgroundColor: tone.bg,
            borderWidth: variant === 'outline' ? 1 : 0,
            borderColor: tone.border,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: isDisabled ? 0.45 : 1,
            transform: [{ scale }],
          },
          showShadow && {
            shadowColor: colors.navyDeep,
            shadowOpacity: 0.22,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 0,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={tone.fg} size="small" />
        ) : (
          <Fragment>
            {!!icon && <Text style={{ color: tone.fg, fontSize: metrics.font + 1 }}>{icon}</Text>}
            <View style={{ alignItems: 'center' }}>
              <Text
                numberOfLines={1}
                style={{
                  color: tone.fg,
                  fontWeight: '800',
                  fontSize: metrics.font,
                  letterSpacing: 0.2,
                  textAlign: 'center',
                }}
              >
                {label}
              </Text>
              {!!subLabel && (
                <Text
                  numberOfLines={1}
                  style={{
                    color: tone.fg,
                    opacity: 0.82,
                    fontSize: metrics.font - 3,
                    fontWeight: '700',
                    marginTop: 2,
                  }}
                >
                  {subLabel}
                </Text>
              )}
            </View>
          </Fragment>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function Chip({
  label,
  icon,
  on,
  onPress,
  colors,
  disabled,
}: {
  label: string;
  icon?: string;
  on?: boolean;
  onPress?: () => void;
  colors: Colors;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(on), disabled: Boolean(disabled) }}
      hitSlop={6}
      style={{
        minHeight: 44,
        paddingLeft: icon ? 12 : 15,
        paddingRight: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderRadius: 999,
        backgroundColor: on ? colors.navy : colors.white,
        borderWidth: on ? 2 : 1,
        borderColor: on ? colors.pinkHot : colors.line,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {!!icon && <Text style={{ fontSize: 14 }}>{icon}</Text>}
      <Text numberOfLines={1} style={{ color: on ? colors.white : colors.ink, fontWeight: '800', fontSize: 14 }}>
        {label}
      </Text>
      {on && <Text style={{ color: colors.pinkHot, fontWeight: '800', fontSize: 13 }}>✓</Text>}
    </Pressable>
  );
}

export function Stepper({
  value,
  min = 1,
  max = 99,
  onChange,
  colors,
  label,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  colors: Colors;
  label?: string;
}) {
  function bump(delta: number) {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next !== value) {
      onChange(next);
    }
  }

  function stepButton(glyph: string, delta: number, enabled: boolean) {
    return (
      <Pressable
        onPress={() => bump(delta)}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={delta > 0 ? 'Increase' : 'Decrease'}
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.paper,
          borderWidth: 1,
          borderColor: colors.line,
          opacity: enabled ? 1 : 0.4,
        }}
      >
        <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800', lineHeight: 24 }}>{glyph}</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {stepButton('−', -1, value > min)}
      <View style={{ minWidth: 56, alignItems: 'center' }}>
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18 }}>{value}</Text>
        {!!label && <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>{label}</Text>}
      </View>
      {stepButton('+', 1, value < max)}
    </View>
  );
}

const ARROW_ROTATION = {
  down: '0deg',
  up: '180deg',
  right: '-90deg',
  left: '90deg',
} as const;

export function IconCircle({
  dir = 'down',
  size = 24,
  background,
  color,
  glyphSize = 11,
}: {
  dir?: keyof typeof ARROW_ROTATION;
  size?: number;
  background: string;
  color: string;
  glyphSize?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        allowFontScaling={false}
        style={{
          color,
          fontSize: glyphSize,
          lineHeight: Math.round(glyphSize * 1.3),
          transform: [{ rotate: ARROW_ROTATION[dir] }],
        }}
      >
        ▼
      </Text>
    </View>
  );
}

export function SwipeHint({
  colors,
  background,
}: {
  colors: Colors;
  background?: string;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingRight: 2,
        backgroundColor: background || colors.paper,
      }}
    >
      <IconCircle dir="right" background={colors.pink} color={colors.white} />
    </View>
  );
}
