-- =============================================================================
-- Atomic hard delete for a student and all owned related rows.
-- Date: 2026-08-31
-- Apply manually when ready — repository falls back to sequential deletes until then.
-- =============================================================================

create or replace function public.delete_student_by_app_id(p_app_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_lesson_ids uuid[];
begin
  select id
  into v_student_id
  from public.students
  where app_id = p_app_id;

  if v_student_id is null then
    raise exception 'Student not found: %', p_app_id
      using errcode = 'P0002';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
  into v_lesson_ids
  from public.lessons
  where student_id = v_student_id;

  if cardinality(v_lesson_ids) > 0 then
    update public.lessons
    set makeup_for_lesson_id = null
    where makeup_for_lesson_id = any (v_lesson_ids);

    update public.lessons
    set transferred_to_lesson_id = null
    where transferred_to_lesson_id = any (v_lesson_ids);

    update public.lessons
    set transferred_from_lesson_id = null
    where transferred_from_lesson_id = any (v_lesson_ids);
  end if;

  delete from public.payments
  where student_id = v_student_id;

  delete from public.lessons
  where student_id = v_student_id;

  delete from public.students
  where id = v_student_id;
end;
$$;

comment on function public.delete_student_by_app_id(text) is
  'Hard-deletes a student by app_id with payments and lessons first; remaining FKs cascade or set null.';
