-- Fix: overall_score von INT auf NUMERIC(3,1) ändern
-- Erlaubt Dezimalwerte wie 3.4 statt nur gerundete Ganzzahlen
-- Idempotent: kann mehrfach laufen
ALTER TABLE fit_assessments ALTER COLUMN overall_score TYPE NUMERIC(3,1);
