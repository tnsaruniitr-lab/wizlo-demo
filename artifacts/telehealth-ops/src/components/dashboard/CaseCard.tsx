import { formatTimeStuck, formatStatus, getInitials, getProgramColor, getSeverityColor } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CaseWithDetails } from "@workspace/api-client-react";
import { Clock, AlertTriangle, Brain, MessageSquare, CheckCircle2 } from "lucide-react";
import { useAnalyzeCase, useGenerateAction, useResolveException } from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export function CaseCard({ data }: { data: CaseWithDetails }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  
  const analyzeMutation = useAnalyzeCase({
    mutation: {
      onSuccess: () => {
        toast({ title: "Analysis complete" });
        queryClient.invalidateQueries();
      },
      onSettled: () => setAnalyzing(false)
    }
  });

  const handleAnalyze = () => {
    setAnalyzing(true);
    analyzeMutation.mutate({ id: data.id });
  };

  const highestSeverityException = data.open_exceptions?.[0]; // Assuming sorted or just taking first

  return (
    <Card className="p-4 flex flex-col gap-4 bg-card hover:bg-accent/50 transition-colors border-border">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
              {getInitials(data.patient.first_name, data.patient.last_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-sm text-foreground">
              {data.patient.first_name} {data.patient.last_name}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {formatTimeStuck(data.created_at)}
            </div>
          </div>
        </div>
        <Badge variant="outline" className={`font-mono text-xs ${getProgramColor(data.program_type)}`}>
          {data.program_type}
        </Badge>
      </div>

      <div className="text-sm font-medium">{formatStatus(data.current_status)}</div>

      {highestSeverityException && (
        <div className={`p-2.5 rounded-md border text-xs flex gap-2 ${getSeverityColor(highestSeverityException.severity)}`}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{highestSeverityException.reason}</span>
        </div>
      )}

      {data.latest_ai_summary && (
        <div className="p-2.5 rounded-md border border-primary/20 bg-primary/5 text-xs flex flex-col gap-2">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Brain className="h-4 w-4" /> AI Summary
          </div>
          <p className="text-muted-foreground">{data.latest_ai_summary.summary}</p>
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs h-8"
          onClick={handleAnalyze}
          disabled={analyzing}
          data-testid={`button-analyze-${data.id}`}
        >
          <Brain className="h-3 w-3 mr-1.5" />
          {analyzing ? "Analyzing..." : "Analyze"}
        </Button>
        <Link href={`/cases/${data.id}`} className="flex-1">
          <Button variant="default" size="sm" className="w-full text-xs h-8" data-testid={`button-view-${data.id}`}>
            View Case
          </Button>
        </Link>
      </div>
    </Card>
  );
}
