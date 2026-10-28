-- CAÍDA pasa a ser un juego real (SPEC 07): texto largo nuevo y reset de las puntuaciones del simulado.

update public.games
  set long = 'Ocho piezas caen desde la oscuridad, incluida una tuerca hueca que no perdona. Gíralas, encájalas y limpia líneas para sobrevivir; cada 10 líneas la caída se acelera sin piedad.'
  where id = 'caida';

delete from public.scores where game_id = 'caida';
