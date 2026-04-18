# Patrones reutilizables — VeriHome

Snippets y convenciones que vale la pena seguir sin reinventarlos cada
vez.

---

## File upload (backend + frontend)

**Backend** — DRF con parsers multipart:

```python
from rest_framework.parsers import MultiPartParser, FormParser

class FileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        files = request.FILES.getlist('fieldname')
        # procesar…
```

**Frontend** — `FormData` con varios archivos:

```typescript
const formData = new FormData();
formData.append('property_id', propertyId);
images.forEach((image) => {
  formData.append('images', image.file);
});
```

---

## WebSocket consumer (backend)

```python
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class MyConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("group_name", self.channel_name)
        await self.accept()

    async def receive_json(self, content):
        await self.channel_layer.group_send("group_name", {
            'type': 'message.new',
            'data': content,
        })
```

---

## Atribución de signals (thread-local)

Cuando una view hace cambios que disparan signals y quieres que la
fila histórica lleve el usuario responsable, usa el patrón
`_updated_by`:

```python
lcc._updated_by = request.user
lcc.current_state = 'TENANT_INVITED'
lcc.save()
```

El signal (`contracts/signals.py` o `services/signals.py`) lee
`getattr(instance, '_updated_by', None)` y lo usa como `performed_by`.
Si no se setea, la fila queda atribuida a `system`.

---

## Audit logging uniforme (Fase 1.9.7)

En cualquier `@action` / view importante:

```python
from core.audit_service import log_activity

log_activity(
    request,
    action_type='match.accept',  # tipo canónico tipo-dominio.acción
    description='Match aceptado para Apt 201',
    target_object=match_request,
    details={'tenant_id': str(tenant.id)},
)
```

La función nunca rompe el flujo de negocio: si falla, sólo registra un
warning en logs.

---

## Code style

- **Backend**: PEP 8 + convenciones Django.
- **Frontend**: ESLint + Prettier.
- **TypeScript**: modo estricto, sin `any`.
- **Imports**: alias absoluto `@/…`.

---

## Commit messages (conventional)

```
feat: add biometric authentication flow
fix: resolve contract approval 404 error
refactor: optimize property query performance
docs: update API documentation
test: add traceability E2E
```
