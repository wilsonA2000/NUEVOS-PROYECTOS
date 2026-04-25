import { parseColombianId } from '../colombianIdParser';

describe('parseColombianId', () => {
  it('detecta cédula de ciudadanía por keyword explícito', () => {
    const result = parseColombianId([
      'REPUBLICA DE COLOMBIA',
      'CEDULA DE CIUDADANIA',
      'NUMERO',
      '1234567890',
      'APELLIDOS',
      'GARCIA RODRIGUEZ',
      'NOMBRES',
      'JUAN CARLOS',
    ]);
    expect(result.detectedType).toBe('cedula_ciudadania');
    expect(result.documentNumber).toBe('1234567890');
  });

  it('detecta cédula extranjería con prefijo CE', () => {
    const result = parseColombianId([
      'CEDULA DE EXTRANJERIA',
      'No. CE 1234567',
      'PEREZ MARTINEZ',
      'CARLOS ANDRES',
    ]);
    expect(result.detectedType).toBe('cedula_extranjeria');
    expect(result.documentNumber).toBe('CE1234567');
  });

  it('detecta pasaporte', () => {
    const result = parseColombianId([
      'REPUBLICA DE COLOMBIA',
      'PASAPORTE',
      'PASSPORT',
      'AB1234567',
    ]);
    expect(result.detectedType).toBe('pasaporte');
  });

  it('detecta tarjeta de identidad', () => {
    const result = parseColombianId([
      'REPUBLICA DE COLOMBIA',
      'TARJETA DE IDENTIDAD',
      '1098765432',
    ]);
    expect(result.detectedType).toBe('tarjeta_identidad');
  });

  it('cae a cédula ciudadanía si solo aparece "REPUBLICA DE COLOMBIA"', () => {
    const result = parseColombianId([
      'REPUBLICA DE COLOMBIA',
      '1234567890',
      'GARCIA RODRIGUEZ',
      'JUAN',
    ]);
    expect(result.detectedType).toBe('cedula_ciudadania');
  });

  it('extrae fecha en formato DD/MM/YYYY', () => {
    const result = parseColombianId([
      'CEDULA DE CIUDADANIA',
      '1234567890',
      'FECHA DE NACIMIENTO 15/03/1990',
      'FECHA DE EXPEDICION 20/05/2010',
    ]);
    expect(result.dateOfBirth).toBe('1990-03-15');
  });

  it('extrae fecha con mes en español (ENE/FEB/...)', () => {
    const result = parseColombianId([
      'CEDULA DE CIUDADANIA',
      '1234567890',
      'NACIMIENTO 15-MAR-1990',
    ]);
    expect(result.dateOfBirth).toBe('1990-03-15');
  });

  it('parsea nombre con 4 tokens (2 apellidos + 2 nombres)', () => {
    const result = parseColombianId([
      'CEDULA DE CIUDADANIA',
      '1234567890',
      'GARCIA RODRIGUEZ ALONSO PEREZ',
    ]);
    expect(result.fullName).toBe('GARCIA RODRIGUEZ ALONSO PEREZ');
    expect(result.firstName).toBe('GARCIA RODRIGUEZ');
    expect(result.lastName).toBe('ALONSO PEREZ');
  });

  it('ignora líneas con dígitos al extraer nombres', () => {
    const result = parseColombianId([
      'CEDULA DE CIUDADANIA',
      '1234567890',
      'PEREZ MARTINEZ',
      'CARLOS ANDRES',
    ]);
    expect(result.fullName).toBeTruthy();
    expect(result.fullName).not.toContain('1234567890');
  });

  it('ignora stopwords (REPUBLICA, COLOMBIA, NUMERO, etc.) en nombres', () => {
    const result = parseColombianId([
      'REPUBLICA DE COLOMBIA',
      'CEDULA DE CIUDADANIA',
      'NUMERO',
      '1234567890',
      'APELLIDOS GARCIA RODRIGUEZ',
    ]);
    expect(result.fullName).toBe('GARCIA RODRIGUEZ');
  });

  it('devuelve null en campos no extraíbles sin fallar', () => {
    const result = parseColombianId([]);
    expect(result.documentNumber).toBeNull();
    expect(result.fullName).toBeNull();
    expect(result.dateOfBirth).toBeNull();
    expect(result.detectedType).toBe('');
  });

  it('rechaza fechas inválidas (32 de enero)', () => {
    const result = parseColombianId([
      'CEDULA DE CIUDADANIA',
      '1234567890',
      'FECHA 32/01/1990',
    ]);
    expect(result.dateOfBirth).toBeNull();
  });

  it('elige el número de cédula más largo cuando hay varios', () => {
    const result = parseColombianId([
      'CEDULA DE CIUDADANIA',
      '12345',
      '1234567890',
      'CARRERA 123',
    ]);
    expect(result.documentNumber).toBe('1234567890');
  });
});
