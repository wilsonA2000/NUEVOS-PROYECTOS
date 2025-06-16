from django import forms

class CustomTextInput(forms.TextInput):
    def __init__(self, attrs=None):
        default_attrs = {
            'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200'
        }
        if attrs:
            default_attrs.update(attrs)
        super().__init__(default_attrs)

class CustomEmailInput(forms.EmailInput):
    def __init__(self, attrs=None):
        default_attrs = {
            'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200'
        }
        if attrs:
            default_attrs.update(attrs)
        super().__init__(default_attrs)

class CustomPasswordInput(forms.PasswordInput):
    def __init__(self, attrs=None):
        default_attrs = {
            'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200'
        }
        if attrs:
            default_attrs.update(attrs)
        super().__init__(default_attrs)