drop table if exists comments;
create table if not exists comments (
    id integer primary key autoincrement,
    author text not null,
    body text not null,
    post_slug text not null
);

insert into comments (author, body, post_slug) values
    ('Francisco', 'Muy buen tutorial, me sirvió mucho.', 'introduccion-a-d1'),
    ('Laura', '¿Se puede usar D1 con Workers y con Pages?', 'introduccion-a-d1'),
    ('Carlos', 'No me funcionaba hasta que usé sqlite_master.', 'introduccion-a-d1'),
    ('Marta', 'Gracias por explicar la diferencia entre local y remoto.', 'wrangler-local-vs-remoto'),
    ('Javier', 'Estaría bien un ejemplo con migraciones.', 'wrangler-local-vs-remoto'),
    ('Ana', 'Me encantó el post, lo compartí con mi equipo.', 'primeros-pasos-con-workers');

create index idx_comments_post_slug on comments (post_slug);