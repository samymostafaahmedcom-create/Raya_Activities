import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/participants")({
  component: ParticipantsPage,
});

type Activity = Tables<"activities">;
type Registration = Tables<"registrations">;

function ParticipantsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [filter, setFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: acts }, { data: rs }] = await Promise.all([
        supabase.from("activities").select("*").order("activity_date", { ascending: true }),
        supabase.from("registrations").select("*").order("created_at", { ascending: false }),
      ]);
      setActivities(acts ?? []);
      setRegs(rs ?? []);
      setLoading(false);
    })();
  }, []);

  const activityById = useMemo(() => {
    const m: Record<string, Activity> = {};
    activities.forEach((a) => { m[a.id] = a; });
    return m;
  }, [activities]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return regs.filter((r) => {
      if (activityFilter !== "all" && r.activity_id !== activityFilter) return false;
      if (!q) return true;
      return (
        r.user_email.toLowerCase().includes(q) ||
        (r.user_name?.toLowerCase().includes(q) ?? false) ||
        (activityById[r.activity_id]?.title.toLowerCase().includes(q) ?? false)
      );
    });
  }, [regs, filter, activityFilter, activityById]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Participants</h1>
        <p className="text-muted-foreground">All registrations across activities.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> {filtered.length} registration{filtered.length === 1 ? "" : "s"}
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All activities</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search name, email, activity..."
                className="pl-8 sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No participants match.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const a = activityById[r.activity_id];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.user_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.user_email}</TableCell>
                      <TableCell>
                        {a ? <Badge variant="secondary" className="font-normal">{a.title}</Badge> : <span className="text-muted-foreground">Unknown</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(r.created_at), "PP")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
