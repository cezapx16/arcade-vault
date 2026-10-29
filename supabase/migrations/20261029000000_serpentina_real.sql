-- SERPENTINA pasa a ser un juego real (SPEC 09): texto largo nuevo y reset de las puntuaciones del simulado.

update public.games
  set long = 'Una serpiente de luz recorre la grilla devorando fruta pixelada. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.'
  where id = 'serpentina';

delete from public.scores where game_id = 'serpentina';
