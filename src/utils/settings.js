const THEMES = {
  blue: {
    bg: '#080c1f',
    bgGradEnd: 'rgba(8,12,31,0)',
    bgGradStart: 'rgba(16,24,72,0.15)',
    primary: '200,220,255',
    highlight: '79,195,247',
    starBase: 'rgba(200,220,255,', // expects opacity appended
    name: 'Blue'
  },
  purple: {
    bg: '#14081f',
    bgGradEnd: 'rgba(20,8,31,0)',
    bgGradStart: 'rgba(48,16,72,0.15)',
    primary: '230,200,255',
    highlight: '210,79,247',
    starBase: 'rgba(230,200,255,',
    name: 'Purple'
  },
  green: {
    bg: '#081f14',
    bgGradEnd: 'rgba(8,31,20,0)',
    bgGradStart: 'rgba(16,72,48,0.15)',
    primary: '200,255,220',
    highlight: '79,247,195',
    starBase: 'rgba(200,255,220,',
    name: 'Green'
  }
};

const THEME_KEYS = Object.keys(THEMES);

class SettingsManager {
  constructor() {
    this.load();
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem('sg-settings') || '{}');
      this.soundEnabled = data.soundEnabled !== undefined ? data.soundEnabled : true;
      this.themeKey = data.theme || 'blue';
    } catch {
      this.soundEnabled = true;
      this.themeKey = 'blue';
    }
  }

  save() {
    try {
      localStorage.setItem('sg-settings', JSON.stringify({
        soundEnabled: this.soundEnabled,
        theme: this.themeKey
      }));
    } catch {}
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.save();
  }

  cycleTheme() {
    const idx = THEME_KEYS.indexOf(this.themeKey);
    this.themeKey = THEME_KEYS[(idx + 1) % THEME_KEYS.length];
    this.save();
  }

  getTheme() {
    return THEMES[this.themeKey] || THEMES.blue;
  }
}

export const settings = new SettingsManager();
