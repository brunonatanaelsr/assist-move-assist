-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ReportType" AS ENUM ('DASHBOARD', 'PROJECT', 'FORM', 'REGIONAL');

-- CreateEnum
CREATE TYPE "public"."ChartType" AS ENUM ('LINE', 'BAR', 'PIE', 'DOUGHNUT');

-- CreateEnum
CREATE TYPE "public"."ReportScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('OFICINA', 'REUNIAO', 'ATIVIDADE', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('AGENDADO', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "public"."RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."ParticipantResponse" AS ENUM ('ACCEPTED', 'DECLINED', 'TENTATIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('EMAIL', 'PUSH', 'SMS');

-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'user',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "avatar_url" TEXT,
    "ultimo_login" TIMESTAMP(3),
    "cargo" TEXT,
    "departamento" TEXT,
    "bio" TEXT,
    "telefone" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."beneficiarias" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "rg" TEXT,
    "rg_orgao_emissor" TEXT,
    "rg_data_emissao" DATE,
    "nis" TEXT,
    "data_nascimento" DATE NOT NULL,
    "telefone" TEXT,
    "telefone_secundario" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "referencia_endereco" TEXT,
    "escolaridade" TEXT,
    "estado_civil" TEXT,
    "num_dependentes" INTEGER DEFAULT 0,
    "renda_familiar" DECIMAL(10,2),
    "situacao_moradia" TEXT,
    "observacoes_socioeconomicas" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "observacoes" TEXT,
    "historico_violencia" TEXT,
    "tipo_violencia" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medida_protetiva" BOOLEAN DEFAULT false,
    "acompanhamento_juridico" BOOLEAN DEFAULT false,
    "acompanhamento_psicologico" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "usuario_id" INTEGER,

    CONSTRAINT "beneficiarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."beneficiaria_familiares" (
    "id" SERIAL NOT NULL,
    "beneficiaria_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "parentesco" TEXT,
    "data_nascimento" DATE,
    "trabalha" BOOLEAN,
    "renda_mensal" DECIMAL(10,2),
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiaria_familiares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vulnerabilidades" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "vulnerabilidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."beneficiaria_vulnerabilidades" (
    "beneficiaria_id" INTEGER NOT NULL,
    "vulnerabilidade_id" INTEGER NOT NULL,
    "apontada_em" DATE,

    CONSTRAINT "beneficiaria_vulnerabilidades_pkey" PRIMARY KEY ("beneficiaria_id","vulnerabilidade_id")
);

-- CreateTable
CREATE TABLE "public"."projetos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "data_inicio" DATE,
    "data_fim_prevista" DATE,
    "status" TEXT NOT NULL DEFAULT 'planejamento',
    "responsavel_id" INTEGER,
    "orcamento" DECIMAL(12,2),
    "local_execucao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."participacoes" (
    "id" SERIAL NOT NULL,
    "projeto_id" INTEGER NOT NULL,
    "beneficiaria_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inscrita',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_inscricao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oficinas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "instrutor" TEXT,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "horario_inicio" TIME,
    "horario_fim" TIME,
    "local" TEXT,
    "tipo" TEXT,
    "vagas_total" INTEGER NOT NULL DEFAULT 0,
    "projeto_id" INTEGER,
    "responsavel_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "oficinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."participacao_oficinas" (
    "id" SERIAL NOT NULL,
    "oficina_id" INTEGER NOT NULL,
    "beneficiaria_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inscrita',
    "data_inscricao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_conclusao" TIMESTAMP(3),
    "frequencia" INTEGER NOT NULL DEFAULT 0,
    "avaliacao" INTEGER,
    "feedback" TEXT,
    "certificado_emitido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "participacao_oficinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oficina_presencas" (
    "id" SERIAL NOT NULL,
    "oficina_id" INTEGER NOT NULL,
    "beneficiaria_id" INTEGER NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "data_registro" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "data_encontro" DATE NOT NULL,

    CONSTRAINT "oficina_presencas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."formularios" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "beneficiaria_id" INTEGER NOT NULL,
    "data_preenchimento" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "dados" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "usuario_id" INTEGER,

    CONSTRAINT "formularios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."historico_atendimentos" (
    "id" SERIAL NOT NULL,
    "beneficiaria_id" INTEGER NOT NULL,
    "tipo_atendimento" TEXT NOT NULL,
    "data_atendimento" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "encaminhamentos" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "usuario_id" INTEGER,

    CONSTRAINT "historico_atendimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."historico_status_beneficiaria" (
    "id" SERIAL NOT NULL,
    "beneficiaria_id" INTEGER NOT NULL,
    "status_anterior" TEXT,
    "status_novo" TEXT NOT NULL,
    "observacao" TEXT,
    "data_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_status_beneficiaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."planos_acao" (
    "id" SERIAL NOT NULL,
    "beneficiaria_id" INTEGER NOT NULL,
    "criado_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "objetivo_principal" TEXT NOT NULL,
    "areas_prioritarias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observacoes" TEXT,
    "primeira_avaliacao_em" DATE,
    "primeira_avaliacao_nota" TEXT,
    "segunda_avaliacao_em" DATE,
    "segunda_avaliacao_nota" TEXT,
    "assinatura_beneficiaria" TEXT,
    "assinatura_responsavel" TEXT,

    CONSTRAINT "planos_acao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plano_acao_itens" (
    "id" SERIAL NOT NULL,
    "plano_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "responsavel" TEXT,
    "prazo" DATE,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "suporte_oferecido" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plano_acao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ReportType" NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "metrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "charts" JSONB NOT NULL DEFAULT '{}',
    "schedule" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "updated_by_id" INTEGER NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_executions" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "execution_time" INTEGER,
    "output_format" TEXT NOT NULL,
    "output_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "template_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "action_url" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT false,
    "mention_notifications" BOOLEAN NOT NULL DEFAULT true,
    "assignment_notifications" BOOLEAN NOT NULL DEFAULT true,
    "activity_notifications" BOOLEAN NOT NULL DEFAULT true,
    "form_response_notifications" BOOLEAN NOT NULL DEFAULT true,
    "reminder_notifications" BOOLEAN NOT NULL DEFAULT true,
    "notification_types" TEXT[] DEFAULT ARRAY['info', 'success', 'warning', 'error']::TEXT[],
    "quiet_hours_start" TIME,
    "quiet_hours_end" TIME,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_events" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "type" "public"."EventType" NOT NULL,
    "status" "public"."EventStatus" NOT NULL,
    "project_id" INTEGER,
    "organizer_id" INTEGER NOT NULL,
    "recurrence_rule_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurrence_rules" (
    "id" SERIAL NOT NULL,
    "frequency" "public"."RecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "until_date" TIMESTAMP(3),
    "by_weekday" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "exceptions" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurrence_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_participants" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "response" "public"."ParticipantResponse" NOT NULL DEFAULT 'PENDING',
    "attended" BOOLEAN,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_notifications" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "minutes_before" INTEGER NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_for" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feed_posts" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'noticia',
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "imagem_url" TEXT,
    "autor_id" TEXT,
    "autor_nome" TEXT,
    "curtidas" INTEGER NOT NULL DEFAULT 0,
    "comentarios" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."comentarios_feed" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "autor_id" TEXT,
    "autor_nome" TEXT,
    "autor_foto" TEXT,
    "conteudo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comentarios_feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "public"."usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiarias_codigo_key" ON "public"."beneficiarias"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiarias_cpf_key" ON "public"."beneficiarias"("cpf");

-- CreateIndex
CREATE INDEX "beneficiarias_status_idx" ON "public"."beneficiarias"("status");

-- CreateIndex
CREATE INDEX "beneficiaria_familiares_beneficiaria_id_idx" ON "public"."beneficiaria_familiares"("beneficiaria_id");

-- CreateIndex
CREATE UNIQUE INDEX "vulnerabilidades_slug_key" ON "public"."vulnerabilidades"("slug");

-- CreateIndex
CREATE INDEX "beneficiaria_vulnerabilidades_vulnerabilidade_id_idx" ON "public"."beneficiaria_vulnerabilidades"("vulnerabilidade_id");

-- CreateIndex
CREATE INDEX "projetos_status_idx" ON "public"."projetos"("status");

-- CreateIndex
CREATE INDEX "participacoes_projeto_id_idx" ON "public"."participacoes"("projeto_id");

-- CreateIndex
CREATE INDEX "participacoes_beneficiaria_id_idx" ON "public"."participacoes"("beneficiaria_id");

-- CreateIndex
CREATE INDEX "oficinas_status_idx" ON "public"."oficinas"("status");

-- CreateIndex
CREATE INDEX "oficinas_data_inicio_data_fim_idx" ON "public"."oficinas"("data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "participacao_oficinas_beneficiaria_id_idx" ON "public"."participacao_oficinas"("beneficiaria_id");

-- CreateIndex
CREATE UNIQUE INDEX "participacao_oficinas_oficina_id_beneficiaria_id_key" ON "public"."participacao_oficinas"("oficina_id", "beneficiaria_id");

-- CreateIndex
CREATE INDEX "oficina_presencas_beneficiaria_id_idx" ON "public"."oficina_presencas"("beneficiaria_id");

-- CreateIndex
CREATE INDEX "oficina_presencas_data_encontro_idx" ON "public"."oficina_presencas"("data_encontro");

-- CreateIndex
CREATE UNIQUE INDEX "oficina_presencas_oficina_id_beneficiaria_id_data_encontro_key" ON "public"."oficina_presencas"("oficina_id", "beneficiaria_id", "data_encontro");

-- CreateIndex
CREATE INDEX "formularios_tipo_idx" ON "public"."formularios"("tipo");

-- CreateIndex
CREATE INDEX "formularios_beneficiaria_id_idx" ON "public"."formularios"("beneficiaria_id");

-- CreateIndex
CREATE INDEX "historico_atendimentos_beneficiaria_id_idx" ON "public"."historico_atendimentos"("beneficiaria_id");

-- CreateIndex
CREATE INDEX "historico_atendimentos_data_atendimento_idx" ON "public"."historico_atendimentos"("data_atendimento");

-- CreateIndex
CREATE INDEX "historico_status_beneficiaria_beneficiaria_id_idx" ON "public"."historico_status_beneficiaria"("beneficiaria_id");

-- CreateIndex
CREATE INDEX "planos_acao_beneficiaria_id_idx" ON "public"."planos_acao"("beneficiaria_id");

-- CreateIndex
CREATE INDEX "plano_acao_itens_plano_id_idx" ON "public"."plano_acao_itens"("plano_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "public"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "public"."notifications"("read");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "public"."notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "calendar_events_start_date_end_date_idx" ON "public"."calendar_events"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "calendar_events_type_idx" ON "public"."calendar_events"("type");

-- CreateIndex
CREATE INDEX "calendar_events_status_idx" ON "public"."calendar_events"("status");

-- CreateIndex
CREATE INDEX "calendar_events_project_id_idx" ON "public"."calendar_events"("project_id");

-- CreateIndex
CREATE INDEX "calendar_events_organizer_id_idx" ON "public"."calendar_events"("organizer_id");

-- CreateIndex
CREATE INDEX "event_participants_participant_id_idx" ON "public"."event_participants"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_event_id_participant_id_key" ON "public"."event_participants"("event_id", "participant_id");

-- CreateIndex
CREATE INDEX "calendar_notifications_event_id_idx" ON "public"."calendar_notifications"("event_id");

-- CreateIndex
CREATE INDEX "calendar_notifications_sent_idx" ON "public"."calendar_notifications"("sent");

-- CreateIndex
CREATE INDEX "feed_posts_ativo_idx" ON "public"."feed_posts"("ativo");

-- CreateIndex
CREATE INDEX "comentarios_feed_post_id_idx" ON "public"."comentarios_feed"("post_id");

-- AddForeignKey
ALTER TABLE "public"."beneficiarias" ADD CONSTRAINT "beneficiarias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."beneficiaria_familiares" ADD CONSTRAINT "beneficiaria_familiares_beneficiaria_id_fkey" FOREIGN KEY ("beneficiaria_id") REFERENCES "public"."beneficiarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."beneficiaria_vulnerabilidades" ADD CONSTRAINT "beneficiaria_vulnerabilidades_beneficiaria_id_fkey" FOREIGN KEY ("beneficiaria_id") REFERENCES "public"."beneficiarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."beneficiaria_vulnerabilidades" ADD CONSTRAINT "beneficiaria_vulnerabilidades_vulnerabilidade_id_fkey" FOREIGN KEY ("vulnerabilidade_id") REFERENCES "public"."vulnerabilidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projetos" ADD CONSTRAINT "projetos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."participacoes" ADD CONSTRAINT "participacoes_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."participacoes" ADD CONSTRAINT "participacoes_beneficiaria_id_fkey" FOREIGN KEY ("beneficiaria_id") REFERENCES "public"."beneficiarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oficinas" ADD CONSTRAINT "oficinas_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oficinas" ADD CONSTRAINT "oficinas_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."participacao_oficinas" ADD CONSTRAINT "participacao_oficinas_oficina_id_fkey" FOREIGN KEY ("oficina_id") REFERENCES "public"."oficinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."participacao_oficinas" ADD CONSTRAINT "participacao_oficinas_beneficiaria_id_fkey" FOREIGN KEY ("beneficiaria_id") REFERENCES "public"."beneficiarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oficina_presencas" ADD CONSTRAINT "oficina_presencas_oficina_id_fkey" FOREIGN KEY ("oficina_id") REFERENCES "public"."oficinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oficina_presencas" ADD CONSTRAINT "oficina_presencas_beneficiaria_id_fkey" FOREIGN KEY ("beneficiaria_id") REFERENCES "public"."beneficiarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."formularios" ADD CONSTRAINT "formularios_beneficiaria_id_fkey" FOREIGN KEY ("beneficiaria_id") REFERENCES "public"."beneficiarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."formularios" ADD CONSTRAINT "formularios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."historico_atendimentos" ADD CONSTRAINT "historico_atendimentos_beneficiaria_id_fkey" FOREIGN KEY ("beneficiaria_id") REFERENCES "public"."beneficiarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."historico_atendimentos" ADD CONSTRAINT "historico_atendimentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."historico_status_beneficiaria" ADD CONSTRAINT "historico_status_beneficiaria_beneficiaria_id_fkey" FOREIGN KEY ("beneficiaria_id") REFERENCES "public"."beneficiarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."planos_acao" ADD CONSTRAINT "planos_acao_beneficiaria_id_fkey" FOREIGN KEY ("beneficiaria_id") REFERENCES "public"."beneficiarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."planos_acao" ADD CONSTRAINT "planos_acao_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plano_acao_itens" ADD CONSTRAINT "plano_acao_itens_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "public"."planos_acao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_templates" ADD CONSTRAINT "report_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_templates" ADD CONSTRAINT "report_templates_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_executions" ADD CONSTRAINT "report_executions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_executions" ADD CONSTRAINT "report_executions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_recurrence_rule_id_fkey" FOREIGN KEY ("recurrence_rule_id") REFERENCES "public"."recurrence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_participants" ADD CONSTRAINT "event_participants_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_notifications" ADD CONSTRAINT "calendar_notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comentarios_feed" ADD CONSTRAINT "comentarios_feed_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

