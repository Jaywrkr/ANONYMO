-- Cola durable para preparar la fase de ejecución distribuida.
-- Aplicar con un administrador en el Supabase de la agencia; no se activa desde el chat.
-- La integración del estado del proyecto debe validarse antes de sustituir el ejecutor actual.
create table if not exists public.anonymo_trabajos (
 id uuid primary key,
 proyecto text not null check (proyecto ~ '^[a-z0-9_-]+$'),
 entrada jsonb not null check (octet_length(entrada::text) <= 262144),
 estado text not null default 'cola' check (estado in ('cola','ejecutando','terminado','error','pausado')),
 creado timestamptz not null default now(),
 actualizado timestamptz not null default now(),
 disponible timestamptz not null default now(),
 propietario uuid,
 vence timestamptz,
 revision bigint not null default 0,
 intentos integer not null default 0,
 limite integer not null default 3 check (limite between 1 and 10),
 resultado jsonb
);
alter table public.anonymo_trabajos enable row level security;
revoke all on public.anonymo_trabajos from anon, authenticated;
grant all on public.anonymo_trabajos to service_role;
create index if not exists anonymo_trabajos_pendientes on public.anonymo_trabajos(proyecto,estado,disponible);

create or replace function public.anonymo_tomar_trabajo(p_proyecto text,p_propietario uuid,p_segundos integer default 60)
returns setof public.anonymo_trabajos language plpgsql security invoker set search_path=public as $$
declare elegido uuid;
begin
 if p_segundos < 15 or p_segundos > 300 then raise exception 'Duración de reserva no válida'; end if;
 select id into elegido from public.anonymo_trabajos
 where proyecto=p_proyecto and intentos<limite and disponible<=now()
 and (estado='cola' or (estado='ejecutando' and vence<now()))
 order by creado,id for update skip locked limit 1;
 if elegido is null then return; end if;
 return query update public.anonymo_trabajos set estado='ejecutando',propietario=p_propietario,
 vence=now()+make_interval(secs=>p_segundos),revision=revision+1,intentos=intentos+1,actualizado=now()
 where id=elegido returning *;
end $$;

create or replace function public.anonymo_terminar_trabajo(p_id uuid,p_propietario uuid,p_revision bigint,p_resultado jsonb,p_correcto boolean)
returns boolean language plpgsql security invoker set search_path=public as $$
declare cantidad integer;
begin
 update public.anonymo_trabajos set estado=case when p_correcto then 'terminado' else 'error' end,
 resultado=p_resultado,actualizado=now(),vence=null
 where id=p_id and propietario=p_propietario and revision=p_revision and estado='ejecutando' and vence>now();
 get diagnostics cantidad=row_count;
 return cantidad=1;
end $$;
revoke all on function public.anonymo_tomar_trabajo(text,uuid,integer) from public,anon,authenticated;
revoke all on function public.anonymo_terminar_trabajo(uuid,uuid,bigint,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.anonymo_tomar_trabajo(text,uuid,integer) to service_role;
grant execute on function public.anonymo_terminar_trabajo(uuid,uuid,bigint,jsonb,boolean) to service_role;
