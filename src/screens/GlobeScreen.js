import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useRef, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function GlobeScreen({ visited, dream, onCountryPress }) {
  const insets = useSafeAreaInsets();
  const webRef = useRef();
  const [webReady, setWebReady] = useState(false);

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />

<style>
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  #globeViz {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 90vmin;
    height: 90vmin;
    transform: translate(-50%, -50%);
  }

  canvas {
    outline: none;
    display: block;
    -webkit-tap-highlight-color: transparent;
  }

  * {
    -webkit-tap-highlight-color: transparent;
  }
</style>
</head>

<body>

<div id="globeViz"></div>

<script src="https://unpkg.com/three"></script>
<script src="https://unpkg.com/globe.gl"></script>
<script src="https://unpkg.com/topojson-client"></script>

<script>

let visited = [];
let dream = [];
let countries = [];
let world = null;
let ready = false;
let pendingData = null;

// прибираємо синій флік
document.body.style.webkitTapHighlightColor = 'transparent';

function getColor(name, id) {
  if (visited.some(c => c.id === id || c.name === name)) return '#69e36a';
  if (dream.some(c => c.id === id || c.name === name)) return '#83cfff';
  return '#d6d6d6';
}

function applyColors() {
  if (!world || !countries.length) return;

  const fn = feat => getColor(feat.properties.name, feat.id);

  world.polygonCapColor(fn);
  world.polygonsData([...countries]);
}

// API з RN
window.applyData = function(json) {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json;

    if (!ready) {
      pendingData = data;
      return true;
    }

    visited = data.visited || [];
    dream = data.dream || [];

    applyColors();
  } catch {}

  return true;
};

// біла текстура
const WHITE_TEXTURE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512">' +
  '<rect width="100%" height="100%" fill="white"/></svg>'
);

// створення глобуса
world = Globe()(document.getElementById('globeViz'))
  .globeImageUrl(WHITE_TEXTURE)
  .backgroundColor('#ffffff')
  .showAtmosphere(false);

// камера
world.pointOfView({ lat: 10, lng: 0, altitude: 2.3 });

// фон
world.renderer().domElement.style.background = '#ffffff';

// resize
function resizeGlobe() {
  const size = Math.min(window.innerWidth, window.innerHeight);
  world.width(size * 0.9);
  world.height(size * 0.9);
}
window.addEventListener('resize', resizeGlobe);
resizeGlobe();

// КЛІК ПО КРАЇНІ
world.onPolygonClick(function(feat) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'countryClick',
      id: feat.id,
      name: feat.properties.name
    }));
  }
});

// hover
world.onPolygonHover(function(feat) {
  document.body.style.cursor = feat ? 'pointer' : 'default';
});

// завантаження країн
fetch('https://unpkg.com/world-atlas@2/countries-110m.json')
  .then(res => res.json())
  .then(data => {
    countries = topojson.feature(data, data.objects.countries).features;

    world
      .polygonsData(countries)
      .polygonAltitude(0.01)
      .polygonCapColor(() => '#d6d6d6')
      .polygonSideColor(() => 'rgba(0,0,0,0.15)')
      .polygonStrokeColor(() => '#666');

    ready = true;

    if (pendingData) {
      visited = pendingData.visited || [];
      dream = pendingData.dream || [];
    }

    requestAnimationFrame(() => {
      applyColors();
    });

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    }
  });

world.controls().autoRotate = false;

</script>

</body>
</html>
`;

  useEffect(() => {
    if (!webReady || !webRef.current) return;

    const payload = JSON.stringify({ visited, dream });

    webRef.current.injectJavaScript(`
      window.applyData(${JSON.stringify(payload)});
      true;
    `);
  }, [visited, dream, webReady]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'ready') {
        setWebReady(true);
      } 
      // ГОЛОВНА ЗМІНА
      else if (data.type === 'countryClick') {
        onCountryPress?.(data.id, data.name);
      }
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#5f5df8" />
            <Text style={styles.loadTxt}>Завантажую глобус...</Text>
          </View>
        )}
        androidLayerType="hardware"
        bounces={false}
        scrollEnabled={false}
        overScrollMode="never"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadTxt: { marginTop: 12, color: '#666' },
});