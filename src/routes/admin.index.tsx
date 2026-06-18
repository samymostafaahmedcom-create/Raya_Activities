import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Pencil, Trash2, Users, Calendar, MapPin, Images } from "lucide-react";
import { MediaManager } from "@/components/media-manager";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/")({
  component: ActivitiesAdminPage,
});

type Activity = Tables<"activities">;
type Registration = Tables<"registrations">;

const activitySchema = z.object({
  title: z.string().trim().min(1, "Title required").max(150),

  description: z.string().trim().max(2000).optional(),

  activity_date: z.string().min(1, "Date required"),

  location: z.string().trim().min(1, "Location required").max(200),

  category: z.string().trim().min(1, "Category required").max(100),

  image_url: z.string().optional(),

  featured: z.coerce.boolean().optional(),

  max_participants: z.coerce.number().int().min(1).max(10000),
});

function ActivitiesAdminPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Activity | null>(null);
  const [open, setOpen] = useState(false);
  const [mediaFor, setMediaFor] = useState<Activity | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: acts } = await supabase
      .from("activities")
      .select("*")
      .order("activity_date", { ascending: true });
    setActivities(acts ?? []);
    const { data: regs } = await supabase.from("registrations").select("activity_id");
    const map: Record<string, number> = {};
    regs?.forEach((r: Pick<Registration, "activity_id">) => {
      map[r.activity_id] = (map[r.activity_id] ?? 0) + 1;
    });
    setCounts(map);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = activitySchema.safeParse({
      title: fd.get("title"),
      description: fd.get("description"),
      activity_date: fd.get("activity_date"),
      location: fd.get("location"),
      category: fd.get("category"),
      image_url: fd.get("image_url"),
      featured: fd.get("featured"),
      max_participants: fd.get("max_participants"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const payload = {
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      activity_date: new Date(parsed.data.activity_date).toISOString(),
      location: parsed.data.location,
      category: parsed.data.category,
      image_url: parsed.data.image_url ?? "",
      featured: parsed.data.featured ?? false,
      max_participants: parsed.data.max_participants,
      created_by: user!.id,
    };
    if (editing) {
      const { error } = await supabase.from("activities").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Activity updated");
    } else {
      const { error } = await supabase.from("activities").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Activity created");
    }
    setOpen(false);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Activity deleted");
    load();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Activities</h1>
          <p className="text-muted-foreground">Create, edit and delete student activities.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New activity</Button>
          </DialogTrigger>
          <ActivityFormDialog editing={editing} onSubmit={handleSubmit} />
        </Dialog>
      </div>

      {activities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            No activities yet. Click <strong>New activity</strong> to add one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {activities.map((a) => {
            const count = counts[a.id] ?? 0;
            return (
              <Card key={a.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="font-display text-xl">{a.title}</CardTitle>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{format(new Date(a.activity_date), "PPp")}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{a.location}</span>
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{count} / {a.max_participants}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMediaFor(a)} title="Manage media">
                      <Images className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditing(a); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will also remove all {count} registration(s). This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(a.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                {a.description && (
                  <CardContent>
                    <p className="text-sm text-foreground/80">{a.description}</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {mediaFor && (
        <MediaManager
          activityId={mediaFor.id}
          activityTitle={mediaFor.title}
          open={!!mediaFor}
          onOpenChange={(o) => !o && setMediaFor(null)}
        />
      )}
    </div>
  );
}

function ActivityFormDialog({
  editing,
  onSubmit,
}: {
  editing: Activity | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const defaultDate = editing ? format(new Date(editing.activity_date), "yyyy-MM-dd'T'HH:mm") : "";
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit activity" : "New activity"}</DialogTitle>
        <DialogDescription>
          {editing ? "Update the details below." : "Fill in the details to create a new activity."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={editing?.title} maxLength={150} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={editing?.description} maxLength={2000} rows={3} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="activity_date">Date & time</Label>
            <Input id="activity_date" name="activity_date" type="datetime-local" defaultValue={defaultDate} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_participants">Max participants</Label>
            <Input id="max_participants" name="max_participants" type="number" min={1} max={10000} defaultValue={editing?.max_participants ?? 20} required />
          </div>
        </div>
        <div className="space-y-2">
  <Label htmlFor="category">Category</Label>

  <Input
    id="category"
    name="category"
    defaultValue={(editing as any)?.category}
    placeholder="Sports / Technology / Workshop"
    required
  />
</div>

<div className="space-y-2">
  <Label htmlFor="image_url">Activity Image URL</Label>

  <Input
    id="image_url"
    name="image_url"
    defaultValue={(editing as any)?.image_url}
    placeholder="https://example.com/image.jpg"
  />
</div>

<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="featured"
    name="featured"
    defaultChecked={(editing as any)?.featured}
  />

  <Label htmlFor="featured">Featured Activity</Label>
</div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={editing?.location} maxLength={200} required />
        </div>
        <DialogFooter>
          <Button type="submit">{editing ? "Save changes" : "Create activity"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
