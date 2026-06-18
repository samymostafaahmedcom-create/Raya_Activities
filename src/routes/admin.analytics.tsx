import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { Calendar, Users, TrendingUp, Activity as ActivityIcon, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

type Activity = Tables<"activities">;
type Registration = Tables<"registrations">;

function AnalyticsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: acts }, { data: rs }, { count: users }] = await Promise.all([
        supabase.from("activities").select("*"),
        supabase.from("registrations").select("*"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }),
      ]);
      setActivities(acts ?? []);
      setRegs(rs ?? []);
      setTotalUsers(users ?? 0);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = activities.filter((a) => new Date(a.activity_date).getTime() >= now).length;
    const totalSeats = activities.reduce((sum, a) => sum + a.max_participants, 0);
    const fillRate = totalSeats > 0 ? Math.round((regs.length / totalSeats) * 100) : 0;
    const uniqueStudents = new Set(regs.map((r) => r.user_id)).size;
    return {
      totalActivities: activities.length,
      upcoming,
      totalRegistrations: regs.length,
      uniqueStudents,
      fillRate,
    };
  }, [activities, regs]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    regs.forEach((r) => { counts[r.activity_id] = (counts[r.activity_id] ?? 0) + 1; });
    return activities
      .map((a) => ({
        name: a.title.length > 18 ? a.title.slice(0, 18) + "…" : a.title,
        registrations: counts[a.id] ?? 0,
        capacity: a.max_participants,
      }))
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 8);
  }, [activities, regs]);

  const trendData = useMemo(() => {
    const days = 14;
    const buckets: { date: string; label: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      buckets.push({ date: d.toISOString().slice(0, 10), label: format(d, "MMM d"), count: 0 });
    }
    const byDate = new Map(buckets.map((b) => [b.date, b]));
    regs.forEach((r) => {
      const key = startOfDay(new Date(r.created_at)).toISOString().slice(0, 10);
      const b = byDate.get(key);
      if (b) b.count += 1;
    });
    return buckets;
  }, [regs]);

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Overview of activities and engagement.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total users" value={totalUsers} icon={UserCheck} hint="registered accounts" />
        <StatCard label="Total activities" value={stats.totalActivities} icon={ActivityIcon} hint={`${stats.upcoming} upcoming`} />
        <StatCard label="Registrations" value={stats.totalRegistrations} icon={Calendar} hint="across all events" />
        <StatCard label="Unique students" value={stats.uniqueStudents} icon={Users} hint="distinct participants" />
        <StatCard label="Fill rate" value={`${stats.fillRate}%`} icon={TrendingUp} hint="seats taken" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Registration trend (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ count: { label: "Registrations", color: "hsl(var(--primary))" } }}
              className="h-[300px] w-full"
            >
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} fill="url(#fillCount)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Most popular activities</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ChartContainer
                config={{
                  registrations: { label: "Registrations", color: "hsl(var(--primary))" },
                  capacity: { label: "Capacity", color: "hsl(var(--muted-foreground))" },
                }}
                className="h-[300px] w-full"
              >
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="registrations" fill="var(--color-registrations)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="capacity" fill="var(--color-capacity)" radius={[6, 6, 0, 0]} opacity={0.25} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, hint,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-3xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}
