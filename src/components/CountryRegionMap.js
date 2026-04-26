import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { geoMercator, geoAlbersUsa, geoPath, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import { TapGestureHandler, State } from 'react-native-gesture-handler';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_HEIGHT = 380;

// =========================
// 🔥 NAME PARSER
// =========================
function getRegionName(feature, index) {
  const p = feature.properties || {};
  return (
    p.name ||
    p.NAME ||
    p.NAME_1 ||
    p.shapeName ||
    p.nom ||
    p.NAME_EN ||
    p.name_en ||
    `region-${index}`
  );
}

export default function CountryRegionMap({
  config,
  visitedRegions,
  onRegionPress,
  countryId,
}) {
  const [features, setFeatures] = useState(null);
  const [error, setError] = useState(null);

  // 🔥 zoom / pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // =========================
  // 🔥 LOAD DATA
  // =========================
  useEffect(() => {
    setFeatures(null);
    setError(null);

    const loadData = async () => {
      try {
        if (config.isGeoboundaries) {
          const metaRes = await fetch(config.url);
          if (!metaRes.ok) throw new Error(`HTTP ${metaRes.status}`);

          const meta = await metaRes.json();
          const geojsonUrl =
            meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL;

          const geoRes = await fetch(geojsonUrl);
          if (!geoRes.ok) throw new Error(`HTTP ${geoRes.status}`);

          const geoData = await geoRes.json();
          setFeatures(geoData.features || []);
          return;
        }

        const res = await fetch(config.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (config.topojsonObject) {
          const obj = data.objects?.[config.topojsonObject];
          const geo = feature(data, obj);
          setFeatures(geo.features || []);
        } else {
          setFeatures(data.features || []);
        }
      } catch (e) {
        console.warn('Region map load error:', e);
        setError(e.message);
      }
    };

    loadData();
  }, [config]);

  // =========================
  // 🔥 PROJECTION
  // =========================
  const { pathGen, projection, width, height } = useMemo(() => {
    const w = SCREEN_W - 20;
    const h = MAP_HEIGHT;

    if (countryId === '840') {
      const proj = geoAlbersUsa()
        .scale(w * 1.2)
        .translate([w / 2, h / 2]);

      return { pathGen: geoPath(proj), projection: proj, width: w, height: h };
    }

    const adjustedScale = (config.scale * w) / 800;

    const proj = geoMercator()
      .center(config.center)
      .scale(adjustedScale)
      .translate([w / 2, h / 2]);

    return { pathGen: geoPath(proj), projection: proj, width: w, height: h };
  }, [config, countryId]);

  // =========================
  // 🔥 PATHS
  // =========================
  const paths = useMemo(() => {
    if (!features) return [];

    return features
      .map((f, i) => {
        const name = getRegionName(f, i);
        const d = pathGen(f);

        if (!d) return null;

        return {
          name,
          d,
          key: `${name}-${i}`,
          feature: f,
        };
      })
      .filter(Boolean);
  }, [features, pathGen]);

  // =========================
  // 🔥 TAP DETECTION
  // =========================
  const onTap = (e) => {
    if (e.nativeEvent.state !== State.ACTIVE) return;

    const x = (e.nativeEvent.x - translate.x) / scale;
    const y = (e.nativeEvent.y - translate.y) / scale;

    const coords = projection.invert([x, y]);
    if (!coords) return;

    for (const p of paths) {
      if (geoContains(p.feature, coords)) {
        onRegionPress?.(p.name);
        return;
      }
    }
  };

  // =========================
  // 🔥 RENDER STATES
  // =========================
  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.err}>Не вдалося завантажити карту</Text>
        <Text style={styles.errSmall}>{error}</Text>
      </View>
    );
  }

  if (!features) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadTxt}>Завантажую карту...</Text>
      </View>
    );
  }

  if (paths.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.err}>Регіони не знайдено</Text>
      </View>
    );
  }

  // =========================
  // 🔥 RENDER
  // =========================
  return (
    <View style={styles.container}>
      <TapGestureHandler onHandlerStateChange={onTap}>
        <View style={{ width, height }}>
          <Svg width={width} height={height}>
            <G
              transform={`
                translate(${translate.x}, ${translate.y})
                scale(${scale})
              `}
            >
              {paths.map((p) => {
                const isVisited = visitedRegions.some(
                  (r) => r.name === p.name
                );

                return (
                  <Path
                    key={p.key}
                    d={p.d}
                    fill={isVisited ? '#69e36a' : '#d6d6d6'}
                    stroke="#fff"
                    strokeWidth={0.8}
                  />
                );
              })}
            </G>
          </Svg>
        </View>
      </TapGestureHandler>
    </View>
  );
}

// =========================
// 🎨 STYLES
// =========================
const styles = StyleSheet.create({
  container: {
    width: SCREEN_W - 20,
    height: MAP_HEIGHT,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadTxt: {
    marginTop: 10,
    color: '#666',
  },

  err: {
    color: '#c62828',
    fontWeight: '600',
    marginBottom: 6,
  },

  errSmall: {
    color: '#999',
    fontSize: 12,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
});