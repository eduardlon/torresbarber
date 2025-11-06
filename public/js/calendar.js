// calendar.js - Funcionalidad específica del calendario de citas

class CalendarManager {
    constructor() {
        this.calendar = null;
        this.events = [];
        this.init();
    }

    init() {
        this.loadEvents();
        this.initCalendar();
        this.bindCalendarEvents();
    }

    initCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl || typeof FullCalendar === 'undefined') {
            console.warn('Calendar element not found or FullCalendar not loaded');
            return;
        }

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'es',
            height: 'auto',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            buttonText: {
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día'
            },
            events: this.events,
            eventClick: (info) => {
                this.showAppointmentDetails(info.event);
            },
            dateClick: (info) => {
                this.showNewAppointmentModal(info.date);
            },
            eventDidMount: (info) => {
                // Add custom styling to events
                info.el.style.cursor = 'pointer';
            },
            eventMouseEnter: (info) => {
                // Show tooltip on hover
                this.showEventTooltip(info);
            },
            eventMouseLeave: (info) => {
                // Hide tooltip
                this.hideEventTooltip();
            }
        });

        this.calendar.render();
    }

    loadEvents() {
        // Load events from API or local storage
        this.events = [
            {
                id: '1',
                title: 'Corte - Juan Pérez',
                start: '2024-01-15T10:00:00',
                end: '2024-01-15T11:00:00',
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                extendedProps: {
                    cliente: 'Juan Pérez',
                    barbero: 'Carlos Mendoza',
                    servicio: 'Corte de cabello',
                    telefono: '+1234567890',
                    precio: 25000
                }
            },
            {
                id: '2',
                title: 'Barba - Carlos López',
                start: '2024-01-16T14:30:00',
                end: '2024-01-16T15:30:00',
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                extendedProps: {
                    cliente: 'Carlos López',
                    barbero: 'Miguel Torres',
                    servicio: 'Arreglo de barba',
                    telefono: '+1234567891',
                    precio: 20000
                }
            },
            {
                id: '3',
                title: 'Corte + Barba - Ana García',
                start: '2024-01-17T16:00:00',
                end: '2024-01-17T17:30:00',
                backgroundColor: '#10b981',
                borderColor: '#059669',
                extendedProps: {
                    cliente: 'Ana García',
                    barbero: 'Luis Rodríguez',
                    servicio: 'Corte + Barba',
                    telefono: '+1234567892',
                    precio: 40000
                }
            },
            {
                id: '4',
                title: 'Peinado - María Fernández',
                start: '2024-01-18T11:00:00',
                end: '2024-01-18T12:00:00',
                backgroundColor: '#f59e0b',
                borderColor: '#d97706',
                extendedProps: {
                    cliente: 'María Fernández',
                    barbero: 'Carlos Mendoza',
                    servicio: 'Peinado especial',
                    telefono: '+1234567893',
                    precio: 30000
                }
            }
        ];
    }

    bindCalendarEvents() {
        // Calendar view buttons
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.changeCalendarView(view);
            });
        });

        // Add appointment button
        const addAppointmentBtn = document.getElementById('add-appointment-btn');
        if (addAppointmentBtn) {
            addAppointmentBtn.addEventListener('click', () => {
                this.showNewAppointmentModal();
            });
        }

        // Filter buttons
        document.querySelectorAll('.appointment-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.filterAppointments(filter);
            });
        });
    }

    changeCalendarView(view) {
        if (this.calendar) {
            this.calendar.changeView(view);
        }
    }

    filterAppointments(filter) {
        // Update active filter button
        document.querySelectorAll('.appointment-filter').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        // Filter events based on criteria
        let filteredEvents = [...this.events];

        switch (filter) {
            case 'today':
                const today = new Date().toISOString().split('T')[0];
                filteredEvents = this.events.filter(event => 
                    event.start.startsWith(today)
                );
                break;
            case 'week':
                const weekStart = this.getWeekStart();
                const weekEnd = this.getWeekEnd();
                filteredEvents = this.events.filter(event => {
                    const eventDate = new Date(event.start);
                    return eventDate >= weekStart && eventDate <= weekEnd;
                });
                break;
            case 'pending':
                filteredEvents = this.events.filter(event => 
                    new Date(event.start) > new Date()
                );
                break;
            case 'completed':
                filteredEvents = this.events.filter(event => 
                    new Date(event.start) < new Date()
                );
                break;
            default:
                // Show all events
                break;
        }

        // Update calendar with filtered events
        if (this.calendar) {
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(filteredEvents);
        }
    }

    getWeekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day;
        return new Date(now.setDate(diff));
    }

    getWeekEnd() {
        const weekStart = this.getWeekStart();
        return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    }

    showAppointmentDetails(event) {
        const modal = document.getElementById('appointment-details-modal');
        if (!modal) {
            this.createAppointmentDetailsModal(event);
            return;
        }

        // Populate modal with event details
        const props = event.extendedProps;
        document.getElementById('detail-cliente').textContent = props.cliente || 'N/A';
        document.getElementById('detail-barbero').textContent = props.barbero || 'N/A';
        document.getElementById('detail-servicio').textContent = props.servicio || 'N/A';
        document.getElementById('detail-fecha').textContent = this.formatDate(event.start);
        document.getElementById('detail-hora').textContent = this.formatTime(event.start);
        document.getElementById('detail-telefono').textContent = props.telefono || 'N/A';
        document.getElementById('detail-precio').textContent = props.precio ? `$${props.precio.toLocaleString()}` : 'N/A';

        // Show modal
        this.showModal('appointment-details-modal');
    }

    createAppointmentDetailsModal(event) {
        const modal = document.createElement('div');
        modal.id = 'appointment-details-modal';
        modal.className = 'modal fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50';
        
        const props = event.extendedProps;
        modal.innerHTML = `
            <div class="modal-content bg-white rounded-lg p-6 max-w-md w-full mx-4 transform scale-95 opacity-0 transition-all duration-200">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Detalles de la Cita</h3>
                    <button class="close-modal text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-700">Cliente:</span>
                        <span id="detail-cliente" class="text-gray-900">${props.cliente || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-700">Barbero:</span>
                        <span id="detail-barbero" class="text-gray-900">${props.barbero || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-700">Servicio:</span>
                        <span id="detail-servicio" class="text-gray-900">${props.servicio || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-700">Fecha:</span>
                        <span id="detail-fecha" class="text-gray-900">${this.formatDate(event.start)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-700">Hora:</span>
                        <span id="detail-hora" class="text-gray-900">${this.formatTime(event.start)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-700">Teléfono:</span>
                        <span id="detail-telefono" class="text-gray-900">${props.telefono || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-700">Precio:</span>
                        <span id="detail-precio" class="text-gray-900">${props.precio ? `$${props.precio.toLocaleString()}` : 'N/A'}</span>
                    </div>
                </div>
                
                <div class="flex gap-2 mt-6">
                    <button class="edit-appointment-btn flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                        Editar
                    </button>
                    <button class="delete-appointment-btn flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors">
                        Eliminar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Bind events
        modal.querySelector('.close-modal').addEventListener('click', () => {
            this.hideModal('appointment-details-modal');
        });
        
        modal.querySelector('.edit-appointment-btn').addEventListener('click', () => {
            this.editAppointment(event);
        });
        
        modal.querySelector('.delete-appointment-btn').addEventListener('click', () => {
            this.deleteAppointment(event);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal('appointment-details-modal');
            }
        });
        
        this.showModal('appointment-details-modal');
    }

    showNewAppointmentModal(date = null) {
        const modal = document.getElementById('new-appointment-modal');
        if (modal) {
            // Pre-fill date if provided
            if (date) {
                const dateInput = modal.querySelector('#appointment-date');
                if (dateInput) {
                    dateInput.value = date.toISOString().split('T')[0];
                }
            }
            this.showModal('new-appointment-modal');
        }
    }

    editAppointment(event) {
        // Hide details modal and show edit modal
        this.hideModal('appointment-details-modal');
        
        // Populate edit form with current data
        const props = event.extendedProps;
        const editModal = document.getElementById('edit-appointment-modal');
        if (editModal) {
            editModal.querySelector('#edit-cliente').value = props.cliente || '';
            editModal.querySelector('#edit-barbero').value = props.barbero || '';
            editModal.querySelector('#edit-servicio').value = props.servicio || '';
            editModal.querySelector('#edit-fecha').value = event.start.toISOString().split('T')[0];
            editModal.querySelector('#edit-hora').value = event.start.toTimeString().slice(0, 5);
            editModal.querySelector('#edit-telefono').value = props.telefono || '';
            editModal.querySelector('#edit-precio').value = props.precio || '';
            
            this.showModal('edit-appointment-modal');
        }
    }

    deleteAppointment(event) {
        const message = '¿Estás seguro de que quieres eliminar esta cita?';
        
        if (window.notifications && window.notifications.showConfirmation) {
            window.notifications.showConfirmation(
                message,
                () => {
                    // Remove event from calendar
                    if (this.calendar) {
                        event.remove();
                    }
                    
                    // Remove from events array
                    this.events = this.events.filter(e => e.id !== event.id);
                    
                    // Hide modal
                    this.hideModal('appointment-details-modal');
                    
                    // Show success notification
                    if (window.adminPanel) {
                        window.adminPanel.showNotification('Cita eliminada exitosamente', 'success');
                    }
                }
            );
        } else {
            // Fallback to native confirm
            if (confirm(message)) {
                // Remove event from calendar
                if (this.calendar) {
                    event.remove();
                }
                
                // Remove from events array
                this.events = this.events.filter(e => e.id !== event.id);
                
                // Hide modal
                this.hideModal('appointment-details-modal');
                
                // Show success notification
                if (window.adminPanel) {
                    window.adminPanel.showNotification('Cita eliminada exitosamente', 'success');
                }
            }
        }
    }

    addAppointment(appointmentData) {
        const newEvent = {
            id: Date.now().toString(),
            title: `${appointmentData.servicio} - ${appointmentData.cliente}`,
            start: `${appointmentData.fecha}T${appointmentData.hora}:00`,
            end: this.calculateEndTime(appointmentData.fecha, appointmentData.hora, appointmentData.servicio),
            backgroundColor: this.getServiceColor(appointmentData.servicio),
            borderColor: this.getServiceColor(appointmentData.servicio, true),
            extendedProps: appointmentData
        };
        
        // Add to events array
        this.events.push(newEvent);
        
        // Add to calendar
        if (this.calendar) {
            this.calendar.addEvent(newEvent);
        }
        
        return newEvent;
    }

    calculateEndTime(date, startTime, service) {
        const start = new Date(`${date}T${startTime}:00`);
        let duration = 60; // Default 1 hour
        
        // Adjust duration based on service
        switch (service.toLowerCase()) {
            case 'corte':
            case 'corte de cabello':
                duration = 45;
                break;
            case 'barba':
            case 'arreglo de barba':
                duration = 30;
                break;
            case 'corte + barba':
                duration = 75;
                break;
            case 'peinado':
            case 'peinado especial':
                duration = 60;
                break;
        }
        
        const end = new Date(start.getTime() + duration * 60000);
        return end.toISOString();
    }

    getServiceColor(service, border = false) {
        const colors = {
            'corte': border ? '#dc2626' : '#ef4444',
            'corte de cabello': border ? '#dc2626' : '#ef4444',
            'barba': border ? '#2563eb' : '#3b82f6',
            'arreglo de barba': border ? '#2563eb' : '#3b82f6',
            'corte + barba': border ? '#059669' : '#10b981',
            'peinado': border ? '#d97706' : '#f59e0b',
            'peinado especial': border ? '#d97706' : '#f59e0b'
        };
        
        return colors[service.toLowerCase()] || (border ? '#6b7280' : '#9ca3af');
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showEventTooltip(info) {
        // Create and show tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'event-tooltip';
        tooltip.className = 'absolute bg-gray-900 text-white text-sm rounded-lg p-2 z-50 pointer-events-none';
        
        const props = info.event.extendedProps;
        tooltip.innerHTML = `
            <div class="font-semibold">${props.cliente}</div>
            <div class="text-gray-300">${props.servicio}</div>
            <div class="text-gray-300">${this.formatTime(info.event.start)}</div>
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = info.el.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
    }

    hideEventTooltip() {
        const tooltip = document.getElementById('event-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden';
            
            setTimeout(() => {
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.classList.remove('scale-95', 'opacity-0');
                    modalContent.classList.add('scale-100', 'opacity-100');
                }
            }, 10);
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.remove('scale-100', 'opacity-100');
                modalContent.classList.add('scale-95', 'opacity-0');
            }
            
            setTimeout(() => {
                modal.classList.remove('flex');
                modal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }, 200);
        }
    }

    refreshCalendar() {
        if (this.calendar) {
            this.calendar.refetchEvents();
        }
    }
}

// Initialize calendar manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for FullCalendar to be available
    if (typeof FullCalendar !== 'undefined') {
        window.calendarManager = new CalendarManager();
    } else {
        // Retry after a short delay
        setTimeout(() => {
            if (typeof FullCalendar !== 'undefined') {
                window.calendarManager = new CalendarManager();
            }
        }, 1000);
    }
});