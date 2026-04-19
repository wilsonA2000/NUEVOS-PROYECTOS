# Módulo de solicitudes centralizadas para VeriHome
#
# COMPATIBILITY SHIM: This Django app name 'requests' shadows the PyPI
# 'requests' library. We re-export all public attributes so DRF and other
# libraries that do 'import requests' still work. Django's relative imports
# (e.g., 'from .models import ...') still resolve to the local app's modules
# because Django manages app imports via its own registry.
import sys as _sys
import os as _os


def _find_real_requests_path():
    """Find the real 'requests' library in site-packages."""
    _this_dir = _os.path.normpath(_os.path.dirname(_os.path.abspath(__file__)))
    for path in _sys.path:
        if not path:
            continue
        abs_path = _os.path.normpath(_os.path.abspath(path))
        candidate = _os.path.normpath(_os.path.join(abs_path, 'requests'))
        if candidate == _this_dir:
            continue
        init_file = _os.path.join(candidate, '__init__.py')
        if _os.path.isfile(init_file):
            return candidate, init_file
    return None, None


def _load_real_requests_attrs():
    """Load the real requests package and return a dict of its public attributes."""
    _pkg_dir, _init_file = _find_real_requests_path()
    if not _init_file:
        return {}

    # Save existing state
    _saved_self = _sys.modules.pop('requests', None)
    _saved_subs = {}
    for k in list(_sys.modules):
        if k.startswith('requests.'):
            _saved_subs[k] = _sys.modules.pop(k)

    # Temporarily prepend site-packages to sys.path
    _sp_dir = _os.path.dirname(_pkg_dir)
    _sys.path.insert(0, _sp_dir)

    attrs = {}
    try:
        import importlib as _il
        _real = _il.import_module('requests')
        # Copy all public attributes
        for name in dir(_real):
            if not name.startswith('_'):
                attrs[name] = getattr(_real, name)
        # Also copy __version__
        attrs['__version__'] = _real.__version__
    except Exception:
        pass
    finally:
        # Clean up: remove ALL requests.* modules that the real import added
        for k in list(_sys.modules):
            if k == 'requests' or k.startswith('requests.'):
                del _sys.modules[k]

        # Remove site-packages path we added
        try:
            _sys.path.remove(_sp_dir)
        except ValueError:
            pass

        # Restore original state
        if _saved_self is not None:
            _sys.modules['requests'] = _saved_self
        for k, v in _saved_subs.items():
            _sys.modules[k] = v

    return attrs


# Load and inject attributes into this module
_attrs = _load_real_requests_attrs()
_g = globals()
for _name, _val in _attrs.items():
    _g[_name] = _val
del _attrs, _g, _name, _val
