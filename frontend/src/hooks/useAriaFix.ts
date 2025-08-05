import { useEffect } from 'react';

/**
 * Hook para corregir problemas de accesibilidad con aria-hidden
 * Previene que elementos con aria-hidden="true" contengan elementos enfocables
 */
export const useAriaFix = () => {
  useEffect(() => {
    // Función para verificar y corregir aria-hidden
    const fixAriaHidden = () => {
      const elementsWithAriaHidden = document.querySelectorAll('[aria-hidden="true"]');
      
      elementsWithAriaHidden.forEach((element) => {
        // Buscar elementos enfocables dentro
        const focusableElements = element.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
          // Si hay elementos enfocables, remover aria-hidden o usar inert
          if ('inert' in HTMLElement.prototype) {
            // Usar inert si está disponible (mejor soporte moderno)
            (element as HTMLElement).inert = true;
            element.removeAttribute('aria-hidden');
            console.warn('Corregido: elemento con aria-hidden contenía elementos enfocables. Usando inert.', element);
          } else {
            // Fallback: remover aria-hidden si contiene elementos enfocables
            element.removeAttribute('aria-hidden');
            console.warn('Corregido: removido aria-hidden de elemento con contenido enfocable', element);
          }
        }
      });
    };

    // Ejecutar la corrección inicialmente
    fixAriaHidden();

    // Observar cambios en el DOM para corregir dinámicamente
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          fixAriaHidden();
        }
      });
    });

    // Observar todo el documento
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['aria-hidden']
    });

    return () => {
      observer.disconnect();
    };
  }, []);
};

/**
 * Hook para manejar modales y diálogos accesibles
 */
export const useAccessibleModal = (isOpen: boolean, modalRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!modalRef.current) return;

    if (isOpen) {
      // Guardar el elemento que tenía el foco
      const previouslyFocused = document.activeElement as HTMLElement;
      
      // Hacer el resto del contenido inerte
      const appRoot = document.getElementById('root');
      if (appRoot && 'inert' in HTMLElement.prototype) {
        appRoot.inert = true;
      }
      
      // Enfocar el modal
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
      
      return () => {
        // Restaurar el estado al cerrar
        if (appRoot && 'inert' in HTMLElement.prototype) {
          appRoot.inert = false;
        }
        previouslyFocused?.focus();
      };
    }
  }, [isOpen, modalRef]);
};