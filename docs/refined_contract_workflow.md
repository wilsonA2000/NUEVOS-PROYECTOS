# Sistema de Contrato de Arrendamiento - Arquitectura Refinada
## Basado en Control del Arrendador con Proceso Paso a Paso

---

## 🎯 **Flujo de Trabajo Definitivo**

```
1. ARRENDADOR → Crea Propuesta de Contrato
2. ARRENDADOR → Invita Arrendatario (por cédula/email)  
3. ARRENDATARIO → Revisa Propuesta
4. ARRENDATARIO → Acepta O Presenta Objeciones
5. SI HAY OBJECIONES → ARRENDADOR → Modifica (vuelve al paso 3)
6. SI NO HAY OBJECIONES → ARRENDATARIO → Proporciona sus Datos
7. ARRENDATARIO → Firma y Autentica
8. ARRENDADOR → Firma y Autentica  
9. ARRENDADOR → Publica Contrato (Nace a la Vida Jurídica)
```

---

## 🏗️ **Modelos de Datos Refinados**

### **1. Modelo Principal del Contrato**

```python
# models/contracts.py

class LandlordControlledContract(models.Model):
    """Contrato controlado por el arrendador"""
    
    WORKFLOW_STATES = [
        ('DRAFT', 'Borrador del Arrendador'),
        ('TENANT_REVIEW', 'En Revisión por Arrendatario'),
        ('OBJECTIONS_PENDING', 'Objeciones Pendientes'),
        ('TENANT_DATA_PENDING', 'Esperando Datos del Arrendatario'),
        ('TENANT_SIGNED', 'Firmado por Arrendatario'),
        ('LANDLORD_SIGNED', 'Firmado por Arrendador'),
        ('PUBLISHED', 'Publicado - Vida Jurídica'),
        ('ACTIVE', 'Contrato Activo'),
        ('TERMINATED', 'Terminado')
    ]
    
    # Identificación
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract_number = models.CharField(max_length=20, unique=True)  # VH-2025-001
    
    # Partes del contrato
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_contracts')
    tenant = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='tenant_contracts')
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE)
    
    # Estado del workflow
    current_state = models.CharField(max_length=25, choices=WORKFLOW_STATES, default='DRAFT')
    
    # Datos del contrato (controlados por arrendador)
    landlord_data = models.JSONField(default=dict)  # Datos completos del arrendador
    economic_terms = models.JSONField(default=dict)  # Términos económicos
    contract_terms = models.JSONField(default=dict)   # Términos del contrato
    special_clauses = models.JSONField(default=list)  # Cláusulas especiales
    
    # Datos proporcionados por arrendatario (mínimos)
    tenant_data = models.JSONField(default=dict)  # Solo datos esenciales
    
    # Sistema de objeciones
    has_objections = models.BooleanField(default=False)
    objections_resolved = models.BooleanField(default=False)
    
    # Control de firmas
    tenant_signed = models.BooleanField(default=False)
    tenant_signed_at = models.DateTimeField(null=True)
    tenant_signature_data = models.JSONField(default=dict)  # Datos biométricos
    
    landlord_signed = models.BooleanField(default=False)
    landlord_signed_at = models.DateTimeField(null=True)
    landlord_signature_data = models.JSONField(default=dict)
    
    # Publicación (vida jurídica)
    published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True)
    published_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='published_contracts')
    
    # Invitación
    invitation_token = models.CharField(max_length=255, unique=True, null=True)
    invitation_expires_at = models.DateTimeField(null=True)
    tenant_identifier = models.CharField(max_length=50)  # Cédula para invitar
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ContractObjection(models.Model):
    """Objeciones del arrendatario al contrato"""
    
    OBJECTION_STATUS = [
        ('PENDING', 'Pendiente'),
        ('ACCEPTED', 'Aceptada por Arrendador'),
        ('REJECTED', 'Rechazada por Arrendador'),
        ('RESOLVED', 'Resuelta')
    ]
    
    contract = models.ForeignKey(LandlordControlledContract, on_delete=models.CASCADE, related_name='objections')
    objection_text = models.TextField()
    proposed_modification = models.TextField(blank=True)
    field_reference = models.CharField(max_length=100, blank=True)  # Campo específico objetado
    
    status = models.CharField(max_length=15, choices=OBJECTION_STATUS, default='PENDING')
    landlord_response = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

class ContractGuarantee(models.Model):
    """Garantías que respaldan el contrato"""
    
    GUARANTEE_TYPES = [
        ('DEPOSIT', 'Depósito en Dinero'),
        ('CO_SIGNER', 'Codeudor Solidario'),
        ('BANK_GUARANTEE', 'Garantía Bancaria'),
        ('INSURANCE', 'Póliza de Seguro'),
        ('REAL_ESTATE', 'Garantía Inmobiliaria'),
        ('OTHER', 'Otra Garantía')
    ]
    
    contract = models.ForeignKey(LandlordControlledContract, on_delete=models.CASCADE, related_name='guarantees')
    guarantee_type = models.CharField(max_length=20, choices=GUARANTEE_TYPES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    
    # Para codeudores
    co_signer_name = models.CharField(max_length=200, blank=True)
    co_signer_document = models.CharField(max_length=20, blank=True)
    co_signer_contact = models.JSONField(default=dict)
    
    # Para garantías documentales
    supporting_documents = models.JSONField(default=list)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### **2. Datos Mínimos del Arrendatario**

```python
# Estructura de tenant_data (mínimo requerido)
TENANT_MINIMAL_DATA = {
    "personal_info": {
        "full_name": "string",           # Nombre completo
        "document_number": "string",     # Número de cédula
        "document_issued_in": "string",  # Lugar de expedición
        "current_address": "string",     # Dirección actual
        "phone": "string",               # Teléfono principal
        "email": "string"                # Email principal
    },
    "co_signers": [                     # Codeudores solidarios
        {
            "name": "string",
            "document": "string",
            "relationship": "string",
            "contact": {
                "phone": "string",
                "email": "string",
                "address": "string"
            }
        }
    ],
    "references": [                     # Referencias opcionales
        {
            "type": "personal|commercial",
            "name": "string",
            "contact": "string"
        }
    ]
}
```

---

## ⚙️ **Servicios del Sistema**

### **Servicio Principal de Contratos**

```python
# services/landlord_contract_service.py

class LandlordContractService:
    """Servicio para contratos controlados por arrendador"""
    
    def create_contract_proposal(self, landlord, property_id, tenant_identifier):
        """Paso 1: Arrendador crea propuesta de contrato"""
        
        # Validar que el usuario sea arrendador de la propiedad
        property = Property.objects.get(id=property_id, landlord=landlord)
        
        # Crear contrato base
        contract = LandlordControlledContract.objects.create(
            landlord=landlord,
            property=property,
            tenant_identifier=tenant_identifier,
            contract_number=self._generate_contract_number(),
            current_state='DRAFT'
        )
        
        # Inicializar con datos base de la propiedad
        contract.landlord_data = self._extract_landlord_data(landlord, property)
        contract.economic_terms = self._default_economic_terms(property)
        contract.contract_terms = self._default_contract_terms()
        contract.save()
        
        return contract
    
    def complete_contract_proposal(self, contract_id, landlord, contract_data):
        """Paso 2: Arrendador completa propuesta"""
        contract = self._get_landlord_contract(contract_id, landlord, 'DRAFT')
        
        # Actualizar datos del contrato
        contract.landlord_data.update(contract_data.get('landlord_data', {}))
        contract.economic_terms.update(contract_data.get('economic_terms', {}))
        contract.contract_terms.update(contract_data.get('contract_terms', {}))
        contract.special_clauses = contract_data.get('special_clauses', [])
        
        # Crear garantías
        self._create_guarantees(contract, contract_data.get('guarantees', []))
        
        contract.save()
        return contract
    
    def send_to_tenant_review(self, contract_id, landlord):
        """Paso 3: Enviar propuesta a revisión del arrendatario"""
        contract = self._get_landlord_contract(contract_id, landlord, 'DRAFT')
        
        # Generar token de invitación
        invitation_token = self._generate_invitation_token()
        contract.invitation_token = invitation_token
        contract.invitation_expires_at = timezone.now() + timedelta(days=30)
        contract.current_state = 'TENANT_REVIEW'
        contract.save()
        
        # Enviar invitación por email/SMS
        self._send_tenant_invitation(contract)
        
        return contract, invitation_token
    
    def tenant_accept_invitation(self, invitation_token):
        """Paso 4: Arrendatario acepta invitación"""
        contract = LandlordControlledContract.objects.get(
            invitation_token=invitation_token,
            invitation_expires_at__gt=timezone.now(),
            current_state='TENANT_REVIEW'
        )
        
        return contract
    
    def tenant_submit_objections(self, contract_id, objections_data):
        """Paso 5A: Arrendatario presenta objeciones"""
        contract = LandlordControlledContract.objects.get(
            id=contract_id,
            current_state='TENANT_REVIEW'
        )
        
        # Crear objeciones
        for objection in objections_data:
            ContractObjection.objects.create(
                contract=contract,
                objection_text=objection['text'],
                proposed_modification=objection.get('proposed_modification', ''),
                field_reference=objection.get('field_reference', '')
            )
        
        contract.has_objections = True
        contract.current_state = 'OBJECTIONS_PENDING'
        contract.save()
        
        # Notificar al arrendador
        self._notify_landlord_objections(contract)
        
        return contract
    
    def tenant_accept_proposal(self, contract_id):
        """Paso 5B: Arrendatario acepta propuesta sin objeciones"""
        contract = LandlordControlledContract.objects.get(
            id=contract_id,
            current_state='TENANT_REVIEW'
        )
        
        contract.current_state = 'TENANT_DATA_PENDING'
        contract.save()
        
        return contract
    
    def landlord_respond_objections(self, contract_id, landlord, responses):
        """Paso 6: Arrendador responde a objeciones"""
        contract = self._get_landlord_contract(contract_id, landlord, 'OBJECTIONS_PENDING')
        
        modifications_made = False
        
        for response in responses:
            objection = ContractObjection.objects.get(
                id=response['objection_id'],
                contract=contract
            )
            
            if response['action'] == 'accept':
                objection.status = 'ACCEPTED'
                objection.landlord_response = response.get('response', '')
                
                # Aplicar modificación al contrato
                if response.get('modification'):
                    self._apply_contract_modification(contract, response['modification'])
                    modifications_made = True
                    
            elif response['action'] == 'reject':
                objection.status = 'REJECTED'
                objection.landlord_response = response.get('response', '')
            
            objection.resolved_at = timezone.now()
            objection.save()
        
        # Verificar si todas las objeciones están resueltas
        if not contract.objections.filter(status='PENDING').exists():
            contract.objections_resolved = True
            if modifications_made:
                # Volver a revisión si hubo modificaciones
                contract.current_state = 'TENANT_REVIEW'
                contract.has_objections = False
            else:
                # Pasar a recolección de datos si no se aceptó nada
                contract.current_state = 'TENANT_DATA_PENDING'
            contract.save()
        
        return contract
    
    def tenant_provide_data(self, contract_id, tenant_data):
        """Paso 7: Arrendatario proporciona sus datos mínimos"""
        contract = LandlordControlledContract.objects.get(
            id=contract_id,
            current_state='TENANT_DATA_PENDING'
        )
        
        # Validar datos mínimos
        self._validate_tenant_minimal_data(tenant_data)
        
        contract.tenant_data = tenant_data
        contract.save()
        
        return contract
    
    def tenant_sign_contract(self, contract_id, signature_data):
        """Paso 8: Arrendatario firma el contrato"""
        contract = LandlordControlledContract.objects.get(
            id=contract_id,
            current_state='TENANT_DATA_PENDING'
        )
        
        # Proceso de autenticación biométrica (si está disponible)
        auth_result = self._authenticate_tenant_signature(contract, signature_data)
        
        contract.tenant_signed = True
        contract.tenant_signed_at = timezone.now()
        contract.tenant_signature_data = auth_result
        contract.current_state = 'TENANT_SIGNED'
        contract.save()
        
        # Notificar al arrendador
        self._notify_landlord_tenant_signed(contract)
        
        return contract
    
    def landlord_sign_contract(self, contract_id, landlord, signature_data):
        """Paso 9: Arrendador firma el contrato"""
        contract = self._get_landlord_contract(contract_id, landlord, 'TENANT_SIGNED')
        
        # Proceso de autenticación biométrica
        auth_result = self._authenticate_landlord_signature(contract, signature_data)
        
        contract.landlord_signed = True
        contract.landlord_signed_at = timezone.now()
        contract.landlord_signature_data = auth_result
        contract.current_state = 'LANDLORD_SIGNED'
        contract.save()
        
        return contract
    
    def publish_contract(self, contract_id, landlord):
        """Paso 10: Arrendador publica el contrato (vida jurídica)"""
        contract = self._get_landlord_contract(contract_id, landlord, 'LANDLORD_SIGNED')
        
        # Validaciones finales
        self._validate_contract_completeness(contract)
        
        # Generar PDF final
        pdf_content = self._generate_final_contract_pdf(contract)
        
        # Publicar contrato
        contract.published = True
        contract.published_at = timezone.now()
        contract.published_by = landlord
        contract.current_state = 'PUBLISHED'
        contract.save()
        
        # Activar contrato si la fecha de inicio es hoy o anterior
        if contract.economic_terms.get('start_date') <= timezone.now().date():
            contract.current_state = 'ACTIVE'
            contract.save()
        
        # Notificaciones finales
        self._notify_contract_published(contract)
        
        return contract, pdf_content
    
    # Métodos auxiliares privados...
    def _get_landlord_contract(self, contract_id, landlord, expected_state):
        """Obtener contrato validando propietario y estado"""
        return LandlordControlledContract.objects.get(
            id=contract_id,
            landlord=landlord,
            current_state=expected_state
        )
    
    def _generate_contract_number(self):
        """Generar número único de contrato"""
        year = timezone.now().year
        count = LandlordControlledContract.objects.filter(
            created_at__year=year
        ).count() + 1
        return f"VH-{year}-{count:04d}"
    
    def _validate_tenant_minimal_data(self, data):
        """Validar que los datos mínimos del arrendatario estén completos"""
        required_fields = [
            'personal_info.full_name',
            'personal_info.document_number',
            'personal_info.current_address',
            'personal_info.phone',
            'personal_info.email'
        ]
        
        for field_path in required_fields:
            if not self._get_nested_field(data, field_path):
                raise ValueError(f"Campo requerido faltante: {field_path}")
```

---

## 🎨 **Interfaces de Usuario**

### **1. Panel del Arrendador**

```typescript
// components/contracts/LandlordContractManager.tsx

interface LandlordContractManagerProps {
  propertyId?: string;
}

export const LandlordContractManager: React.FC<LandlordContractManagerProps> = ({
  propertyId
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [contract, setContract] = useState<LandlordContract | null>(null);
  
  const steps = [
    'Crear Propuesta',
    'Configurar Términos',
    'Invitar Arrendatario',
    'Gestionar Objeciones',
    'Firmar Contrato',
    'Publicar Contrato'
  ];
  
  const renderStepContent = () => {
    if (!contract) return <CreateContractProposal onComplete={handleCreateContract} />;
    
    switch (contract.current_state) {
      case 'DRAFT':
        return <ContractTermsForm contract={contract} onComplete={handleCompleteTerms} />;
        
      case 'TENANT_REVIEW':
        return <TenantInvitationStatus contract={contract} />;
        
      case 'OBJECTIONS_PENDING':
        return <ObjectionsManagement contract={contract} onResolve={handleResolveObjections} />;
        
      case 'TENANT_SIGNED':
        return <LandlordSignature contract={contract} onSign={handleLandlordSign} />;
        
      case 'LANDLORD_SIGNED':
        return <PublishContract contract={contract} onPublish={handlePublishContract} />;
        
      case 'PUBLISHED':
      case 'ACTIVE':
        return <ContractPublished contract={contract} />;
        
      default:
        return <ContractStatus contract={contract} />;
    }
  };
  
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Card>
        <CardHeader 
          title="Gestión de Contrato de Arrendamiento"
          subheader={`Propiedad: ${contract?.property?.address || 'No seleccionada'}`}
        />
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

### **2. Panel del Arrendatario**

```typescript
// components/contracts/TenantContractReview.tsx

interface TenantContractReviewProps {
  invitationToken: string;
}

export const TenantContractReview: React.FC<TenantContractReviewProps> = ({
  invitationToken
}) => {
  const [contract, setContract] = useState<LandlordContract | null>(null);
  const [objections, setObjections] = useState<ContractObjection[]>([]);
  const [hasObjections, setHasObjections] = useState(false);
  
  const renderCurrentStep = () => {
    if (!contract) return <AcceptInvitation token={invitationToken} onAccept={handleAcceptInvitation} />;
    
    switch (contract.current_state) {
      case 'TENANT_REVIEW':
        return (
          <Box>
            <ContractPreview contract={contract} />
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="outlined" 
                onClick={() => setHasObjections(true)}
                startIcon={<EditIcon />}
              >
                Tengo Objeciones
              </Button>
              <Button 
                variant="contained" 
                onClick={handleAcceptContract}
                startIcon={<CheckIcon />}
              >
                Acepto la Propuesta
              </Button>
            </Box>
            
            {hasObjections && (
              <ObjectionsForm 
                contract={contract}
                onSubmit={handleSubmitObjections}
                onCancel={() => setHasObjections(false)}
              />
            )}
          </Box>
        );
        
      case 'OBJECTIONS_PENDING':
        return <WaitingForLandlordResponse contract={contract} />;
        
      case 'TENANT_DATA_PENDING':
        return <TenantDataForm contract={contract} onComplete={handleProvideData} />;
        
      case 'TENANT_SIGNED':
        return <WaitingForLandlordSignature contract={contract} />;
        
      case 'PUBLISHED':
      case 'ACTIVE':
        return <ContractActive contract={contract} />;
        
      default:
        return <ContractStatus contract={contract} />;
    }
  };
  
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Card>
        <CardHeader title="Revisión de Contrato de Arrendamiento" />
        <CardContent>
          {renderCurrentStep()}
        </CardContent>
      </Card>
    </Box>
  );
};
```

### **3. Formulario de Datos Mínimos del Arrendatario**

```typescript
// components/contracts/TenantDataForm.tsx

interface TenantDataFormProps {
  contract: LandlordContract;
  onComplete: (data: TenantMinimalData) => void;
}

export const TenantDataForm: React.FC<TenantDataFormProps> = ({
  contract,
  onComplete
}) => {
  const [formData, setFormData] = useState<TenantMinimalData>({
    personal_info: {
      full_name: '',
      document_number: contract.tenant_identifier || '',
      document_issued_in: '',
      current_address: '',
      phone: '',
      email: ''
    },
    co_signers: [],
    references: []
  });
  
  const addCoSigner = () => {
    setFormData(prev => ({
      ...prev,
      co_signers: [...prev.co_signers, {
        name: '',
        document: '',
        relationship: '',
        contact: { phone: '', email: '', address: '' }
      }]
    }));
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Proporcione sus datos para el contrato
      </Typography>
      
      <Grid container spacing={3}>
        {/* Información Personal */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Información Personal
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Nombre Completo"
            value={formData.personal_info.full_name}
            onChange={(e) => updatePersonalInfo('full_name', e.target.value)}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Número de Documento"
            value={formData.personal_info.document_number}
            onChange={(e) => updatePersonalInfo('document_number', e.target.value)}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Lugar de Expedición"
            value={formData.personal_info.document_issued_in}
            onChange={(e) => updatePersonalInfo('document_issued_in', e.target.value)}
            required
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Dirección Actual"
            value={formData.personal_info.current_address}
            onChange={(e) => updatePersonalInfo('current_address', e.target.value)}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Teléfono"
            value={formData.personal_info.phone}
            onChange={(e) => updatePersonalInfo('phone', e.target.value)}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.personal_info.email}
            onChange={(e) => updatePersonalInfo('email', e.target.value)}
            required
          />
        </Grid>
        
        {/* Codeudores Solidarios */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1">
              Codeudores Solidarios
            </Typography>
            <Button startIcon={<AddIcon />} onClick={addCoSigner}>
              Agregar Codeudor
            </Button>
          </Box>
        </Grid>
        
        {formData.co_signers.map((coSigner, index) => (
          <Grid item xs={12} key={index}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre del Codeudor"
                    value={coSigner.name}
                    onChange={(e) => updateCoSigner(index, 'name', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Documento"
                    value={coSigner.document}
                    onChange={(e) => updateCoSigner(index, 'document', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Parentesco/Relación"
                    value={coSigner.relationship}
                    onChange={(e) => updateCoSigner(index, 'relationship', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={coSigner.contact.phone}
                    onChange={(e) => updateCoSignerContact(index, 'phone', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>
        ))}
        
        {/* Botones de acción */}
        <Grid item xs={12}>
          <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
            <Button variant="outlined" onClick={() => window.history.back()}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained">
              Guardar Datos y Continuar
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
```

---

## 🔐 **Sistema de Garantías**

```typescript
// components/contracts/GuaranteesManager.tsx

export const GuaranteesManager: React.FC<GuaranteesManagerProps> = ({
  contract,
  onUpdate
}) => {
  const [guarantees, setGuarantees] = useState<ContractGuarantee[]>([]);
  
  const guaranteeTypes = [
    { value: 'DEPOSIT', label: 'Depósito en Dinero' },
    { value: 'CO_SIGNER', label: 'Codeudor Solidario' },
    { value: 'BANK_GUARANTEE', label: 'Garantía Bancaria' },
    { value: 'INSURANCE', label: 'Póliza de Seguro' },
    { value: 'REAL_ESTATE', label: 'Garantía Inmobiliaria' },
    { value: 'OTHER', label: 'Otra Garantía' }
  ];
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Garantías que Respaldan el Contrato
      </Typography>
      
      {guarantees.map((guarantee, index) => (
        <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Garantía</InputLabel>
                <Select
                  value={guarantee.guarantee_type}
                  onChange={(e) => updateGuarantee(index, 'guarantee_type', e.target.value)}
                  label="Tipo de Garantía"
                >
                  {guaranteeTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Monto"
                type="number"
                value={guarantee.amount}
                onChange={(e) => updateGuarantee(index, 'amount', Number(e.target.value))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={2}
                value={guarantee.description}
                onChange={(e) => updateGuarantee(index, 'description', e.target.value)}
              />
            </Grid>
            
            {guarantee.guarantee_type === 'CO_SIGNER' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre del Codeudor"
                    value={guarantee.co_signer_name}
                    onChange={(e) => updateGuarantee(index, 'co_signer_name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Documento del Codeudor"
                    value={guarantee.co_signer_document}
                    onChange={(e) => updateGuarantee(index, 'co_signer_document', e.target.value)}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Card>
      ))}
      
      <Button startIcon={<AddIcon />} onClick={addGuarantee}>
        Agregar Garantía
      </Button>
    </Box>
  );
};
```

---

## 📱 **APIs del Sistema**

```python
# api/landlord_contract_views.py

class LandlordContractViewSet(viewsets.ModelViewSet):
    """API para contratos controlados por arrendador"""
    
    def get_queryset(self):
        return LandlordControlledContract.objects.filter(
            landlord=self.request.user
        )
    
    @action(detail=False, methods=['post'])
    def create_proposal(self, request):
        """Crear propuesta de contrato"""
        service = LandlordContractService()
        contract = service.create_contract_proposal(
            landlord=request.user,
            property_id=request.data['property_id'],
            tenant_identifier=request.data['tenant_identifier']
        )
        return Response(LandlordContractSerializer(contract).data)
    
    @action(detail=True, methods=['post'])
    def complete_proposal(self, request, pk=None):
        """Completar propuesta de contrato"""
        service = LandlordContractService()
        contract = service.complete_contract_proposal(
            contract_id=pk,
            landlord=request.user,
            contract_data=request.data
        )
        return Response(LandlordContractSerializer(contract).data)
    
    @action(detail=True, methods=['post'])
    def send_to_review(self, request, pk=None):
        """Enviar a revisión del arrendatario"""
        service = LandlordContractService()
        contract, token = service.send_to_tenant_review(pk, request.user)
        return Response({
            'contract': LandlordContractSerializer(contract).data,
            'invitation_token': token
        })
    
    @action(detail=True, methods=['post'])
    def respond_objections(self, request, pk=None):
        """Responder a objeciones del arrendatario"""
        service = LandlordContractService()
        contract = service.landlord_respond_objections(
            contract_id=pk,
            landlord=request.user,
            responses=request.data['responses']
        )
        return Response(LandlordContractSerializer(contract).data)
    
    @action(detail=True, methods=['post'])
    def sign_contract(self, request, pk=None):
        """Firmar contrato como arrendador"""
        service = LandlordContractService()
        contract = service.landlord_sign_contract(
            contract_id=pk,
            landlord=request.user,
            signature_data=request.data
        )
        return Response(LandlordContractSerializer(contract).data)
    
    @action(detail=True, methods=['post'])
    def publish_contract(self, request, pk=None):
        """Publicar contrato (vida jurídica)"""
        service = LandlordContractService()
        contract, pdf_content = service.publish_contract(pk, request.user)
        
        return Response({
            'contract': LandlordContractSerializer(contract).data,
            'pdf_url': f'/api/v1/contracts/{pk}/pdf/',
            'published': True
        })

class TenantContractViewSet(viewsets.ReadOnlyModelViewSet):
    """API para arrendatarios - solo lectura y acciones específicas"""
    
    @action(detail=False, methods=['post'])
    def accept_invitation(self, request):
        """Aceptar invitación de contrato"""
        service = LandlordContractService()
        contract = service.tenant_accept_invitation(
            invitation_token=request.data['invitation_token']
        )
        return Response(TenantContractSerializer(contract).data)
    
    @action(detail=True, methods=['post'])
    def submit_objections(self, request, pk=None):
        """Presentar objeciones al contrato"""
        service = LandlordContractService()
        contract = service.tenant_submit_objections(
            contract_id=pk,
            objections_data=request.data['objections']
        )
        return Response(TenantContractSerializer(contract).data)
    
    @action(detail=True, methods=['post'])
    def accept_proposal(self, request, pk=None):
        """Aceptar propuesta sin objeciones"""
        service = LandlordContractService()
        contract = service.tenant_accept_proposal(pk)
        return Response(TenantContractSerializer(contract).data)
    
    @action(detail=True, methods=['post'])
    def provide_data(self, request, pk=None):
        """Proporcionar datos mínimos"""
        service = LandlordContractService()
        contract = service.tenant_provide_data(
            contract_id=pk,
            tenant_data=request.data
        )
        return Response(TenantContractSerializer(contract).data)
    
    @action(detail=True, methods=['post'])
    def sign_contract(self, request, pk=None):
        """Firmar contrato como arrendatario"""
        service = LandlordContractService()
        contract = service.tenant_sign_contract(
            contract_id=pk,
            signature_data=request.data
        )
        return Response(TenantContractSerializer(contract).data)
```

---

## 🎉 **Resumen de Beneficios de tu Propuesta Refinada**

### ✅ **Ventajas Técnicas:**
1. **Control Claro**: El arrendador mantiene control total del proceso
2. **Datos Mínimos**: Solo se solicita información esencial al arrendatario  
3. **Proceso Lineal**: Flujo paso a paso sin ambigüedades
4. **Trazabilidad Legal**: Cada acción queda registrada con responsable
5. **Eficiencia**: Proceso rápido y directo

### ✅ **Ventajas Legales:**
1. **Responsabilidad Clara**: Cada parte tiene funciones bien definidas
2. **Vida Jurídica Controlada**: El arrendador decide cuándo se activa
3. **Sistema de Objeciones**: Mecanismo formal para modificaciones
4. **Firmas Independientes**: Autenticación separada y segura

### ✅ **Ventajas de UX:**
1. **Interfaz Simple**: Cada parte ve solo lo que le corresponde
2. **Proceso Intuitivo**: Cada paso es claro y autoexplicativo
3. **Móvil-Optimizado**: Funciona perfectamente en dispositivos móviles

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Design refined contract workflow based on user feedback", "status": "completed", "priority": "high", "id": "33"}, {"content": "Implement landlord-controlled contract system", "status": "pending", "priority": "high", "id": "34"}, {"content": "Create tenant approval and objection system", "status": "pending", "priority": "high", "id": "35"}, {"content": "Implement digital authentication and contract publication", "status": "pending", "priority": "high", "id": "36"}, {"content": "Replace current ProfessionalContractForm with new landlord-controlled system", "status": "pending", "priority": "high", "id": "37"}]