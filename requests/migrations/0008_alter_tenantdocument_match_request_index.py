# Generated manually after data migration to make match_request non-nullable
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('requests', '0007_link_tenant_documents_to_match'),
        ('matching', '0005_matchrequest_workflow_stage_and_more'),
    ]

    operations = [
        # Remove old index on property_request
        migrations.RemoveIndex(
            model_name='tenantdocument',
            name='requests_te_propert_cde9c6_idx',
        ),

        # Alter match_request field to make it non-nullable
        # All existing rows have been populated by migration 0007
        migrations.AlterField(
            model_name='tenantdocument',
            name='match_request',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='tenant_documents',
                to='matching.matchrequest',
                verbose_name='Solicitud de Match',
                help_text='Match request al que pertenece este documento'
            ),
        ),

        # Create new index on match_request + document_type
        migrations.AddIndex(
            model_name='tenantdocument',
            index=models.Index(fields=['match_request', 'document_type'], name='requests_te_match_r_222bde_idx'),
        ),
    ]
