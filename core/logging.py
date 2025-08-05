"""
Configuración personalizada de logging para VeriHome.
Incluye formatters JSON seguros y configuración optimizada.
"""

import json
import logging
import traceback
from datetime import datetime
from typing import Dict, Any


class SafeJSONFormatter(logging.Formatter):
    """
    Formatter JSON seguro que maneja excepciones y caracteres especiales.
    """
    
    def format(self, record):
        """Formatear el record de log como JSON seguro."""
        try:
            # Crear el diccionario base del log
            log_data = {
                'timestamp': datetime.fromtimestamp(record.created).isoformat(),
                'level': record.levelname,
                'logger': record.name,
                'message': record.getMessage(),
                'module': record.module,
                'funcName': record.funcName,
                'lineno': record.lineno,
            }
            
            # Agregar información de proceso y thread si está disponible
            if hasattr(record, 'process'):
                log_data['process'] = record.process
            if hasattr(record, 'thread'):
                log_data['thread'] = record.thread
            
            # Agregar información de excepción si existe
            if record.exc_info:
                log_data['exception'] = {
                    'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                    'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                    'traceback': traceback.format_exception(*record.exc_info)
                }
            
            # Agregar campos extra de manera segura
            for key, value in record.__dict__.items():
                if key not in ('name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                              'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                              'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                              'thread', 'threadName', 'processName', 'process', 'getMessage'):
                    try:
                        # Intentar serializar el valor
                        json.dumps(value)
                        log_data[key] = value
                    except (TypeError, ValueError):
                        # Si no se puede serializar, convertir a string
                        log_data[key] = str(value)
            
            return json.dumps(log_data, ensure_ascii=False, default=str)
            
        except Exception as e:
            # Si algo falla, usar formato simple
            return f"{datetime.now().isoformat()} ERROR in JSONFormatter: {str(e)} - Original: {record.getMessage()}"


class DevelopmentFormatter(logging.Formatter):
    """
    Formatter optimizado para desarrollo con colores y mejor legibilidad.
    """
    
    # Códigos de color ANSI
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[91m', # Bright Red
        'RESET': '\033[0m'      # Reset
    }
    
    def format(self, record):
        """Formatear el record con colores para desarrollo."""
        try:
            # Obtener color según el nivel
            color = self.COLORS.get(record.levelname, '')
            reset = self.COLORS['RESET']
            
            # Formato básico con color
            log_message = (
                f"{color}[{record.levelname}]{reset} "
                f"{datetime.fromtimestamp(record.created).strftime('%H:%M:%S')} "
                f"{record.name} - {record.getMessage()}"
            )
            
            # Agregar información de ubicación en debug
            if record.levelno >= logging.INFO:
                log_message += f" ({record.module}:{record.lineno})"
            
            # Agregar traceback si hay excepción
            if record.exc_info:
                log_message += f"\n{self.formatException(record.exc_info)}"
            
            return log_message
            
        except Exception:
            # Fallback simple
            return f"[{record.levelname}] {record.getMessage()}"


def get_logging_config(debug_mode: bool = False) -> Dict[str, Any]:
    """
    Obtener configuración de logging optimizada según el modo.
    
    Args:
        debug_mode: Si está en modo debug
        
    Returns:
        Diccionario con configuración de logging
    """
    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                '()': DevelopmentFormatter if debug_mode else 'logging.Formatter',
                'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
                'style': '{',
            },
            'simple': {
                '()': DevelopmentFormatter if debug_mode else 'logging.Formatter',
                'format': '{levelname} {message}',
                'style': '{',
            },
            'json': {
                '()': SafeJSONFormatter,
            },
        },
        'handlers': {
            'console': {
                'level': 'DEBUG' if debug_mode else 'INFO',
                'class': 'logging.StreamHandler',
                'formatter': 'simple',
            },
        },
        'loggers': {
            'django.security': {
                'handlers': ['console'],
                'level': 'WARNING',
                'propagate': False,
            },
        },
        'root': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    }
    
    # Agregar handlers de archivo solo si no estamos en debug
    if not debug_mode:
        config['handlers'].update({
            'file': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': 'logs/verihome.log',
                'maxBytes': 15728640,  # 15MB
                'backupCount': 10,
                'formatter': 'verbose',
            },
            'security_file': {
                'level': 'WARNING',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': 'logs/security.log',
                'maxBytes': 15728640,
                'backupCount': 5,
                'formatter': 'json',
            },
            'activity_file': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': 'logs/activity.log',
                'maxBytes': 10485760,
                'backupCount': 15,
                'formatter': 'json',
            },
        })
        
        # Actualizar loggers para usar archivos
        config['loggers']['django.security']['handlers'].append('security_file')
        config['root']['handlers'].extend(['file'])
    
    return config