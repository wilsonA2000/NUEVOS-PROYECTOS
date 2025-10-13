# MODULO PROPIEDADES PERFIL ARRENDADOR

- **Corrección en campos de formulario**: En la creación de una propiedad, ajustar los campos *depósito de garantía* y *cuota de mantenimiento* para eliminar la referencia a la moneda (sugerencia actual menciona "México").
- **Problema con el mapa en el formulario**: Durante el diligenciamiento del formulario de creación de propiedad, si el cursor está dentro del área del mapa virtual y el usuario intenta deslizar hacia abajo, el mapa interpreta el gesto como un intento de acercamiento. El usuario debe salir del área del mapa para continuar desplazándose por el formulario. Solucionar este comportamiento.
- **Mejorar UI de imágenes**: Arreglar la interfaz de usuario para la visualización y gestión de imágenes en la creación de propiedades.
- **Modal de creación de propiedad**: Implementar un diseño con color básico para mejorar la experiencia visual del modal.
- **Uso de iconos**: Incorporar iconos isométricos en la interfaz para un estilo visual más moderno.
- **Corrección en fecha de miembro**: Arreglar la visualización de la fecha "Miembro desde" en la vista detallada de la propiedad.
- **Mejorar iconos en detalle de información**: Actualizar los iconos simples en la vista de detalle de la propiedad para que sean más representativos y visualmente atractivos.
- **Problema con video de YouTube**: Los arrendatarios no pueden visualizar el video subido en formato URL de YouTube desde la vista de detalle de la propiedad creada por el arrendador. Corregir este error.
- **Falta de mapa en vista de detalle**: Agregar un mapa sencillo en la vista de detalle de la propiedad para que los arrendatarios puedan identificar la ubicación exacta de la propiedad de interés.

# AUTENTICACIÓN

- **Mejorar plantillas de correo**: Optimizar el diseño y contenido de los correos electrónicos, incluyendo el mensaje de reestablecimiento de contraseña, para que sean más claros y profesionales.

# NOTIFICACIONES Y CORREOS

- **Sistema de notificaciones por correo**: Implementar un sistema que informe vía email sobre eventos importantes, como el interés de un arrendatario en una propiedad del arrendador. Asegurar que todos los roles o perfiles reciban notificaciones relevantes sobre eventos que requieran atención.
- **Botón de notificaciones en el panel principal**: Conectar el botón con el símbolo de campana en el panel principal para mostrar notificaciones. Mostrar un contador de hasta "99+" junto a la campana para indicar la cantidad de notificaciones pendientes. Al abrir el botón, mostrar una lista de notificaciones organizadas por módulo (contratos, solicitudes, pagos, mensajes, servicios, calificaciones) con una breve descripción. Cada notificación debe ser clickable y redirigir al módulo correspondiente.

# CONTRATOS PERFIL ARRENDADOR

- **Problema en selección de propiedad**: En el módulo de contratos, al crear un nuevo contrato tras avanzar una solicitud a la etapa "en progreso", el campo seleccionable para elegir la propiedad está vacío. Corregir este error para que las propiedades disponibles se muestren correctamente.
- **Estado de propiedad**: Una vez que el contrato es firmado, autenticado y aprobado, la propiedad debe cambiar su estado a "ARRENDADA" y vincularse a las partes involucradas, además de ser removida del listado de propiedades disponibles.

# SOLICITUDES PERFIL ARRENDADOR

- **Acceso a información del arrendatario**: Cuando un arrendatario envía una solicitud de interés, el arrendador debe poder ver no solo el mensaje, sino también la hoja de vida y el perfil del arrendatario para evaluar su idoneidad antes de avanzar con el contrato de arrendamiento o venta.
- **Flujo de etapas en solicitudes**: 
  - **Pendiente**: El arrendador puede verificar la hoja de vida y perfil del arrendatario.
  - **En progreso**: Habilitar el módulo de contratos con los datos del arrendatario y la propiedad seleccionada, utilizando un token único para unificar la información.
  - **Completada**: Una vez que el contrato es validado, firmado, autenticado, discutido y aprobado, la solicitud pasa a la etapa de completada.

# DESDE EL PERFIL DE ARRENDATARIO

- **Corrección en formulario de registro**:
  - Aclarar o renombrar el campo *Fecha deseada de ingreso* para que su propósito sea más claro.
  - Impedir que el usuario pueda aceptar los términos y condiciones sin haberlos leído previamente.
  - Unificar los dos campos sobre la cantidad de familiares que vivirán en la propiedad (actualmente en *Información laboral y financiera* e *Información específica para arrendatarios*) en un solo campo.
- **Fecha de ingreso al sistema**: La fecha de ingreso al sistema debe ser la del día en que se autenticó el correo del usuario, y no debe ser editable ni visible para el usuario.

# MODULO DASHBOARD DE ARRENDATARIOS

- **Ajustar métricas del dashboard**: Eliminar métricas irrelevantes para el rol de arrendatario, como ingresos mensuales, número total de propiedades y métricas generales de propiedades. El dashboard debe enfocarse exclusivamente en:
  - Propiedades que el arrendatario tiene en arriendo.
  - Contratos activos, autenticados y firmados, relacionados con el rol de arrendatario.
- **Enfoque por rol**: Asegurar que los dashboards de arrendatarios y prestadores de servicios muestren únicamente métricas y datos relevantes a sus respectivos roles y funciones.