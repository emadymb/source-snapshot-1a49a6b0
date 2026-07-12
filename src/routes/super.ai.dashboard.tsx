import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { AiScreen } from "@/components/ai/AiScreen";
import { KpiGrid, DataCard } from "@/components/screens/RichScreen";
import { MODEL_COSTS, type AiModelName } from "@/lib/mock/ai";
import { listUsage } from "@/lib/ai.functions";

export const Route = createFileRoute("/super/ai/dashboard")({ component: Page });

function Page() {
  const { data: usage = [] } = useQuery({ queryKey: ["ai", "usage"], queryFn: () => listUsage() });

  const today = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return usage.filter((u) => u.createdAt >= start.getTime());
  }, [usage]);

  const totalCost = usage.reduce((a, u) => a + u.cost, 0);
  const todayCost = today.reduce((a, u) => a + u.cost, 0);
  const ocrCount = usage.filter((u) => u.operation === "ocr").length;
  const chatCount = usage.filter((u) => u.operation === "chat").length;

  const perModel = useMemo(() => {
    const map = new Map<AiModelName, { calls: number; cost: number }>();
    for (const u of usage) {
      const cur = map.get(u.modelName) ?? { calls: 0, cost: 0 };
      cur.calls += 1; cur.cost += u.cost;
      map.set(u.modelName, cur);
    }
    return Array.from(map.entries()).map(([name, v]) => ({
      name: MODEL_COSTS[name].label,
      model: name,
      calls: v.calls,
      cost: Number(v.cost.toFixed(4)),
      color: MODEL_COSTS[name].color,
    }));
  }, [usage]);

  const daily = useMemo(() => {
    const days: { day: string; cost: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const end = d.getTime() + 24 * 60 * 60 * 1000;
      const c = usage.filter((u) => u.createdAt >= d.getTime() && u.createdAt < end).reduce((a, u) => a + u.cost, 0);
      days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), cost: Number(c.toFixed(4)) });
    }
    return days;
  }, [usage]);

  const kpis = [
    { label: "Total cost", value: `$${totalCost.toFixed(2)}` },
    { label: "Today", value: `$${todayCost.toFixed(4)}` },
    { label: "OCR calls", value: String(ocrCount) },
    { label: "Chat calls", value: String(chatCount) },
  ];

  return (
    <AiScreen title="AI Dashboard" description="Model spend, OCR volume, and cascade telemetry." icon={Brain}>
      <KpiGrid kpis={kpis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard title="Model distribution">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={perModel} dataKey="calls" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {perModel.map((p) => <Cell key={p.model} fill={p.color} />)}
                </Pie>
                <Tooltip formatter={(v: number | string) => `${v} calls`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        <DataCard title="Daily cost (7d)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v: number | string) => `$${v}`} />
                <Bar dataKey="cost" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
      </div>

      <DataCard title="Per-model breakdown">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2 text-start">Model</th>
              <th className="p-2 text-start">Calls</th>
              <th className="p-2 text-start">Cost</th>
              <th className="p-2 text-start">Avg / call</th>
            </tr>
          </thead>
          <tbody>
            {perModel.map((p) => (
              <tr key={p.model} className="border-t border-glass-border">
                <td className="p-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                </td>
                <td className="p-2">{p.calls}</td>
                <td className="p-2">${p.cost.toFixed(4)}</td>
                <td className="p-2">${(p.cost / Math.max(1, p.calls)).toFixed(5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataCard>
    </AiScreen>
  );
}
