#!/usr/bin/env python
"""
Script para iniciar el servidor Django y probar el endpoint
"""
import os
import sys
import subprocess
import time
import requests
import json
import signal

def start_server():
    """Inicia el servidor Django en background"""
    os.chdir('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
    python_path = './venv/Scripts/python.exe'
    
    print("🚀 Starting Django server...")
    proc = subprocess.Popen([python_path, 'manage.py', 'runserver', '127.0.0.1:8000'])
    
    # Esperar a que el servidor inicie
    print("⏳ Waiting for server to start...")
    time.sleep(5)
    
    return proc

def test_endpoint():
    """Prueba el endpoint de validación"""
    url = "http://127.0.0.1:8000/api/v1/auth/validate-interview-code/"
    
    test_data = {
        "interview_code": "VH-AWTQ-4217"
    }
    
    try:
        print(f"🔍 Testing endpoint: {url}")
        print(f"📝 Sending data: {test_data}")
        
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(test_data),
            timeout=10
        )
        
        print(f"📊 Status code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Endpoint working correctly!")
            return True
        else:
            print("❌ Endpoint returned error")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    proc = None
    try:
        proc = start_server()
        success = test_endpoint()
        
        if success:
            print("\n✅ Everything working! Server will continue running.")
            print("Press Ctrl+C to stop the server.")
            
            # Keep server running
            try:
                proc.wait()
            except KeyboardInterrupt:
                print("\n🛑 Stopping server...")
        else:
            print("\n❌ Test failed. Stopping server.")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if proc:
            proc.terminate()
            proc.wait()

if __name__ == "__main__":
    main()