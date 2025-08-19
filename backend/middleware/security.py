from django.http import HttpResponseForbidden
from django.conf import settings
import re
import logging

logger = logging.getLogger(__name__)

class SecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # Compilar regex para inputs maliciosos
        self.sql_injection_pattern = re.compile(
            r'(\b(union|select|insert|update|delete|drop|alter)\b)|(-{2})|(/\*.*\*/)', 
            re.IGNORECASE
        )
        self.xss_pattern = re.compile(
            r'<[^>]*script|javascript:|data:text/html|<[^>]*embed|<[^>]*object|<[^>]*iframe',
            re.IGNORECASE
        )

    def __call__(self, request):
        # Verificar potenciais ataques
        if self._check_security_violations(request):
            logger.warning(f"Tentativa de ataque detectada de {request.META.get('REMOTE_ADDR')}")
            return HttpResponseForbidden("Requisição bloqueada por motivos de segurança")

        response = self.get_response(request)
        
        # Adicionar headers de segurança
        self._add_security_headers(response)
        
        return response

    def _check_security_violations(self, request):
        # Verificar query parameters
        query_string = request.META.get('QUERY_STRING', '')
        if self._check_malicious_content(query_string):
            return True

        # Verificar corpo da requisição
        if request.method in ['POST', 'PUT', 'PATCH']:
            body = str(request.body)
            if self._check_malicious_content(body):
                return True

        # Verificar headers suspeitos
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        if self._check_malicious_content(user_agent):
            return True

        return False

    def _check_malicious_content(self, content):
        # Verificar SQL Injection
        if self.sql_injection_pattern.search(content):
            return True
        
        # Verificar XSS
        if self.xss_pattern.search(content):
            return True

        return False

    def _add_security_headers(self, response):
        # Headers básicos de segurança
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Adicionar CSP se não existir
        if not response.has_header('Content-Security-Policy'):
            csp_value = "; ".join([
                "default-src 'self'",
                "img-src 'self' data: https:",
                "style-src 'self' 'unsafe-inline'",
                "script-src 'self'",
                "connect-src 'self'",
                "frame-ancestors 'none'",
                "form-action 'self'",
                "base-uri 'self'",
            ])
            response['Content-Security-Policy'] = csp_value

class ContentSecurityPolicyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        if settings.DEBUG:
            # Política mais permissiva em desenvolvimento
            csp = {
                'default-src': ["'self'"],
                'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                'style-src': ["'self'", "'unsafe-inline'"],
                'img-src': ["'self'", 'data:', 'blob:'],
                'connect-src': ["'self'", 'ws:', 'wss:'],
            }
        else:
            # Política estrita em produção
            csp = {
                'default-src': ["'self'"],
                'script-src': ["'self'"],
                'style-src': ["'self'"],
                'img-src': ["'self'", 'data:'],
                'connect-src': ["'self'"],
                'frame-ancestors': ["'none'"],
                'form-action': ["'self'"],
                'base-uri': ["'self'"],
            }

        response['Content-Security-Policy'] = self._build_csp_header(csp)
        return response

    def _build_csp_header(self, csp_dict):
        return '; '.join(f"{key} {' '.join(values)}" for key, values in csp_dict.items())
