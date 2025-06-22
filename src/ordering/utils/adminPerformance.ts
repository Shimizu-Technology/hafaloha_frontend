// src/ordering/utils/adminPerformance.ts

interface AdminPerformanceMetric {
  componentName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
  tabName?: string;
}

class AdminPerformanceMonitor {
  private static instance: AdminPerformanceMonitor;
  private metrics: Map<string, AdminPerformanceMetric> = new Map();
  private isEnabled: boolean = true; // Always enabled for admin performance tracking

  public static getInstance(): AdminPerformanceMonitor {
    if (!AdminPerformanceMonitor.instance) {
      AdminPerformanceMonitor.instance = new AdminPerformanceMonitor();
    }
    return AdminPerformanceMonitor.instance;
  }

  public startComponentLoad(componentName: string, tabName?: string): void {
    if (!this.isEnabled) return;
    
    const operationId = `${componentName}_${Date.now()}`;
    this.metrics.set(operationId, {
      componentName,
      tabName,
      startTime: performance.now()
    });
    
    console.debug(`🚀 [Admin Performance] Started loading: ${componentName}${tabName ? ` (${tabName} tab)` : ''}`);
  }

  public endComponentLoad(componentName: string, success: boolean = true, error?: string): void {
    if (!this.isEnabled) return;
    
    // Find the most recent metric for this component
    const entries = Array.from(this.metrics.entries());
    const entry = entries
      .filter(([_, metric]) => metric.componentName === componentName && !metric.endTime)
      .pop();
    
    if (!entry) return;

    const [operationId, metric] = entry;
    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.success = success;
    metric.error = error;

    const status = success ? '✅' : '❌';
    const message = `${status} [Admin Performance] ${metric.componentName}: ${duration.toFixed(2)}ms`;
    
    if (success) {
      if (duration > 3000) {
        console.warn(`🐌 ${message} (VERY SLOW - Consider optimization)`);
      } else if (duration > 1500) {
        console.warn(`⚠️ ${message} (SLOW)`);
      } else if (duration > 800) {
        console.log(`⚡ ${message} (OK)`);
      } else {
        console.debug(`⚡ ${message} (FAST)`);
      }
    } else {
      console.error(`${message} - Error: ${error}`);
    }
  }

  public getComponentMetrics(componentName?: string): AdminPerformanceMetric[] {
    const completed = Array.from(this.metrics.values()).filter(m => m.endTime !== undefined);
    if (componentName) {
      return completed.filter(m => m.componentName === componentName);
    }
    return completed;
  }

  public getSlowComponents(threshold: number = 1500): AdminPerformanceMetric[] {
    return this.getComponentMetrics().filter(m => m.duration && m.duration > threshold);
  }

  public printAdminSummary(): void {
    if (!this.isEnabled) return;
    
    const completed = this.getComponentMetrics();
    const slow = this.getSlowComponents();
    
    console.group('📊 Admin Performance Summary');
    console.log(`Total admin component loads: ${completed.length}`);
    console.log(`Slow components (>1.5s): ${slow.length}`);
    
    if (slow.length > 0) {
      console.warn('Slow admin components:', slow.map(m => 
        `${m.componentName}${m.tabName ? ` (${m.tabName})` : ''}: ${m.duration?.toFixed(2)}ms`
      ));
    }
    
    // Group by component for averages
    const componentAverages = completed.reduce((acc, m) => {
      if (!acc[m.componentName]) {
        acc[m.componentName] = [];
      }
      acc[m.componentName].push(m.duration || 0);
      return acc;
    }, {} as Record<string, number[]>);
    
    console.log('Average load times by component:');
    Object.entries(componentAverages).forEach(([component, durations]) => {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      console.log(`  ${component}: ${avg.toFixed(2)}ms (${durations.length} loads)`);
    });
    
    console.groupEnd();
  }

  public clear(): void {
    this.metrics.clear();
  }

  // Track tab switches for performance insights
  public trackTabSwitch(fromTab: string, toTab: string): void {
    const switchTime = performance.now();
    console.debug(`🔄 [Admin Performance] Tab switch: ${fromTab} → ${toTab} at ${switchTime.toFixed(2)}ms`);
  }

  // Track bundle loading
  public trackBundleLoad(bundleName: string, size?: number): void {
    console.debug(`📦 [Admin Performance] Bundle loaded: ${bundleName}${size ? ` (${(size / 1024).toFixed(1)}KB)` : ''}`);
  }
}

// Export singleton instance
export const adminPerformanceMonitor = AdminPerformanceMonitor.getInstance();

// Helper functions for easy use
export const startAdminComponentLoad = (componentName: string, tabName?: string) => {
  adminPerformanceMonitor.startComponentLoad(componentName, tabName);
};

export const endAdminComponentLoad = (componentName: string, success: boolean = true, error?: string) => {
  adminPerformanceMonitor.endComponentLoad(componentName, success, error);
};

export const printAdminPerformanceSummary = () => {
  adminPerformanceMonitor.printAdminSummary();
};

export const trackAdminTabSwitch = (fromTab: string, toTab: string) => {
  adminPerformanceMonitor.trackTabSwitch(fromTab, toTab);
};

export const trackAdminBundleLoad = (bundleName: string, size?: number) => {
  adminPerformanceMonitor.trackBundleLoad(bundleName, size);
}; 