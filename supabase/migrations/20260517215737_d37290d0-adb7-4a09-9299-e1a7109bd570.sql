
-- Storage bucket for activity images
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-media', 'activity-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: public read, admin write/delete
CREATE POLICY "Public can view activity media"
ON storage.objects FOR SELECT
USING (bucket_id = 'activity-media');

CREATE POLICY "Admins can upload activity media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'activity-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update activity media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'activity-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete activity media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'activity-media' AND public.has_role(auth.uid(), 'admin'));

-- activity_media table
CREATE TABLE public.activity_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_media_activity ON public.activity_media(activity_id, sort_order);

ALTER TABLE public.activity_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity media"
ON public.activity_media FOR SELECT
USING (true);

CREATE POLICY "Admins can insert activity media"
ON public.activity_media FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update activity media"
ON public.activity_media FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete activity media"
ON public.activity_media FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
