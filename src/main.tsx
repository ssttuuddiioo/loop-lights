import { render } from 'preact';
import { App } from './app';
import './theme/tokens.css';
import './theme/typography.css';
import './theme/global.css';
import './theme/m3-overrides.css';

render(<App />, document.getElementById('app')!);
