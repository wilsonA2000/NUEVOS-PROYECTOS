#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔧 Fixing rollup issue for WSL...');

// Verificar si estamos en WSL
const isWSL = process.platform === 'linux' && fs.existsSync('/proc/version') && 
              fs.readFileSync('/proc/version', 'utf8').includes('Microsoft');

if (isWSL) {
  console.log('📍 WSL detected - applying rollup fix...');
  
  try {
    // Instalar rollup específico para Linux
    console.log('📦 Installing rollup for Linux...');
    execSync('npm install @rollup/rollup-linux-x64-gnu --save-dev', { stdio: 'inherit' });
    
    // También instalar esbuild para Linux
    console.log('📦 Installing esbuild for Linux...');
    execSync('npm install @esbuild/linux-x64 --save-dev', { stdio: 'inherit' });
    
    console.log('✅ Rollup fix applied successfully!');
    
    // Intentar iniciar Vite
    console.log('🚀 Starting Vite dev server...');
    execSync('npm run dev', { stdio: 'inherit' });
    
  } catch (error) {
    console.error('❌ Error during rollup fix:', error.message);
    
    // Fallback: usar yarn
    console.log('🔄 Trying yarn as fallback...');
    try {
      execSync('npm install -g yarn', { stdio: 'inherit' });
      execSync('yarn install', { stdio: 'inherit' });
      execSync('yarn dev', { stdio: 'inherit' });
    } catch (yarnError) {
      console.error('❌ Yarn fallback failed:', yarnError.message);
      process.exit(1);
    }
  }
} else {
  console.log('📍 Not WSL - starting normally...');
  execSync('npm run dev', { stdio: 'inherit' });
}