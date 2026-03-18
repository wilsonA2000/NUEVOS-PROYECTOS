import os
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')

import django
django.setup()

from django.urls import get_resolver
from django.urls.resolvers import URLPattern, URLResolver

def list_urls(urlpatterns, prefix=''):
    """Recursively list all URLs"""
    urls = []
    for pattern in urlpatterns:
        if isinstance(pattern, URLResolver):
            # It's an included URLconf
            new_prefix = prefix + str(pattern.pattern)
            urls.extend(list_urls(pattern.url_patterns, new_prefix))
        elif isinstance(pattern, URLPattern):
            # It's a URL pattern
            url = prefix + str(pattern.pattern)
            name = pattern.name or ''
            urls.append((url, name))
    return urls

resolver = get_resolver()
all_urls = list_urls(resolver.url_patterns)

# Filter API endpoints
api_urls = [(url, name) for url, name in all_urls if 'api/v1' in url]

print("=" * 100)
print("📋 TODOS LOS ENDPOINTS DE API (/api/v1/)")
print("=" * 100)

# Group by module
from collections import defaultdict
grouped = defaultdict(list)

for url, name in sorted(api_urls):
    module = url.split('/')[2] if len(url.split('/')) > 2 else 'other'
    grouped[module].append((url, name))

for module in sorted(grouped.keys()):
    print(f"\n🔹 {module.upper()}:")
    for url, name in grouped[module]:
        print(f"   {url:80} -> {name}")

print(f"\n📊 Total endpoints: {len(api_urls)}")
