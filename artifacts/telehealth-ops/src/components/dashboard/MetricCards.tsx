import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDashboardMetrics, getGetDashboardMetricsQueryKey } from "@workspace/api-client-react";

export function MetricCards() {
  const { data: metrics, isLoading } = useGetDashboardMetrics({
    query: { queryKey: getGetDashboardMetricsQueryKey() }
  });

  if (isLoading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium"><Skeleton className="h-4 w-24" /></CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    { title: "Active Cases", value: metrics.active_cases },
    { title: "Open Exceptions", value: metrics.open_exceptions, alert: metrics.open_exceptions > 0 },
    { title: "High Severity", value: metrics.high_severity, danger: metrics.high_severity > 0 },
    { title: "Avg Time Stuck", value: `${metrics.avg_time_stuck_hours}h` },
    { title: "Payment Recovery", value: metrics.payment_recovery_queue },
    { title: "Provider SLA Breaches", value: metrics.provider_sla_breaches, danger: metrics.provider_sla_breaches > 0 },
    { title: "Pharmacy Delays", value: metrics.pharmacy_delays, alert: metrics.pharmacy_delays > 0 },
    { title: "Refill Risk Cases", value: metrics.refill_risk_cases },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i} className={card.danger ? "border-red-500/50 bg-red-500/5" : card.alert ? "border-amber-500/50 bg-amber-500/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.danger ? "text-red-500" : card.alert ? "text-amber-500" : ""}`}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
