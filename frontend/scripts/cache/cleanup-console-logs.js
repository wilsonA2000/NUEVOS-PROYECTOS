#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🧹 Iniciando limpieza de console.log...');

// Función para procesar un archivo
function cleanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Reemplazar console.log con comentarios
    const cleanedContent = content
      .replace(/\s*console\.log\([^)]*\);?\s*/g, '\n  // Debug log removed\n')
      .replace(/^\s*\/\/ Debug log removed\s*$/gm, '') // Remover líneas vacías de comentarios
      .replace(/\n\s*\n\s*\n/g, '\n\n'); // Reducir múltiples líneas vacías
    
    if (originalContent !== cleanedContent) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
      console.log(`✅ Limpiado: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return false;
  }
}

// Obtener lista de archivos con console.log
try {
  const output = execSync(`find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "console\\.log"`, { encoding: 'utf8' });
  const files = output.trim().split('\n').filter(file => file.length > 0);
  
  console.log(`📁 Encontrados ${files.length} archivos con console.log`);
  
  let cleanedCount = 0;
  
  files.forEach(file => {
    if (cleanFile(file)) {
      cleanedCount++;
    }
  });
  
  console.log(`🎉 Limpieza completada: ${cleanedCount} archivos modificados`);
  
  // Verificar que no queden console.log
  try {
    const remaining = execSync(`find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "console\\.log"`, { encoding: 'utf8' });
    if (remaining.trim()) {
      console.log('⚠️ Algunos archivos aún tienen console.log:');
      console.log(remaining);
    } else {
      console.log('🎯 ¡Todos los console.log han sido removidos!');
    }
  } catch (e) {
    console.log('🎯 ¡Todos los console.log han sido removidos!');
  }
  
} catch (error) {
  console.log('🎯 No se encontraron archivos con console.log o ya están limpios');
}