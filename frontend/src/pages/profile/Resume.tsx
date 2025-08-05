import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  AccountBalance as AccountIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { userService } from '../../services/userService';
import { UserResume, UpdateResumeDto } from '../../types/user';

const Resume: React.FC = () => {
  const [resume, setResume] = useState<UserResume | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserResume>({
    defaultValues: {
      personal_info: {
        full_name: '',
        date_of_birth: '',
        nationality: '',
        marital_status: '',
        identification_number: '',
        identification_type: '',
      },
      contact_info: {
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
      },
      education: {
        highest_degree: '',
        institution: '',
        graduation_year: 0,
        field_of_study: '',
        additional_certifications: [],
      },
      employment: {
        current_employer: '',
        position: '',
        employment_type: '',
        years_employed: 0,
        monthly_income: 0,
        employment_status: '',
      },
      financial_info: {
        credit_score: 0,
        bank_references: [],
        income_sources: [],
        monthly_expenses: 0,
        savings_amount: 0,
      },
      references: {
        personal_references: [],
        professional_references: [],
      },
      housing_history: [],
      documents: {
        identification_document: '',
        proof_of_income: '',
        bank_statements: [],
        rental_history: [],
        credit_report: '',
      },
      verification_status: {
        identity_verified: false,
        income_verified: false,
        references_verified: false,
        documents_verified: false,
        overall_verified: false,
      },
    },
  });

  const { fields: personalRefFields, append: appendPersonalRef, remove: removePersonalRef } = useFieldArray({
    control,
    name: 'references.personal_references',
  });

  const { fields: professionalRefFields, append: appendProfessionalRef, remove: removeProfessionalRef } = useFieldArray({
    control,
    name: 'references.professional_references',
  });

  const { fields: housingFields, append: appendHousing, remove: removeHousing } = useFieldArray({
    control,
    name: 'housing_history',
  });

  useEffect(() => {
    loadResume();
  }, []);

  const loadResume = async () => {
    try {
      const resumeData = await userService.getResume();
      setResume(resumeData);
      reset(resumeData);
    } catch (error: any) {
      console.error('Error loading resume:', error);
      // Si no existe, crear uno nuevo
      if (error.response?.status === 404) {
        setResume(null);
      }
    }
  };

  const onSubmit = async (data: UserResume) => {
    setIsLoading(true);
    try {
      const updateData: UpdateResumeDto = {
        personal_info: data.personal_info,
        contact_info: data.contact_info,
        education: data.education,
        employment: data.employment,
        financial_info: data.financial_info,
        references: data.references,
        housing_history: data.housing_history,
        documents: data.documents,
      };

      let updatedResume: UserResume;
      if (resume) {
        updatedResume = await userService.updateResume(updateData);
      } else {
        updatedResume = await userService.createResume(updateData);
      }

      setResume(updatedResume);
      setSuccessMessage('Hoja de vida actualizada exitosamente');
      setShowSuccess(true);
      setIsEditing(false);

      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error updating resume:', error);
      setSuccessMessage('Error al actualizar la hoja de vida');
      setShowSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset(resume || undefined);
    setIsEditing(false);
  };

  const addPersonalReference = () => {
    appendPersonalRef({
      name: '',
      relationship: '',
      phone: '',
      email: '',
    });
  };

  const addProfessionalReference = () => {
    appendProfessionalRef({
      name: '',
      position: '',
      company: '',
      phone: '',
      email: '',
    });
  };

  const addHousingHistory = () => {
    appendHousing({
      address: '',
      landlord_name: '',
      landlord_phone: '',
      rent_amount: 0,
      lease_start: '',
      lease_end: '',
      reason_for_leaving: '',
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSuccess(false)} 
          severity={successMessage.includes('Error') ? 'error' : 'success'} 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Hoja de Vida</Typography>
        {!isEditing && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
          >
            Editar
          </Button>
        )}
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Información Personal */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon />
                  <Typography variant="h6">Información Personal</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="personal_info.full_name"
                      control={control}
                      rules={{ required: 'El nombre completo es requerido' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Nombre Completo"
                          disabled={!isEditing}
                          error={!!errors.personal_info?.full_name}
                          helperText={errors.personal_info?.full_name?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="personal_info.date_of_birth"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Fecha de Nacimiento"
                          type="date"
                          disabled={!isEditing}
                          InputLabelProps={{ shrink: true }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="personal_info.nationality"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Nacionalidad"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="personal_info.marital_status"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth disabled={!isEditing}>
                          <InputLabel>Estado Civil</InputLabel>
                          <Select {...field} label="Estado Civil">
                            <MenuItem value="single">Soltero/a</MenuItem>
                            <MenuItem value="married">Casado/a</MenuItem>
                            <MenuItem value="divorced">Divorciado/a</MenuItem>
                            <MenuItem value="widowed">Viudo/a</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Información de Contacto */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon />
                  <Typography variant="h6">Información de Contacto</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="contact_info.email"
                      control={control}
                      rules={{ 
                        required: 'El email es requerido',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email inválido'
                        }
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Email"
                          disabled={!isEditing}
                          error={!!errors.contact_info?.email}
                          helperText={errors.contact_info?.email?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="contact_info.phone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Teléfono"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="contact_info.address"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Dirección"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Educación */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon />
                  <Typography variant="h6">Educación</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="education.highest_degree"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Grado Más Alto"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="education.institution"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Institución"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="education.graduation_year"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Año de Graduación"
                          type="number"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="education.field_of_study"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Campo de Estudio"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Empleo */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WorkIcon />
                  <Typography variant="h6">Información Laboral</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="employment.current_employer"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Empleador Actual"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="employment.position"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Cargo"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="employment.monthly_income"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Ingreso Mensual"
                          type="number"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="employment.years_employed"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Años de Empleo"
                          type="number"
                          disabled={!isEditing}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Referencias */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon />
                  <Typography variant="h6">Referencias</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="h6" gutterBottom>Referencias Personales</Typography>
                {personalRefFields.map((field, index) => (
                  <Card key={field.id} sx={{ mb: 2, p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`references.personal_references.${index}.name`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Nombre"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`references.personal_references.${index}.relationship`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Relación"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`references.personal_references.${index}.phone`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Teléfono"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`references.personal_references.${index}.email`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Email"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                    {isEditing && (
                      <IconButton
                        onClick={() => removePersonalRef(index)}
                        color="error"
                        sx={{ mt: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Card>
                ))}
                {isEditing && (
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addPersonalReference}
                    variant="outlined"
                    sx={{ mb: 3 }}
                  >
                    Agregar Referencia Personal
                  </Button>
                )}

                <Typography variant="h6" gutterBottom>Referencias Profesionales</Typography>
                {professionalRefFields.map((field, index) => (
                  <Card key={field.id} sx={{ mb: 2, p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`references.professional_references.${index}.name`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Nombre"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`references.professional_references.${index}.position`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Cargo"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`references.professional_references.${index}.company`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Empresa"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`references.professional_references.${index}.phone`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Teléfono"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                    {isEditing && (
                      <IconButton
                        onClick={() => removeProfessionalRef(index)}
                        color="error"
                        sx={{ mt: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Card>
                ))}
                {isEditing && (
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addProfessionalReference}
                    variant="outlined"
                  >
                    Agregar Referencia Profesional
                  </Button>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Historial de Vivienda */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HomeIcon />
                  <Typography variant="h6">Historial de Vivienda</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {housingFields.map((field, index) => (
                  <Card key={field.id} sx={{ mb: 2, p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Controller
                          name={`housing_history.${index}.address`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Dirección"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`housing_history.${index}.landlord_name`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Nombre del Arrendador"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`housing_history.${index}.landlord_phone`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Teléfono del Arrendador"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`housing_history.${index}.rent_amount`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Monto de Renta"
                              type="number"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`housing_history.${index}.lease_start`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Inicio de Arrendamiento"
                              type="date"
                              disabled={!isEditing}
                              InputLabelProps={{ shrink: true }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`housing_history.${index}.lease_end`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Fin de Arrendamiento"
                              type="date"
                              disabled={!isEditing}
                              InputLabelProps={{ shrink: true }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`housing_history.${index}.reason_for_leaving`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Razón de Salida"
                              disabled={!isEditing}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                    {isEditing && (
                      <IconButton
                        onClick={() => removeHousing(index)}
                        color="error"
                        sx={{ mt: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Card>
                ))}
                {isEditing && (
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addHousingHistory}
                    variant="outlined"
                  >
                    Agregar Historial de Vivienda
                  </Button>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>

        {isEditing && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </Box>
        )}
      </form>
    </Container>
  );
};

export default Resume; 