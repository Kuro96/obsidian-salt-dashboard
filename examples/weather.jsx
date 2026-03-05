/* eslint-disable @typescript-eslint/no-var-requires */
/* global React */
const { useState, useEffect } = React;
const { Setting } = require('obsidian');

// --- Internationalization ---
// Minimal i18n implementation for single-file plugin
const resources = {
  en: {
    loading: 'Loading Weather...',
    wind: 'Wind',
    settings: {
      heading: 'Weather (Gist) Settings',
      lat: { name: 'Latitude', desc: 'e.g. 35.6895' },
      long: { name: 'Longitude', desc: 'e.g. 139.6917' },
    },
  },
  zh: {
    loading: '正在加载天气...',
    wind: '风速',
    settings: {
      heading: '天气 (Gist) 设置',
      lat: { name: '纬度', desc: '例如 35.6895' },
      long: { name: '经度', desc: '例如 139.6917' },
    },
  },
};

const getLocale = () => {
  // Try to get Obsidian's language setting from localStorage
  const saved = window.localStorage.getItem('language');
  // Or check moment if available
  const momentLang = window.moment ? window.moment.locale() : 'en';

  let lang = saved || momentLang || 'en';
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
};

const t = key => {
  const lang = getLocale();
  const keys = key.split('.');
  let val = resources[lang];
  for (const k of keys) {
    val = val?.[k];
  }
  return val || resources['en'][key] || key;
};

// --- Configuration ---
const DEFAULT_SETTINGS = {
  latitude: '35.6895',
  longitude: '139.6917',
  unit: 'celsius',
};

// --- Helper ---
const getWeatherIcon = code => {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  return '⛈️';
};

// --- Component ---
const WeatherCard = () => {
  const [data, setData] = useState(null);
  const config = DEFAULT_SETTINGS;

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${config.latitude}&longitude=${config.longitude}&current_weather=true&temperature_unit=${config.unit}`
    )
      .then(res => res.json())
      .then(json => setData(json.current_weather))
      .catch(err => console.error(err));
  }, []);

  // Inline Styles
  const styles = {
    container: {
      padding: '16px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      color: 'white',
      textAlign: 'center',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
    temp: { fontSize: '32px', fontWeight: 'bold', margin: '8px 0' },
    meta: { fontSize: '12px', opacity: 0.9 },
    icon: { fontSize: '48px', marginBottom: '8px' },
  };

  if (!data) return <div style={{ ...styles.container, background: '#ccc' }}>{t('loading')}</div>;

  return (
    <>
      <style>
        {`
          .module-id-weather-gist-card {
            padding: 0 !important;
            border: none !important;
            background: none !important;
            box-shadow: none !important;
          }
        `}
      </style>
      <div style={styles.container}>
        <div style={styles.icon}>{getWeatherIcon(data.weathercode)}</div>
        <div style={styles.temp}>
          {data.temperature}°{config.unit === 'celsius' ? 'C' : 'F'}
        </div>
        <div style={styles.meta}>
          {t('wind')}: {data.windspeed} km/h
        </div>
      </div>
    </>
  );
};

// --- Module Definition ---
module.exports = {
  id: 'weather-gist-card',
  title: 'Weather (Gist Plugin)',
  icon: 'sun',
  defaultSettings: {
    'weather-gist': DEFAULT_SETTINGS,
  },
  defaultLayout: {
    w: 4,
    h: 8,
    showTitle: false,
  },
  component: WeatherCard,
  renderSettings: (containerEl, plugin, settings) => {
    containerEl.createEl('h3', { text: t('settings.heading') });

    // Ensure config object exists
    if (!settings['weather-gist']) settings['weather-gist'] = { ...DEFAULT_SETTINGS };
    const config = settings['weather-gist'];

    new Setting(containerEl)
      .setName(t('settings.lat.name'))
      .setDesc(t('settings.lat.desc'))
      .addText(text =>
        text.setValue(config.latitude).onChange(async value => {
          config.latitude = value;
          await plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t('settings.long.name'))
      .setDesc(t('settings.long.desc'))
      .addText(text =>
        text.setValue(config.longitude).onChange(async value => {
          config.longitude = value;
          await plugin.saveSettings();
        })
      );
  },
};
