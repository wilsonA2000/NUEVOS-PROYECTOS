# Generated migration - Link TenantDocument to MatchRequest instead of PropertyInterestRequest

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("requests", "0005_increase_file_field_length"),
        ("matching", "0005_matchrequest_workflow_stage_and_more"),
    ]

    operations = [
        # Agregar nuevo campo match_request (nullable temporalmente)
        migrations.AddField(
            model_name='tenantdocument',
            name='match_request',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='tenant_documents',
                to='matching.matchrequest',
                verbose_name='Solicitud de Match',
                help_text='Match request al que pertenece este documento'
            ),
        ),

        # Hacer property_request nullable (para permitir migración de datos)
        migrations.AlterField(
            model_name='tenantdocument',
            name='property_request',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='legacy_tenant_documents',
                to='requests.propertyinterestrequest'
            ),
        ),

        # Remover unique_together antiguo
        migrations.AlterUniqueTogether(
            name='tenantdocument',
            unique_together=set(),
        ),

        # Agregar nuevo unique_together
        migrations.AlterUniqueTogether(
            name='tenantdocument',
            unique_together={('match_request', 'document_type', 'uploaded_by')},
        ),
    ]
