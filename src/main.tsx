import { render } from 'preact';
import { App } from './app';
import { loadSafeZone } from './lib/safe-color';
import './theme/tokens.css';
import './theme/typography.css';
import './theme/global.css';
import './theme/m3-overrides.css';
import './theme/geist-controls.css';
import './theme/responsive.css';

// Apply saved theme before first paint to prevent flash
const savedTheme = localStorage.getItem('dimly-theme');
if (savedTheme === 'light') document.documentElement.dataset.theme = 'light';

// Fetch the calibrated glitch-zone once so the picker snap matches the server.
loadSafeZone();

render(<App />, document.getElementById('app')!);
