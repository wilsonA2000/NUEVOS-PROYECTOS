from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.views import View
from .simple_form import SimpleUserForm
from .models import LandlordProfile

class DirectRegisterView(View):
    def get(self, request):
        form = SimpleUserForm()
        return render(request, 'users/direct_register.html', {'form': form})
    
    def post(self, request):
        form = SimpleUserForm(request.POST)
        if form.is_valid():
            try:
                user = form.save()
                # Crear perfil de arrendador
                LandlordProfile.objects.create(user=user)
                return HttpResponse(f"Usuario creado exitosamente: {user.email}")
            except Exception as e:
                return HttpResponse(f"Error al crear usuario: {str(e)}")
        else:
            return render(request, 'users/direct_register.html', {'form': form, 'errors': form.errors})