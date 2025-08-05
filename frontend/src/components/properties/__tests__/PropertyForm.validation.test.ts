import '@testing-library/jest-dom';

// Mock file validation functions from PropertyForm
const FILE_VALIDATION = {
  images: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxCount: 10,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  },
  videos: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.webm', '.mov']
  }
};

const validateImageFiles = (files: File[]): { valid: File[], errors: string[] } => {
  const errors: string[] = [];
  const valid: File[] = [];

  if (files.length > FILE_VALIDATION.images.maxCount) {
    errors.push(`Máximo ${FILE_VALIDATION.images.maxCount} imágenes permitidas`);
    return { valid: files.slice(0, FILE_VALIDATION.images.maxCount), errors };
  }

  files.forEach((file, index) => {
    // Validar tipo MIME
    if (!FILE_VALIDATION.images.allowedTypes.includes(file.type)) {
      errors.push(`Archivo ${index + 1}: Tipo no permitido. Use JPG, PNG o WebP`);
      return;
    }

    // Validar extensión
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!FILE_VALIDATION.images.allowedExtensions.includes(extension)) {
      errors.push(`Archivo ${index + 1}: Extensión no permitida`);
      return;
    }

    // Validar tamaño
    if (file.size > FILE_VALIDATION.images.maxSize) {
      const maxSizeMB = FILE_VALIDATION.images.maxSize / (1024 * 1024);
      errors.push(`Archivo ${index + 1}: Tamaño máximo ${maxSizeMB}MB`);
      return;
    }

    valid.push(file);
  });

  return { valid, errors };
};

const validateVideoFile = (file: File): { valid: boolean, error?: string } => {
  // Validar tipo MIME
  if (!FILE_VALIDATION.videos.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de video no permitido. Use MP4, WebM o MOV' };
  }

  // Validar extensión
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!FILE_VALIDATION.videos.allowedExtensions.includes(extension)) {
    return { valid: false, error: 'Extensión de video no permitida' };
  }

  // Validar tamaño
  if (file.size > FILE_VALIDATION.videos.maxSize) {
    const maxSizeMB = FILE_VALIDATION.videos.maxSize / (1024 * 1024);
    return { valid: false, error: `Tamaño máximo para video: ${maxSizeMB}MB` };
  }

  return { valid: true };
};

// Helper function to create mock files
const createMockFile = (name: string, type: string, size: number): File => {
  const blob = new Blob(['mock file content'], { type });
  const file = new File([blob], name, { type });
  
  // Mock the size property
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  });
  
  return file;
};

describe('PropertyForm File Validation', () => {
  describe('validateImageFiles', () => {
    it('should accept valid image files', () => {
      const validFiles = [
        createMockFile('test1.jpg', 'image/jpeg', 1024 * 1024), // 1MB
        createMockFile('test2.png', 'image/png', 2 * 1024 * 1024), // 2MB
        createMockFile('test3.webp', 'image/webp', 3 * 1024 * 1024), // 3MB
      ];

      const result = validateImageFiles(validFiles);

      expect(result.valid).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.valid).toEqual(validFiles);
    });

    it('should reject files with invalid MIME types', () => {
      const invalidFiles = [
        createMockFile('test.gif', 'image/gif', 1024 * 1024),
        createMockFile('test.bmp', 'image/bmp', 1024 * 1024),
      ];

      const result = validateImageFiles(invalidFiles);

      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Tipo no permitido');
      expect(result.errors[1]).toContain('Tipo no permitido');
    });

    it('should reject files with invalid extensions', () => {
      const invalidFiles = [
        createMockFile('test.gif', 'image/jpeg', 1024 * 1024), // MIME type valid but extension invalid
      ];

      const result = validateImageFiles(invalidFiles);

      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Extensión no permitida');
    });

    it('should reject files that are too large', () => {
      const largeFiles = [
        createMockFile('test.jpg', 'image/jpeg', 6 * 1024 * 1024), // 6MB > 5MB limit
      ];

      const result = validateImageFiles(largeFiles);

      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Tamaño máximo 5MB');
    });

    it('should limit the number of files to maximum count', () => {
      const tooManyFiles = Array.from({ length: 12 }, (_, i) => 
        createMockFile(`test${i}.jpg`, 'image/jpeg', 1024 * 1024)
      );

      const result = validateImageFiles(tooManyFiles);

      expect(result.valid).toHaveLength(10); // Limited to max count
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Máximo 10 imágenes permitidas');
    });

    it('should handle mixed valid and invalid files', () => {
      const mixedFiles = [
        createMockFile('valid.jpg', 'image/jpeg', 1024 * 1024),
        createMockFile('invalid.gif', 'image/gif', 1024 * 1024),
        createMockFile('toolarge.png', 'image/png', 6 * 1024 * 1024),
        createMockFile('valid2.webp', 'image/webp', 2 * 1024 * 1024),
      ];

      const result = validateImageFiles(mixedFiles);

      expect(result.valid).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
      expect(result.valid[0].name).toBe('valid.jpg');
      expect(result.valid[1].name).toBe('valid2.webp');
    });
  });

  describe('validateVideoFile', () => {
    it('should accept valid video files', () => {
      const validVideoFiles = [
        createMockFile('test.mp4', 'video/mp4', 10 * 1024 * 1024),
        createMockFile('test.webm', 'video/webm', 20 * 1024 * 1024),
        createMockFile('test.mov', 'video/quicktime', 30 * 1024 * 1024),
      ];

      validVideoFiles.forEach(file => {
        const result = validateVideoFile(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject files with invalid MIME types', () => {
      const invalidFile = createMockFile('test.avi', 'video/avi', 10 * 1024 * 1024);
      
      const result = validateVideoFile(invalidFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tipo de video no permitido. Use MP4, WebM o MOV');
    });

    it('should reject files with invalid extensions', () => {
      const invalidFile = createMockFile('test.avi', 'video/mp4', 10 * 1024 * 1024);
      
      const result = validateVideoFile(invalidFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Extensión de video no permitida');
    });

    it('should reject files that are too large', () => {
      const largeFile = createMockFile('test.mp4', 'video/mp4', 60 * 1024 * 1024); // 60MB > 50MB limit
      
      const result = validateVideoFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tamaño máximo para video: 50MB');
    });

    it('should accept files at the size limit', () => {
      const maxSizeFile = createMockFile('test.mp4', 'video/mp4', 50 * 1024 * 1024); // Exactly 50MB
      
      const result = validateVideoFile(maxSizeFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('FILE_VALIDATION constants', () => {
    it('should have correct image validation settings', () => {
      expect(FILE_VALIDATION.images.maxSize).toBe(5 * 1024 * 1024);
      expect(FILE_VALIDATION.images.maxCount).toBe(10);
      expect(FILE_VALIDATION.images.allowedTypes).toEqual([
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp'
      ]);
      expect(FILE_VALIDATION.images.allowedExtensions).toEqual([
        '.jpg', '.jpeg', '.png', '.webp'
      ]);
    });

    it('should have correct video validation settings', () => {
      expect(FILE_VALIDATION.videos.maxSize).toBe(50 * 1024 * 1024);
      expect(FILE_VALIDATION.videos.allowedTypes).toEqual([
        'video/mp4', 'video/webm', 'video/quicktime'
      ]);
      expect(FILE_VALIDATION.videos.allowedExtensions).toEqual([
        '.mp4', '.webm', '.mov'
      ]);
    });
  });
});