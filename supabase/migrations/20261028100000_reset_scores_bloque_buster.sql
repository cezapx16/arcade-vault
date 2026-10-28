-- BLOQUE BUSTER pasa a ser un juego real (SPEC 08): reset de las puntuaciones del simulado.

delete from public.scores where game_id = 'bloque-buster';
