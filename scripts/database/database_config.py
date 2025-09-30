"""
Database Configuration Manager for VeriHome
Handles dual database setup (SQLite for development, PostgreSQL for production)
"""

import os
from decouple import config
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def get_database_config():
    """
    Get database configuration based on environment
    """
    database_engine = config('DATABASE_ENGINE', default='sqlite')
    
    if database_engine == 'postgresql':
        return get_postgresql_config()
    else:
        return get_sqlite_config()

def get_sqlite_config():
    """SQLite configuration for development"""
    return {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
            'OPTIONS': {
                'timeout': 60,  # Increase timeout for long operations
            }
        }
    }

def get_postgresql_config():
    """PostgreSQL configuration for production"""
    return {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='verihome_db'),
            'USER': config('DB_USER', default='verihome_user'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'OPTIONS': {
                'client_encoding': 'UTF8',
            },
            'CONN_MAX_AGE': 600,  # Connection pooling
            'CONN_HEALTH_CHECKS': True,
        }
    }

def get_test_database_config():
    """Test database configuration"""
    database_engine = config('DATABASE_ENGINE', default='sqlite')
    
    if database_engine == 'postgresql':
        config_dict = get_postgresql_config()
        # Use separate test database
        config_dict['default']['NAME'] = config('TEST_DB_NAME', default='test_verihome_db')
        config_dict['default']['TEST'] = {
            'NAME': config('TEST_DB_NAME', default='test_verihome_db'),
        }
        return config_dict
    else:
        return {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': ':memory:',  # In-memory for faster tests
                'OPTIONS': {
                    'timeout': 60,
                }
            }
        }

def validate_database_config():
    """Validate database configuration"""
    database_engine = config('DATABASE_ENGINE', default='sqlite')
    
    if database_engine == 'postgresql':
        required_vars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST']
        missing_vars = []
        
        for var in required_vars:
            if not config(var, default=''):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(f"Missing required PostgreSQL environment variables: {', '.join(missing_vars)}")
    
    return True