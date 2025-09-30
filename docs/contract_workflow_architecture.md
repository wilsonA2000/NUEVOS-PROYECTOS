# Arquitectura del Sistema de Workflow de Contratos
## Alternativa Robusta a la Edición Colaborativa en Tiempo Real

---

## 🎯 **Justificación de la Arquitectura**

En lugar de implementar edición colaborativa en tiempo real (que presenta riesgos legales y complejidad técnica excesiva), propongo un **Sistema de Workflow Inteligente** que:

- ✅ **Garantiza seguridad jurídica** con trazabilidad completa
- ✅ **Reduce complejidad técnica** sin sacrificar funcionalidad  
- ✅ **Mejora la experiencia de usuario** con proceso claro y guiado
- ✅ **Facilita mantenimiento** y escalabilidad del sistema

---

## 🏗️ **Arquitectura del Sistema**

### **Backend - Modelos de Datos**

```python
# models/contracts.py

class ContractTemplate(models.Model):
    """Plantillas base de contratos"""
    name = models.CharField(max_length=200)
    description = models.TextField()
    content_template = models.TextField()  # Plantilla con placeholders
    variables_schema = models.JSONField()  # Schema de variables esperadas
    legal_framework = models.CharField(max_length=100, default='colombia')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class ContractWorkflow(models.Model):
    """Gestión del flujo de trabajo de contratos"""
    
    WORKFLOW_STATES = [
        ('DRAFT', 'Borrador'),
        ('LANDLORD_PENDING', 'Pendiente Arrendador'),
        ('TENANT_INVITED', 'Arrendatario Invitado'),
        ('TENANT_PENDING', 'Pendiente Arrendatario'),
        ('NEGOTIATION', 'En Negociación'),
        ('REVIEW', 'En Revisión'),
        ('READY_TO_SIGN', 'Listo para Firmar'),
        ('SIGNED', 'Firmado'),
        ('ACTIVE', 'Activo'),
        ('TERMINATED', 'Terminado')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    template = models.ForeignKey(ContractTemplate, on_delete=models.CASCADE)
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contracts_as_landlord')
    tenant = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='contracts_as_tenant')
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, null=True)
    
    # Estado del workflow
    current_state = models.CharField(max_length=20, choices=WORKFLOW_STATES, default='DRAFT')
    
    # Datos del contrato (se van llenando por fases)
    landlord_data = models.JSONField(default=dict)  # Datos completados por arrendador
    tenant_data = models.JSONField(default=dict)    # Datos completados por arrendatario
    negotiation_data = models.JSONField(default=dict)  # Propuestas y contrapropuestas
    final_data = models.JSONField(default=dict)     # Datos finales consolidados
    
    # Control de aprobaciones
    landlord_approved = models.BooleanField(default=False)
    tenant_approved = models.BooleanField(default=False)
    landlord_approved_at = models.DateTimeField(null=True)
    tenant_approved_at = models.DateTimeField(null=True)
    
    # Invitación
    invitation_token = models.CharField(max_length=255, unique=True, null=True)
    invitation_expires_at = models.DateTimeField(null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    signed_at = models.DateTimeField(null=True)

class ContractWorkflowHistory(models.Model):
    """Historial de cambios en el workflow"""
    workflow = models.ForeignKey(ContractWorkflow, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=100)
    old_state = models.CharField(max_length=20)
    new_state = models.CharField(max_length=20)
    changes = models.JSONField(default=dict)  # Detalles de los cambios
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(null=True)

class ContractNegotiation(models.Model):
    """Gestión de propuestas y contrapropuestas"""
    
    PROPOSAL_TYPES = [
        ('MODIFICATION', 'Modificación'),
        ('COUNTER_PROPOSAL', 'Contrapropuesta'),
        ('ACCEPTANCE', 'Aceptación'),
        ('REJECTION', 'Rechazo')
    ]
    
    workflow = models.ForeignKey(ContractWorkflow, on_delete=models.CASCADE, related_name='negotiations')
    proposed_by = models.ForeignKey(User, on_delete=models.CASCADE)
    proposal_type = models.CharField(max_length=20, choices=PROPOSAL_TYPES)
    field_name = models.CharField(max_length=100)  # Campo que se propone cambiar
    current_value = models.TextField()
    proposed_value = models.TextField()
    justification = models.TextField(blank=True)
    
    is_accepted = models.BooleanField(null=True)  # None = Pendiente, True = Aceptado, False = Rechazado
    response_note = models.TextField(blank=True)
    responded_at = models.DateTimeField(null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
```

### **Backend - Servicios de Workflow**

```python
# services/contract_workflow_service.py

class ContractWorkflowService:
    """Servicio para gestionar el flujo de trabajo de contratos"""
    
    def create_contract_draft(self, landlord, template_id, property_id=None):
        """Paso 1: Arrendador crea borrador del contrato"""
        template = ContractTemplate.objects.get(id=template_id)
        
        workflow = ContractWorkflow.objects.create(
            template=template,
            landlord=landlord,
            property_id=property_id,
            current_state='LANDLORD_PENDING'
        )
        
        # Crear entrada en historial
        self._record_history(workflow, landlord, 'CREATE_DRAFT', 'DRAFT', 'LANDLORD_PENDING')
        
        return workflow
    
    def complete_landlord_data(self, workflow_id, landlord, data):
        """Paso 2: Arrendador completa sus datos"""
        workflow = ContractWorkflow.objects.get(id=workflow_id, landlord=landlord)
        
        # Validar que esté en estado correcto
        if workflow.current_state != 'LANDLORD_PENDING':
            raise ValueError(f"Cannot complete landlord data in state {workflow.current_state}")
        
        # Validar datos requeridos
        self._validate_landlord_data(data)
        
        # Guardar datos del arrendador
        workflow.landlord_data = data
        workflow.current_state = 'TENANT_INVITED'
        workflow.save()
        
        # Crear token de invitación
        invitation_token = self._generate_invitation_token()
        workflow.invitation_token = invitation_token
        workflow.invitation_expires_at = timezone.now() + timedelta(days=7)
        workflow.save()
        
        # Registrar en historial
        self._record_history(workflow, landlord, 'COMPLETE_LANDLORD_DATA', 'LANDLORD_PENDING', 'TENANT_INVITED')
        
        return workflow, invitation_token
    
    def invite_tenant(self, workflow_id, tenant_email):
        """Paso 3: Enviar invitación al arrendatario"""
        workflow = ContractWorkflow.objects.get(id=workflow_id)
        
        # Enviar email de invitación
        self._send_tenant_invitation_email(workflow, tenant_email)
        
        return workflow.invitation_token
    
    def accept_invitation(self, invitation_token, tenant):
        """Paso 4: Arrendatario acepta invitación"""
        workflow = ContractWorkflow.objects.get(
            invitation_token=invitation_token,
            invitation_expires_at__gt=timezone.now()
        )
        
        workflow.tenant = tenant
        workflow.current_state = 'TENANT_PENDING'
        workflow.save()
        
        self._record_history(workflow, tenant, 'ACCEPT_INVITATION', 'TENANT_INVITED', 'TENANT_PENDING')
        
        return workflow
    
    def complete_tenant_data(self, workflow_id, tenant, data):
        """Paso 5: Arrendatario completa sus datos"""
        workflow = ContractWorkflow.objects.get(id=workflow_id, tenant=tenant)
        
        if workflow.current_state != 'TENANT_PENDING':
            raise ValueError(f"Cannot complete tenant data in state {workflow.current_state}")
        
        # Validar datos del arrendatario
        self._validate_tenant_data(data)
        
        workflow.tenant_data = data
        workflow.current_state = 'REVIEW'
        workflow.save()
        
        self._record_history(workflow, tenant, 'COMPLETE_TENANT_DATA', 'TENANT_PENDING', 'REVIEW')
        
        # Notificar al arrendador que el contrato está listo para revisión
        self._notify_landlord_review_ready(workflow)
        
        return workflow
    
    def propose_modification(self, workflow_id, user, field_name, proposed_value, justification=""):
        """Proponer modificación de un campo"""
        workflow = ContractWorkflow.objects.get(id=workflow_id)
        
        # Verificar que el usuario sea parte del contrato
        if user not in [workflow.landlord, workflow.tenant]:
            raise PermissionError("User is not part of this contract")
        
        # Crear propuesta de negociación
        negotiation = ContractNegotiation.objects.create(
            workflow=workflow,
            proposed_by=user,
            proposal_type='MODIFICATION',
            field_name=field_name,
            current_value=self._get_current_field_value(workflow, field_name),
            proposed_value=proposed_value,
            justification=justification
        )
        
        # Cambiar estado a negociación si no estaba ya
        if workflow.current_state not in ['NEGOTIATION', 'REVIEW']:
            old_state = workflow.current_state
            workflow.current_state = 'NEGOTIATION'
            workflow.save()
            self._record_history(workflow, user, 'PROPOSE_MODIFICATION', old_state, 'NEGOTIATION')
        
        # Notificar a la otra parte
        other_party = workflow.tenant if user == workflow.landlord else workflow.landlord
        self._notify_modification_proposed(workflow, negotiation, other_party)
        
        return negotiation
    
    def respond_to_proposal(self, negotiation_id, user, is_accepted, response_note=""):
        """Responder a una propuesta de modificación"""
        negotiation = ContractNegotiation.objects.get(id=negotiation_id)
        workflow = negotiation.workflow
        
        # Verificar permisos
        if user == negotiation.proposed_by:
            raise PermissionError("Cannot respond to own proposal")
        
        if user not in [workflow.landlord, workflow.tenant]:
            raise PermissionError("User is not part of this contract")
        
        # Guardar respuesta
        negotiation.is_accepted = is_accepted
        negotiation.response_note = response_note
        negotiation.responded_at = timezone.now()
        negotiation.save()
        
        if is_accepted:
            # Aplicar el cambio al contrato
            self._apply_negotiation_change(workflow, negotiation)
            
        # Verificar si todas las negociaciones están resueltas
        if self._all_negotiations_resolved(workflow):
            workflow.current_state = 'REVIEW'
            workflow.save()
            self._record_history(workflow, user, 'RESOLVE_NEGOTIATIONS', 'NEGOTIATION', 'REVIEW')
        
        return negotiation
    
    def approve_contract(self, workflow_id, user):
        """Aprobar el contrato final"""
        workflow = ContractWorkflow.objects.get(id=workflow_id)
        
        if user == workflow.landlord:
            workflow.landlord_approved = True
            workflow.landlord_approved_at = timezone.now()
        elif user == workflow.tenant:
            workflow.tenant_approved = True
            workflow.tenant_approved_at = timezone.now()
        else:
            raise PermissionError("User is not part of this contract")
        
        workflow.save()
        
        # Si ambos han aprobado, pasar a listo para firmar
        if workflow.landlord_approved and workflow.tenant_approved:
            workflow.current_state = 'READY_TO_SIGN'
            workflow.save()
            self._record_history(workflow, user, 'BOTH_APPROVED', 'REVIEW', 'READY_TO_SIGN')
            
            # Generar PDF final del contrato
            self._generate_final_contract_pdf(workflow)
        
        return workflow
    
    def generate_contract_content(self, workflow):
        """Generar contenido final del contrato"""
        # Consolidar todos los datos
        final_data = {
            **workflow.landlord_data,
            **workflow.tenant_data,
            **workflow.final_data
        }
        
        # Usar template engine para reemplazar placeholders
        template_content = workflow.template.content_template
        
        # Aquí usarías un motor de templates como Jinja2
        from jinja2 import Template
        template = Template(template_content)
        contract_content = template.render(**final_data)
        
        return contract_content
    
    # Métodos privados auxiliares...
    def _validate_landlord_data(self, data):
        """Validar datos del arrendador"""
        required_fields = ['nombre', 'documento', 'direccion', 'telefono', 'email']
        for field in required_fields:
            if not data.get(field):
                raise ValueError(f"Campo requerido faltante: {field}")
    
    def _validate_tenant_data(self, data):
        """Validar datos del arrendatario"""
        required_fields = ['nombre', 'documento', 'direccion', 'telefono', 'email']
        for field in required_fields:
            if not data.get(field):
                raise ValueError(f"Campo requerido faltante: {field}")
    
    def _record_history(self, workflow, user, action, old_state, new_state):
        """Registrar cambio en el historial"""
        ContractWorkflowHistory.objects.create(
            workflow=workflow,
            user=user,
            action=action,
            old_state=old_state,
            new_state=new_state
        )
    
    def _generate_invitation_token(self):
        """Generar token único de invitación"""
        import secrets
        return secrets.token_urlsafe(32)
    
    def _send_tenant_invitation_email(self, workflow, tenant_email):
        """Enviar email de invitación al arrendatario"""
        # Implementar envío de email
        pass
    
    def _notify_landlord_review_ready(self, workflow):
        """Notificar al arrendador que el contrato está listo para revisión"""
        # Implementar notificación
        pass
```

### **Frontend - Componentes del Workflow**

```typescript
// components/contracts/ContractWorkflowManager.tsx

interface ContractWorkflowManagerProps {
  workflowId?: string;
  userRole: 'landlord' | 'tenant';
}

export const ContractWorkflowManager: React.FC<ContractWorkflowManagerProps> = ({
  workflowId,
  userRole
}) => {
  const [workflow, setWorkflow] = useState<ContractWorkflow | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = useMemo(() => {
    if (userRole === 'landlord') {
      return [
        'Crear Contrato',
        'Completar Datos',
        'Invitar Arrendatario', 
        'Revisión y Negociación',
        'Aprobación Final',
        'Firma Digital'
      ];
    } else {
      return [
        'Aceptar Invitación',
        'Completar Datos',
        'Revisión y Negociación', 
        'Aprobación Final',
        'Firma Digital'
      ];
    }
  }, [userRole]);
  
  const renderStepContent = () => {
    if (!workflow) return null;
    
    switch (workflow.current_state) {
      case 'LANDLORD_PENDING':
        return userRole === 'landlord' ? 
          <LandlordDataForm workflow={workflow} onComplete={handleLandlordComplete} /> :
          <WaitingForLandlord />;
          
      case 'TENANT_INVITED':
        return userRole === 'landlord' ?
          <TenantInvitationStatus workflow={workflow} /> :
          <AcceptInvitation workflow={workflow} onAccept={handleAcceptInvitation} />;
          
      case 'TENANT_PENDING':
        return userRole === 'tenant' ?
          <TenantDataForm workflow={workflow} onComplete={handleTenantComplete} /> :
          <WaitingForTenant />;
          
      case 'NEGOTIATION':
        return <NegotiationInterface workflow={workflow} userRole={userRole} />;
        
      case 'REVIEW':
        return <ContractReview workflow={workflow} userRole={userRole} onApprove={handleApprove} />;
        
      case 'READY_TO_SIGN':
        return <DigitalSignature workflow={workflow} userRole={userRole} />;
        
      default:
        return <div>Estado no reconocido: {workflow.current_state}</div>;
    }
  };
  
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Card>
        <CardHeader title="Gestión de Contrato de Arrendamiento" />
        <CardContent>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <Box sx={{ mt: 4 }}>
            {renderStepContent()}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
```

### **APIs del Sistema**

```python
# api/contract_workflow_views.py

class ContractWorkflowViewSet(viewsets.ModelViewSet):
    """API para gestión de workflow de contratos"""
    
    @action(detail=False, methods=['post'])
    def create_draft(self, request):
        """Crear borrador de contrato (solo arrendadores)"""
        service = ContractWorkflowService()
        workflow = service.create_contract_draft(
            landlord=request.user,
            template_id=request.data['template_id'],
            property_id=request.data.get('property_id')
        )
        return Response(ContractWorkflowSerializer(workflow).data)
    
    @action(detail=True, methods=['post'])
    def complete_landlord_data(self, request, pk=None):
        """Completar datos del arrendador"""
        service = ContractWorkflowService()
        workflow, token = service.complete_landlord_data(
            workflow_id=pk,
            landlord=request.user,
            data=request.data
        )
        return Response({
            'workflow': ContractWorkflowSerializer(workflow).data,
            'invitation_token': token
        })
    
    @action(detail=True, methods=['post'])
    def invite_tenant(self, request, pk=None):
        """Enviar invitación a arrendatario"""
        service = ContractWorkflowService()
        token = service.invite_tenant(pk, request.data['tenant_email'])
        return Response({'invitation_sent': True, 'token': token})
    
    @action(detail=False, methods=['post'])
    def accept_invitation(self, request):
        """Aceptar invitación como arrendatario"""
        service = ContractWorkflowService()
        workflow = service.accept_invitation(
            invitation_token=request.data['token'],
            tenant=request.user
        )
        return Response(ContractWorkflowSerializer(workflow).data)
    
    # ... más endpoints para el workflow completo
```

---

## 🎯 **Beneficios de esta Arquitectura**

### **✅ Seguridad Jurídica**
- **Trazabilidad completa**: Cada cambio queda registrado con usuario, timestamp y justificación
- **Responsabilidad clara**: No hay ambigüedad sobre quién hizo qué cambio
- **Proceso documentado**: El historial de negociación queda como evidencia legal
- **Estados bien definidos**: Cada etapa del contrato tiene reglas claras

### **✅ Simplicidad Técnica**
- **No requiere WebSockets**: Sistema basado en API REST estándar
- **Estados predecibles**: Máquina de estados bien definida
- **Fácil de testear**: Cada estado y transición es testeable independientemente
- **Escalable**: Puede manejar miles de contratos simultáneos

### **✅ Experiencia de Usuario Superior**
- **Proceso claro**: Cada parte sabe exactamente qué hacer y cuándo
- **Sin confusión**: No hay campos bloqueados misteriosamente
- **Notificaciones inteligentes**: Solo cuando hay acciones pendientes
- **Móvil-friendly**: Cada paso funciona perfectamente en móviles

### **✅ Mantenibilidad**
- **Código limpio**: Separación clara de responsabilidades
- **Fácil de extender**: Nuevos tipos de contrato fáciles de agregar
- **Debugging simple**: Estados y transiciones claras
- **Testing robusto**: Cada componente es testeable independientemente

---

## ❓ **Pregunta Final para el Usuario**

**¿Está de acuerdo con proceder con esta arquitectura de Workflow Inteligente en lugar de la edición colaborativa en tiempo real?**

Esta solución es:
- **Más segura legalmente**
- **Más simple técnicamente**
- **Mejor experiencia de usuario**
- **Más fácil de mantener**
- **Más escalable**

**¿Procedo con la implementación de esta arquitectura, o prefiere que exploremos los riesgos de la edición colaborativa en tiempo real que propuso inicialmente?**