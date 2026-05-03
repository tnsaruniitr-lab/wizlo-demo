import { Header } from "@/components/layout/Header";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { CaseBoard } from "@/components/dashboard/CaseBoard";
import { useGetExceptionsByType, getGetExceptionsByTypeQueryKey } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ExceptionsChart() {
  const { data } = useGetExceptionsByType({
    query: { queryKey: getGetExceptionsByTypeQueryKey() }
  });

  if (!data) return null;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Exceptions By Type</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="exception_type" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              cursor={{fill: 'transparent'}}
              contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.severity === 'high' ? 'hsl(var(--destructive))' : entry.severity === 'medium' ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-2))'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
        <MetricCards />
        <ExceptionsChart />
        <div className="flex-1 overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-4 tracking-tight">Active Case Board</h2>
          <CaseBoard />
        </div>
      </main>
    </div>
  );
}
