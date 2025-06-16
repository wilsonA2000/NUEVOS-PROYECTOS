/**
 * JavaScript para el sistema de calificaciones de VeriHome
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar componentes de calificación con estrellas
    initStarRatings();
    
    // Inicializar pestañas en el dashboard
    initTabs();
    
    // Inicializar dropdowns
    initDropdowns();
});

/**
 * Inicializa los componentes de calificación con estrellas
 */
function initStarRatings() {
    // Calificación general
    const overallStars = document.querySelectorAll('.rating-stars .star-btn');
    const overallInput = document.getElementById('id_overall_rating');
    
    if (overallStars.length > 0 && overallInput) {
        // Ocultar el campo de entrada numérica
        overallInput.style.display = 'none';
        
        const overallValue = document.querySelector('.rating-value');
        
        overallStars.forEach(star => {
            star.addEventListener('click', function() {
                const value = this.dataset.value;
                overallInput.value = value;
                
                if (overallValue) {
                    overallValue.textContent = value + '/10';
                }
                
                // Actualizar estrellas
                overallStars.forEach(s => {
                    if (parseInt(s.dataset.value) <= parseInt(value)) {
                        s.classList.remove('text-gray-300');
                        s.classList.add('text-yellow-500');
                    } else {
                        s.classList.remove('text-yellow-500');
                        s.classList.add('text-gray-300');
                    }
                });
            });
        });
    }
    
    // Calificaciones por categoría
    document.querySelectorAll('.category-stars').forEach(starsContainer => {
        const fieldName = starsContainer.dataset.field;
        const input = document.querySelector(`input[name="${fieldName}"]`);
        
        if (input) {
            // Ocultar el campo de entrada numérica
            input.style.display = 'none';
            
            const valueDisplay = starsContainer.parentNode.querySelector('.category-value');
            const stars = starsContainer.querySelectorAll('.star-btn');
            
            stars.forEach(star => {
                star.addEventListener('click', function() {
                    const value = this.dataset.value;
                    input.value = value;
                    
                    if (valueDisplay) {
                        valueDisplay.textContent = value + '/10';
                    }
                    
                    // Actualizar estrellas
                    stars.forEach(s => {
                        if (parseInt(s.dataset.value) <= parseInt(value)) {
                            s.classList.remove('text-gray-300');
                            s.classList.add('text-yellow-500');
                        } else {
                            s.classList.remove('text-yellow-500');
                            s.classList.add('text-gray-300');
                        }
                    });
                });
            });
        }
    });
}

/**
 * Inicializa las pestañas en el dashboard
 */
function initTabs() {
    const tabs = document.querySelectorAll('[data-tabs-target]');
    const tabContents = document.querySelectorAll('[role="tabpanel"]');
    
    if (tabs.length > 0 && tabContents.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = document.querySelector(tab.dataset.tabsTarget);
                
                tabContents.forEach(tabContent => {
                    tabContent.classList.add('hidden');
                });
                
                tabs.forEach(t => {
                    t.classList.remove('border-blue-600');
                    t.classList.add('border-transparent');
                    t.setAttribute('aria-selected', false);
                });
                
                tab.classList.remove('border-transparent');
                tab.classList.add('border-blue-600');
                tab.setAttribute('aria-selected', true);
                
                if (target) {
                    target.classList.remove('hidden');
                }
            });
        });
    }
}

/**
 * Inicializa los dropdowns
 */
function initDropdowns() {
    const dropdownButtons = document.querySelectorAll('.dropdown button');
    
    dropdownButtons.forEach(button => {
        const dropdownMenu = button.parentNode.querySelector('.dropdown-menu');
        
        if (dropdownMenu) {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                dropdownMenu.classList.toggle('hidden');
            });
            
            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', function() {
                dropdownMenu.classList.add('hidden');
            });
        }
    });
}

/**
 * Actualiza la visualización de estrellas para un elemento
 * @param {HTMLElement} container - Contenedor de las estrellas
 * @param {number} rating - Calificación (1-10)
 */
function updateStars(container, rating) {
    if (!container) return;
    
    const stars = container.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('text-yellow-500');
            star.classList.remove('text-gray-300');
        } else {
            star.classList.remove('text-yellow-500');
            star.classList.add('text-gray-300');
        }
    });
}

/**
 * Carga las calificaciones de un usuario mediante AJAX
 * @param {string} userId - ID del usuario
 * @param {HTMLElement} container - Contenedor donde mostrar las calificaciones
 */
function loadUserRatings(userId, container) {
    if (!userId || !container) return;
    
    fetch(`/api/v1/calificaciones/users/${userId}/ratings/`)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                renderRatings(data.results, container);
            } else {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">Este usuario aún no tiene calificaciones.</p>';
            }
        })
        .catch(error => {
            console.error('Error al cargar calificaciones:', error);
            container.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar calificaciones.</p>';
        });
}

/**
 * Renderiza las calificaciones en el contenedor
 * @param {Array} ratings - Array de calificaciones
 * @param {HTMLElement} container - Contenedor donde mostrar las calificaciones
 */
function renderRatings(ratings, container) {
    if (!ratings || !container) return;
    
    let html = '<div class="space-y-4">';
    
    ratings.forEach(rating => {
        html += `
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center">
                            <span class="font-bold text-lg">${rating.overall_rating}</span>
                            <span class="ml-1 text-yellow-500">★</span>
                            <span class="ml-2 text-gray-600">/10</span>
                        </div>
                        <h4 class="text-lg font-semibold mt-1">${rating.title}</h4>
                    </div>
                    <div class="text-sm text-gray-500">
                        ${new Date(rating.created_at).toLocaleDateString()}
                    </div>
                </div>
                
                <div class="mt-2">
                    <p class="text-gray-700">${rating.review_text}</p>
                </div>
                
                <div class="mt-3 flex items-center">
                    <div class="flex-shrink-0">
                        <div class="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span class="text-gray-600 text-sm">${rating.reviewer.full_name.charAt(0)}</span>
                        </div>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-gray-700">
                            ${rating.is_anonymous ? 'Anónimo' : rating.reviewer.full_name}
                        </p>
                    </div>
                </div>
                
                <div class="mt-4 flex justify-end">
                    <a href="/calificaciones/detail/${rating.id}/" class="text-blue-600 hover:underline text-sm">Ver detalles</a>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}