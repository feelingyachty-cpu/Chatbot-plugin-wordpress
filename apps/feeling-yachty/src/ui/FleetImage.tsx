import { useEffect, useState } from 'react';
import { Image, type ImageResizeMode, type ImageStyle, type StyleProp } from 'react-native';
import { smallerImageUrl } from '../api';

export function FleetImage({
  uri,
  maxWidth = 768,
  style,
  resizeMode = 'cover',
  onError,
}: {
  uri: string;
  maxWidth?: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  onError?: () => void;
}) {
  const [src, setSrc] = useState(() => smallerImageUrl(uri, maxWidth));

  useEffect(() => {
    setSrc(smallerImageUrl(uri, maxWidth));
  }, [uri, maxWidth]);

  return (
    <Image
      source={{ uri: src }}
      style={style}
      resizeMode={resizeMode}
      fadeDuration={0}
      onError={() => {
        if (src === uri) {
          onError?.();
        } else {
          setSrc(uri);
        }
      }}
    />
  );
}
