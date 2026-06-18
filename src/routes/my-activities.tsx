import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { Calendar, MapPin, Users, CalendarX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/my-activities")({
  head: () => ({
    meta: [
      { title: "My Activities — CampusLink" },
      { name: "description", content: "View and manage the activities you've joined." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyActivitiesPage,
});

type Activity = Tables<"activities">;

interface Joined {
  activity: Activity;
  count: number;
}

function MyActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Joined[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data: regs } = await supabase
      .from("registrations")
      .select("activity_id")
      .eq("user_id", user!.id);
    const ids = (regs ?? []).map((r) => r.activity_id);
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: acts } = await supabase
      .from("activities")
      .select("*")
      .in("id", ids)
      .order("activity_date", { ascending: true });
    const { data: allRegs } = await supabase
      .from("registrations")
      .select("activity_id")
      .in("activity_id", ids);
    const counts: Record<string, number> = {};
    allRegs?.forEach((r) => { counts[r.activity_id] = (counts[r.activity_id] ?? 0) + 1; });
    setItems((acts ?? []).map((a) => ({ activity: a, count: counts[a.id] ?? 0 })));
    setLoading(false);
  }

  async function cancel(activityId: string) {
    setBusy(activityId);
    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("activity_id", activityId)
      .eq("user_id", user!.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Participation cancelled");
    load();
  }

  const { upcoming, past } = useMemo(() => {
    const up: Joined[] = [], ps: Joined[] = [];
    items.forEach((i) => (isPast(new Date(i.activity.activity_date)) ? ps : up).push(i));
    return { upcoming: up, past: ps };
  }, [items]);

  if (authLoading || !user) {
    return <div className="container mx-auto px-4 py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">My activities</h1>
        <p className="text-muted-foreground">Activities you've signed up for.</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <CalendarX className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-display text-lg font-semibold">No activities yet</p>
            <p className="text-sm text-muted-foreground">Browse and join one to see it here.</p>
            <Link to="/" className="mt-4 inline-block">
              <Button>Browse activities</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          <Section title="Upcoming" items={upcoming} busy={busy} onCancel={cancel} canCancel />
          {past.length > 0 && (
            <Section title="Past" items={past} busy={busy} onCancel={cancel} canCancel={false} />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title, items, busy, onCancel, canCancel,
}: {
  title: string;
  items: Joined[];
  busy: string | null;
  onCancel: (id: string) => void;
  canCancel: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="font-display mb-4 text-xl font-semibold">{title} ({items.length})</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ activity: a, count }) => {
          const full = count >= a.max_participants;
          const pct = Math.min(100, (count / a.max_participants) * 100);
          const past = isPast(new Date(a.activity_date));
          return (
            <Card key={a.id} className="bg-gradient-card">
              <CardHeader className="pb-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-ocean-light">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(a.activity_date), "EEE, MMM d · h:mm a")}
                  </span>
                  <Badge variant={past ? "secondary" : full ? "destructive" : "default"} className="text-[10px]">
                    {past ? "Past" : full ? "Full" : "Confirmed"}
                  </Badge>
                </div>
                <CardTitle className="font-display text-lg leading-snug">{a.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-3">
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <MapPin className="h-4 w-4 text-ocean-light" />{a.location}
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{count} / {a.max_participants}</span>
                    <span>{Math.max(0, a.max_participants - count)} seats left</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-gradient-to-r from-ocean-mid to-ocean-foam" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </CardContent>
              {canCancel && (
                <CardFooter>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full" disabled={busy === a.id}>
                        {busy === a.id ? "..." : "Cancel participation"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel participation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You'll lose your spot in "{a.title}". You can re-join later if seats are still available.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep my spot</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onCancel(a.id)}>Cancel participation</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
