import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type ActivityMedia = Tables<"activity_media">;

interface MediaManagerProps {
  activityId: string;
  activityTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BUCKET = "activity-media";
const MAX_BYTES = 5 * 1024 * 1024;

export function MediaManager({ activityId, activityTitle, open, onOpenChange }: MediaManagerProps) {
  const [items, setItems] = useState<ActivityMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) load(); }, [open, activityId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("activity_media")
      .select("*")
      .eq("activity_id", activityId)
      .order("sort_order");
    setItems(data ?? []);
    setLoading(false);
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: not an image`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name}: max 5MB`);
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${activityId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });
        if (upErr) { toast.error(upErr.message); continue; }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const sort = (items[items.length - 1]?.sort_order ?? 0) + 1;
        const { error: insErr } = await supabase.from("activity_media").insert({
          activity_id: activityId,
          url: pub.publicUrl,
          storage_path: path,
          sort_order: sort,
        });
        if (insErr) {
          toast.error(insErr.message);
          await supabase.storage.from(BUCKET).remove([path]);
        }
      }
      toast.success("Images uploaded");
      load();
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(item: ActivityMedia) {
    const { error } = await supabase.from("activity_media").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    await supabase.storage.from(BUCKET).remove([item.storage_path]);
    toast.success("Image removed");
    load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Media — {activityTitle}</DialogTitle>
          <DialogDescription>
            Upload images for the gallery. The first image is used as the cover. Max 5MB per image.
          </DialogDescription>
        </DialogHeader>

        <div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="w-full gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Upload images"}
          </Button>
        </div>

        <div className="mt-2 max-h-[420px] overflow-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No images yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((m, i) => (
                <div key={m.id} className="group relative aspect-square overflow-hidden rounded-lg bg-secondary">
                  <img src={m.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete image"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
