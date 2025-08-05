# Instalación de Dependencias para Dashboard

Para que el nuevo dashboard funcione correctamente, necesitas instalar las siguientes dependencias:

```bash
npm install chart.js react-chartjs-2
```

Estas librerías son necesarias para:
- `chart.js`: La librería principal de gráficos
- `react-chartjs-2`: Wrapper de React para Chart.js

## Verificación

Después de instalar, verifica que las dependencias estén en tu `package.json`:

```json
"dependencies": {
  ...
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0",
  ...
}
```

## Uso

El dashboard ya está configurado para usar estas librerías. Una vez instaladas, podrás ver:
- Gráfico de líneas para flujo de caja
- Gráfico de dona para ocupación de propiedades
- Gráfico de barras para calificaciones
- Y más visualizaciones de datos