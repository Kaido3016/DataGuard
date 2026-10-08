import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
}
interface State {
  readonly failed: boolean;
}

/** Last-resort guard so a rendering bug shows a message instead of a blank page. Nothing is logged. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fatal" role="alert">
        <h1>DataGuard</h1>
        <p lang="fr">Une erreur inattendue est survenue. Rechargez la page.</p>
        <p lang="en">An unexpected error occurred. Reload the page.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload / Recharger
        </button>
      </div>
    );
  }
}
