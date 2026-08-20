import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { isStoreOrigin } from '../config';
import type { Colors } from '../theme';
import { ShimmerBlock } from './Shimmer';

type WebFrameProps = {
  url?: string;
  html?: string;
  colors: Colors;
  title?: string;
  onLoad?: () => void;
  onBlocked?: () => void;
  skeleton?: boolean;
  injectedJavaScript?: string;
};

function injectScript(frame: HTMLIFrameElement | null, script?: string) {
  if (!script || !frame) {
    return;
  }
  try {
    const doc = frame.contentDocument;
    if (!doc) {
      return;
    }
    if (doc.getElementById('fy-app-chrome-boot')) {
      return;
    }
    const tag = doc.createElement('script');
    tag.id = 'fy-app-chrome-boot';
    tag.textContent = script;
    (doc.head || doc.documentElement).appendChild(tag);
  } catch {
    // Cross-origin frames cannot be scripted.
  }
}

function WebFrameWeb({
  url,
  html,
  colors,
  title,
  onLoad,
  onBlocked,
  skeleton = true,
  injectedJavaScript,
}: WebFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const onLoadRef = useRef(onLoad);
  const onBlockedRef = useRef(onBlocked);
  const injectedRef = useRef(injectedJavaScript);
  const [ready, setReady] = useState(!skeleton || Boolean(html));

  onLoadRef.current = onLoad;
  onBlockedRef.current = onBlocked;
  injectedRef.current = injectedJavaScript;

  useEffect(() => {
    if (html || !skeleton) {
      setReady(true);
      return;
    }
    setReady(false);
    const timeout = window.setTimeout(() => setReady(true), 1600);
    const onMessage = (event: MessageEvent) => {
      if (!isStoreOrigin(event.origin)) {
        return;
      }
      const data = event.data as { fy?: string } | null;
      if (data?.fy === 'ready') {
        setReady(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
    };
  }, [url, html, skeleton]);

  const handleLoad = useCallback((frame: HTMLIFrameElement | null) => {
    if (!frame) {
      return;
    }
    try {
      const href = frame.contentWindow?.location?.href || '';
      if (!href || href === 'about:blank') {
        return;
      }
      if (href.startsWith(window.location.origin)) {
        onBlockedRef.current?.();
        setReady(true);
        return;
      }
    } catch {
      // Ignore cross-origin read errors.
    }
    setReady(true);
    onLoadRef.current?.();
    injectScript(frame, injectedRef.current);
  }, []);

  useLayoutEffect(() => {
    if (!html) {
      return;
    }
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const writeHtml = () => {
      const doc = frame.contentDocument;
      if (!doc) {
        return false;
      }
      doc.open();
      doc.write(html);
      doc.close();
      return true;
    };
    if (writeHtml()) {
      onLoadRef.current?.();
      return;
    }
    const onFrameLoad = () => {
      frame.removeEventListener('load', onFrameLoad);
      if (writeHtml()) {
        onLoadRef.current?.();
      }
    };
    frame.addEventListener('load', onFrameLoad);
    frame.src = 'about:blank';
    return () => frame.removeEventListener('load', onFrameLoad);
  }, [html]);

  const frameStyle = {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    border: 'none',
    width: '100%',
    height: '100%',
    background: 'transparent',
    display: 'block',
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch' as const,
  };

  const frame = html
    ? createElement('iframe', {
        ref: frameRef,
        title: title || 'Feeling Yachty',
        allow: 'payment; clipboard-write',
        loading: 'eager',
        style: frameStyle,
      })
    : createElement('iframe', {
        ref: frameRef,
        src: url,
        title: title || 'Feeling Yachty',
        allow: 'payment; clipboard-write; autoplay; fullscreen; publickey-credentials-get',
        referrerPolicy: 'origin',
        loading: 'eager',
        scrolling: 'yes',
        onLoad: (event: { currentTarget: HTMLIFrameElement }) => {
          handleLoad(event.currentTarget || frameRef.current);
        },
        onError: () => setReady(true),
        style: frameStyle,
      });

  return (
    <View
      style={{
        flex: 1,
        position: 'relative',
        backgroundColor: colors.paper,
        minHeight: 0,
        height: '100%',
        width: '100%',
      }}
    >
      {frame}
      {skeleton && !html && !ready && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 12,
            backgroundColor: colors.paper,
          }}
        >
          <ShimmerBlock colors={colors} height={220} />
          <ShimmerBlock colors={colors} height={48} radius={12} />
          <ShimmerBlock colors={colors} height={48} radius={12} />
          <ShimmerBlock colors={colors} height={56} radius={14} />
        </View>
      )}
    </View>
  );
}

function WebFrameNative({
  url,
  html,
  colors,
  title,
  onLoad,
  onBlocked,
  skeleton = true,
  injectedJavaScript,
}: WebFrameProps) {
  const [ready, setReady] = useState(!skeleton || Boolean(html));
  const webRef = useRef<WebView>(null);

  return (
    <View
      style={{
        flex: 1,
        position: 'relative',
        backgroundColor: colors.paper,
        minHeight: 0,
      }}
    >
      <WebView
        ref={webRef}
        source={html ? { html } : { uri: url || 'about:blank' }}
        style={{ flex: 1, backgroundColor: colors.paper }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        injectedJavaScript={injectedJavaScript}
        onLoadEnd={() => {
          setReady(true);
          onLoad?.();
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (!request.url || request.url === 'about:blank') {
            return true;
          }
          try {
            const origin = new URL(request.url).origin;
            if (!isStoreOrigin(origin) && !request.url.startsWith('http')) {
              onBlocked?.();
              return false;
            }
          } catch {
            return true;
          }
          return true;
        }}
        onError={() => setReady(true)}
      />
      {skeleton && !html && !ready && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 12,
            backgroundColor: colors.paper,
          }}
        >
          <ShimmerBlock colors={colors} height={220} />
          <ShimmerBlock colors={colors} height={48} radius={12} />
          <ShimmerBlock colors={colors} height={48} radius={12} />
          <ShimmerBlock colors={colors} height={56} radius={14} />
        </View>
      )}
    </View>
  );
}

export function WebFrame(props: WebFrameProps) {
  if (Platform.OS === 'web') {
    return <WebFrameWeb {...props} />;
  }
  return <WebFrameNative {...props} />;
}
