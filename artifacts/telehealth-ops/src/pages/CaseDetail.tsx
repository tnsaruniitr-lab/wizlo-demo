import { useParams, Link } from "wouter";
import { useGetCase, getGetCaseQueryKey, useAnalyzeCase, useGenerateAction, useSendAction, useResolveException } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, Send, CheckCircle2, Clock, AlertTriangle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimeStuck, formatStatus, getProgramColor, getSeverityColor } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CaseDetail() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: caseData, isLoading } = useGetCase(id, {
    query: { enabled: !!id, queryKey: getGetCaseQueryKey(id) }
  });

  const analyzeMutation = useAnalyzeCase({
    mutation: {
      onSuccess: () => {
        toast({ title: "Analysis complete" });
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(id) });
      },
      onSettled: () => setAnalyzing(false)
    }
  });

  const generateMutation = useGenerateAction({
    mutation: {
      onSuccess: () => {
        toast({ title: "Action drafted" });
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(id) });
      },
      onSettled: () => setGenerating(false)
    }
  });

  const sendMutation = useSendAction({
    mutation: {
      onSuccess: () => {
        toast({ title: "Action sent successfully" });
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(id) });
      }
    }
  });

  const resolveMutation = useResolveException({
    mutation: {
      onSuccess: () => {
        toast({ title: "Exception resolved" });
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(id) });
      }
    }
  });

  if (isLoading || !caseData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="p-6"><Skeleton className="h-64 w-full" /></div>
      </div>
    );
  }

  const handleAnalyze = () => {
    setAnalyzing(true);
    analyzeMutation.mutate({ id });
  };

  const handleGenerate = () => {
    setGenerating(true);
    generateMutation.mutate({ id, data: { action_type: "SEND_MESSAGE", target: "PATIENT" } });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Case {id.slice(0,8)}</h1>
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${getProgramColor(caseData.program_type)}`}>
              {caseData.program_type}
            </div>
            <div className="bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full text-xs font-medium border">
              {formatStatus(caseData.current_status)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Patient Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-semibold text-lg">{caseData.patient.first_name} {caseData.patient.last_name}</div>
                <div className="text-sm text-muted-foreground mt-1">{caseData.patient.email}</div>
                <div className="text-sm text-muted-foreground">{caseData.patient.phone}</div>
                <div className="text-sm text-muted-foreground mt-2">State: {caseData.patient.state}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Case Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time Stuck</span>
                    <span className="font-medium flex items-center gap-1"><Clock className="h-3 w-3"/>{formatTimeStuck(caseData.created_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Priority</span>
                    <span className="font-medium">{caseData.priority}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Assigned Provider</span>
                    <span className="font-medium">{caseData.assigned_provider || 'Unassigned'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-lg">Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {caseData.events?.map((event) => (
                  <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow-sm">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-sm">{formatStatus(event.event_type)}</div>
                        <time className="font-mono text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</time>
                      </div>
                      {event.payload && (
                        <pre className="text-xs bg-muted/50 p-2 rounded mt-2 overflow-x-auto text-muted-foreground">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Actions & Exceptions */}
        <div className="flex flex-col gap-6">
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" /> Ops Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-4">
              <Button 
                className="w-full justify-start" 
                onClick={handleAnalyze} 
                disabled={analyzing}
                data-testid="btn-analyze"
              >
                <Brain className="mr-2 h-4 w-4" /> {analyzing ? "Running Analysis..." : "1. Run AI Analysis"}
              </Button>
              
              {caseData.latest_ai_summary && (
                <div className="bg-muted p-3 rounded-md text-sm flex flex-col gap-2 border border-border">
                  <p className="font-medium text-primary">AI Insight</p>
                  <p>{caseData.latest_ai_summary.summary}</p>
                  <p className="text-xs text-muted-foreground">Risk Level: {caseData.latest_ai_summary.risk_level}</p>
                </div>
              )}

              <Button 
                variant="secondary" 
                className="w-full justify-start" 
                onClick={handleGenerate} 
                disabled={generating || !caseData.latest_ai_summary}
                data-testid="btn-generate"
              >
                <MessageSquare className="mr-2 h-4 w-4" /> {generating ? "Drafting..." : "2. Draft Action Message"}
              </Button>

              {caseData.actions?.filter(a => a.status === 'draft').map(action => (
                <div key={action.id} className="bg-background border border-border p-3 rounded-md text-sm flex flex-col gap-3">
                  <p className="font-medium">Draft Message to {action.target}</p>
                  <div className="p-2 bg-muted/50 rounded text-muted-foreground italic">
                    "{action.message}"
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => sendMutation.mutate({ id: action.id })}
                    disabled={sendMutation.isPending}
                    data-testid="btn-send"
                  >
                    <Send className="mr-2 h-3 w-3" /> Send Message
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Open Exceptions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {caseData.open_exceptions?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open exceptions.</p>
              ) : (
                caseData.open_exceptions?.map(exc => (
                  <div key={exc.id} className={`p-3 rounded-md border flex flex-col gap-2 ${getSeverityColor(exc.severity)}`}>
                    <div className="font-bold text-sm">{exc.exception_type}</div>
                    <div className="text-sm">{exc.reason}</div>
                    <div className="text-xs opacity-80">Recommended: {exc.recommended_action}</div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 bg-background/50 hover:bg-background"
                      onClick={() => resolveMutation.mutate({ id: exc.id })}
                      disabled={resolveMutation.isPending}
                      data-testid={`btn-resolve-${exc.id}`}
                    >
                      <CheckCircle2 className="mr-2 h-3 w-3" /> Mark Resolved
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
