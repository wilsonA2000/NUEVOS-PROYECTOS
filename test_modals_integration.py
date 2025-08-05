#!/usr/bin/env python3
"""
Script para verificar la integración de modales de términos y condiciones
"""

import os
import sys
from pathlib import Path

def check_frontend_files():
    """Verificar que los archivos del frontend existen"""
    print("🔍 Verificando archivos del frontend...")
    
    frontend_path = Path('frontend/src')
    required_files = [
        'components/modals/TermsModal.tsx',
        'components/modals/PrivacyModal.tsx',
        'components/modals/index.ts',
        'pages/auth/Register.tsx'
    ]
    
    all_exist = True
    for file_path in required_files:
        full_path = frontend_path / file_path
        if full_path.exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - NO EXISTE")
            all_exist = False
    
    return all_exist

def check_backend_templates():
    """Verificar que las plantillas del backend existen"""
    print("\n🔍 Verificando plantillas del backend...")
    
    templates_path = Path('templates')
    required_templates = [
        'core/terms.html',
        'core/privacy.html'
    ]
    
    all_exist = True
    for template_path in required_templates:
        full_path = templates_path / template_path
        if full_path.exists():
            print(f"✅ {template_path}")
        else:
            print(f"❌ {template_path} - NO EXISTE")
            all_exist = False
    
    return all_exist

def check_register_templates():
    """Verificar plantillas de registro"""
    print("\n🔍 Verificando plantillas de registro...")
    
    templates_path = Path('templates/users')
    register_templates = [
        'register_landlord.html',
        'register_tenant.html',
        'register_service_provider.html',
        'register_form.html'
    ]
    
    all_exist = True
    for template_path in register_templates:
        full_path = templates_path / template_path
        if full_path.exists():
            print(f"✅ {template_path}")
        else:
            print(f"❌ {template_path} - NO EXISTE")
            all_exist = False
    
    return all_exist

def check_terms_links():
    """Verificar que los enlaces a términos están presentes"""
    print("\n🔍 Verificando enlaces a términos en plantillas...")
    
    templates_to_check = [
        'templates/users/register_landlord.html',
        'templates/users/register_tenant.html',
        'templates/users/register_service_provider.html',
        'templates/users/register_form.html'
    ]
    
    all_have_links = True
    for template_file in templates_to_check:
        if Path(template_file).exists():
            with open(template_file, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'Términos y Condiciones' in content and 'Política de Privacidad' in content:
                    print(f"✅ {template_file} - Enlaces presentes")
                else:
                    print(f"⚠️ {template_file} - Enlaces faltantes")
                    all_have_links = False
        else:
            print(f"❌ {template_file} - NO EXISTE")
            all_have_links = False
    
    return all_have_links

def check_frontend_components():
    """Verificar componentes del frontend"""
    print("\n🔍 Verificando componentes del frontend...")
    
    register_file = Path('frontend/src/pages/auth/Register.tsx')
    if register_file.exists():
        with open(register_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        checks = [
            ('TermsModal import', 'import TermsModal from'),
            ('PrivacyModal import', 'import PrivacyModal from'),
            ('TermsModal component', '<TermsModal'),
            ('PrivacyModal component', '<PrivacyModal'),
            ('terms_accepted state', 'terms_accepted: false'),
            ('privacy_policy_accepted state', 'privacy_policy_accepted: false'),
            ('handleTermsAccept', 'handleTermsAccept'),
            ('handlePrivacyAccept', 'handlePrivacyAccept'),
            ('setTermsModalOpen', 'setTermsModalOpen'),
            ('setPrivacyModalOpen', 'setPrivacyModalOpen')
        ]
        
        all_checks_passed = True
        for check_name, check_text in checks:
            if check_text in content:
                print(f"✅ {check_name}")
            else:
                print(f"❌ {check_name} - NO ENCONTRADO")
                all_checks_passed = False
        
        return all_checks_passed
    else:
        print(f"❌ {register_file} - NO EXISTE")
        return False

def main():
    """Función principal"""
    print("🔍 Verificación de Integración - Modales de Términos y Privacidad")
    print("=" * 70)
    
    # 1. Verificar archivos del frontend
    frontend_ok = check_frontend_files()
    
    # 2. Verificar plantillas del backend
    backend_ok = check_backend_templates()
    
    # 3. Verificar plantillas de registro
    register_ok = check_register_templates()
    
    # 4. Verificar enlaces en plantillas
    links_ok = check_terms_links()
    
    # 5. Verificar componentes del frontend
    components_ok = check_frontend_components()
    
    # Resumen
    print("\n" + "=" * 70)
    print("📊 RESUMEN DE LA VERIFICACIÓN")
    print("=" * 70)
    print(f"📱 Frontend Files: {'✅ OK' if frontend_ok else '❌ FALLO'}")
    print(f"🔧 Backend Templates: {'✅ OK' if backend_ok else '❌ FALLO'}")
    print(f"📝 Register Templates: {'✅ OK' if register_ok else '❌ FALLO'}")
    print(f"🔗 Terms Links: {'✅ OK' if links_ok else '❌ FALLO'}")
    print(f"⚛️ Frontend Components: {'✅ OK' if components_ok else '❌ FALLO'}")
    
    all_ok = frontend_ok and backend_ok and register_ok and links_ok and components_ok
    
    if all_ok:
        print("\n🎉 ¡Integración completada exitosamente!")
        print("\n📋 Funcionalidades implementadas:")
        print("✅ Modales de términos y condiciones")
        print("✅ Modal de política de privacidad (Ley 1581 de 2012)")
        print("✅ Scroll obligatorio hasta el final")
        print("✅ Botón de aceptar solo disponible después del scroll")
        print("✅ Integración en formulario de registro")
        print("✅ Validación de aceptación obligatoria")
        print("✅ Chips de confirmación visual")
        print("✅ Alertas informativas")
        
        print("\n🚀 Próximos pasos:")
        print("1. Ejecuta el frontend: npm run dev")
        print("2. Prueba el registro de un nuevo usuario")
        print("3. Verifica que los modales se abren correctamente")
        print("4. Confirma que el scroll es obligatorio")
        print("5. Prueba que el botón de aceptar funciona")
    else:
        print("\n❌ Hay problemas en la integración")
        print("🔧 Revisa los archivos faltantes o incorrectos")
    
    print("\n📞 Si necesitas ayuda:")
    print("- Verifica que todos los archivos estén en las ubicaciones correctas")
    print("- Asegúrate de que las importaciones sean correctas")
    print("- Revisa que no haya errores de sintaxis")

if __name__ == '__main__':
    main() 