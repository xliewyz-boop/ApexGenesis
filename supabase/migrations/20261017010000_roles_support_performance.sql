-- Apex Genesis: role hierarchy, support tickets, rank verification and least-privilege policies.
begin;

alter table public.announcements add column if not exists image_url text;
update public.shop_items set description = 'Topluluk başlangıç rozeti.' where name = 'Apex Genesis Badge';
update public.shop_items set description = 'Profil için neon tarzı sanal çerçeve.' where name = 'Neon Player Frame';
update public.shop_items set description = 'Profilinde gösterebileceğin sanal unvan.' where name = 'Grand Champion Title';
update public.shop_items set description = 'Profilinde gösterebileceğin prestij unvanı.' where name = 'SSL Elite Title';

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check (role in ('owner','admin','moderator'));

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'owner');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role in ('owner','admin','moderator'));
$$;

-- A member may edit their public profile, but cannot self-assign a verified rank.
create or replace function public.protect_profile_rank()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.rocket_league_rank is distinct from old.rocket_league_rank and not public.is_admin() then
    raise exception 'Only staff can verify or change Rocket League ranks';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_rank on public.profiles;
create trigger profiles_protect_rank before update on public.profiles
for each row execute function public.protect_profile_rank();

-- Teams are created only by Admin/Owner. Members can still join/leave public teams.
drop policy if exists "Users create own teams" on public.teams;
drop policy if exists "Staff create teams" on public.teams;
create policy "Staff create teams" on public.teams for insert to authenticated
with check (public.is_admin() and owner_id = (select auth.uid()));

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (char_length(trim(subject)) between 3 and 140),
  category text not null default 'general' check (category in ('general','rank_verification','account','bug_report','other')),
  status text not null default 'open' check (status in ('open','in_progress','waiting_user','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_user_updated_idx on public.support_tickets(user_id, updated_at desc);
create index if not exists support_tickets_staff_queue_idx on public.support_tickets(status, priority, updated_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  is_staff boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_created_idx on public.support_messages(ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
drop policy if exists "Users read own support tickets" on public.support_tickets;
drop policy if exists "Users create own support tickets" on public.support_tickets;
drop policy if exists "Staff manage support tickets" on public.support_tickets;
create policy "Users read own support tickets" on public.support_tickets for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());
create policy "Users create own support tickets" on public.support_tickets for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Staff manage support tickets" on public.support_tickets for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Ticket participants read messages" on public.support_messages;
drop policy if exists "Ticket participants send messages" on public.support_messages;
create policy "Ticket participants read messages" on public.support_messages for select to authenticated
using (public.is_admin() or exists (
  select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = (select auth.uid())
));
create policy "Ticket participants send messages" on public.support_messages for insert to authenticated
with check (
  sender_id = (select auth.uid()) and (
    (not is_staff and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = (select auth.uid())))
    or (is_staff and public.is_admin())
  )
);

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at before update on public.support_tickets
for each row execute function public.set_updated_at();

grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;

-- Only Owner may grant/revoke staff roles. Admins cannot promote accounts.
drop policy if exists "Owner manages staff roles" on public.user_roles;
create policy "Owner manages staff roles" on public.user_roles for all to authenticated
using (public.is_owner()) with check (public.is_owner());
grant insert, delete on public.user_roles to authenticated;

create or replace function public.bump_ticket_updated_at_from_message()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin update public.support_tickets set updated_at = now() where id = new.ticket_id; return new; end $$;
drop trigger if exists support_message_bumps_ticket on public.support_messages;
create trigger support_message_bumps_ticket after insert on public.support_messages
for each row execute function public.bump_ticket_updated_at_from_message();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_tickets') then
      execute 'alter publication supabase_realtime add table public.support_tickets';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages') then
      execute 'alter publication supabase_realtime add table public.support_messages';
    end if;
  end if;
end $$;

commit;
