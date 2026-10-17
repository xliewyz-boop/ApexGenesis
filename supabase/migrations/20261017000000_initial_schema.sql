-- Apex Genesis initial production schema.
-- Apply this file once in Supabase SQL Editor or with Supabase CLI.
begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  display_name text not null default '',
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_url text,
  rocket_league_rank text not null default 'Unranked'
    check (rocket_league_rank in ('Unranked','Bronze','Silver','Gold','Platinum','Diamond','Champion','Grand Champion','SSL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_user_created_idx on public.posts(user_id, created_at desc);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows(following_id);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 2 and 50),
  tag text not null default '' check (char_length(tag) <= 8),
  description text not null default '' check (char_length(description) <= 1000),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','captain','member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index if not exists team_members_user_idx on public.team_members(user_id);

create or replace function public.add_team_owner_membership()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.team_members(team_id, user_id, role) values (new.id, new.owner_id, 'owner')
  on conflict (team_id, user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists teams_add_owner_membership on public.teams;
create trigger teams_add_owner_membership after insert on public.teams
for each row execute function public.add_team_owner_membership();

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 100),
  description text not null default '' check (char_length(description) <= 3000),
  status text not null default 'upcoming' check (status in ('draft','upcoming','live','completed','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  max_participants integer not null default 16 check (max_participants between 2 and 512),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create index if not exists tournaments_start_idx on public.tournaments(starts_at);

create table if not exists public.tournament_participants (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  registered_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 160),
  body text not null check (char_length(trim(body)) between 1 and 10000),
  is_published boolean not null default false,
  is_pinned boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null check (char_length(lesson_id) between 1 and 100),
  rank text not null check (rank in ('GOLD','PLATINUM','DIAMOND','CHAMPION','GRAND CHAMPION','SSL')),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  item_type text not null default 'cosmetic' check (item_type in ('cosmetic','badge','title','avatar','other')),
  price integer not null default 0 check (price >= 0),
  asset_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.shop_items(name, description, item_type, price, is_active)
select seed.name, seed.description, seed.item_type, seed.price, true
from (values
  ('Apex Genesis Badge', 'Topluluk başlangıç rozeti.', 'badge', 0),
  ('Neon Player Frame', 'Profil için neon tarzı sanal çerçeve.', 'cosmetic', 100),
  ('Grand Champion Title', 'Profilinde gösterebileceğin sanal unvan.', 'title', 250),
  ('SSL Elite Title', 'Profilinde gösterebileceğin prestij unvanı.', 'title', 500)
) as seed(name, description, item_type, price)
where not exists (select 1 from public.shop_items existing where existing.name = seed.name);

create table if not exists public.user_inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- Ledger is intentionally not writable by browser clients. Purchases/rewards must
-- be processed by a trusted server/Edge Function after validating the operation.
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (char_length(trim(reason)) between 2 and 120),
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists wallet_transactions_user_created_idx on public.wallet_transactions(user_id, created_at desc);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','moderator')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_updated_at();
drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at before update on public.announcements
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  candidate := coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), 'player_' || left(new.id::text, 8));
  candidate := regexp_replace(lower(candidate), '[^a-z0-9_]', '_', 'g');
  candidate := left(candidate, 24);
  if char_length(candidate) < 3 then
    candidate := 'player_' || left(new.id::text, 8);
  end if;
  if exists (select 1 from public.profiles p where p.username = candidate) then
    candidate := left(candidate, 15) || '_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), candidate))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  );
$$;

-- Atomic purchase: the profile row lock serializes concurrent purchases by the same user.
create or replace function public.purchase_shop_item(p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  item_price integer;
  item_name text;
  current_balance bigint;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  perform 1 from public.profiles where id = current_user_id for update;
  if not found then raise exception 'Profile not found'; end if;

  select price, name into item_price, item_name
  from public.shop_items where id = p_item_id and is_active = true;
  if not found then raise exception 'Item is unavailable'; end if;
  if exists (select 1 from public.user_inventory where user_id = current_user_id and item_id = p_item_id) then
    raise exception 'You already own this item';
  end if;

  select coalesce(sum(amount), 0) into current_balance
  from public.wallet_transactions where user_id = current_user_id;
  if current_balance < item_price then raise exception 'Not enough Genesis Coins'; end if;

  insert into public.user_inventory(user_id, item_id) values (current_user_id, p_item_id);
  if item_price > 0 then
    insert into public.wallet_transactions(user_id, amount, reason, reference_id, metadata)
    values (current_user_id, -item_price, 'Shop purchase: ' || item_name, p_item_id,
            jsonb_build_object('item_name', item_name));
    current_balance := current_balance - item_price;
  end if;
  return jsonb_build_object('success', true, 'item_id', p_item_id, 'price', item_price, 'balance', current_balance);
end;
$$;

create or replace function public.admin_adjust_wallet(p_user_id uuid, p_amount integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  new_balance bigint;
begin
  if not public.is_admin() then raise exception 'Administrator permission required'; end if;
  if p_amount = 0 or char_length(trim(p_reason)) not between 2 and 120 then
    raise exception 'Invalid amount or reason';
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'User profile not found'; end if;
  select coalesce(sum(amount), 0) into new_balance
  from public.wallet_transactions where user_id = p_user_id;
  if new_balance + p_amount < 0 then raise exception 'Wallet balance cannot become negative'; end if;
  insert into public.wallet_transactions(user_id, amount, reason)
  values (p_user_id, p_amount, trim(p_reason));
  select coalesce(sum(amount), 0) into new_balance
  from public.wallet_transactions where user_id = p_user_id;
  return jsonb_build_object('success', true, 'user_id', p_user_id, 'balance', new_balance);
end;
$$;
revoke all on function public.purchase_shop_item(uuid) from public, anon;
revoke all on function public.admin_adjust_wallet(uuid, integer, text) from public, anon;
grant execute on function public.purchase_shop_item(uuid) to authenticated;
grant execute on function public.admin_adjust_wallet(uuid, integer, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.announcements enable row level security;
alter table public.training_progress enable row level security;
alter table public.shop_items enable row level security;
alter table public.user_inventory enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.user_roles enable row level security;

drop policy if exists "Profiles are readable by signed-in users" on public.profiles;
create policy "Profiles are readable by signed-in users" on public.profiles for select to authenticated using (true);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Signed-in users read posts" on public.posts;
create policy "Signed-in users read posts" on public.posts for select to authenticated using (true);
drop policy if exists "Users create own posts" on public.posts;
create policy "Users create own posts" on public.posts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own posts" on public.posts;
create policy "Users update own posts" on public.posts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own posts" on public.posts;
create policy "Users delete own posts" on public.posts for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Signed-in users read follows" on public.follows;
create policy "Signed-in users read follows" on public.follows for select to authenticated using (true);
drop policy if exists "Users follow as themselves" on public.follows;
create policy "Users follow as themselves" on public.follows for insert to authenticated with check ((select auth.uid()) = follower_id and follower_id <> following_id);
drop policy if exists "Users unfollow as themselves" on public.follows;
create policy "Users unfollow as themselves" on public.follows for delete to authenticated using ((select auth.uid()) = follower_id);

drop policy if exists "Public teams visible to signed-in users" on public.teams;
create policy "Public teams visible to signed-in users" on public.teams for select to authenticated using (is_public or owner_id = (select auth.uid()) or public.is_admin());
drop policy if exists "Users create own teams" on public.teams;
create policy "Users create own teams" on public.teams for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "Owners update teams" on public.teams;
create policy "Owners update teams" on public.teams for update to authenticated using (owner_id = (select auth.uid()) or public.is_admin()) with check (owner_id = (select auth.uid()) or public.is_admin());
drop policy if exists "Owners delete teams" on public.teams;
create policy "Owners delete teams" on public.teams for delete to authenticated using (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Team members visible to signed-in users" on public.team_members;
create policy "Team members visible to signed-in users" on public.team_members for select to authenticated using (true);
drop policy if exists "Users join public teams" on public.team_members;
create policy "Users join public teams" on public.team_members for insert to authenticated with check (
  user_id = (select auth.uid()) and role = 'member'
  and exists (select 1 from public.teams t where t.id = team_id and t.is_public)
);
drop policy if exists "Users leave teams or owners manage members" on public.team_members;
create policy "Users leave teams or owners manage members" on public.team_members for delete to authenticated using (
  user_id = (select auth.uid()) or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = (select auth.uid())) or public.is_admin()
);

drop policy if exists "Signed-in users read tournaments" on public.tournaments;
create policy "Signed-in users read tournaments" on public.tournaments for select to authenticated using (status <> 'draft' or created_by = (select auth.uid()) or public.is_admin());
drop policy if exists "Admins manage tournaments" on public.tournaments;
create policy "Admins manage tournaments" on public.tournaments for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Signed-in users read participants" on public.tournament_participants;
create policy "Signed-in users read participants" on public.tournament_participants for select to authenticated using (true);
create or replace function public.check_tournament_capacity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  current_status text;
  capacity integer;
  registered_count integer;
begin
  select status, max_participants into current_status, capacity
  from public.tournaments where id = new.tournament_id for update;
  if current_status is distinct from 'upcoming' then
    raise exception 'This tournament is not accepting registrations';
  end if;
  select count(*) into registered_count from public.tournament_participants where tournament_id = new.tournament_id;
  if registered_count >= capacity then
    raise exception 'This tournament is full';
  end if;
  return new;
end;
$$;
drop trigger if exists tournament_capacity_check on public.tournament_participants;
create trigger tournament_capacity_check before insert on public.tournament_participants
for each row execute function public.check_tournament_capacity();

drop policy if exists "Users register themselves" on public.tournament_participants;
create policy "Users register themselves" on public.tournament_participants for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.tournaments t where t.id = tournament_id and t.status = 'upcoming')
);
drop policy if exists "Users unregister themselves" on public.tournament_participants;
create policy "Users unregister themselves" on public.tournament_participants for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Published announcements readable" on public.announcements;
create policy "Published announcements readable" on public.announcements for select to authenticated using (is_published or public.is_admin());
drop policy if exists "Admins manage announcements" on public.announcements;
create policy "Admins manage announcements" on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users read own training progress" on public.training_progress;
create policy "Users read own training progress" on public.training_progress for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users save own training progress" on public.training_progress;
create policy "Users save own training progress" on public.training_progress for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users remove own training progress" on public.training_progress;
create policy "Users remove own training progress" on public.training_progress for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Active shop items readable" on public.shop_items;
create policy "Active shop items readable" on public.shop_items for select to authenticated using (is_active or public.is_admin());
drop policy if exists "Admins manage shop items" on public.shop_items;
create policy "Admins manage shop items" on public.shop_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Users read own inventory" on public.user_inventory;
create policy "Users read own inventory" on public.user_inventory for select to authenticated using (user_id = (select auth.uid()));
-- Inventory inserts/deletes are intentionally reserved for trusted server functions.
drop policy if exists "Users read own wallet transactions" on public.wallet_transactions;
create policy "Users read own wallet transactions" on public.wallet_transactions for select to authenticated using (user_id = (select auth.uid()));
-- No client INSERT/UPDATE/DELETE policies on wallet_transactions.
-- Role membership is private and never writable by normal clients.
drop policy if exists "Users read own roles" on public.user_roles;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.tournaments to authenticated;
grant select, insert, delete on public.tournament_participants to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, delete on public.training_progress to authenticated;
grant select, insert, update, delete on public.shop_items to authenticated;
grant select on public.user_inventory to authenticated;
grant select on public.wallet_transactions to authenticated;
grant select on public.user_roles to authenticated;

commit;
