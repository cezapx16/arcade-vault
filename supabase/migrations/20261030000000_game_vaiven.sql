-- VAIVÉN entra como juego nuevo (SPEC 12): fila en el catálogo, sin seed de puntuaciones.

insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('vaiven', 'VAIVÉN', 'Cruza, voltea y vuelve más rápido.', 'Salta carril a carril por una autopista de neón y un río de datos. Al llegar a la otra orilla el tablero se voltea y toca volver, cada viaje más rápido. Esquiva por los pelos y la racha multiplica tus puntos.', 'ARCADE', 'cover-vaiven', 'green', 9)
on conflict (id) do nothing;
