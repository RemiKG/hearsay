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
      const dec = decodeInput(route.slice('#/share/'.length));
      if (dec?.story) { trial.start({ story: dec.story, mode: (dec.mode as any) || 'type', absentName: dec.absentName }); nav('#/trial'); }
      else nav('#/');
    }
  }, [route]); // eslint-disable-line

  const caseName = (route.startsWith('#/trial') || route.startsWith('#/proof') || route.startsWith('#/case')) ? (trial.state.title || undefined) : undefined;

  let screen: React.ReactNode;
  if (route.startsWith('#/trial')) screen = <TrialScreen trial={trial} engine={engine} nav={nav} />;
  else if (route.startsWith('#/proof')) screen = <Proof trial={trial} engine={engine} nav={nav} />;
  else if (route.startsWith('#/chambers')) screen = <Chambers engine={engine} nav={nav} />;
  else if (route.startsWith('#/docket')) screen = <Docket trial={trial} nav={nav} />;
  else if (route.startsWith('#/numbers')) screen = <Numbers engine={engine} nav={nav} />;
  else if (route.startsWith('#/case/')) screen = <TrialScreen trial={trial} engine={engine} nav={nav} openCaseId={route.slice('#/case/'.length)} />;
  else screen = <Intake trial={trial} engine={engine} nav={nav} />;

  return (
    <div className="app">
      <div className="paper-bg" />
      <PaperDefs />
      <Topbar route={route} caseName={caseName} onNav={nav} />
      <main className="wrap">{screen}</main>
      {engine && !engine.live && <EngineBanner engine={engine} />}
    </div>
  );
}

function EngineBanner({ engine }: { engine: EngineInfo }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 40,
      background: 'var(--paper-hi)', borderRadius: 999, padding: '8px 16px', boxShadow: '0 3px 12px rgba(42,36,32,0.18)',
      display: 'flex', gap: 10, alignItems: 'center', maxWidth: 'min(94vw, 680px)' }}>
      <span className="edge" style={{ borderRadius: 999, borderColor: 'var(--ochre-deep)', opacity: 0.55 }} />
      <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--ochre)', flex: 'none' }} />
      <span className="ui" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
        <b>Demo engine.</b> Arguments &amp; votes are illustrative — the Bench, the record, the impartiality checks &amp; every number are real. Set <span className="mono">DASHSCOPE_API_KEY</span> for the live Qwen society.
      </span>
      <span onClick={() => setOpen(false)} style={{ cursor: 'pointer', color: 'var(--ink-faint)', fontWeight: 700, flex: 'none' }}>×</span>
    </div>
  );
}
