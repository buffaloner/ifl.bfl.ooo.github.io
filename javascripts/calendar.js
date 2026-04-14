document.addEventListener("DOMContentLoaded", function() {
    var calendarEl = document.getElementById('front-page-calendar');
    var filterEl = document.getElementById('calendar-filters');
    
    if (calendarEl) {
        var calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'listWeek', // Shows events of current day/week by default
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listWeek'
            },
            navLinks: true, // Allows clicking day/week names to navigate views
            events: '/data/events.json',
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

        // Dynamically parse the fetched payload to construct the category tab filters
        fetch('/data/events.json')
            .then(response => response.json())
            .then(data => {
                if(!filterEl) return;
                
                var categories = {};
                data.forEach(function(evt) {
                    var props = evt.extendedProps;
                    if (props && props.category) {
                        categories[props.category] = props.icon || '';
                    }
                });

                var allBtn = document.createElement('button');
                allBtn.className = 'md-button md-button--primary filter-btn active';
                allBtn.innerText = 'All Events';
                allBtn.onclick = function() {
                    setActiveFilter('all', allBtn);
                };
                filterEl.appendChild(allBtn);

                Object.keys(categories).forEach(function(cat) {
                    var btn = document.createElement('button');
                    btn.className = 'md-button filter-btn';
                    btn.innerText = categories[cat] + ' ' + cat.replace(/_/g, ' ').toUpperCase();
                    btn.onclick = function() {
                        setActiveFilter(cat, btn);
                    };
                    filterEl.appendChild(btn);
                });
            })
            .catch(err => console.error("Could not load events.json for filters", err));

        function setActiveFilter(category, clickedBtn) {
            var btns = filterEl.querySelectorAll('.filter-btn');
            btns.forEach(b => b.classList.remove('md-button--primary'));
            clickedBtn.classList.add('md-button--primary');

            calendar.batchRendering(function() {
                calendar.getEvents().forEach(function(evt) {
                    if (category === 'all' || evt.extendedProps.category === category) {
                        evt.setProp('display', 'auto');
                    } else {
                        evt.setProp('display', 'none');
                    }
                });
            });
        }
    }
});
