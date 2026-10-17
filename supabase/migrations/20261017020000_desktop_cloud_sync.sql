-- Apex Genesis: bring desktop player directory, tournaments and wallet onto shared Supabase data.
begin;

alter table public.announcements add column if not exists image_url text;

alter table public.profiles
  add column if not exists player_role text not null default 'Flex'
    check (player_role in ('Flex','Striker','Playmaker','Defensive','Goalkeeper')),
  add column if not exists region text not null default 'EU'
    check (region in ('EU','NA','ME','OCE','SAM','APAC','Unknown'));

alter table public.tournaments
  add column if not exists registration_open boolean not null default true;

create index if not exists profiles_directory_idx on public.profiles(region, player_role, username);
create index if not exists tournament_participants_lookup_idx on public.tournament_participants(tournament_id, registered_at);

create or replace function public.check_tournament_capacity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  current_status text;
  is_registration_open boolean;
  capacity integer;
  registered_count integer;
begin
  select status, registration_open, max_participants
    into current_status, is_registration_open, capacity
    from public.tournaments where id = new.tournament_id for update;
  if current_status is distinct from 'upcoming' or is_registration_open is distinct from true then
    raise exception 'This tournament is not accepting registrations';
  end if;
  select count(*) into registered_count
    from public.tournament_participants where tournament_id = new.tournament_id;
  if registered_count >= capacity then
    raise exception 'This tournament is full';
  end if;
  return new;
end;
$$;

drop policy if exists "Users register themselves" on public.tournament_participants;
create policy "Users register themselves" on public.tournament_participants
  for insert to authenticated with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.status = 'upcoming' and t.registration_open
    )
  );

create unique index if not exists wallet_daily_reward_unique_idx
  on public.wallet_transactions(user_id, (metadata ->> 'reward_date'))
  where metadata ->> 'reward_type' = 'daily';

create unique index if not exists wallet_tournament_reward_unique_idx
  on public.wallet_transactions(user_id, reference_id)
  where metadata ->> 'reward_type' = 'tournament_registration' and reference_id is not null;

create or replace function public.award_tournament_registration_reward()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.wallet_transactions
    where user_id = new.user_id and reference_id = new.tournament_id
      and metadata ->> 'reward_type' = 'tournament_registration'
  ) then
    insert into public.wallet_transactions(user_id, amount, reason, reference_id, metadata)
    values (new.user_id, 50, 'Tournament registration reward', new.tournament_id,
            jsonb_build_object('reward_type','tournament_registration','tournament_id',new.tournament_id));
  end if;
  return new;
end;
$$;
drop trigger if exists tournament_registration_reward on public.tournament_participants;
create trigger tournament_registration_reward after insert on public.tournament_participants
for each row execute function public.award_tournament_registration_reward();

create or replace function public.claim_daily_reward()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  reward_day text := to_char(timezone('utc', now())::date, 'YYYY-MM-DD');
  last_membership_day date;
  profile_created_date date;
  membership_days integer;
  membership_bonus integer;
  current_balance bigint;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select created_at::date into profile_created_date
    from public.profiles where id = current_user_id for update;
  if not found then raise exception 'Profile not found'; end if;

  if exists (
    select 1 from public.wallet_transactions
    where user_id = current_user_id
      and metadata ->> 'reward_type' = 'daily'
      and metadata ->> 'reward_date' = reward_day
  ) then
    select coalesce(sum(amount), 0) into current_balance
      from public.wallet_transactions where user_id = current_user_id;
    return jsonb_build_object('success', false, 'already_claimed', true, 'balance', current_balance);
  end if;

  select max((metadata ->> 'reward_date')::date) into last_membership_day
    from public.wallet_transactions
    where user_id = current_user_id and metadata ->> 'reward_type' = 'membership';
  if last_membership_day is null then
    last_membership_day := greatest(profile_created_date, reward_day::date - 1);
  end if;
  membership_days := greatest(0, reward_day::date - last_membership_day);
  membership_bonus := membership_days * 2;

  insert into public.wallet_transactions(user_id, amount, reason, metadata)
  values (current_user_id, 10, 'Daily login reward',
          jsonb_build_object('reward_type','daily','reward_date',reward_day));
  if membership_bonus > 0 then
    insert into public.wallet_transactions(user_id, amount, reason, metadata)
    values (current_user_id, membership_bonus, 'Membership loyalty bonus',
            jsonb_build_object('reward_type','membership','reward_date',reward_day,'days',membership_days));
  end if;

  select coalesce(sum(amount), 0) into current_balance
    from public.wallet_transactions where user_id = current_user_id;
  return jsonb_build_object('success', true, 'already_claimed', false, 'reward', 10,
    'membership_bonus', membership_bonus, 'membership_days', membership_days, 'balance', current_balance);
end;
$$;
revoke all on function public.claim_daily_reward() from public, anon;
grant execute on function public.claim_daily_reward() to authenticated;

commit;
