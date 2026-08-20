import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { Colors } from '../theme';

export function ShimmerBlock({ colors, height, radius = 16 }: { colors: Colors; height: number; radius?: number }) {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        height,
        borderRadius: radius,
        backgroundColor: colors.line,
        opacity: pulse,
        marginBottom: 14,
      }}
    />
  );
}

export function FeedSkeleton({ colors }: { colors: Colors }) {
  return (
    <View style={{ padding: 16 }}>
      <ShimmerBlock colors={colors} height={188} />
      <ShimmerBlock colors={colors} height={220} />
      <ShimmerBlock colors={colors} height={220} />
    </View>
  );
}
