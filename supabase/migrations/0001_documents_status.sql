-- ============================================================
-- 0001_documents_status.sql
-- Contrato Android nativo (bizflow.cloud-android).
-- Adiciona a coluna `status` na tabela documents + CHECK constraint.
-- Os valores sao EXATAMENTE os `DocumentStatus.name` que o Room grava:
--   PENDENTE, EMITIDO, PAGO, ANULADO
-- (RASCUNHO nao entra: duplica PENDENTE; o legado DRAFT -> PENDENTE ja cobre)
-- Idempotente: pode ser aplicado varias vezes sem erro.
-- ============================================================

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDENTE';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_status_check') THEN
        ALTER TABLE public.documents
            ADD CONSTRAINT documents_status_check
            CHECK (status IN ('PENDENTE', 'EMITIDO', 'PAGO', 'ANULADO'));
    END IF;
END $$;