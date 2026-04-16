from django.contrib import admin

from .models import LegalInterestRate


@admin.register(LegalInterestRate)
class LegalInterestRateAdmin(admin.ModelAdmin):
    list_display = ('year', 'month', 'monthly_rate_pct', 'max_usury_rate_pct', 'is_active', 'source')
    list_filter = ('is_active', 'year')
    search_fields = ('source', 'notes')
    ordering = ('-year', '-month')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Período', {'fields': ('year', 'month', 'is_active')}),
        ('Tasas', {'fields': ('monthly_rate', 'max_usury_rate')}),
        ('Origen', {'fields': ('source', 'notes')}),
        ('Auditoría', {'fields': ('created_at', 'updated_at')}),
    )

    def monthly_rate_pct(self, obj):
        return f'{obj.monthly_rate * 100:.4f}%'
    monthly_rate_pct.short_description = 'Tasa mensual'

    def max_usury_rate_pct(self, obj):
        return f'{obj.max_usury_rate * 100:.4f}%'
    max_usury_rate_pct.short_description = 'Tope usura'
