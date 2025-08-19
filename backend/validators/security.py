from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
import re
import bleach
import html

class SecurityValidators:
    @staticmethod
    def validate_no_sql_injection(value):
        """
        Valida se o valor não contém padrões de SQL injection
        """
        sql_patterns = [
            r'\bSELECT\b.*\bFROM\b',
            r'\bUNION\b.*\bSELECT\b',
            r'\bINSERT\b.*\bINTO\b',
            r'\bUPDATE\b.*\bSET\b',
            r'\bDELETE\b.*\bFROM\b',
            r'\bDROP\b.*\bTABLE\b',
            r'--',
            r'/\*.*\*/',
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                raise ValidationError(
                    _('Entrada inválida detectada'),
                    code='invalid'
                )

    @staticmethod
    def validate_no_xss(value):
        """
        Valida se o valor não contém padrões de XSS
        """
        xss_patterns = [
            r'<[^>]*script',
            r'javascript:',
            r'data:text/html',
            r'<[^>]*embed',
            r'<[^>]*object',
            r'<[^>]*iframe',
        ]
        
        for pattern in xss_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                raise ValidationError(
                    _('Entrada inválida detectada'),
                    code='invalid'
                )

    @staticmethod
    def sanitize_html(value):
        """
        Sanitiza HTML permitindo apenas tags seguras
        """
        allowed_tags = [
            'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
        ]
        allowed_attrs = {
            '*': ['class', 'style'],
            'a': ['href', 'title', 'target'],
            'img': ['src', 'alt', 'title', 'width', 'height'],
        }
        
        return bleach.clean(
            value,
            tags=allowed_tags,
            attributes=allowed_attrs,
            strip=True
        )

    @staticmethod
    def escape_html(value):
        """
        Escapa HTML completamente
        """
        return html.escape(value)

class InputValidators:
    @staticmethod
    def validate_cpf(value):
        """
        Valida um CPF
        """
        if not value:
            return

        # Remove caracteres não numéricos
        cpf = re.sub(r'[^0-9]', '', value)

        if len(cpf) != 11:
            raise ValidationError(
                _('CPF deve conter 11 dígitos'),
                code='invalid'
            )

        # Verifica se todos os dígitos são iguais
        if len(set(cpf)) == 1:
            raise ValidationError(
                _('CPF inválido'),
                code='invalid'
            )

        # Validação dos dígitos verificadores
        for i in range(9, 11):
            value = sum((int(cpf[num]) * ((i + 1) - num) for num in range(0, i)))
            digit = ((value * 10) % 11) % 10
            if digit != int(cpf[i]):
                raise ValidationError(
                    _('CPF inválido'),
                    code='invalid'
                )

    @staticmethod
    def validate_phone(value):
        """
        Valida um número de telefone brasileiro
        """
        if not value:
            return

        # Remove caracteres não numéricos
        phone = re.sub(r'[^0-9]', '', value)

        if len(phone) not in [10, 11]:
            raise ValidationError(
                _('Número de telefone deve ter 10 ou 11 dígitos'),
                code='invalid'
            )

        if len(phone) == 11 and phone[2] not in ['9']:
            raise ValidationError(
                _('Celular deve começar com 9'),
                code='invalid'
            )

    @staticmethod
    def validate_cep(value):
        """
        Valida um CEP brasileiro
        """
        if not value:
            return

        # Remove caracteres não numéricos
        cep = re.sub(r'[^0-9]', '', value)

        if len(cep) != 8:
            raise ValidationError(
                _('CEP deve conter 8 dígitos'),
                code='invalid'
            )

    @staticmethod
    def validate_price(value):
        """
        Valida um valor monetário
        """
        if not isinstance(value, (int, float)):
            raise ValidationError(
                _('Valor deve ser numérico'),
                code='invalid'
            )

        if value < 0:
            raise ValidationError(
                _('Valor não pode ser negativo'),
                code='invalid'
            )

        # Limita a duas casas decimais
        if isinstance(value, float) and len(str(value).split('.')[-1]) > 2:
            raise ValidationError(
                _('Valor deve ter no máximo duas casas decimais'),
                code='invalid'
            )
