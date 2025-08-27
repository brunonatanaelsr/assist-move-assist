-- Sistema de Permissões e Roles
CREATE TYPE permission_type AS ENUM ('read', 'write', 'delete', 'admin');
CREATE TYPE module_type AS ENUM ('beneficiarias', 'formularios', 'oficinas', 'relatorios', 'usuarios', 'sistema');

CREATE TABLE user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    module module_type NOT NULL,
    permission permission_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, module, permission)
);

-- Oficinas e controle de presença
CREATE TABLE oficinas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR NOT NULL,
    descricao TEXT,
    instrutor VARCHAR NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    dias_semana TEXT[] NOT NULL, -- ['segunda', 'quarta', 'sexta']
    vagas_totais INTEGER DEFAULT 20,
    vagas_ocupadas INTEGER DEFAULT 0,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE oficinas_participantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    oficina_id UUID REFERENCES oficinas(id) ON DELETE CASCADE,
    beneficiaria_id UUID REFERENCES beneficiarias(id) ON DELETE CASCADE,
    data_matricula DATE DEFAULT CURRENT_DATE,
    status VARCHAR DEFAULT 'ativa' CHECK (status IN ('ativa', 'suspensa', 'concluida', 'desistente')),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(oficina_id, beneficiaria_id)
);

CREATE TABLE presencas_oficinas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    oficina_id UUID REFERENCES oficinas(id) ON DELETE CASCADE,
    beneficiaria_id UUID REFERENCES beneficiarias(id) ON DELETE CASCADE,
    data_aula DATE NOT NULL,
    presente BOOLEAN NOT NULL DEFAULT false,
    observacoes TEXT,
    registrado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(oficina_id, beneficiaria_id, data_aula)
);

-- Sistema de mensagens
CREATE TABLE conversas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo VARCHAR DEFAULT 'individual' CHECK (tipo IN ('individual', 'grupo')),
    nome_grupo VARCHAR, -- apenas para grupos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversas_participantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversa_id, user_id)
);

CREATE TABLE mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    tipo VARCHAR DEFAULT 'texto' CHECK (tipo IN ('texto', 'arquivo', 'imagem')),
    arquivo_url TEXT,
    editada BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sistema de notificações
CREATE TABLE notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo VARCHAR NOT NULL,
    conteudo TEXT NOT NULL,
    tipo VARCHAR DEFAULT 'info' CHECK (tipo IN ('info', 'aviso', 'aniversario', 'sistema', 'urgente')),
    lida BOOLEAN DEFAULT false,
    data_leitura TIMESTAMPTZ,
    url_acao VARCHAR, -- link para ação relacionada
    metadata JSONB, -- dados extras
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feed de avisos/posts
CREATE TABLE feed_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo VARCHAR NOT NULL,
    conteudo TEXT NOT NULL,
    tipo VARCHAR DEFAULT 'aviso' CHECK (tipo IN ('aviso', 'noticia', 'evento', 'importante')),
    anexo_url TEXT,
    fixado BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE oficinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE oficinas_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas_oficinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Permissões: apenas admins podem gerenciar
CREATE POLICY "Admins can manage permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND tipo_usuario = 'admin')
    );

-- Oficinas: profissionais podem ver, admins podem gerenciar
CREATE POLICY "Authenticated users can view oficinas" ON oficinas
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage oficinas" ON oficinas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND tipo_usuario = 'admin')
    );

-- Participantes e presenças: profissionais podem gerenciar
CREATE POLICY "Authenticated users can manage participants" ON oficinas_participantes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Authenticated users can manage attendance" ON presencas_oficinas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid())
    );

-- Mensagens: usuários podem ver conversas onde participam
CREATE POLICY "Users can view their conversations" ON conversas
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM conversas_participantes WHERE conversa_id = id AND user_id = auth.uid())
    );

CREATE POLICY "Users can manage conversation participants" ON conversas_participantes
    FOR ALL USING (
        user_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND tipo_usuario = 'admin')
    );

CREATE POLICY "Users can view messages in their conversations" ON mensagens
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM conversas_participantes WHERE conversa_id = mensagens.conversa_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can send messages" ON mensagens
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (SELECT 1 FROM conversas_participantes WHERE conversa_id = mensagens.conversa_id AND user_id = auth.uid())
    );

-- Notificações: usuários veem apenas suas notificações
CREATE POLICY "Users can view their notifications" ON notificacoes
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notificacoes
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notificacoes
    FOR INSERT WITH CHECK (true);

-- Feed: todos podem ver, admins podem gerenciar
CREATE POLICY "Authenticated users can view feed" ON feed_posts
    FOR SELECT USING (
        ativo = true AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage feed" ON feed_posts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND tipo_usuario = 'admin')
    );

-- Triggers para timestamps
CREATE TRIGGER update_oficinas_updated_at
    BEFORE UPDATE ON oficinas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversas_updated_at
    BEFORE UPDATE ON conversas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mensagens_updated_at
    BEFORE UPDATE ON mensagens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feed_posts_updated_at
    BEFORE UPDATE ON feed_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
