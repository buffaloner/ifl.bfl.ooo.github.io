let activeCalendar = null;
let allEventsCache = null;
let weatherCache = null;

// MkDocs Material SPA lifecycle hook
if (typeof document$ !== "undefined") {
    document$.subscribe(function() {
        initCalendar();
    });
} else {
    document.addEventListener("DOMContentLoaded", initCalendar);
}

function initCalendar() {
    var calendarEl = document.getElementById('front-page-calendar');
    var filterEl = document.getElementById('calendar-filters');

    // Prevent memory leaks during Ajax navigations
    if (activeCalendar) {
        activeCalendar.destroy();
        activeCalendar = null;
    }
    
    if (calendarEl) {
        var calendarObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && !activeCalendar) {
                    renderCalendarInstance(calendarEl);
                }
            });
        });
        calendarObserver.observe(calendarEl);
    }
}

function renderCalendarInstance(calendarEl) {
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'listWeek', // Shows events of current day/week by default
            eventDisplay: 'block', // Forces all events to render as solid blocks, removing the confusing transparent dots
            dayMaxEvents: 3, // Limits clutter in Month view by collapsing overflowing events into a "+ more" link
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listWeek'
            },
            navLinks: true, // Allows clicking day/week names to navigate views
            eventSources: [
                {
                    events: async function(fetchInfo, successCallback, failureCallback) {
                        try {
                            if (!allEventsCache) {
                                const res = await fetch('/data/events.json');
                                allEventsCache = await res.json();
                            }
                            var currentCategory = typeof Alpine !== 'undefined' ? Alpine.store('filters').category : 'all';
                            var filtered = allEventsCache.filter(evt => {
                                var cat = evt.category || (evt.extendedProps && evt.extendedProps.category);
                                return currentCategory === 'all' || cat === currentCategory;
                            });
                            successCallback(filtered);
                        } catch(e) {
                            console.error("Could not fetch events:", e);
                            successCallback([]);
                        }
                    }
                },
                {
                    events: async function(fetchInfo, successCallback, failureCallback) {
                        try {
                            var currentCategory = typeof Alpine !== 'undefined' ? Alpine.store('filters').category : 'all';
                            var outdoorList = window.OUTDOOR_CATEGORIES || ['all'];
                            if (!outdoorList.includes(currentCategory)) {
                                successCallback([]);
                                return;
                            }

                            if (!weatherCache) {
                                const response = await fetch('https://api.weather.gov/gridpoints/BUF/78,43/forecast');
                                if (!response.ok) throw new Error("Weather API failed");
                                
                                const data = await response.json();
                                weatherCache = data.properties.periods
                                    .filter(period => period.isDaytime)
                                    .map(period => ({
                                        title: `🌡️ ${period.temperature}°F - ${period.shortForecast}`,
                                        start: period.startTime.split('T')[0],
                                        allDay: true,
                                        display: 'background',
                                        backgroundColor: 'var(--md-default-bg-color)',
                                        extendedProps: {
                                            category: 'weather',
                                            icon: '⛅'
                                        }
                                    }));
                            }
                            successCallback(weatherCache);
                        } catch (error) {
                            console.error("Could not fetch live weather:", error);
                            successCallback([]); 
                        }
                    }
                }
            ],
            eventContent: function(arg) {
                var iconStr = arg.event.extendedProps.icon || '📅';
                var catId = arg.event.extendedProps.category || 'general';
                var sourceElement = document.getElementById(catId + '_icon');
                var finalIcon = sourceElement ? sourceElement.innerHTML : iconStr;

                var el = document.createElement('div');
                el.className = 'fc-event-title';
                el.style.padding = '2px';
                el.style.whiteSpace = 'normal';
                el.style.cursor = 'pointer';
                el.innerHTML = finalIcon + ' <b style="vertical-align: super;">' + arg.event.title + '</b>';
                return { domNodes: [el] };
            },
            eventDidMount: function(info) {
                // Task 5: Inject detailed popups via Tippy.js
                var props = info.event.extendedProps;
                var timeString = info.event.start ? info.event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'All Day';
                
                var tooltipContent = `
                    <div style="text-align: left; padding: 5px; font-family: sans-serif;">
                        <h4 style="margin: 0 0 5px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">${info.event.title}</h4>
                        <p style="margin: 0 0 5px 0; font-size: 0.9em;"><strong>Time:</strong> ${timeString}</p>
                `;

                if (props.location) {
                    tooltipContent += `<p style="margin: 0 0 5px 0; font-size: 0.9em;"><strong>Where:</strong> ${props.location}</p>`;
                }
                if (props.description) {
                    // Truncate long descriptions
                    var desc = props.description.length > 150 ? props.description.substring(0, 147) + '...' : props.description;
                    tooltipContent += `<p style="margin: 0; font-size: 0.85em; color: #eee;">${desc}</p>`;
                }
                tooltipContent += `</div>`;

                tippy(info.el, {
                    content: tooltipContent,
                    allowHTML: true,
                    placement: 'top',
                    interactive: true,
                    theme: 'material',
                    onShow(instance) {
                        // Close all other tippy instances to prevent visual clutter
                        document.querySelectorAll('[data-tippy-root]').forEach(el => {
                            if (el._tippy) el._tippy.hide();
                        });
                    }
                });
            }
        });
        calendar.render();

        activeCalendar = calendar;

        // Task 3: Bind FullCalendar to the Alpine.js Reactive Store
        if (typeof Alpine !== 'undefined') {
            Alpine.effect(() => {
                // Read the category to track the Alpine dependency
                var currentCategory = Alpine.store('filters').category;
                
                // Instruct the calendar to refetch from our cached, filtered sources
                if (activeCalendar) {
                    activeCalendar.refetchEvents();
                }
            });
        }
    }
