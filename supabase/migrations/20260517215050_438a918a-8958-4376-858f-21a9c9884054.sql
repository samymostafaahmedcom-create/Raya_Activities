
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- inserts happen via SECURITY DEFINER triggers; no insert policy needed

-- Capacity enforcement + registration confirmation notification
CREATE OR REPLACE FUNCTION public.handle_registration_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity public.activities;
  v_count int;
BEGIN
  SELECT * INTO v_activity FROM public.activities WHERE id = NEW.activity_id FOR UPDATE;
  IF v_activity IS NULL THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;
  SELECT count(*) INTO v_count FROM public.registrations WHERE activity_id = NEW.activity_id;
  IF v_count >= v_activity.max_participants THEN
    RAISE EXCEPTION 'This activity is full';
  END IF;

  INSERT INTO public.notifications (user_id, activity_id, type, title, message)
  VALUES (
    NEW.user_id, NEW.activity_id, 'registration_confirmed',
    'You''re in!',
    'Your spot is confirmed for "' || v_activity.title || '" on ' || to_char(v_activity.activity_date, 'Mon DD, HH24:MI') || '.'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_registration_insert
  BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_registration_insert();

-- Notify users when an activity they joined is updated
CREATE OR REPLACE FUNCTION public.handle_activity_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.activity_date IS DISTINCT FROM OLD.activity_date
     OR NEW.location IS DISTINCT FROM OLD.location
     OR NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO public.notifications (user_id, activity_id, type, title, message)
    SELECT r.user_id, NEW.id, 'activity_updated',
           'Activity updated',
           '"' || NEW.title || '" was updated. Check the new details.'
    FROM public.registrations r WHERE r.activity_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_update
  AFTER UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_activity_update();

-- Notify users when an activity is deleted
CREATE OR REPLACE FUNCTION public.handle_activity_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, activity_id, type, title, message)
  SELECT r.user_id, NULL, 'activity_cancelled',
         'Activity cancelled',
         '"' || OLD.title || '" has been cancelled.'
  FROM public.registrations r WHERE r.activity_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_activity_delete
  BEFORE DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_activity_delete();
