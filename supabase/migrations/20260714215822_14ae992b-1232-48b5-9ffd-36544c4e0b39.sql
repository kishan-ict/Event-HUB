CREATE POLICY "Users can assign their signup role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('host'::public.app_role, 'participant'::public.app_role)
);