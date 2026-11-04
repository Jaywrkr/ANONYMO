-- Publicación atómica de proyectos. Requiere cola.sql. Preparar en un entorno de ensayo antes de activar el modo versionado.
create table if not exists public.anonymo_publicaciones (
 proyecto text primary key check (proyecto ~ '^[a-z0-9_-]+$'),
 revision bigint not null default 0,
 archivos jsonb not null default '{}'::jsonb check (jsonb_typeof(archivos)='object' and octet_length(archivos::text)<=5242880),
 actualizado timestamptz not null default now()
);
create table if not exists public.anonymo_guardados (
 id uuid primary key, proyecto text not null, base bigint not null, huella text not null,
 archivos jsonb not null check (jsonb_typeof(archivos)='object' and octet_length(archivos::text)<=5242880),
 estado text not null check (estado in ('publicado','conflicto','reserva-perdida')),
 revision bigint, trabajo uuid, propietario uuid, reserva bigint, correcto boolean not null, error text,
 creado timestamptz not null default now()
);
alter table public.anonymo_publicaciones enable row level security;
alter table public.anonymo_guardados enable row level security;
revoke all on public.anonymo_publicaciones,public.anonymo_guardados from anon,authenticated;
grant all on public.anonymo_publicaciones,public.anonymo_guardados to service_role;
create index if not exists anonymo_guardados_proyecto on public.anonymo_guardados(proyecto,creado desc);

create or replace function public.anonymo_leer_publicacion(p_proyecto text) returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('revision',revision,'archivos',archivos) from public.anonymo_publicaciones where proyecto=p_proyecto
$$;
create or replace function public.anonymo_listar_publicaciones() returns table(proyecto text) language sql security invoker set search_path=public as $$
 select proyecto from public.anonymo_publicaciones order by proyecto
$$;

create or replace function public.anonymo_publicar(p_proyecto text,p_base bigint,p_id uuid,p_huella text,p_archivos jsonb,p_trabajo uuid default null,p_propietario uuid default null,p_reserva bigint default null,p_correcto boolean default true,p_error text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare anterior public.anonymo_guardados; actual bigint; vigente public.anonymo_trabajos; motivo text; nueva bigint;
begin
 if p_base is null or p_base<0 or p_id is null or p_proyecto is null or p_huella is null or p_correcto is null or p_proyecto !~ '^[a-z0-9_-]+$' or p_huella !~ '^[a-f0-9]{64}$' then raise exception 'Publicación no válida'; end if;
 if p_archivos is null or jsonb_typeof(p_archivos)<>'object' or octet_length(p_archivos::text)>5242880 then raise exception 'Índice no válido'; end if;
 if not(p_archivos ? 'estado.json') then raise exception 'Falta el estado del proyecto'; end if;
 if exists(select 1 from jsonb_each(p_archivos) e where e.key !~ '^[a-zA-Z0-9_./-]+$' or e.key like '/%' or e.key ~ '(^|/)\.\.?(/|$)' or e.key like '%//%' or jsonb_typeof(e.value)<>'object' or not(e.value ?& array['sha256','objeto','bytes']) or coalesce(e.value->>'sha256','') !~ '^[a-f0-9]{64}$' or e.value->>'objeto' is distinct from '_anonymo/'||p_proyecto||'/'||(e.value->>'sha256') or case when jsonb_typeof(e.value->'bytes')='number' then (e.value->>'bytes')::numeric else -1 end not between 0 and 33554432) then raise exception 'Archivo no válido en el índice'; end if;
 -- Mismo orden de candados que la cola para evitar inversiones al encolar y publicar.
 perform pg_advisory_xact_lock(hashtextextended('anonymo-cola:'||p_proyecto,0));
 select * into anterior from public.anonymo_guardados where id=p_id;
 if found then
  if anterior.proyecto<>p_proyecto or anterior.base<>p_base or anterior.huella<>p_huella or anterior.archivos<>p_archivos or anterior.trabajo is distinct from p_trabajo or anterior.propietario is distinct from p_propietario or anterior.reserva is distinct from p_reserva or anterior.correcto<>p_correcto or anterior.error is distinct from p_error then raise exception 'Identificador reutilizado con otros datos'; end if;
  return jsonb_build_object('estado',anterior.estado,'revision',anterior.revision,'id',p_id);
 end if;
 if p_trabajo is not null then
  select * into vigente from public.anonymo_trabajos where id=p_trabajo and proyecto=p_proyecto for update;
  if not found or vigente.estado<>'ejecutando' or vigente.propietario is distinct from p_propietario or vigente.revision is distinct from p_reserva or vigente.vence<=clock_timestamp() then motivo='reserva-perdida'; end if;
 elsif p_propietario is not null or p_reserva is not null then raise exception 'Reserva incompleta';
 end if;
 select revision into actual from public.anonymo_publicaciones where proyecto=p_proyecto for update;
 actual=coalesce(actual,0);
 if motivo is null and actual<>p_base then motivo='conflicto'; end if;
 if motivo is not null then
  insert into public.anonymo_guardados(id,proyecto,base,huella,archivos,estado,trabajo,propietario,reserva,correcto,error) values(p_id,p_proyecto,p_base,p_huella,p_archivos,motivo,p_trabajo,p_propietario,p_reserva,p_correcto,p_error);
  if motivo='conflicto' and p_trabajo is not null then update public.anonymo_trabajos set estado='error',vence=null,actualizado=clock_timestamp(),resultado=jsonb_build_object('guardado',p_id,'motivo','El proyecto cambió mientras se trabajaba') where id=p_trabajo; end if;
  return jsonb_build_object('estado',motivo,'revision',actual,'id',p_id);
 end if;
 nueva=actual+1;
 insert into public.anonymo_publicaciones(proyecto,revision,archivos) values(p_proyecto,nueva,p_archivos)
 on conflict(proyecto) do update set revision=excluded.revision,archivos=excluded.archivos,actualizado=clock_timestamp();
 insert into public.anonymo_guardados(id,proyecto,base,huella,archivos,estado,revision,trabajo,propietario,reserva,correcto,error) values(p_id,p_proyecto,p_base,p_huella,p_archivos,'publicado',nueva,p_trabajo,p_propietario,p_reserva,p_correcto,p_error);
 if p_trabajo is not null then update public.anonymo_trabajos set estado=case when p_correcto then 'terminado' else 'error' end,vence=null,actualizado=clock_timestamp(),resultado=jsonb_build_object('guardado',p_id,'revision',nueva,'motivo',left(p_error,500)) where id=p_trabajo; end if;
 return jsonb_build_object('estado','publicado','revision',nueva,'id',p_id);
end $$;

create unique index if not exists anonymo_trabajo_por_base on public.anonymo_trabajos(proyecto,((entrada->>'base')::bigint)) where entrada ? 'base';
create or replace function public.anonymo_encolar(p_proyecto text,p_id uuid) returns uuid language plpgsql security invoker set search_path=public as $$
declare actual bigint; anterior uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('anonymo-cola:'||p_proyecto,0));
 select coalesce(revision,0) into actual from public.anonymo_publicaciones where proyecto=p_proyecto;actual=coalesce(actual,0);
 select id into anterior from public.anonymo_trabajos where proyecto=p_proyecto and entrada->>'base'=actual::text;
 if anterior is not null then return anterior; end if;
 select id into anterior from public.anonymo_trabajos where proyecto=p_proyecto and estado in ('cola','ejecutando') order by creado limit 1;
 if anterior is not null then return anterior; end if;
 insert into public.anonymo_trabajos(id,proyecto,entrada) values(p_id,p_proyecto,jsonb_build_object('base',actual));return p_id;
end $$;
create or replace function public.anonymo_pulso(p_id uuid,p_propietario uuid,p_revision bigint,p_vivo jsonb) returns boolean language plpgsql security invoker set search_path=public as $$
declare cantidad integer;
begin
 if octet_length(p_vivo::text)>8192 then raise exception 'Señal demasiado grande'; end if;
 update public.anonymo_trabajos set vence=clock_timestamp()+interval '90 seconds',actualizado=clock_timestamp(),entrada=entrada||jsonb_build_object('vivo',p_vivo)
 where id=p_id and propietario=p_propietario and revision=p_revision and estado='ejecutando' and vence>clock_timestamp();
 get diagnostics cantidad=row_count;return cantidad=1;
end $$;
create or replace function public.anonymo_estado_trabajo(p_proyecto text) returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('id',id,'estado',estado,'propietario',propietario,'revision',revision,'vence',vence,'actualizado',actualizado,'creado',creado,'vivo',entrada->'vivo','resultado',resultado)
 from public.anonymo_trabajos where proyecto=p_proyecto order by creado desc,id desc limit 1
$$;
create or replace function public.anonymo_guardados_de(p_proyecto text) returns table(id uuid,estado text,creado timestamptz,archivos jsonb) language sql security invoker set search_path=public as $$
 select id,estado,creado,archivos from public.anonymo_guardados where proyecto=p_proyecto and estado<>'publicado' order by creado desc limit 20
$$;
revoke all on function public.anonymo_leer_publicacion(text),public.anonymo_listar_publicaciones(),public.anonymo_publicar(text,bigint,uuid,text,jsonb,uuid,uuid,bigint,boolean,text),public.anonymo_encolar(text,uuid),public.anonymo_pulso(uuid,uuid,bigint,jsonb),public.anonymo_estado_trabajo(text),public.anonymo_guardados_de(text) from public,anon,authenticated;
grant execute on function public.anonymo_leer_publicacion(text),public.anonymo_listar_publicaciones(),public.anonymo_publicar(text,bigint,uuid,text,jsonb,uuid,uuid,bigint,boolean,text),public.anonymo_encolar(text,uuid),public.anonymo_pulso(uuid,uuid,bigint,jsonb),public.anonymo_estado_trabajo(text),public.anonymo_guardados_de(text) to service_role;

-- Diagnóstico sin leer filas de proyectos ni crear reservas. No acredita ejecución ni restauración.
create or replace function public.anonymo_preparacion() returns jsonb language sql security invoker set search_path=public as $$
 with funciones as (
  select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
   'anonymo_preparacion','anonymo_leer_publicacion','anonymo_listar_publicaciones',
   'anonymo_publicar','anonymo_encolar','anonymo_pulso','anonymo_estado_trabajo',
   'anonymo_avisos_estado','anonymo_reservar_aviso','anonymo_cerrar_aviso','anonymo_historial','anonymo_guardado','anonymo_restaurar','anonymo_guardados_de','anonymo_tomar_trabajo','anonymo_renovar_trabajo','anonymo_terminar_trabajo')
 ), tablas(nombre) as (values ('public.anonymo_publicaciones'),('public.anonymo_guardados'),('public.anonymo_trabajos'),('public.anonymo_restauraciones'),('public.anonymo_salidas')),
 roles(rol) as (values ('anon'),('authenticated'))
 select jsonb_build_object('protocolo',2,'seguridad',
  current_user='service_role'
  and (select count(distinct proname) from funciones)=17
  and not exists(select 1 from tablas t join pg_class c on c.oid=t.nombre::regclass where not c.relrowsecurity)
  and not exists(select 1 from tablas cross join roles where has_table_privilege(rol,nombre,'select,insert,update,delete'))
  and not exists(select 1 from tablas where not (has_table_privilege('service_role',nombre,'select') and has_table_privilege('service_role',nombre,'insert') and has_table_privilege('service_role',nombre,'update')))
  and not exists(select 1 from funciones cross join roles where has_function_privilege(rol,oid,'execute') or not has_function_privilege('service_role',oid,'execute')))
$$;
revoke all on function public.anonymo_preparacion() from public,anon,authenticated;
grant execute on function public.anonymo_preparacion() to service_role;


-- El historial conserva índices completos; restaurar publica una revisión nueva, sin eliminar las anteriores.
create table if not exists public.anonymo_restauraciones (
 id uuid primary key references public.anonymo_guardados(id),
 proyecto text not null, origen uuid not null references public.anonymo_guardados(id), creado timestamptz not null default now()
);
alter table public.anonymo_restauraciones enable row level security;
revoke all on public.anonymo_restauraciones from public,anon,authenticated;
grant all on public.anonymo_restauraciones to service_role;
create or replace function public.anonymo_historial(p_proyecto text) returns jsonb language sql security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
 select id,estado,revision,base,creado from public.anonymo_guardados where proyecto=p_proyecto order by creado desc,id desc limit 50
 ) t
$$;
create or replace function public.anonymo_guardado(p_proyecto text,p_id uuid) returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('id',id,'estado',estado,'revision',revision,'archivos',archivos,'creado',creado) from public.anonymo_guardados where proyecto=p_proyecto and id=p_id
$$;
create or replace function public.anonymo_restaurar(p_proyecto text,p_base bigint,p_id uuid,p_origen uuid,p_huella text,p_archivos jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare anterior public.anonymo_restauraciones; resultado jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('anonymo-cola:'||p_proyecto,0));
 if not exists(select 1 from public.anonymo_guardados where id=p_origen and proyecto=p_proyecto) then raise exception 'Copia de origen no disponible'; end if;
 select * into anterior from public.anonymo_restauraciones where id=p_id;
 if found then
  if anterior.proyecto<>p_proyecto or anterior.origen<>p_origen then raise exception 'Recibo reutilizado para otra restauración'; end if;
  -- Revalida también base, huella y contenido, sin cancelar trabajos que empezaron después.
  return public.anonymo_publicar(p_proyecto,p_base,p_id,p_huella,p_archivos);
 end if;
 if exists(select 1 from public.anonymo_guardados where id=p_id) then raise exception 'Recibo de otra operación'; end if;
 resultado=public.anonymo_publicar(p_proyecto,p_base,p_id,p_huella,p_archivos);
 insert into public.anonymo_restauraciones(id,proyecto,origen) values(p_id,p_proyecto,p_origen);
 if resultado->>'estado'='publicado' then
  update public.anonymo_trabajos set estado='terminado',vence=null,actualizado=clock_timestamp(),resultado=jsonb_build_object('motivo','Revisión restaurada. El proyecto queda en pausa.')
  where proyecto=p_proyecto and estado in ('cola','ejecutando');
 end if;
 return resultado;
end $$;
revoke all on function public.anonymo_historial(text),public.anonymo_guardado(text,uuid),public.anonymo_restaurar(text,bigint,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.anonymo_historial(text),public.anonymo_guardado(text,uuid),public.anonymo_restaurar(text,bigint,uuid,uuid,text,jsonb) to service_role;

create table if not exists public.anonymo_salidas (
 proyecto text not null, evento uuid not null, canal text not null check(canal in ('correo','webhook')), config text not null, quien text check(quien in ('jay','luna')),
 estado text not null check(estado in ('enviando','enviado','pendiente','revisar')), propietario uuid, vence timestamptz,
 intentos integer not null default 0, creado timestamptz not null default clock_timestamp(), actualizado timestamptz not null default clock_timestamp(),
 primary key(proyecto,evento,canal)
);
alter table public.anonymo_salidas enable row level security;
revoke all on public.anonymo_salidas from public,anon,authenticated;
grant all on public.anonymo_salidas to service_role;
create or replace function public.anonymo_avisos_estado(p_proyecto text) returns jsonb language sql security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('evento',evento,'canal',canal,'estado',case when estado='enviado' then 'enviado' when estado='enviando' and vence>clock_timestamp() then 'enviando' when estado='revisar' or intentos>=3 or creado<clock_timestamp()-interval '23 hours' then 'revisar' else 'pendiente' end,'intentos',intentos)),'[]'::jsonb) from public.anonymo_salidas where proyecto=p_proyecto
$$;
create or replace function public.anonymo_reservar_aviso(p_proyecto text,p_evento uuid,p_ruta text,p_huella text,p_canal text,p_config text,p_propietario uuid,p_quien text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare salida public.anonymo_salidas;
begin
 if p_quien is null or p_quien not in ('jay','luna') then raise exception 'Falta quien envía';end if;
 if p_evento is null or p_propietario is null or p_canal not in ('correo','webhook') or p_config is null or p_config !~ '^[a-f0-9]{64}$' or p_ruta !~ '^avisos-cola/[0-9]{17}_[a-f0-9-]{36}\.json$' or right(p_ruta,42)<>'_'||p_evento::text||'.json' then raise exception 'Aviso no válido';end if;
 perform pg_advisory_xact_lock(hashtextextended('anonymo-cola:'||p_proyecto,0));
 if not exists(select 1 from public.anonymo_publicaciones where proyecto=p_proyecto and archivos->p_ruta->>'sha256'=p_huella) then raise exception 'Aviso no confirmado';end if;
 insert into public.anonymo_salidas(proyecto,evento,canal,config,estado) values(p_proyecto,p_evento,p_canal,p_config,'pendiente') on conflict do nothing;
 select * into salida from public.anonymo_salidas where proyecto=p_proyecto and evento=p_evento and canal=p_canal for update;
 if salida.config<>p_config then raise exception 'Cambió el destino del aviso';end if;
 if salida.estado in ('enviado','revisar') or (salida.estado='enviando' and salida.vence>clock_timestamp()) then return false;end if;
 -- El proveedor puede olvidar las claves de deduplicación: no se reintenta fuera de esta ventana.
 if salida.intentos>=3 or salida.creado<clock_timestamp()-interval '23 hours' then update public.anonymo_salidas set estado='revisar',vence=null where proyecto=p_proyecto and evento=p_evento and canal=p_canal;return false;end if;
 update public.anonymo_salidas set estado='enviando',quien=p_quien,propietario=p_propietario,vence=clock_timestamp()+interval '60 seconds',intentos=intentos+1,actualizado=clock_timestamp() where proyecto=p_proyecto and evento=p_evento and canal=p_canal;
 return true;
end $$;
create or replace function public.anonymo_cerrar_aviso(p_proyecto text,p_evento uuid,p_canal text,p_propietario uuid,p_correcto boolean)
returns boolean language plpgsql security invoker set search_path=public as $$
declare cantidad integer;
begin
 if p_correcto is null then raise exception 'Falta el resultado';end if;
 update public.anonymo_salidas set estado=case when p_correcto then 'enviado' when intentos>=3 then 'revisar' else 'pendiente' end,vence=null,actualizado=clock_timestamp()
 where proyecto=p_proyecto and evento=p_evento and canal=p_canal and propietario=p_propietario and estado='enviando' and vence>clock_timestamp();
 get diagnostics cantidad=row_count;return cantidad=1;
end $$;
revoke all on function public.anonymo_avisos_estado(text),public.anonymo_reservar_aviso(text,uuid,text,text,text,text,uuid,text),public.anonymo_cerrar_aviso(text,uuid,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.anonymo_avisos_estado(text),public.anonymo_reservar_aviso(text,uuid,text,text,text,text,uuid,text),public.anonymo_cerrar_aviso(text,uuid,text,uuid,boolean) to service_role;

-- Hace visibles los RPC nuevos en PostgREST después de aplicar la migración.
notify pgrst, 'reload schema';
