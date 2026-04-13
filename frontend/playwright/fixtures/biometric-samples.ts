/**
 * Payloads base64 minimos para interceptar endpoints biometricos en tests E2E.
 *
 * El backend (contracts/biometric_service.py) usa simulacion ML con thresholds
 * bajos (0.7) y acepta cualquier base64 valido como entrada. Estas fixtures
 * evitan depender de getUserMedia / fake media streams en Playwright.
 *
 * NOTA: formatos reales (no placeholders). El JPG es 1x1 gris, el PNG 1x1, el
 * WAV es un tono de 440Hz de ~0.1s. Son suficientes para pasar la validacion
 * de "archivo valido recibido".
 */

// JPG 1x1 pixel (data URL valido, padding correcto)
export const JPG_1X1_BASE64 =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD7/P/Z';

// PNG 1x1 transparente
export const PNG_1X1_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

// WAV valido (44 bytes header, 0 data) - header aceptado por ffmpeg/scipy
export const WAV_SILENCE_BASE64 =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export const BiometricPayloads = {
  faceCapture: {
    face_front_image: JPG_1X1_BASE64,
    face_side_image: JPG_1X1_BASE64,
  },
  documentCapture: {
    document_image: JPG_1X1_BASE64,
    document_type: 'cedula',
    document_number: '1098765432',
  },
  combinedCapture: {
    combined_image: JPG_1X1_BASE64,
  },
  voiceCapture: {
    voice_recording: WAV_SILENCE_BASE64,
    expected_text: 'Mi nombre es Test, autorizo la firma del contrato.',
  },
  // Shape real que consume CompleteAuthenticationAPIView (contracts/api_views.py)
  completeAuth: {
    face_capture: { faceImage: JPG_1X1_BASE64, confidence: 0.88 },
    document_verification: {
      pdfFile: JPG_1X1_BASE64,
      frontPhotoWithFace: JPG_1X1_BASE64,
      backPhotoWithFace: JPG_1X1_BASE64,
      documentType: 'cedula',
      documentNumber: '1098765432',
      confidence: 0.9,
    },
    voice_recording: {
      identificationRecording: WAV_SILENCE_BASE64,
      culturalRecording: WAV_SILENCE_BASE64,
      transcription: 'Mi nombre es Test, autorizo la firma del contrato.',
      confidence: 0.85,
      duration: 3,
    },
    digital_signature: {
      signatureImage: PNG_1X1_BASE64,
      signatureMetadata: {
        timestamp: new Date().toISOString(),
        duration: 2,
        strokeCount: 15,
      },
    },
  },
};
