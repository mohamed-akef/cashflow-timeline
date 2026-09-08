import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';
import { usePlanStore } from '../store/planStore';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * React 19 still requires a class component for componentDidCatch/getDerivedStateFromError.
 * Class components cannot call hooks, so the locale and store are read imperatively.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  onClear = () => {
    usePlanStore.getState().clearAll();
    this.setState({ failed: false });
  };

  render() {
    if (this.state.failed) {
      const locale = usePlanStore.getState().plan.settings.locale;
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
          <div className="w-full max-w-md space-y-3 rounded-lg bg-surface p-6 text-center shadow-xl">
            <h1 className="text-xl font-semibold">{t(locale, 'errorTitle')}</h1>
            <p className="text-sm text-ink-muted">{t(locale, 'errorBody')}</p>
            <button
              type="button"
              className="rounded bg-accent px-4 py-1.5 text-on-accent hover:bg-accent-hover"
              onClick={this.onClear}
            >
              {t(locale, 'clearAll')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
