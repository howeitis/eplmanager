/**
 * Public library entry. This file is what host applications import after
 * installing the package — it exposes <EPLManagerApp /> and a small set of
 * configuration helpers. Keep the public surface narrow on purpose so we can
 * refactor internals without breaking consumers.
 *
 * Standalone dev/preview still uses src/main.tsx — that path is unchanged.
 */

import { useEffect } from 'react';
import App from './App';
import { setAssetBasePath } from './data/assets';
import './index.css';

export interface EPLManagerAppProps {
  /**
   * Prefix prepended to every asset URL the game resolves at runtime
   * (club logos, flags, national team logos, brand logo, hero image).
   *
   * If your host site copies the contents of this package's `public/`
   * folder to e.g. `public/games/epl-manager/`, set this to
   * `'/games/epl-manager'`. Leave undefined / empty for asset-roots
   * mounted at the host's web root.
   *
   * No trailing slash. The empty string is the standalone default.
   */
  assetBasePath?: string;
}

/**
 * Drop-in component for embedding Premier League Manager inside a host
 * React app. Renders the full game inside its own `.plm-app-root` scope
 * so the Tailwind utilities (`plm-` prefix) and the package's CSS reset
 * never leak out.
 *
 * @example
 * import { EPLManagerApp } from '@howeitis/epl-manager';
 * import '@howeitis/epl-manager/style.css';
 *
 * function GamePage() {
 *   return <EPLManagerApp assetBasePath="/games/epl-manager" />;
 * }
 */
export function EPLManagerApp({ assetBasePath }: EPLManagerAppProps) {
  // Configure asset resolution once before the first card renders. useEffect
  // would be too late (cards render synchronously on first paint), so we set
  // this synchronously during render. setAssetBasePath is idempotent.
  if (assetBasePath !== undefined) {
    setAssetBasePath(assetBasePath);
  }

  // Cleanup: reset to standalone default when the host unmounts the game,
  // in case the host re-mounts with a different base path. Cheap, safe.
  useEffect(() => {
    return () => {
      if (assetBasePath !== undefined) setAssetBasePath('');
    };
  }, [assetBasePath]);

  return (
    <div className="plm-app-root">
      <App />
    </div>
  );
}

// Configuration helpers, re-exported so advanced consumers can do their own
// asset-resolution wiring without rendering the wrapper component.
export { setAssetBasePath, getAssetBasePath } from './data/assets';

export default EPLManagerApp;
