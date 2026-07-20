import { lazy, Suspense } from 'react';
import { AvailabilityLoading, ServiceStatusPage } from './components/ServiceStatusPage';
import { useServiceAvailability } from './hooks/useServiceAvailability';

const LiveApp = lazy(() => import('./LiveApp'));

export default function RootApp() {
  const { status, retry } = useServiceAvailability();

  if (status === 'checking') {
    return <AvailabilityLoading />;
  }

  if (status === 'unavailable') {
    return <ServiceStatusPage onRetry={() => void retry()} />;
  }

  return (
    <Suspense fallback={<AvailabilityLoading />}>
      <LiveApp />
    </Suspense>
  );
}
