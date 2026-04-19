let activeCalendar = null;

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
        var calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'listWeek', // Shows events of current day/week by default
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listWeek'
            },
            navLinks: true, // Allows clicking day/week names to navigate views
            eventSources: [
                {
                    url: '/data/events.json',
                    format: 'json'
                },
                {
                    events: async function(fetchInfo, successCallback, failureCallback) {
                        try {
                            const response = await fetch('https://api.weather.gov/gridpoints/BUF/78,43/forecast');
                            if (!response.ok) throw new Error("Weather API failed");
                            
                            const data = await response.json();
                            
                            const weatherEvents = data.properties.periods
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
                            
                            successCallback(weatherEvents);
                        } catch (error) {
                            console.error("Could not fetch live weather:", error);
                            successCallback([]); 
                        }
                    }
                }
            ],
            eventContent: function(arg) {
                var icon = arg.event.extendedProps.icon || '📍';
                var el = document.createElement('div');
                el.className = 'fc-event-title';
                el.style.padding = '2px';
                el.style.whiteSpace = 'normal';
                el.style.cursor = 'pointer';
                el.innerHTML = icon + ' <b>' + arg.event.title + '</b>';
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
                    theme: 'material'
                });
            }
        });
        calendar.render();

        activeCalendar = calendar;

        // Task 3: Bind FullCalendar to the Alpine.js Reactive Store
        if (typeof Alpine !== 'undefined') {
            Alpine.effect(() => {
                var currentCategory = Alpine.store('filters').category;
                
                if (activeCalendar) {
                    activeCalendar.batchRendering(function() {
                        activeCalendar.getEvents().forEach(function(evt) {
                            var isOutdoorCalendar = ['community_gardens', 'patio_season', 'bike_me', 'all'].includes(currentCategory);
                            
                            if (evt.extendedProps.category === 'weather') {
                                if (isOutdoorCalendar) {
                                    evt.setProp('display', 'background');
                                } else {
                                    evt.setProp('display', 'none');
                                }
                            } else if (currentCategory === 'all' || evt.extendedProps.category === currentCategory) {
                                evt.setProp('display', 'auto');
                            } else {
                                evt.setProp('display', 'none');
                            }
                        });
                    });
                }
            });
        }
    }
}
