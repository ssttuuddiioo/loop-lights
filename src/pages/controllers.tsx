import { useState, useEffect, useCallback } from 'preact/hooks';
import type { HealthResponse, ControllerSummary } from '../api/health';
import { fetchControllerHealth, refreshControllerHealth } from '../api/health';
import { SummaryBar } from '../components/controllers/summary-bar';
import { ControllerCard } from '../components/controllers/controller-card';
import { ControllerDetail } from '../components/controllers/controller-detail';

export function ControllersPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const health = await fetchControllerHealth();
      setData(health);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const health = await refreshControllerHealth();
      setData(health);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Detail view for selected controller
  const selected: ControllerSummary | undefined =
    selectedIp ? data?.controllers.find(c => c.ip === selectedIp) : undefined;

  if (selected) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center',
        padding: '16px', height: '100%', overflow: 'auto',
      }}>
        <ControllerDetail controller={selected} onBack={() => setSelectedIp(null)} />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      padding: '16px', height: '100%', overflow: 'auto',
    }}>
      {error && !data && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 13, color: '#FF3333',
          textAlign: 'center', padding: 24,
        }}>
          Failed to load controller health: {error}
        </div>
      )}

      {data && (
        <>
          <SummaryBar data={data} onRefresh={handleRefresh} refreshing={refreshing} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 10,
          }}>
            {data.controllers.map(c => (
              <ControllerCard key={c.ip} controller={c} onSelect={setSelectedIp} />
            ))}
          </div>

          {data.controllers.length === 0 && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 13,
              color: 'var(--app-muted)', textAlign: 'center', padding: 40,
            }}>
              No controllers configured. Set DIMLY_CONTROLLERS in .env
            </div>
          )}
        </>
      )}

      {!data && !error && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 13,
          color: 'var(--app-muted)', textAlign: 'center', padding: 40,
        }}>
          Loading...
        </div>
      )}
    </div>
  );
}
