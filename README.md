# VeriHome - Plataforma Inmobiliaria

VeriHome es una plataforma inmobiliaria integral que conecta arrendadores, arrendatarios y prestadores de servicios, permitiendo la gestión de propiedades, contratos, pagos, mensajería y calificaciones de manera centralizada y segura.

---

## 🚀 Características principales
- Gestión de propiedades, contratos y pagos
- Mensajería interna entre usuarios
- Calificaciones y reputación
- Panel de administración y dashboards
- Frontend moderno en React (Material-UI)
- Backend robusto en Django + Django REST Framework
- Autenticación JWT y social (Allauth)
- Soporte para despliegue con Docker y Nginx

---

## 📁 Estructura del Proyecto

```
NUEVOS PROYECTOS/
├── contracts/           # App Django: contratos
├── core/                # App Django: núcleo
├── frontend/            # ÚNICO frontend React (Material-UI)
│   ├── public/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile
│   └── ...
├── media/               # Archivos multimedia (uploads)
├── messaging/           # App Django: mensajería
├── payments/            # App Django: pagos
├── properties/          # App Django: propiedades
├── ratings/             # App Django: calificaciones
├── staticfiles/         # Archivos estáticos recolectados por Django
├── sub_tasks/           # Documentación de tareas y resúmenes
├── templates/           # Templates Django (HTML)
├── users/               # App Django: usuarios
├── venv/                # Entorno virtual Python
├── verihome/            # Configuración principal Django (settings, urls, wsgi, asgi)
│   ├── settings.py
│   ├── urls.py
│   └── ...
├── ...otros archivos y scripts útiles
```

---

## ⚙️ Instalación y uso rápido

### 1. Clonar el repositorio y crear entorno virtual
```bash
python -m venv venv
venv\Scripts\activate  # En Windows
source venv/bin/activate  # En Linux/Mac
pip install -r requirements.txt
```

### 2. Configurar variables de entorno
Copia `.env.example` a `.env` y ajusta los valores necesarios (SECRET_KEY, DB, email, etc).

### 3. Migrar la base de datos y crear superusuario
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 4. Instalar dependencias y correr el frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Correr el backend
```bash
cd ..
python manage.py runserver
```

---

## 🐳 Despliegue con Docker

### 1. Build y levantar servicios
```bash
docker-compose up --build
```
- El frontend se compila y sirve como estático vía Django/Nginx.
- El backend corre en Gunicorn.
- Nginx sirve como proxy reverso.

### 2. Acceso
- Frontend: http://localhost
- Admin Django: http://localhost/admin/

---

## 📝 Notas y recomendaciones
- Para producción, configura correctamente las variables de entorno y los secretos.
- Usa HTTPS y configura dominios reales en producción.
- Revisa y ajusta los volúmenes de Docker para persistencia.
- Elimina o restringe el DEBUG en producción.

---

## 📬 Contacto y soporte
¿Dudas o sugerencias? Escribe a [info@verihome.com](mailto:info@verihome.com)

---

**VeriHome © 2025** 