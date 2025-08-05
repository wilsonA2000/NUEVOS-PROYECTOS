#!/usr/bin/env python
"""
Test simple para verificar que el backend Django esté respondiendo correctamente
"""
import requests
import json
import time

def test_backend_connection():
    print("PRUEBA DE CONEXION AL BACKEND")
    print("=" * 40)
    
    # URLs a probar
    urls_to_test = [
        ("Django Admin", "http://127.0.0.1:8000/admin/"),
        ("API Root", "http://127.0.0.1:8000/api/v1/"),
        ("Validate Interview Code", "http://127.0.0.1:8000/api/v1/auth/validate-interview-code/"),
        ("Registration Endpoint", "http://127.0.0.1:8000/api/v1/auth/register/"),
    ]
    
    for name, url in urls_to_test:
        print(f"\nProbando {name}: {url}")
        
        try:
            start_time = time.time()
            
            if "register" in url or "validate-interview" in url:
                # Hacer POST con datos mínimos
                response = requests.post(url, 
                    json={"test": "data"}, 
                    headers={"Content-Type": "application/json"},
                    timeout=5
                )
            else:
                # Hacer GET
                response = requests.get(url, timeout=5)
            
            end_time = time.time()
            duration = (end_time - start_time) * 1000  # en milisegundos
            
            print(f"Status: {response.status_code}")
            print(f"Tiempo: {duration:.2f}ms")
            
            if duration > 1000:
                print(f"LENTO: Mas de 1 segundo!")
            
            # Mostrar headers relevantes
            if 'content-type' in response.headers:
                print(f"Content-Type: {response.headers['content-type']}")
            
            if response.status_code == 200:
                print("Endpoint funcionando correctamente")
            elif response.status_code == 400:
                print("Endpoint responde (error de validacion esperado)")
            elif response.status_code == 405:
                print("Endpoint responde (metodo no permitido)")
            else:
                print(f"Status code inesperado: {response.status_code}")
                
        except requests.exceptions.Timeout:
            print("TIMEOUT: El servidor tardo mas de 5 segundos en responder")
        except requests.exceptions.ConnectionError:
            print("ERROR DE CONEXION: No se pudo conectar al servidor")
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    test_backend_connection()