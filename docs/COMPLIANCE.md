# Cumplimiento legal colombiano — VeriHome

Leyes y regulaciones que impactan el modelo de datos y los flujos.

---

## Contrato de arrendamiento

- **Ley 820 de 2003** — Arrendamiento de Vivienda Urbana.
- `contracts/clause_manager.py` genera cláusulas automáticamente
  según el tipo de contrato.
- PDF notarial con marca de agua "Diosa Temis" (`contracts/pdf_generator.py`).
- **Art. 20**: ajuste anual por IPC implementado en el sistema de
  renovación de contratos.

---

## Documentos de identidad soportados

1. **Cédula de Ciudadanía (CC)** — 8-10 dígitos.
2. **Cédula de Extranjería (CE)** — 6-7 dígitos.
3. **Pasaporte** — 2 letras + 7 dígitos.
4. **Licencia de Conducción** — 40 + 9 dígitos.
5. **RUT** — 9 dígitos + dígito de verificación.

---

## Protección de datos

- **Ley 1581 de 2012** — Habeas Data.
- Página `/privacy` documenta tratamiento de datos personales.
- Demo mode biométrico (BIO-002) incluye disclosure explícita bajo
  esta ley antes de solicitar captura facial/de voz.

---

## Facturación electrónica

- **DIAN UBL 2.1 XML** — generación al cobro de canon
  (`payments/dian_invoice_service.py`).
- **Resolución 000042/2020** — schema compliant.
- **CUFE** — implementado (`calculate_cufe`) en
  `payments/dian_invoice_service.py`. SHA-384 determinístico, tests en
  `payments/tests/test_dian_cufe.py`.
- **XAdES-BES** — stub listo (`sign_invoice_xml`). Para activar en
  producción:
  1. Obtener certificado `.p12` de certificador autorizado (Andes
     SCD, Certicámara, GSE, etc.).
  2. `pip install signxml`.
  3. Setear `DIAN_CERTIFICATE_PATH` y `DIAN_CERTIFICATE_PASSWORD` en
     settings, además de `DIAN_TECHNICAL_KEY` provisto por DIAN en la
     resolución de habilitación.
  4. Implementar el bloque TODO dentro de `sign_invoice_xml`.
  5. Validar contra el ambiente de pruebas DIAN antes de producción.

---

## Páginas legales frontend

- `/terms` — Términos y condiciones (Ley 820/2003).
- `/privacy` — Política de privacidad (Ley 1581/2012).
- `/security` — Pilares de seguridad + disclosures biométricos.
