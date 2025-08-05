#!/usr/bin/env node

/**
 * Test de conectividad Frontend-Backend para VeriHome
 */

const https = require('http');

const API_BASE = 'http://localhost:8001/api/v1';

async function testAPIConnection() {
    console.log('🧪 TESTING: Conectividad Frontend-Backend');
    console.log('=' .repeat(50));
    
    // Test 1: Validación de código de entrevista
    console.log('\n📡 Test 1: Validación de código de entrevista');
    
    const postData = JSON.stringify({
        interview_code: 'VH-OSZI-4918'
    });
    
    const options = {
        hostname: 'localhost',
        port: 8001,
        path: '/api/v1/users/auth/validate-interview-code/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = https.request(options, (res) => {
        console.log(`📥 Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log('📥 Response:', JSON.stringify(response, null, 2));
                
                if (res.statusCode === 200 && response.is_valid) {
                    console.log('✅ Código válido confirmado');
                    testRegistration();
                } else {
                    console.log('❌ Error en validación');
                }
            } catch (e) {
                console.log('❌ Error parsing response:', e);
            }
        });
    });
    
    req.on('error', (e) => {
        console.log('❌ Error en conexión:', e.message);
    });
    
    req.write(postData);
    req.end();
}

function testRegistration() {
    console.log('\n📡 Test 2: Registro sin código de entrevista');
    
    const postData = JSON.stringify({
        email: 'test.conexion@test.com',
        password: 'testpass123',
        password2: 'testpass123',
        first_name: 'Test',
        last_name: 'Connection',
        user_type: 'tenant',
        phone_number: '+57 300 000 0000'
    });
    
    const options = {
        hostname: 'localhost',
        port: 8001,
        path: '/api/v1/users/auth/register/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = https.request(options, (res) => {
        console.log(`📥 Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log('📥 Response:', JSON.stringify(response, null, 2));
                
                if (res.statusCode === 201) {
                    console.log('✅ Registro exitoso');
                    console.log('\n🎉 ¡CONECTIVIDAD FRONTEND-BACKEND 100% FUNCIONAL!');
                } else if (res.statusCode === 400 && response.error && response.error.includes('Ya existe')) {
                    console.log('✅ Validación correcta (usuario ya existe)');
                    console.log('\n🎉 ¡CONECTIVIDAD FRONTEND-BACKEND 100% FUNCIONAL!');
                } else {
                    console.log('❌ Error en registro');
                }
            } catch (e) {
                console.log('❌ Error parsing response:', e);
            }
        });
    });
    
    req.on('error', (e) => {
        console.log('❌ Error en conexión:', e.message);
    });
    
    req.write(postData);
    req.end();
}

// Ejecutar test
testAPIConnection();