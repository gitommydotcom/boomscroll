import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { loadState } from './lib/store';
import './styles/app.css';

registerSW({ immediate: true });

loadState().then(() => render(<App />, document.getElementById('app')!));
