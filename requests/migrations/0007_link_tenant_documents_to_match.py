# Generated manually to handle TenantDocument.match_request field migration
from django.db import migrations
import uuid


def generate_match_code():
    """Generate unique match code."""
    return f"M-{uuid.uuid4().hex[:10].upper()}"


def link_tenant_documents_to_match_requests(apps, schema_editor):
    """
    Create MatchRequest records for TenantDocuments that have NULL match_request
    but valid property_request values.
    """
    TenantDocument = apps.get_model('requests', 'TenantDocument')
    MatchRequest = apps.get_model('matching', 'MatchRequest')

    # Find all TenantDocuments with NULL match_request but valid property_request
    orphaned_docs = TenantDocument.objects.filter(
        match_request__isnull=True,
        property_request__isnull=False
    )

    if not orphaned_docs.exists():
        print("✅ No orphaned TenantDocuments found - migration not needed")
        return

    print(f"🔄 Found {orphaned_docs.count()} TenantDocuments to link...")

    # Group documents by property_request to avoid duplicate MatchRequests
    property_requests_map = {}
    for doc in orphaned_docs:
        pr = doc.property_request
        if pr.id not in property_requests_map:
            property_requests_map[pr.id] = {
                'property_request': pr,
                'documents': []
            }
        property_requests_map[pr.id]['documents'].append(doc)

    created_count = 0
    linked_count = 0

    # Create MatchRequest for each unique property_request
    for pr_id, data in property_requests_map.items():
        pr = data['property_request']

        # Check if MatchRequest already exists for this property + tenant combination
        existing_match = MatchRequest.objects.filter(
            property=pr.property,
            tenant=pr.requester,
            landlord=pr.assignee
        ).first()

        if existing_match:
            print(f"  ♻️  Reusing existing MatchRequest {existing_match.match_code}")
            match_request = existing_match
        else:
            # Create new MatchRequest based on PropertyInterestRequest data
            match_request = MatchRequest.objects.create(
                match_code=generate_match_code(),
                property=pr.property,
                tenant=pr.requester,
                landlord=pr.assignee,
                status='pending',
                tenant_message=pr.description or 'Solicitud de arrendamiento',
                monthly_income=pr.monthly_income,
                employment_type=pr.employment_type or '',
                preferred_move_in_date=pr.preferred_move_in_date,
                lease_duration_months=pr.lease_duration_months,
                has_rental_references=pr.has_rental_references,
                has_employment_proof=pr.has_employment_proof,
                has_credit_check=pr.has_credit_check,
                number_of_occupants=pr.number_of_occupants,
                has_pets=pr.has_pets,
                pet_details=pr.pet_details or '',
                smoking_allowed=pr.smoking_allowed,
                workflow_stage=pr.workflow_stage,
                workflow_status=pr.workflow_status,
                workflow_data=pr.workflow_data or {},
            )
            created_count += 1
            print(f"  ✅ Created MatchRequest {match_request.match_code} for property '{pr.property.title}'")

        # Link all documents to this MatchRequest
        for doc in data['documents']:
            doc.match_request = match_request
            doc.save(update_fields=['match_request'])
            linked_count += 1

    print("\n✅ Migration complete:")
    print(f"   - Created {created_count} new MatchRequest(s)")
    print(f"   - Linked {linked_count} TenantDocument(s)")


def reverse_link(apps, schema_editor):
    """
    Reverse migration - set match_request back to NULL for migrated documents.
    """
    TenantDocument = apps.get_model('requests', 'TenantDocument')

    # Find MatchRequests created by this migration (they should have workflow_data from PropertyInterestRequest)
    migrated_docs = TenantDocument.objects.filter(
        match_request__isnull=False,
        property_request__isnull=False
    )

    count = migrated_docs.count()
    if count > 0:
        print(f"🔄 Reversing migration for {count} TenantDocument(s)...")
        migrated_docs.update(match_request=None)
        print("✅ Reversal complete")
    else:
        print("✅ No documents to reverse")


class Migration(migrations.Migration):

    dependencies = [
        ('requests', '0006_link_tenant_documents_to_match'),
        ('matching', '0005_matchrequest_workflow_stage_and_more'),  # Ensure MatchRequest model exists with workflow fields
    ]

    operations = [
        migrations.RunPython(
            link_tenant_documents_to_match_requests,
            reverse_link
        ),
    ]
