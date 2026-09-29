-- =============================================================================
-- Дополнение к уже применённой 20260928_meme_battle.sql
-- База: таблицы, bucket, RLS и исходные функции уже есть.
-- Этот скрипт только добавляет prepared/active, prefetch и квоту раундов.
-- Голоса, завершённые раунды, рейтинг и файлы не удаляются.
-- Запускать один раз целиком. Повторный запуск тоже безопасен.
-- =============================================================================

begin;

alter table public.meme_rating_rounds
  add column if not exists activated_at timestamptz;

-- Незавершённый раунд из первой версии — это текущая игра, не prefetch.
update public.meme_rating_rounds
set activated_at = created_at
where activated_at is null
  and completed_at is null
  and voided_at is null;

drop index if exists public.meme_rounds_one_open_uidx;

create unique index if not exists meme_rounds_one_active_uidx
  on public.meme_rating_rounds (event_id, student_id)
  where completed_at is null and voided_at is null and activated_at is not null;

create unique index if not exists meme_rounds_one_prepared_uidx
  on public.meme_rating_rounds (event_id, student_id)
  where completed_at is null and voided_at is null and activated_at is null;

-- Старая сигнатура (uuid, uuid[]) не заменяется через CREATE OR REPLACE.
drop function if exists public.commit_meme_rating_round(uuid, uuid[]);

create or replace function public.meme_image_held_for_vote(
  p_event_id uuid,
  p_student_id uuid,
  p_image_id uuid
) returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.meme_rating_round_items i
    join public.meme_rating_rounds r on r.id = i.round_id
    where i.image_id = p_image_id
      and r.event_id = p_event_id
      and r.student_id = p_student_id
      and r.activated_at is not null
      and r.completed_at is null
      and r.voided_at is null
  );
$$;

create or replace function public.release_prepared_meme_round(
  p_student_id uuid,
  p_round_id uuid
) returns jsonb
language plpgsql
as $$
declare
  v_found uuid;
begin
  perform pg_advisory_xact_lock(834221, 1);

  select id into v_found
  from public.meme_rating_rounds
  where id = p_round_id
    and student_id = p_student_id
    and activated_at is null
    and completed_at is null
    and voided_at is null
  for update;

  if v_found is null then
    return jsonb_build_object('ok', true, 'code', 'skipped');
  end if;

  with voided as (
    update public.meme_rating_rounds
    set voided_at = timezone('utc', now())
    where id = p_round_id
      and activated_at is null
      and completed_at is null
      and voided_at is null
    returning id
  ),
  affected as (
    select i.image_id
    from public.meme_rating_round_items i
    join voided v on v.id = i.round_id
  )
  update public.meme_images img
  set participation_count = greatest(0, img.participation_count - sub.cnt)
  from (
    select image_id, count(*)::integer as cnt
    from affected
    group by image_id
  ) sub
  where img.id = sub.image_id;

  return jsonb_build_object('ok', true, 'code', 'released');
end;
$$;

create or replace function public.meme_vote_round_cap(p_own_active integer)
returns integer
language sql
immutable
as $$
  select case
    when coalesce(p_own_active, 0) <= 0 then 1
    when p_own_active = 1 then 2
    when p_own_active = 2 then 3
    else null
  end;
$$;

create or replace function public.commit_meme_rating_round(
  p_student_id uuid,
  p_image_ids uuid[],
  p_prepare boolean default false
) returns jsonb
language plpgsql
as $$
declare
  v_event public.meme_events%rowtype;
  v_open_id uuid;
  v_round_id uuid;
  v_set_key text;
  v_eligible integer;
  v_max_chosen integer;
  v_below_n integer;
  v_relevant integer;
  v_slot integer;
  v_image_id uuid;
  v_stale record;
  v_own_active integer;
  v_cap integer;
  v_completed integer;
  v_active_n integer;
  v_prepared_n integer;
begin
  perform pg_advisory_xact_lock(834221, 1);

  select * into v_event
  from public.meme_events
  where slug = 'battle-of-pictures';

  if not found then
    return jsonb_build_object('ok', false, 'code', 'no_event');
  end if;

  if timezone('utc', now()) < v_event.starts_at
     or timezone('utc', now()) >= v_event.ends_at then
    return jsonb_build_object('ok', false, 'code', 'event_closed');
  end if;

  for v_stale in
    select id, student_id
    from public.meme_rating_rounds
    where event_id = v_event.id
      and activated_at is null
      and completed_at is null
      and voided_at is null
      and created_at < timezone('utc', now()) - interval '12 hours'
  loop
    perform public.release_prepared_meme_round(v_stale.student_id, v_stale.id);
  end loop;

  if p_prepare then
    select id into v_open_id
    from public.meme_rating_rounds
    where event_id = v_event.id
      and student_id = p_student_id
      and activated_at is null
      and completed_at is null
      and voided_at is null
    limit 1;
  else
    select id into v_open_id
    from public.meme_rating_rounds
    where event_id = v_event.id
      and student_id = p_student_id
      and activated_at is not null
      and completed_at is null
      and voided_at is null
    limit 1;

    if v_open_id is null then
      select id into v_open_id
      from public.meme_rating_rounds
      where event_id = v_event.id
        and student_id = p_student_id
        and activated_at is null
        and completed_at is null
        and voided_at is null
      limit 1;

      if v_open_id is not null then
        select count(*)::integer
        into v_own_active
        from public.meme_images
        where event_id = v_event.id
          and student_id = p_student_id
          and is_active;

        select count(*)::integer
        into v_completed
        from public.meme_rating_rounds
        where event_id = v_event.id
          and student_id = p_student_id
          and completed_at is not null
          and voided_at is null;

        v_cap := public.meme_vote_round_cap(v_own_active);
        if v_cap is not null and v_completed >= v_cap then
          perform public.release_prepared_meme_round(p_student_id, v_open_id);
          return jsonb_build_object('ok', false, 'code', 'vote_limit');
        end if;

        update public.meme_rating_rounds
        set activated_at = timezone('utc', now())
        where id = v_open_id;
      end if;
    end if;
  end if;

  if v_open_id is not null then
    return jsonb_build_object(
      'ok', true,
      'code', 'open_round',
      'roundId', v_open_id,
      'imageIds', (
        select coalesce(jsonb_agg(i.image_id order by i.slot_index), '[]'::jsonb)
        from public.meme_rating_round_items i
        where i.round_id = v_open_id
      )
    );
  end if;

  select count(*)::integer
  into v_own_active
  from public.meme_images
  where event_id = v_event.id
    and student_id = p_student_id
    and is_active;

  select count(*)::integer
  into v_completed
  from public.meme_rating_rounds
  where event_id = v_event.id
    and student_id = p_student_id
    and completed_at is not null
    and voided_at is null;

  select count(*)::integer
  into v_active_n
  from public.meme_rating_rounds
  where event_id = v_event.id
    and student_id = p_student_id
    and activated_at is not null
    and completed_at is null
    and voided_at is null;

  select count(*)::integer
  into v_prepared_n
  from public.meme_rating_rounds
  where event_id = v_event.id
    and student_id = p_student_id
    and activated_at is null
    and completed_at is null
    and voided_at is null;

  v_cap := public.meme_vote_round_cap(v_own_active);
  if v_cap is not null then
    if p_prepare then
      if (v_completed + v_active_n + v_prepared_n) >= v_cap then
        return jsonb_build_object('ok', false, 'code', 'vote_limit');
      end if;
    elsif (v_completed + v_active_n) >= v_cap then
      return jsonb_build_object('ok', false, 'code', 'vote_limit');
    end if;
  end if;

  if p_image_ids is null or cardinality(p_image_ids) <> 3 then
    return jsonb_build_object('ok', false, 'code', 'invalid_triple');
  end if;

  if (select count(distinct x) from unnest(p_image_ids) as x) <> 3 then
    return jsonb_build_object('ok', false, 'code', 'invalid_triple');
  end if;

  if exists (
    select 1
    from unnest(p_image_ids) as chosen(id)
    where not exists (
      select 1
      from public.meme_images img
      where img.id = chosen.id
        and img.event_id = v_event.id
        and img.is_active
        and img.student_id <> p_student_id
        and not exists (
          select 1
          from public.meme_image_votes v
          where v.image_id = img.id
            and v.student_id = p_student_id
        )
        and (
          not p_prepare
          or not public.meme_image_held_for_vote(v_event.id, p_student_id, img.id)
        )
    )
  ) then
    return jsonb_build_object('ok', false, 'code', 'retry');
  end if;

  select string_agg(x.id::text, '|' order by x.id::text)
  into v_set_key
  from unnest(p_image_ids) as x(id);

  if exists (
    select 1
    from public.meme_rating_rounds r
    where r.event_id = v_event.id
      and r.student_id = p_student_id
      and r.voided_at is null
      and r.image_set_key = v_set_key
  ) then
    return jsonb_build_object('ok', false, 'code', 'retry');
  end if;

  select max(img.participation_count)
  into v_max_chosen
  from public.meme_images img
  where img.id = any (p_image_ids);

  select count(*)
  into v_below_n
  from public.meme_images img
  where img.event_id = v_event.id
    and img.is_active
    and img.student_id <> p_student_id
    and img.participation_count < v_max_chosen
    and not exists (
      select 1
      from public.meme_image_votes v
      where v.image_id = img.id
        and v.student_id = p_student_id
    )
    and (
      not p_prepare
      or not public.meme_image_held_for_vote(v_event.id, p_student_id, img.id)
    );

  select count(*)
  into v_relevant
  from public.meme_rating_rounds r
  where r.event_id = v_event.id
    and r.student_id = p_student_id
    and r.voided_at is null
    and (
      select coalesce(bool_and(
        exists (
          select 1
          from public.meme_images img
          where img.id = part.part::uuid
            and img.event_id = v_event.id
            and img.is_active
            and img.student_id <> p_student_id
            and img.participation_count < v_max_chosen
            and not exists (
              select 1
              from public.meme_image_votes v
              where v.image_id = img.id
                and v.student_id = p_student_id
            )
            and (
              not p_prepare
              or not public.meme_image_held_for_vote(v_event.id, p_student_id, img.id)
            )
        )
      ), false)
      from unnest(string_to_array(r.image_set_key, '|')) as part(part)
    );

  if v_below_n >= 3
     and (v_below_n::numeric * (v_below_n - 1) * (v_below_n - 2) / 6) > v_relevant then
    return jsonb_build_object('ok', false, 'code', 'retry');
  end if;

  insert into public.meme_rating_rounds (event_id, student_id, image_set_key, activated_at)
  values (
    v_event.id,
    p_student_id,
    v_set_key,
    case when p_prepare then null else timezone('utc', now()) end
  )
  returning id into v_round_id;

  v_slot := 0;
  foreach v_image_id in array p_image_ids loop
    insert into public.meme_rating_round_items (round_id, image_id, slot_index)
    values (v_round_id, v_image_id, v_slot);
    v_slot := v_slot + 1;
  end loop;

  update public.meme_images
  set participation_count = participation_count + 1
  where id = any (p_image_ids);

  return jsonb_build_object(
    'ok', true,
    'code', 'created',
    'roundId', v_round_id,
    'imageIds', to_jsonb(p_image_ids)
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'retry');
end;
$$;

create or replace function public.activate_prepared_meme_round(
  p_student_id uuid,
  p_round_id uuid
) returns jsonb
language plpgsql
as $$
declare
  v_event_id uuid;
  v_activated timestamptz;
  v_completed timestamptz;
  v_voided timestamptz;
  v_own_active integer;
  v_cap integer;
  v_done integer;
begin
  perform pg_advisory_xact_lock(834221, 1);

  select event_id, activated_at, completed_at, voided_at
  into v_event_id, v_activated, v_completed, v_voided
  from public.meme_rating_rounds
  where id = p_round_id
    and student_id = p_student_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'round_not_found');
  end if;

  if v_voided is not null then
    return jsonb_build_object('ok', false, 'code', 'round_void');
  end if;

  if v_completed is not null or v_activated is not null then
    return jsonb_build_object('ok', true, 'code', 'active');
  end if;

  select count(*)::integer
  into v_own_active
  from public.meme_images
  where event_id = v_event_id
    and student_id = p_student_id
    and is_active;

  select count(*)::integer
  into v_done
  from public.meme_rating_rounds
  where event_id = v_event_id
    and student_id = p_student_id
    and completed_at is not null
    and voided_at is null;

  v_cap := public.meme_vote_round_cap(v_own_active);
  if v_cap is not null and v_done >= v_cap then
    perform public.release_prepared_meme_round(p_student_id, p_round_id);
    return jsonb_build_object('ok', false, 'code', 'vote_limit');
  end if;

  if exists (
    select 1
    from public.meme_rating_rounds r
    where r.event_id = v_event_id
      and r.student_id = p_student_id
      and r.id <> p_round_id
      and r.activated_at is not null
      and r.completed_at is null
      and r.voided_at is null
  ) then
    return jsonb_build_object('ok', false, 'code', 'retry');
  end if;

  update public.meme_rating_rounds
  set activated_at = timezone('utc', now())
  where id = p_round_id;

  return jsonb_build_object('ok', true, 'code', 'active');
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'retry');
end;
$$;

revoke all on function public.meme_image_held_for_vote(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_prepared_meme_round(uuid, uuid) from public, anon, authenticated;
revoke all on function public.activate_prepared_meme_round(uuid, uuid) from public, anon, authenticated;
revoke all on function public.meme_vote_round_cap(integer) from public, anon, authenticated;
revoke all on function public.commit_meme_rating_round(uuid, uuid[], boolean) from public, anon, authenticated;

grant execute on function public.meme_image_held_for_vote(uuid, uuid, uuid) to service_role;
grant execute on function public.release_prepared_meme_round(uuid, uuid) to service_role;
grant execute on function public.activate_prepared_meme_round(uuid, uuid) to service_role;
grant execute on function public.meme_vote_round_cap(integer) to service_role;
grant execute on function public.commit_meme_rating_round(uuid, uuid[], boolean) to service_role;

commit;
