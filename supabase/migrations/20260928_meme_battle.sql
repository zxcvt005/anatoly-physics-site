-- =============================================================================
-- Временное событие «Битва картинок»
-- Дата: 2026-09-28
-- Окно события (starts_at / ends_at) живёт только здесь.
-- НЕ применять к production без явного подтверждения. Не деплоить вместе с кодом автоматически.
-- =============================================================================

create table if not exists public.meme_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  tagline text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_images_per_student integer not null default 5,
  created_at timestamptz not null default timezone('utc', now()),
  constraint meme_events_slug_unique unique (slug),
  constraint meme_events_window check (ends_at > starts_at),
  constraint meme_events_max_images_positive check (max_images_per_student > 0)
);

create table if not exists public.meme_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.meme_events (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  byte_size integer not null,
  participation_count integer not null default 0,
  total_votes integer not null default 0,
  first_place_count integer not null default 0,
  second_place_count integer not null default 0,
  third_place_count integer not null default 0,
  total_points integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint meme_images_storage_path_unique unique (storage_path),
  constraint meme_images_byte_size_positive check (byte_size > 0 and byte_size <= 5242880),
  constraint meme_images_counts_non_negative check (
    participation_count >= 0
    and total_votes >= 0
    and first_place_count >= 0
    and second_place_count >= 0
    and third_place_count >= 0
    and total_points >= 0
  ),
  constraint meme_images_mime_allowed check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  )
);

create index if not exists meme_images_event_active_participation_idx
  on public.meme_images (event_id, is_active, participation_count);

create index if not exists meme_images_student_idx
  on public.meme_images (student_id);

create table if not exists public.meme_rating_rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.meme_events (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  image_set_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  voided_at timestamptz
);

create unique index if not exists meme_rounds_student_set_uidx
  on public.meme_rating_rounds (event_id, student_id, image_set_key)
  where voided_at is null;

create unique index if not exists meme_rounds_one_open_uidx
  on public.meme_rating_rounds (event_id, student_id)
  where completed_at is null and voided_at is null;

create index if not exists meme_rounds_student_idx
  on public.meme_rating_rounds (student_id, event_id);

create table if not exists public.meme_rating_round_items (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.meme_rating_rounds (id) on delete cascade,
  image_id uuid not null references public.meme_images (id) on delete cascade,
  slot_index smallint not null,
  selected_place smallint,
  constraint meme_round_items_slot_range check (slot_index between 0 and 2),
  constraint meme_round_items_place_range check (
    selected_place is null or selected_place between 1 and 3
  ),
  constraint meme_round_items_round_slot_unique unique (round_id, slot_index),
  constraint meme_round_items_round_image_unique unique (round_id, image_id)
);

create index if not exists meme_round_items_image_idx
  on public.meme_rating_round_items (image_id);

create table if not exists public.meme_image_votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.meme_events (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  image_id uuid not null references public.meme_images (id) on delete cascade,
  round_id uuid not null references public.meme_rating_rounds (id) on delete cascade,
  place smallint not null,
  points smallint not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint meme_votes_student_image_unique unique (student_id, image_id),
  constraint meme_votes_place_range check (place between 1 and 3),
  constraint meme_votes_points_match check (
    (place = 1 and points = 3)
    or (place = 2 and points = 2)
    or (place = 3 and points = 1)
  )
);

create index if not exists meme_votes_student_idx
  on public.meme_image_votes (student_id, event_id);

create index if not exists meme_votes_image_idx
  on public.meme_image_votes (image_id);

comment on table public.meme_events is
  'Временное событие Студентки. Срок задаётся starts_at/ends_at, не в коде.';

comment on column public.meme_images.participation_count is
  'Сколько раундов показа картинки. Выдача троек выравнивает это число, а не авторов.';

insert into public.meme_events (
  slug,
  name,
  tagline,
  description,
  starts_at,
  ends_at,
  max_images_per_student
)
values (
  'battle-of-pictures',
  'Битва картинок',
  'Помоги Анатолию собрать базу картинок',
  'Загрузи свои самые смешные картинки и оцени картинки других участников. Лучшие попадут в файлы занятий.',
  timezone('utc', now()),
  timezone('utc', now()) + interval '10 days',
  5
)
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public)
values ('meme-battle', 'meme-battle', false)
on conflict (id) do nothing;

alter table public.meme_events enable row level security;
alter table public.meme_images enable row level security;
alter table public.meme_rating_rounds enable row level security;
alter table public.meme_rating_round_items enable row level security;
alter table public.meme_image_votes enable row level security;

drop policy if exists meme_events_service_role_all on public.meme_events;
create policy meme_events_service_role_all
  on public.meme_events
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists meme_images_service_role_all on public.meme_images;
create policy meme_images_service_role_all
  on public.meme_images
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists meme_rounds_service_role_all on public.meme_rating_rounds;
create policy meme_rounds_service_role_all
  on public.meme_rating_rounds
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists meme_round_items_service_role_all on public.meme_rating_round_items;
create policy meme_round_items_service_role_all
  on public.meme_rating_round_items
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists meme_votes_service_role_all on public.meme_image_votes;
create policy meme_votes_service_role_all
  on public.meme_image_votes
  for all
  to service_role
  using (true)
  with check (true);

-- Сериализация выдачи троек: два студента не читают один и тот же participation_count.
create or replace function public.commit_meme_rating_round(
  p_student_id uuid,
  p_image_ids uuid[]
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

  select id into v_open_id
  from public.meme_rating_rounds
  where event_id = v_event.id
    and student_id = p_student_id
    and completed_at is null
    and voided_at is null
  limit 1;

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
        )
      ), false)
      from unnest(string_to_array(r.image_set_key, '|')) as part(part)
    );

  if v_below_n >= 3
     and (v_below_n::numeric * (v_below_n - 1) * (v_below_n - 2) / 6) > v_relevant then
    return jsonb_build_object('ok', false, 'code', 'retry');
  end if;

  insert into public.meme_rating_rounds (event_id, student_id, image_set_key)
  values (v_event.id, p_student_id, v_set_key)
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

create or replace function public.submit_meme_rating_round(
  p_student_id uuid,
  p_round_id uuid,
  p_places jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_event public.meme_events%rowtype;
  v_round public.meme_rating_rounds%rowtype;
  v_item record;
  v_image_student uuid;
  v_active boolean;
  v_place integer;
  v_points integer;
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

  select * into v_round
  from public.meme_rating_rounds
  where id = p_round_id
    and student_id = p_student_id
    and event_id = v_event.id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'round_not_found');
  end if;

  if v_round.voided_at is not null then
    return jsonb_build_object('ok', false, 'code', 'round_void');
  end if;

  if v_round.completed_at is not null then
    return jsonb_build_object('ok', false, 'code', 'already_completed');
  end if;

  if jsonb_typeof(p_places) <> 'array' or jsonb_array_length(p_places) <> 3 then
    return jsonb_build_object('ok', false, 'code', 'invalid_places');
  end if;

  if (
    select count(distinct (elem->>'imageId'))
    from jsonb_array_elements(p_places) elem
  ) <> 3 then
    return jsonb_build_object('ok', false, 'code', 'invalid_places');
  end if;

  if (
    select count(distinct (elem->>'place')::int)
    from jsonb_array_elements(p_places) elem
    where (elem->>'place')::int between 1 and 3
  ) <> 3 then
    return jsonb_build_object('ok', false, 'code', 'invalid_places');
  end if;

  if exists (
    select 1
    from public.meme_rating_round_items i
    where i.round_id = p_round_id
      and not exists (
        select 1
        from jsonb_array_elements(p_places) elem
        where (elem->>'imageId')::uuid = i.image_id
      )
  ) or exists (
    select 1
    from jsonb_array_elements(p_places) elem
    where not exists (
      select 1
      from public.meme_rating_round_items i
      where i.round_id = p_round_id
        and i.image_id = (elem->>'imageId')::uuid
    )
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_places');
  end if;

  for v_item in
    select (elem->>'imageId')::uuid as image_id, (elem->>'place')::int as place
    from jsonb_array_elements(p_places) elem
  loop
    select student_id, is_active
    into v_image_student, v_active
    from public.meme_images
    where id = v_item.image_id;

    if v_image_student is null or v_image_student = p_student_id or v_active is not true then
      return jsonb_build_object('ok', false, 'code', 'invalid_image');
    end if;

    if exists (
      select 1
      from public.meme_image_votes
      where student_id = p_student_id
        and image_id = v_item.image_id
    ) then
      return jsonb_build_object('ok', false, 'code', 'already_voted');
    end if;
  end loop;

  for v_item in
    select (elem->>'imageId')::uuid as image_id, (elem->>'place')::int as place
    from jsonb_array_elements(p_places) elem
  loop
    v_place := v_item.place;
    v_points := 4 - v_place;

    insert into public.meme_image_votes (
      event_id, student_id, image_id, round_id, place, points
    )
    values (
      v_event.id, p_student_id, v_item.image_id, p_round_id, v_place, v_points
    );

    update public.meme_images
    set
      total_votes = total_votes + 1,
      total_points = total_points + v_points,
      first_place_count = first_place_count + case when v_place = 1 then 1 else 0 end,
      second_place_count = second_place_count + case when v_place = 2 then 1 else 0 end,
      third_place_count = third_place_count + case when v_place = 3 then 1 else 0 end
    where id = v_item.image_id;

    update public.meme_rating_round_items
    set selected_place = v_place
    where round_id = p_round_id
      and image_id = v_item.image_id;
  end loop;

  update public.meme_rating_rounds
  set completed_at = timezone('utc', now())
  where id = p_round_id;

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'already_voted');
  when invalid_text_representation then
    return jsonb_build_object('ok', false, 'code', 'invalid_places');
end;
$$;

create or replace function public.register_meme_image(
  p_student_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_byte_size integer
) returns jsonb
language plpgsql
as $$
declare
  v_event public.meme_events%rowtype;
  v_count integer;
  v_image_id uuid;
begin
  perform pg_advisory_xact_lock(834222, hashtext(p_student_id::text));

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

  if p_byte_size is null or p_byte_size <= 0 or p_byte_size > 5242880 then
    return jsonb_build_object('ok', false, 'code', 'invalid_file');
  end if;

  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'image/gif') then
    return jsonb_build_object('ok', false, 'code', 'invalid_file');
  end if;

  select count(*)
  into v_count
  from public.meme_images
  where event_id = v_event.id
    and student_id = p_student_id
    and is_active;

  if v_count >= v_event.max_images_per_student then
    return jsonb_build_object('ok', false, 'code', 'limit');
  end if;

  insert into public.meme_images (
    event_id, student_id, storage_path, mime_type, byte_size
  )
  values (
    v_event.id, p_student_id, p_storage_path, p_mime_type, p_byte_size
  )
  returning id into v_image_id;

  return jsonb_build_object('ok', true, 'imageId', v_image_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'retry');
end;
$$;

create or replace function public.deactivate_meme_image(
  p_student_id uuid,
  p_image_id uuid
) returns jsonb
language plpgsql
as $$
declare
  v_event public.meme_events%rowtype;
  v_owner uuid;
  v_active boolean;
  v_path text;
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

  select student_id, is_active, storage_path
  into v_owner, v_active, v_path
  from public.meme_images
  where id = p_image_id
    and event_id = v_event.id
  for update;

  if v_owner is null or v_owner <> p_student_id then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_active is not true then
    return jsonb_build_object('ok', true, 'storagePath', v_path);
  end if;

  with voided as (
    update public.meme_rating_rounds r
    set voided_at = timezone('utc', now())
    where r.event_id = v_event.id
      and r.completed_at is null
      and r.voided_at is null
      and exists (
        select 1
        from public.meme_rating_round_items i
        where i.round_id = r.id
          and i.image_id = p_image_id
      )
    returning r.id
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

  update public.meme_images
  set is_active = false
  where id = p_image_id;

  return jsonb_build_object('ok', true, 'storagePath', v_path);
end;
$$;

revoke all on function public.commit_meme_rating_round(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.submit_meme_rating_round(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.register_meme_image(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.deactivate_meme_image(uuid, uuid) from public, anon, authenticated;

grant execute on function public.commit_meme_rating_round(uuid, uuid[]) to service_role;
grant execute on function public.submit_meme_rating_round(uuid, uuid, jsonb) to service_role;
grant execute on function public.register_meme_image(uuid, text, text, integer) to service_role;
grant execute on function public.deactivate_meme_image(uuid, uuid) to service_role;

create or replace function public.admin_hide_meme_image(p_image_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_event_id uuid;
  v_active boolean;
  v_path text;
begin
  perform pg_advisory_xact_lock(834221, 1);

  select event_id, is_active, storage_path
  into v_event_id, v_active, v_path
  from public.meme_images
  where id = p_image_id
  for update;

  if v_event_id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_active is not true then
    return jsonb_build_object('ok', true, 'storagePath', v_path);
  end if;

  with voided as (
    update public.meme_rating_rounds r
    set voided_at = timezone('utc', now())
    where r.event_id = v_event_id
      and r.completed_at is null
      and r.voided_at is null
      and exists (
        select 1
        from public.meme_rating_round_items i
        where i.round_id = r.id
          and i.image_id = p_image_id
      )
    returning r.id
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

  update public.meme_images
  set is_active = false
  where id = p_image_id;

  return jsonb_build_object('ok', true, 'storagePath', v_path);
end;
$$;

revoke all on function public.admin_hide_meme_image(uuid) from public, anon, authenticated;
grant execute on function public.admin_hide_meme_image(uuid) to service_role;
