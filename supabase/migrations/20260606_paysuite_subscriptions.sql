-- ============================================
-- PaySuite + Subscriptions para BizFlow
-- ============================================

-- 1. Tabela de planos
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price_mzn NUMERIC(10,2) NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de subscrições
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'trial')),
  pay_suite_payment_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de histórico de pagamentos
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'MZN',
  plan_name TEXT,
  method TEXT,
  pay_suite_reference TEXT,
  pay_suite_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_reference ON payment_history(pay_suite_reference);

-- 5. Inserir planos (se não existirem)
INSERT INTO plans (name, price_mzn, description, features) VALUES
  ('Grátis', 0, 'Para começar sem compromisso', '["1 negócio", "10 clientes/mês", "Documentos básicos", "Suporte por WhatsApp"]'),
  ('Pro', 250, 'Para freelancers a sério', '["Negócios ilimitados", "Clientes ilimitados", "Relatórios avançados", "Multi-moeda", "Suporte prioritário WhatsApp"]'),
  ('Empresarial', 500, 'Para empresas em crescimento', '["Tudo do Pro", "Acesso para equipa (3 users)", "Contabilidade simplificada", "Suporte prioritário 24h"]')
ON CONFLICT (name) DO UPDATE SET
  price_mzn = EXCLUDED.price_mzn,
  description = EXCLUDED.description,
  features = EXCLUDED.features;

-- 6. RLS (Row Level Security)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Utilizador vê apenas a sua subscrição
CREATE POLICY "Users view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Utilizador vê apenas os seus pagamentos
CREATE POLICY "Users view own payments" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

-- Apenas service_role pode inserir/actualizar
CREATE POLICY "Service role manage subscriptions" ON subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role manage payments" ON payment_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Planos são públicos (leitura)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view plans" ON plans
  FOR SELECT USING (true);
