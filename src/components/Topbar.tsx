import { Logomark } from '../art/Sketch';

const NAV: Array<[string, string]> = [['Steps', '#/'], ['Docket', '#/docket'], ['Chambers', '#/chambers']];

export function Topbar({ route, caseName, onNav }: { route: string; caseName?: string; onNav: (hash: string) => void }) {
  const active = (hash: string) => {
    if (hash === '#/') return route === '#/' || route.startsWith('#/trial') || route.startsWith('#/proof') || route.startsWith('#/numbers') || route.startsWith('#/case');
    return route.startsWith(hash);
  };
  return (
    <div className="topbar">
      <div className="brand" onClick={() => onNav('#/')}>
        <Logomark width={34} />
        <span className="name">Hearsay</span>
      </div>
      {caseName && <div className="case">{caseName}</div>}
      <nav className="nav">
        {NAV.map(([label, hash]) => (
          <a key={hash} className={active(hash) ? 'active' : ''} onClick={() => onNav(hash)}>{label}</a>
        ))}
      </nav>
    </div>
  );
}
