ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assignee_profile_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.org_members
  ADD CONSTRAINT org_members_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;