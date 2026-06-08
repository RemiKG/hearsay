import { useEffect, useState } from 'react';
import type { EngineInfo } from '@shared/types';
import { PaperDefs } from './art/Sketch';
import { Topbar } from './components/Topbar';
import { api } from './lib/api';
import { useTrial } from './state/trial';
import { decodeInput } from './lib/share';
import { Intake } from './screens/Intake';
import { TrialScreen } from './screens/Trial';
import { Proof } from './screens/Proof';
import { Chambers } from './screens/Chambers';
import { Docket } from './screens/Docket';
import { Numbers } from './screens/Numbers';

function useHashRoute(): string {
  const [route, setRoute] = useState(() => location.hash || '#/');
  useEffect(() => {
    const on = () => setRoute(location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function App() {
  const route = useHashRoute();
  const trial = useTrial();
  const [engine, setEngine] = useState<EngineInfo | null>(null);

  const nav = (hash: string) => { location.hash = hash; window.scrollTo({ top: 0 }); };

  useEffect(() => { api.engine().then(setEngine).catch(() => setEngine(null)); }, []);

  // deep-link: #/share/<encoded> pre-fills the intake and runs the same live engine
  useEffect(() => {
    if (route.startsWith('#/share/')) {
