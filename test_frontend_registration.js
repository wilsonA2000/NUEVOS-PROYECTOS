#!/usr/bin/env node

/**
 * Test automatizado de registro desde el frontend de VeriHome
 */

const puppeteer = require('puppeteer');

async function testFrontendRegistration() {
    console.log('🚀 INICIANDO TEST AUTOMATIZADO DE REGISTRO FRONTEND');
    console.log('=' .repeat(60));
    
    let browser;
    try {
        // Configurar navegador
        browser = await puppeteer.launch({
            headless: false, // Mostrar el navegador para ver el proceso
            defaultViewport: { width: 1200, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Interceptar logs de consola
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Frontend Error:', msg.text());
            } else if (msg.text().includes('✅') || msg.text().includes('❌')) {
                console.log('📱 Frontend Log:', msg.text());
            }
        });
        
        // Interceptar peticiones de red
        page.on('response', response => {
            const url = response.url();
            if (url.includes('api/v1')) {
                console.log(`📡 API Call: ${response.request().method()} ${url} → ${response.status()}`);
            }
        });
        
        console.log('🌐 Navegando a la aplicación...');
        await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
        
        console.log('🔍 Buscando botón de registro...');
        
        // Buscar y hacer click en el enlace de registro
        try {
            await page.waitForSelector('a[href="/register"]', { timeout: 10000 });
            await page.click('a[href="/register"]');
            console.log('✅ Click en enlace de registro');
        } catch (e) {
            console.log('⚠️  Navegando directamente a /register');
            await page.goto('http://localhost:5174/register', { waitUntil: 'networkidle0' });
        }
        
        console.log('📝 Llenando formulario de registro...');
        
        // Esperar a que cargue el formulario
        await page.waitForSelector('input[name="email"]', { timeout: 10000 });
        
        // Llenar datos básicos
        await page.type('input[name="email"]', 'letefon100@gmail.com');
        await page.type('input[name="password"]', 'leidy2025*');
        await page.type('input[name="first_name"]', 'Leidy');
        await page.type('input[name="last_name"]', 'Fonseca');
        
        // Seleccionar tipo de usuario (landlord)
        await page.click('select[name="user_type"]');
        await page.select('select[name="user_type"]', 'landlord');
        
        // Código de entrevista
        await page.type('input[name="interview_code"]', 'VH-YLTV-IMWE');
        
        // Datos adicionales
        await page.type('input[name="phone_number"]', '+57 315 789 4567');
        
        // Esperar un momento para que se valide el código
        console.log('⏳ Esperando validación del código de entrevista...');
        await page.waitForTimeout(3000);
        
        // Scroll hacia abajo para ver más campos
        await page.evaluate(() => window.scrollBy(0, 400));
        
        // Llenar campos adicionales si están visibles
        try {
            await page.type('input[name="whatsapp"]', '+57 315 789 4567');
            await page.select('select[name="country"]', 'Colombia');
            await page.type('input[name="state"]', 'Cundinamarca');
            await page.type('input[name="city"]', 'Bogotá');
            await page.type('input[name="postal_code"]', '110111');
        } catch (e) {
            console.log('⚠️  Algunos campos opcionales no están visibles');
        }
        
        // Scroll hacia abajo para términos y condiciones
        await page.evaluate(() => window.scrollBy(0, 400));
        
        // Aceptar términos y condiciones
        try {
            await page.click('input[name="terms_accepted"]');
            await page.click('input[name="privacy_policy_accepted"]');
            console.log('✅ Términos y condiciones aceptados');
        } catch (e) {
            console.log('⚠️  Checkboxes de términos no encontrados');
        }
        
        console.log('🚀 Enviando formulario de registro...');
        
        // Enviar formulario
        await page.click('button[type="submit"]');
        
        // Esperar respuesta
        console.log('⏳ Esperando respuesta del servidor...');
        await page.waitForTimeout(5000);
        
        // Verificar si hay errores o éxito
        const errorElements = await page.$$('.MuiAlert-root');
        const successElements = await page.$$('[data-testid="success"]');
        
        if (errorElements.length > 0) {
            const errorText = await page.evaluate(el => el.textContent, errorElements[0]);
            console.log('❌ Error en registro:', errorText);
        } else if (successElements.length > 0) {
            console.log('✅ Registro exitoso detectado');
        } else {
            console.log('⚠️  Verificando redirección o modal de éxito...');
        }
        
        // Verificar URL actual
        const currentUrl = page.url();
        console.log('📍 URL actual:', currentUrl);
        
        // Esperar un poco más para ver el resultado
        await page.waitForTimeout(3000);
        
        console.log('✅ Test completado');
        
    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Verificar dependencias
async function checkDependencies() {
    try {
        require('puppeteer');
        return true;
    } catch (e) {
        console.log('❌ Puppeteer no está instalado.');
        console.log('📦 Para instalar: npm install puppeteer');
        return false;
    }
}

// Ejecutar test
async function main() {
    const hasDepedencies = await checkDependencies();
    if (hasDepedencies) {
        await testFrontendRegistration();
    }
}

main().catch(console.error);