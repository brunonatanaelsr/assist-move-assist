-- Migration: 2025_08_20_04_create_security_functions.sql

-- Function para verificar tentativas de login
CREATE OR REPLACE FUNCTION check_login_attempts(
    p_user_id INTEGER,
    p_ip_address TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_recent_failures INTEGER;
    v_is_blocked BOOLEAN;
BEGIN
    -- Verificar tentativas falhas nos últimos 15 minutos
    SELECT COUNT(*)
    INTO v_recent_failures
    FROM auth_audit
    WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND event_type = 'login'::auth_event_type
    AND status = 'failure'::auth_status
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes';

    -- Verificar se está bloqueado
    SELECT EXISTS (
        SELECT 1
        FROM auth_audit
        WHERE (user_id = p_user_id OR ip_address = p_ip_address)
        AND event_type = 'account_locked'::auth_event_type
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    ) INTO v_is_blocked;

    -- Se já está bloqueado, retorna false
    IF v_is_blocked THEN
        RETURN FALSE;
    END IF;

    -- Se excedeu tentativas, bloqueia e retorna false
    IF v_recent_failures >= 5 THEN
        PERFORM log_auth_event(
            p_user_id,
            'account_locked'::auth_event_type,
            p_ip_address,
            NULL,
            'blocked'::auth_status,
            jsonb_build_object(
                'reason', 'Too many failed attempts',
                'failed_attempts', v_recent_failures
            )
        );
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function para revogar todos os tokens de um usuário
CREATE OR REPLACE FUNCTION revoke_all_user_tokens(
    p_user_id INTEGER,
    p_reason TEXT DEFAULT 'Manual revocation'
) RETURNS void AS $$
BEGIN
    -- Incrementar versão do token do usuário
    UPDATE usuarios
    SET token_version = token_version + 1,
        sessoes_ativas = 0
    WHERE id = p_user_id;

    -- Marcar todos os tokens como revogados
    UPDATE refresh_tokens
    SET revoked = TRUE,
        revoked_reason = p_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id
    AND revoked = FALSE;

    -- Registrar o evento
    PERFORM log_auth_event(
        p_user_id,
        'logout'::auth_event_type,
        NULL,
        NULL,
        'success'::auth_status,
        jsonb_build_object(
            'action', 'revoke_all_tokens',
            'reason', p_reason
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function para limpar sessões antigas
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
    -- Revogar tokens não utilizados por mais de 7 dias
    UPDATE refresh_tokens
    SET revoked = TRUE,
        revoked_reason = 'Session timeout',
        updated_at = CURRENT_TIMESTAMP
    WHERE last_used < CURRENT_TIMESTAMP - INTERVAL '7 days'
    AND revoked = FALSE;

    -- Atualizar contagem de sessões ativas
    WITH active_sessions AS (
        SELECT user_id, COUNT(*) as count
        FROM refresh_tokens
        WHERE revoked = FALSE
        GROUP BY user_id
    )
    UPDATE usuarios u
    SET sessoes_ativas = COALESCE(a.count, 0)
    FROM active_sessions a
    WHERE u.id = a.user_id;
END;
$$ LANGUAGE plpgsql;

-- Agendar limpeza de sessões (requer extensão pg_cron)
SELECT cron.schedule(
    'cleanup-stale-sessions',
    '0 */12 * * *', -- A cada 12 horas
    $$SELECT cleanup_stale_sessions()$$
);
