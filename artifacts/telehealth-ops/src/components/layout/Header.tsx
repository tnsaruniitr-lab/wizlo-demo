import { Button } from "@/components/ui/button";
import { Activity, Database, Zap } from "lucide-react";
import { useSeedMockData, useRunExceptionScan } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function Header() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const seedMutation = useSeedMockData({
    mutation: {
      onSuccess: () => {
        toast({ title: "Mock data seeded successfully" });
        queryClient.invalidateQueries();
      },
      onError: () => {
        toast({ title: "Failed to seed data", variant: "destructive" });
      },
    },
  });

  const scanMutation = useRunExceptionScan({
    mutation: {
      onSuccess: (data) => {
        toast({ 
          title: "Scan Complete", 
          description: `Found ${data.exceptions_created} new exceptions.`
        });
        queryClient.invalidateQueries();
      },
      onError: () => {
        toast({ title: "Scan failed", variant: "destructive" });
      },
    },
  });

  return (
    <header className="border-b border-border bg-card">
      <div className="flex h-16 items-center px-6 gap-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Activity className="h-5 w-5 text-primary" />
          <span>TelehealthOps</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedMutation.mutate({})}
            disabled={seedMutation.isPending}
            data-testid="button-seed-data"
          >
            <Database className="mr-2 h-4 w-4" />
            Seed Demo Data
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => scanMutation.mutate({})}
            disabled={scanMutation.isPending}
            data-testid="button-run-scan"
          >
            <Zap className="mr-2 h-4 w-4" />
            Run Exception Scan
          </Button>
        </div>
      </div>
    </header>
  );
}
