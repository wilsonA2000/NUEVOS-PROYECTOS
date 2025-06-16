from django.shortcuts import render
from django.http import HttpResponse
from django.views import View
from .forms import LandlordRegistrationForm

class DebugLandlordRegistrationView(View):
    def get(self, request):
        form = LandlordRegistrationForm()
        return render(request, 'users/debug_register.html', {'form': form})
    
    def post(self, request):
        form = LandlordRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            return HttpResponse(f"Usuario creado exitosamente: {user.email}")
        else:
            return render(request, 'users/debug_register.html', {'form': form, 'errors': form.errors})