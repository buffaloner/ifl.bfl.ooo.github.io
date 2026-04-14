document.addEventListener("DOMContentLoaded", function() {
    var calendarEl = document.getElementById('front-page-calendar');
    var filterEl = document.getElementById('calendar-filters');
    
    if (calendarEl) {
        var calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,listWeek'
            },
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
