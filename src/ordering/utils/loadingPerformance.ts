// src/ordering/utils/loadingPerformance.ts

interface LoadingMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
}

class LoadingPerformanceMonitor {
  private static instance: LoadingPerformanceMonitor;
  private metrics: Map<string, LoadingMetric> = new Map();
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  public static getInstance(): LoadingPerformanceMonitor {
    if (!LoadingPerformanceMonitor.instance) {
      LoadingPerformanceMonitor.instance = new LoadingPerformanceMonitor();
    }
    return LoadingPerformanceMonitor.instance;
  }

  public startTiming(operationId: string, operation: string): void {
    if (!this.isEnabled) return;
    
    this.metrics.set(operationId, {
      operation,
      startTime: performance.now()
    });
    
    console.debug(`🚀 [Performance] Started: ${operation}`);
  }

  public endTiming(operationId: string, success: boolean = true, error?: string): void {
    if (!this.isEnabled) return;
    
    const metric = this.metrics.get(operationId);
    if (!metric) return;

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.success = success;
    metric.error = error;

    const status = success ? '✅' : '❌';
    const message = `${status} [Performance] ${metric.operation}: ${duration.toFixed(2)}ms`;
    
    if (success) {
      if (duration > 2000) {
        console.warn(`⚠️ ${message} (SLOW)`);
      } else if (duration > 1000) {
        console.warn(`⚡ ${message} (OK)`);
      } else {
        console.debug(`⚡ ${message} (FAST)`);
      }
    } else {
      console.error(`${message} - Error: ${error}`);
    }
  }

  public getMetrics(): LoadingMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.endTime !== undefined);
  }

  public getSlowOperations(threshold: number = 1000): LoadingMetric[] {
    return this.getMetrics().filter(m => m.duration && m.duration > threshold);
  }

  public printSummary(): void {
    if (!this.isEnabled) return;
    
    const completed = this.getMetrics();
    const slow = this.getSlowOperations();
    
    console.group('📊 Loading Performance Summary');
    console.log(`Total operations: ${completed.length}`);
    console.log(`Slow operations (>1s): ${slow.length}`);
    
    if (slow.length > 0) {
      console.warn('Slow operations:', slow.map(m => `${m.operation}: ${m.duration?.toFixed(2)}ms`));
    }
    
    const avgDuration = completed.reduce((sum, m) => sum + (m.duration || 0), 0) / completed.length;
    console.log(`Average duration: ${avgDuration.toFixed(2)}ms`);
    console.groupEnd();
  }

  public clear(): void {
    this.metrics.clear();
  }
}

// Export singleton instance
export const performanceMonitor = LoadingPerformanceMonitor.getInstance();

// Helper functions for easy use
export const startTiming = (operationId: string, operation: string) => {
  performanceMonitor.startTiming(operationId, operation);
};

export const endTiming = (operationId: string, success: boolean = true, error?: string) => {
  performanceMonitor.endTiming(operationId, success, error);
};

export const printPerformanceSummary = () => {
  performanceMonitor.printSummary();
}; 