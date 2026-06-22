import MainMenu from './screens/MainMenu.js';
import LevelSelect from './screens/LevelSelect.js';
import GameScreen from './screens/GameScreen.js';

import GalaxySelect from './screens/GalaxySelect.js';

import Settings from './screens/Settings.js';

class App {
  constructor() {
    this.container = document.getElementById('app');
    this.current = null;
    this.navigate('main-menu');
  }

  navigate(screen, data = {}) {
    if (this.current) this.current.destroy();
    switch (screen) {
      case 'main-menu':  this.current = new MainMenu(this.container, this.navigate.bind(this)); break;
      case 'galaxy-select': this.current = new GalaxySelect(this.container, this.navigate.bind(this)); break;
      case 'level-select': this.current = new LevelSelect(this.container, this.navigate.bind(this), data); break;
      case 'game':       this.current = new GameScreen(this.container, this.navigate.bind(this), data); break;
      case 'settings':   this.current = new Settings(this.container, this.navigate.bind(this)); break;
    }
  }
}

new App();
