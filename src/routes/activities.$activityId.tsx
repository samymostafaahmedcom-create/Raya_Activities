import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, MapPin, Users, ArrowLeft, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/activities/$activityId")({
  head: ({ params }) => ({
    meta: [
      { title: `Activity — CampusLink` },
      { name: "description", content: "Details, gallery and participants for this student activity." },
    ],
  }),
  component: ActivityDetailPage,
});

type Activity = Tables<"activities">;
type ActivityMedia = Tables<"activity_media">;

function ActivityDetailPage() {
  const { activityId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [media, setMedia] = useState<ActivityMedia[]>([]);
  const [count, setCount] = useState(0);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => { load(); }, [activityId, user]);

  async function load() {
    setLoading(true);
    const [{ data: act }, { data: m }, { data: regs }] = await Promise.all([
      supabase.from("activities").select("*").eq("id", activityId).maybeSingle(),
      supabase.from("activity_media").select("*").eq("activity_id", activityId).order("sort_order"),
      supabase.from("registrations").select("user_id").eq("activity_id", activityId),
    ]);
    setActivity(act);
    setMedia(m ?? []);
    setCount(regs?.length ?? 0);
    setJoined(!!regs?.some((r) => r.user_id === user?.id));
    setLoading(false);
  }

  async function join() {
    if (!user) return navigate({ to: "/auth" });
    if (!activity) return;
    setBusy(true);
    const { error } = await supabase.from("registrations").insert({
      activity_id: activity.id,
      user_id: user.id,
      user_email: user.email ?? "",
      user_name: (user.user_metadata?.full_name as string) ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("You're in!");
    load();
  }

  async function leave() {
    if (!user || !activity) return;
    setBusy(true);
    const { error } = await supabase.from("registrations").delete()
      .eq("activity_id", activity.id).eq("user_id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("You've left this activity");
    load();
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-40 lg:col-span-2" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Activity not found.</p>
        <Link to="/" className="mt-4 inline-block"><Button>Back to activities</Button></Link>
      </div>
    );
  }

  const cover = media[0]?.url;
  const full = count >= activity.max_participants;
  const seatsLeft = Math.max(0, activity.max_participants - count);
  const pct = Math.min(100, (count / activity.max_participants) * 100);
  const date = new Date(activity.activity_date);
  const isPast = date.getTime() < Date.now();

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[44vh] min-h-[280px] w-full overflow-hidden">
        {cover ? (
          <img src={cover} alt={activity.title} className="absolute inset-0 h-full w-full object-cover" loading="eager" />
        ) : (
          <div className="absolute inset-0 bg-gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="container relative z-10 mx-auto flex h-full flex-col justify-end px-4 pb-8">
          <Link to="/" className="mb-4 inline-flex w-fit items-center gap-1.5 text-sm text-white/90 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All activities
          </Link>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-accent text-accent-foreground"><Sparkles className="mr-1 h-3 w-3" />{isPast ? "Past event" : "Upcoming"}</Badge>
            {full && !isPast && <Badge variant="destructive">Full</Badge>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-5xl">{activity.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/90">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{format(date, "EEEE, MMMM d, yyyy")}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{format(date, "h:mm a")}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{activity.location}</span>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: description + gallery */}
          <div className="space-y-8 lg:col-span-2">
            <div>
              <h2 className="font-display mb-3 text-xl font-semibold">About this activity</h2>
              <p className="whitespace-pre-line leading-relaxed text-foreground/80">
                {activity.description || "No description provided yet."}
              </p>
            </div>

            {media.length > 0 && (
              <div>
                <h2 className="font-display mb-3 text-xl font-semibold">Gallery</h2>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {media.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setLightbox(m.url)}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-secondary"
                    >
                      <img
                        src={m.url}
                        alt={activity.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: stats + CTA */}
          <aside className="space-y-4">
            <Card className="bg-gradient-card">
              <CardContent className="space-y-5 p-6">
                <div>
                  <div className="flex items-end justify-between">
                    <span className="font-display text-3xl font-bold">{count}</span>
                    <span className="text-sm text-muted-foreground">of {activity.max_participants}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">participants</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-gradient-to-r from-ocean-mid to-ocean-foam transition-all"
                         style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {full ? "No seats left" : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} remaining`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t pt-4">
                  <Stat icon={Users} label="Joined" value={count} />
                  <Stat icon={Users} label="Capacity" value={activity.max_participants} />
                </div>

                {isPast ? (
                  <Button disabled className="w-full">This event has ended</Button>
                ) : !user ? (
                  <Link to="/auth" className="block"><Button className="w-full">Sign in to join</Button></Link>
                ) : joined ? (
                  <Button variant="outline" className="w-full" onClick={leave} disabled={busy}>
                    {busy ? "..." : "Leave activity"}
                  </Button>
                ) : (
                  <Button className="w-full" onClick={join} disabled={full || busy}>
                    {busy ? "..." : full ? "Activity full" : "Join activity"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="font-display text-base font-semibold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
