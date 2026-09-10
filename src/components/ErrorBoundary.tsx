import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';
import { usePlanStore } from '../store/planStore';
import { useUiStore } from '../store/uiStore';
import { Button, Card, CardDescription, CardFooter, CardHeader, CardTitle } from './ui';

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
      const locale = useUiStore.getState().locale;
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle as="h1">{t(locale, 'errorTitle')}</CardTitle>
              <CardDescription>{t(locale, 'errorBody')}</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button variant="primary" onClick={this.onClear}>{t(locale, 'clearAll')}</Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
