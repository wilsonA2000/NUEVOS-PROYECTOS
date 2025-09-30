"""
VeriHome Core Performance Optimizations
Advanced query optimization mixins and utilities for Django ViewSets and Serializers.

This module provides:
- Optimized ViewSet mixins with intelligent prefetching
- Performance-aware serializer base classes
- Query optimization decorators
- Caching mixins for expensive operations
- Database connection optimization utilities
"""

from functools import wraps
from typing import Any, Dict, List, Optional, Type, Union
from django.db import models, connection
from django.db.models import Prefetch, Q, Count, Avg, Max, Min, F
from django.db.models.query import QuerySet
from django.core.cache import cache
from django.conf import settings
from rest_framework import viewsets, serializers, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
import time
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class OptimizedPagination(PageNumberPagination):
    """Optimized pagination with performance tracking"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def paginate_queryset(self, queryset, request, view=None):
        """Paginate queryset with performance tracking"""
        start_time = time.time()
        result = super().paginate_queryset(queryset, request, view)
        execution_time = time.time() - start_time
        
        # Log slow pagination
        if execution_time > 0.5:  # 500ms threshold
            logger.warning(f"Slow pagination detected: {execution_time:.3f}s for {view.__class__.__name__}")
        
        return result

class QueryOptimizationMixin:
    """Mixin to provide intelligent query optimization for ViewSets"""
    
    # Define optimization patterns for each model
    OPTIMIZATION_PATTERNS = {
        'Property': {
            'select_related': ['landlord'],
            'prefetch_related': ['images', 'videos', 'documents', 'amenity_relations', 'contracts'],
            'annotations': {
                'image_count': Count('images'),
                'video_count': Count('videos'),
                'document_count': Count('documents'),
                'contract_count': Count('contracts')
            }
        },
        'Contract': {
            'select_related': ['primary_party', 'secondary_party', 'property', 'template'],
            'prefetch_related': ['signatures', 'amendments', 'transactions', 'invoices', 'documents'],
            'annotations': {
                'signature_count': Count('signatures'),
                'transaction_count': Count('transactions'),
                'invoice_count': Count('invoices')
            }
        },
        'Transaction': {
            'select_related': ['payer', 'payee', 'property', 'contract'],
            'prefetch_related': ['payment_method'],
            'annotations': {
                'days_since_created': F('created_at') - models.Value(datetime.now().date())
            }
        },
        'Message': {
            'select_related': ['sender', 'conversation'],
            'prefetch_related': ['attachments', 'conversation__participants'],
            'annotations': {
                'attachment_count': Count('attachments')
            }
        },
        'User': {
            'select_related': ['userprofile'],
            'prefetch_related': ['owned_properties', 'tenant_contracts', 'sent_messages'],
            'annotations': {
                'property_count': Count('owned_properties'),
                'contract_count': Count('tenant_contracts')
            }
        }
    }
    
    def get_optimized_queryset(self, base_queryset: QuerySet = None) -> QuerySet:
        """Get optimized queryset with intelligent prefetching"""
        if base_queryset is None:
            queryset = self.get_queryset()
        else:
            queryset = base_queryset
        
        model_name = queryset.model.__name__
        optimizations = self.OPTIMIZATION_PATTERNS.get(model_name, {})
        
        # Apply select_related
        if 'select_related' in optimizations:
            queryset = queryset.select_related(*optimizations['select_related'])
        
        # Apply prefetch_related
        if 'prefetch_related' in optimizations:
            queryset = queryset.prefetch_related(*optimizations['prefetch_related'])
        
        # Apply annotations
        if 'annotations' in optimizations:
            queryset = queryset.annotate(**optimizations['annotations'])
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Optimized list method with performance tracking"""
        start_time = time.time()
        
        # Get optimized queryset
        queryset = self.get_optimized_queryset()
        queryset = self.filter_queryset(queryset)
        
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            execution_time = time.time() - start_time
            
            # Add performance headers
            response = self.get_paginated_response(serializer.data)
            response['X-Query-Time'] = f"{execution_time:.3f}s"
            response['X-Query-Count'] = len(connection.queries) if settings.DEBUG else 'N/A'
            
            return response
        
        serializer = self.get_serializer(queryset, many=True)
        execution_time = time.time() - start_time
        
        response = Response(serializer.data)
        response['X-Query-Time'] = f"{execution_time:.3f}s"
        return response
    
    def retrieve(self, request, *args, **kwargs):
        """Optimized retrieve method"""
        start_time = time.time()
        
        # Get optimized single instance
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        execution_time = time.time() - start_time
        response = Response(serializer.data)
        response['X-Query-Time'] = f"{execution_time:.3f}s"
        
        return response

def cache_expensive_operation(timeout: int = 300, key_prefix: str = None):
    """Decorator to cache expensive operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_prefix:
                cache_key = f"{key_prefix}:{hash(str(args) + str(kwargs))}"
            else:
                cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            start_time = time.time()
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Cache the result
            cache.set(cache_key, result, timeout)
            
            logger.debug(f"Cached {func.__name__} result in {execution_time:.3f}s")
            return result
        return wrapper
    return decorator

class OptimizedSerializerMixin:
    """Mixin for optimized serializer performance"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._optimization_context = kwargs.get('context', {})
    
    def to_representation(self, instance):
        """Optimized representation with caching for expensive fields"""
        # Check if we should use minimal representation for list views
        if self._optimization_context.get('view_action') == 'list':
            return self.to_minimal_representation(instance)
        
        return super().to_representation(instance)
    
    def to_minimal_representation(self, instance):
        """Minimal representation for list views"""
        # Override in subclasses to provide minimal field set
        return super().to_representation(instance)

class OptimizedPropertyViewSet(QueryOptimizationMixin, viewsets.ModelViewSet):
    """Optimized ViewSet for Property model"""
    pagination_class = OptimizedPagination
    
    def get_queryset(self):
        """Get base queryset for properties"""
        from properties.models import Property
        return Property.objects.filter(is_active=True)
    
    @action(detail=False, methods=['get'])
    @cache_expensive_operation(timeout=600, key_prefix='featured_properties')
    def featured(self, request):
        """Get featured properties with caching"""
        queryset = self.get_optimized_queryset().filter(is_featured=True)[:10]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Optimized property search"""
        query = request.query_params.get('q', '')
        city = request.query_params.get('city', '')
        property_type = request.query_params.get('type', '')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        
        queryset = self.get_optimized_queryset()
        
        # Apply filters efficiently
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query) | 
                Q(description__icontains=query)
            )
        
        if city:
            queryset = queryset.filter(city__iexact=city)
        
        if property_type:
            queryset = queryset.filter(property_type=property_type)
        
        if min_price:
            queryset = queryset.filter(price_min__gte=min_price)
        
        if max_price:
            queryset = queryset.filter(price_max__lte=max_price)
        
        # Order by relevance (could implement more sophisticated scoring)
        queryset = queryset.order_by('-created_at')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class OptimizedContractViewSet(QueryOptimizationMixin, viewsets.ModelViewSet):
    """Optimized ViewSet for Contract model"""
    pagination_class = OptimizedPagination
    
    def get_queryset(self):
        """Get base queryset for contracts"""
        from contracts.models import Contract
        user = self.request.user
        
        # Optimize based on user role
        if hasattr(user, 'role'):
            if user.role == 'landlord':
                return Contract.objects.filter(landlord=user)
            elif user.role == 'tenant':
                return Contract.objects.filter(tenant=user)
        
        return Contract.objects.filter(
            Q(landlord=user) | Q(tenant=user)
        )
    
    @action(detail=False, methods=['get'])
    @cache_expensive_operation(timeout=300, key_prefix='active_contracts')
    def active(self, request):
        """Get active contracts with caching"""
        queryset = self.get_optimized_queryset().filter(status='active')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class OptimizedTransactionViewSet(QueryOptimizationMixin, viewsets.ModelViewSet):
    """Optimized ViewSet for Transaction model"""
    pagination_class = OptimizedPagination
    
    def get_queryset(self):
        """Get base queryset for transactions"""
        from payments.models import Transaction
        user = self.request.user
        
        return Transaction.objects.filter(
            Q(payer=user) | Q(payee=user)
        ).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent transactions optimized"""
        days = int(request.query_params.get('days', 30))
        since_date = datetime.now() - timedelta(days=days)
        
        queryset = self.get_optimized_queryset().filter(
            created_at__gte=since_date
        )[:50]  # Limit to 50 most recent
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class PerformanceTrackingMixin:
    """Mixin to track ViewSet performance"""
    
    def dispatch(self, request, *args, **kwargs):
        """Track request performance"""
        start_time = time.time()
        start_queries = len(connection.queries) if settings.DEBUG else 0
        
        response = super().dispatch(request, *args, **kwargs)
        
        execution_time = time.time() - start_time
        query_count = len(connection.queries) - start_queries if settings.DEBUG else 0
        
        # Add performance headers
        response['X-Execution-Time'] = f"{execution_time:.3f}s"
        if settings.DEBUG:
            response['X-Query-Count'] = str(query_count)
        
        # Log slow requests
        if execution_time > 1.0:  # 1 second threshold
            logger.warning(f"Slow request: {request.method} {request.path} took {execution_time:.3f}s with {query_count} queries")
        
        return response

class CachedStatsViewSet(viewsets.ViewSet):
    """Base class for cached statistics ViewSets"""
    
    @cache_expensive_operation(timeout=1800, key_prefix='dashboard_stats')
    def get_dashboard_stats(self, request):
        """Get cached dashboard statistics"""
        return self._calculate_dashboard_stats()
    
    def _calculate_dashboard_stats(self):
        """Override in subclasses"""
        raise NotImplementedError("Subclasses must implement _calculate_dashboard_stats")

# Optimized serializer base classes
class OptimizedPropertySerializer(OptimizedSerializerMixin, serializers.ModelSerializer):
    """Optimized Property serializer"""
    
    image_count = serializers.ReadOnlyField()
    main_image_url = serializers.SerializerMethodField()
    
    class Meta:
        fields = '__all__'
    
    def get_main_image_url(self, obj):
        """Get main image URL efficiently"""
        if hasattr(obj, '_prefetched_objects_cache') and 'images' in obj._prefetched_objects_cache:
            # Use prefetched images
            images = obj._prefetched_objects_cache['images']
            main_image = next((img for img in images if img.is_main), None)
            return main_image.image.url if main_image else None
        
        # Fallback to database query
        main_image = obj.images.filter(is_main=True).first()
        return main_image.image.url if main_image else None
    
    def to_minimal_representation(self, instance):
        """Minimal representation for list views"""
        return {
            'id': instance.id,
            'title': instance.title,
            'price_min': instance.price_min,
            'price_max': instance.price_max,
            'city': instance.city,
            'property_type': instance.property_type,
            'main_image_url': self.get_main_image_url(instance),
            'image_count': getattr(instance, 'image_count', 0)
        }

class OptimizedContractSerializer(OptimizedSerializerMixin, serializers.ModelSerializer):
    """Optimized Contract serializer"""
    
    property_title = serializers.CharField(source='property.title', read_only=True)
    landlord_name = serializers.CharField(source='landlord.get_full_name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.get_full_name', read_only=True)
    signature_count = serializers.ReadOnlyField()
    
    class Meta:
        fields = '__all__'
    
    def to_minimal_representation(self, instance):
        """Minimal representation for list views"""
        return {
            'id': instance.id,
            'property_title': instance.property.title,
            'status': instance.status,
            'start_date': instance.start_date,
            'end_date': instance.end_date,
            'monthly_rent': instance.monthly_rent,
            'signature_count': getattr(instance, 'signature_count', 0)
        }

class OptimizedTransactionSerializer(OptimizedSerializerMixin, serializers.ModelSerializer):
    """Optimized Transaction serializer"""
    
    payer_name = serializers.CharField(source='payer.get_full_name', read_only=True)
    payee_name = serializers.CharField(source='payee.get_full_name', read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True)
    
    class Meta:
        fields = '__all__'
    
    def to_minimal_representation(self, instance):
        """Minimal representation for list views"""
        return {
            'id': instance.id,
            'total_amount': instance.total_amount,
            'status': instance.status,
            'transaction_type': instance.transaction_type,
            'created_at': instance.created_at,
            'payer_name': instance.payer.get_full_name(),
            'payee_name': instance.payee.get_full_name()
        }

# Database optimization utilities
class DatabaseOptimizer:
    """Utility class for database optimization tasks"""
    
    @staticmethod
    def analyze_table_stats():
        """Analyze table statistics"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins,
                    n_tup_upd,
                    n_tup_del,
                    n_live_tup,
                    n_dead_tup,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables
                ORDER BY n_live_tup DESC
            """)
            
            return cursor.fetchall()
    
    @staticmethod
    def get_slow_queries():
        """Get slow queries from pg_stat_statements"""
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    SELECT 
                        query,
                        calls,
                        total_time,
                        mean_time,
                        rows
                    FROM pg_stat_statements
                    WHERE mean_time > 100  -- queries slower than 100ms
                    ORDER BY mean_time DESC
                    LIMIT 20
                """)
                
                return cursor.fetchall()
            except:
                return []
    
    @staticmethod
    def vacuum_analyze_all():
        """Run VACUUM ANALYZE on all tables"""
        with connection.cursor() as cursor:
            cursor.execute("VACUUM ANALYZE")
        
        logger.info("Completed VACUUM ANALYZE on all tables")

# Performance monitoring utilities
def monitor_query_performance(view_class):
    """Class decorator to monitor ViewSet query performance"""
    
    original_dispatch = view_class.dispatch
    
    def monitored_dispatch(self, request, *args, **kwargs):
        start_time = time.time()
        start_queries = len(connection.queries) if settings.DEBUG else 0
        
        response = original_dispatch(self, request, *args, **kwargs)
        
        execution_time = time.time() - start_time
        query_count = len(connection.queries) - start_queries if settings.DEBUG else 0
        
        # Log performance metrics
        logger.info(f"{view_class.__name__}.{request.method} - {execution_time:.3f}s - {query_count} queries")
        
        return response
    
    view_class.dispatch = monitored_dispatch
    return view_class