from django import forms
from django.contrib.auth import get_user_model

User = get_user_model()

class SimpleUserForm(forms.Form):
    first_name = forms.CharField(max_length=150, required=True)
    last_name = forms.CharField(max_length=150, required=True)
    email = forms.EmailField(required=True)
    phone_number = forms.CharField(max_length=15, required=True)
    password = forms.CharField(widget=forms.PasswordInput, required=True)
    
    def save(self):
        data = self.cleaned_data
        user = User(
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=data['email'],
            phone_number=data['phone_number'],
            user_type='landlord'
        )
        user.set_password(data['password'])
        user.save()
        return user