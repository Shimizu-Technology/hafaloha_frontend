import { Component, lazy, Suspense, type ReactNode } from 'react';
import {
  AvailabilityLoading,
  LiveAppLoadErrorPage,
  ServiceStatusPage
} from './components/ServiceStatusPage';
import { useServiceAvailability } from './hooks/useServiceAvailability';

const LiveApp = lazy(() => import('./LiveApp'));

interface LiveAppErrorBoundaryProps {
  children: ReactNode;
}

interface LiveAppErrorBoundaryState {
  hasError: boolean;
}

class LiveAppErrorBoundary extends Component<
  LiveAppErrorBoundaryProps,
  LiveAppErrorBoundaryState
> {
  state: LiveAppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LiveAppErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <LiveAppLoadErrorPage onReload={() => window.location.reload()} />;
    }

    return this.props.children;
  }
}

export default function RootApp() {
  const { status, retry } = useServiceAvailability();

  if (status === 'checking') {
    return <AvailabilityLoading />;
  }

  if (status === 'unavailable') {
    return <ServiceStatusPage onRetry={() => void retry()} />;
  }

  return (
    <LiveAppErrorBoundary>
      <Suspense fallback={<AvailabilityLoading />}>
        <LiveApp />
      </Suspense>
    </LiveAppErrorBoundary>
  );
}
