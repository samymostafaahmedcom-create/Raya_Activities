import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Activities — Raya Activities" },
      {
        name: "description",
        content:
          "Explore upcoming student activities, events, and communities inside Raya Institute.",
      },
    ],
  }),
  component: ActivitiesPage,
});

type Activity = Tables<"activities">;

function ActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myRegs, setMyRegs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, [user]);

  async function load() {
    setLoading(true);

    const { data: acts, error } = await supabase
      .from("activities")
      .select("*")
      .order("activity_date", { ascending: true });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setActivities(acts ?? []);

    if (acts && acts.length) {
      const { data: regs } = await supabase
        .from("registrations")
        .select("activity_id, user_id");

      const map: Record<string, number> = {};
      const mine = new Set<string>();

      regs?.forEach((r) => {
        map[r.activity_id] = (map[r.activity_id] ?? 0) + 1;

        if (user && r.user_id === user.id) {
          mine.add(r.activity_id);
        }
      });

      setCounts(map);
      setMyRegs(mine);
    }

    setLoading(false);
  }

  async function join(activity: Activity) {
    if (!user) {
      toast.error("Please sign in to join activities");
      return;
    }

    setBusy(activity.id);

    const { error } = await supabase.from("registrations").insert({
      activity_id: activity.id,
      user_id: user.id,
      user_email: user.email ?? "",
      user_name: (user.user_metadata?.full_name as string) ?? null,
    });

    setBusy(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`You're in for "${activity.title}"!`);
    load();
  }

  async function leave(activity: Activity) {
    if (!user) return;

    setBusy(activity.id);

    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("activity_id", activity.id)
      .eq("user_id", user.id);

    setBusy(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("You've left the activity");
    load();
  }

  const upcoming = useMemo(() => {
  return activities
    .filter(
      (a) =>
        new Date(a.activity_date) >=
        new Date(Date.now() - 86400000)
    )
    .filter((a) =>
      a.title.toLowerCase().includes(search.toLowerCase())
    );
}, [activities, search]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(92,189,185,0.35),transparent_50%)]" />

        <div className="relative z-10 container mx-auto px-4 py-20 text-primary-foreground sm:py-28">
          <Badge className="mb-4 bg-accent/90 text-accent-foreground hover:bg-accent">
            <Sparkles className="mr-1 h-3 w-3" />
            Raya Student Community
          </Badge>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Discover Activities. Build Connections. Create Memories.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-primary-foreground/80">
            Join student activities, explore new experiences, connect with your
            community, and stay updated with everything happening inside Raya
            Institute.
          </p>

          {!authLoading && !user && (
            <div className="mt-8">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-3xl font-bold">50+</p>
              <p className="text-sm text-primary-foreground/70">
                Activities
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-3xl font-bold">1000+</p>
              <p className="text-sm text-primary-foreground/70">Students</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-3xl font-bold">15+</p>
              <p className="text-sm text-primary-foreground/70">
                Student Communities
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Activities */}
      <div className="container mx-auto px-4 pt-10">
  <input
    type="text"
    placeholder="Search activities..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full rounded-2xl border border-border bg-background px-5 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary"
  />
</div>
      <section className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">
              Upcoming Activities
            </h2>

            <p className="text-muted-foreground">
              {upcoming.length}{" "}
              {upcoming.length === 1 ? "event" : "events"} available now
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />

              <p className="mt-4 font-display text-lg font-semibold">
                No activities available
              </p>

              <p className="text-sm text-muted-foreground">
                New events and student activities will appear here soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((a) => {
              const count = counts[a.id] ?? 0;
              const full = count >= a.max_participants;
              const joined = myRegs.has(a.id);
              const pct = Math.min(
                100,
                (count / a.max_participants) * 100
              );

              return (
                <Card
                  key={a.id}
                  className="group overflow-hidden bg-gradient-card transition-all hover:-translate-y-1 hover:shadow-ocean"
                >
                  {(a as any).image_url && (
  <div className="aspect-video overflow-hidden">
    <img
      src={(a as any).image_url}
      alt={a.title}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
  </div>
)}
                  <CardHeader className="pb-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ocean-light">
                      <Calendar className="h-3.5 w-3.5" />

                      {format(
                        new Date(a.activity_date),
                        "EEE, MMM d · h:mm a"
                      )}
                    </div>

                    <Link
                      to="/activities/$activityId"
                      params={{ activityId: a.id }}
                      className="hover:underline"
                    >
                      <CardTitle className="font-display text-xl leading-snug">
                        {a.title}
                      </CardTitle>
                    </Link>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3">
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {a.description || "No description available"}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                      <MapPin className="h-4 w-4 text-ocean-light" />
                      {a.location}
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {count} / {a.max_participants} joined
                        </span>

                        {full && (
                          <span className="font-semibold text-destructive">
                            Full
                          </span>
                        )}
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-ocean-mid to-ocean-foam transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter>
                    {!user ? (
                      <Link to="/auth" className="w-full">
                        <Button className="w-full">
                          Sign in to join
                        </Button>
                      </Link>
                    ) : joined ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => leave(a)}
                        disabled={busy === a.id}
                      >
                        {busy === a.id ? "..." : "Leave Activity"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => join(a)}
                        disabled={full || busy === a.id}
                      >
                        {busy === a.id
                          ? "..."
                          : full
                          ? "Activity Full"
                          : "Join Activity"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}