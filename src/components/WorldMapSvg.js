import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { geoMercator, geoPath, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';



const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_HEIGHT = 420;

const CountryPath = memo(
  ({ d, fill }) => (
    <Path d={d} fill={fill} stroke="#999" strokeWidth={0.5} />
  ),
  (prev, next) => prev.fill === next.fill && prev.d === next.d
);

function WorldMapSvgInner({ getFill, onCountryPress }) {
  const [features, setFeatures] = useState(null);
  const [error, setError] = useState(null);

  const [baseTx, setBaseTx] = useState(0);
  const [baseTy, setBaseTy] = useState(0);
  const [baseScale, setBaseScale] = useState(1);

  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const pinch = useRef(new Animated.Value(1)).current;

  const panRef = useRef();
  const pinchRef = useRef();
  const tapRef = useRef();

  useEffect(() => {
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((topo) => {
        const geo = feature(topo, topo.objects.countries).features;
        setFeatures(geo);
      })
      .catch((e) => {
        console.warn('World map load error:', e);
        setError(e.message);
      });
  }, []);

  const { paths, projection, width, height } = useMemo(() => {
    const w = SCREEN_W;
    const h = MAP_HEIGHT;
    const proj = geoMercator()
      .scale(w / 6.3)
      .translate([w / 2, h / 1.5]);
    const pathGen = geoPath(proj);

    if (!features) return { paths: [], projection: proj, width: w, height: h };
    const result = features
      .map((f, idx) => {
        const d = pathGen(f);
        if (!d) return null;
        // Гарантовано унікальний ключ: index + id
        const uniqueKey = `c-${idx}-${f.id ?? 'x'}`;
        return {
          key: uniqueKey,
          id: f.id,
          name: f.properties?.name || '',
          d,
          feature: f,
        };
      })
      .filter(Boolean);

    return { paths: result, projection: proj, width: w, height: h };
  }, [features]);

  const onTapEvent = (e) => {
    if (e.nativeEvent.state !== State.ACTIVE) return;
    if (!features) return;

    const tapX = e.nativeEvent.x;
    const tapY = e.nativeEvent.y;

    // Центр View — точка, относительно которой применяется scale
    const originX = width / 2;
    const originY = height / 2;

    // Инвертируем трансформацию с учётом центра масштабирования
    const svgX = (tapX - baseTx - originX) / baseScale + originX;
    const svgY = (tapY - baseTy - originY) / baseScale + originY;

    const coords = projection.invert([svgX, svgY]);
    if (!coords) return;

    for (const p of paths) {
      if (geoContains(p.feature, coords)) {
        onCountryPress?.(p.id, p.name);
        return;
      }
    }
  };

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: panX, translationY: panY } }],
    { useNativeDriver: true }
  );

  const onPanStateChange = (e) => {
    if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
      setBaseTx((v) => v + e.nativeEvent.translationX);
      setBaseTy((v) => v + e.nativeEvent.translationY);
      panX.setValue(0);
      panY.setValue(0);
    }
  };

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinch } }],
    { useNativeDriver: true }
  );

  const onPinchStateChange = (e) => {
    if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
      setBaseScale((v) => Math.max(1, Math.min(12, v * e.nativeEvent.scale)));
      pinch.setValue(1);
    }
  };

  const resetZoom = () => {
    setBaseTx(0);
    setBaseTy(0);
    setBaseScale(1);
  };

  const translateXCombined = Animated.add(panX, baseTx);
  const translateYCombined = Animated.add(panY, baseTy);
  const scaleCombined = Animated.multiply(pinch, baseScale);

  if (error) {
    return (
      <View style={[styles.wrapper, styles.center]}>
        <Text style={{ color: '#c62828' }}>Помилка завантаження карти</Text>
        <Text style={{ color: '#999', fontSize: 12 }}>{error}</Text>
      </View>
    );
  }

  if (!features) {
    return (
      <View style={[styles.wrapper, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, color: '#666' }}>Завантажую карту світу...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <TapGestureHandler
        ref={tapRef}
        onHandlerStateChange={onTapEvent}
        waitFor={[panRef, pinchRef]}
        maxDurationMs={350}
        maxDeltaX={10}
        maxDeltaY={10}
      >
        <Animated.View style={styles.container}>
          <PanGestureHandler
            ref={panRef}
            simultaneousHandlers={pinchRef}
            minPointers={1}
            maxPointers={2}
            onGestureEvent={onPanEvent}
            onHandlerStateChange={onPanStateChange}
          >
            <Animated.View style={styles.container}>
              <PinchGestureHandler
                ref={pinchRef}
                simultaneousHandlers={panRef}
                onGestureEvent={onPinchEvent}
                onHandlerStateChange={onPinchStateChange}
              >
                <Animated.View
                  style={[
                    styles.container,
                    {
                      transform: [
                        { translateX: translateXCombined },
                        { translateY: translateYCombined },
                        { scale: scaleCombined },
                      ],
                    },
                  ]}
                >
                  <Svg
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    pointerEvents="none"
                  >
                    <G>
                      {paths.map((p) => (
                        <CountryPath
                          key={p.key}
                          d={p.d}
                          fill={getFill(p.id)}
                        />
                      ))}
                    </G>
                  </Svg>
                </Animated.View>
              </PinchGestureHandler>
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </TapGestureHandler>

      <TouchableOpacity style={styles.resetBtn} onPress={resetZoom}>
        <Text style={styles.resetTxt}>⊙</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function WorldMapSvg(props) {
  return (
    <GestureHandlerRootView style={styles.wrapper}>
      <WorldMapSvgInner {...props} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SCREEN_W,
    height: MAP_HEIGHT,
    backgroundColor: '#eaf6ff',
    overflow: 'hidden',
  },
  container: {
    width: SCREEN_W,
    height: MAP_HEIGHT,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  resetBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  resetTxt: { fontSize: 20, color: '#333' },
});