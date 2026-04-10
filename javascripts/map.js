document.addEventListener("DOMContentLoaded", function() {
    
    // =========================================================================
    // PART 1: INDIVIDUAL NEIGHBORHOOD MAPS (The .buffalo-map loop)
    // =========================================================================
    var mapElements = document.querySelectorAll('.buffalo-map');
    
    mapElements.forEach(function(mapElement) {
        
        var datasetName = mapElement.getAttribute('data-geojson');
        var boundaryName = mapElement.getAttribute('data-boundary');

        // --- ICON LOGIC ---
        var customIconStr = '📍'; 
        var iconTargetId = mapElement.getAttribute('data-icon-id');
        if (iconTargetId) {
            var sourceElement = document.getElementById(iconTargetId);
            if (sourceElement) {
                var svgElement = sourceElement.querySelector('svg');
                if (svgElement) customIconStr = svgElement.outerHTML; 
            }
        } else if (mapElement.getAttribute('data-icon')) {
            customIconStr = mapElement.getAttribute('data-icon');
        }
        // ------------------

        var map = L.map(mapElement);
        map.attributionControl.setPrefix(false);
        // Track state and bounds for the ResizeObserver
        var targetBounds = null;
        var targetCenter = null;
        var targetZoom = null;
        var wasHidden = mapElement.clientWidth === 0 || mapElement.clientHeight === 0;

        const observer = new ResizeObserver(() => {
            map.invalidateSize();
            
            var isHidden = mapElement.clientWidth === 0 || mapElement.clientHeight === 0;
            
            // If the tab JUST became visible, recalculate the zoom and bounds!
            if (wasHidden && !isHidden) {
                if (targetBounds) {
                    map.fitBounds(targetBounds);
                } else if (targetCenter) {
                    map.setView(targetCenter, targetZoom);
                }
            }
            wasHidden = isHidden;
        });
        observer.observe(mapElement);

        // UPGRADED: CARTO Positron Basemap for individual maps
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd'
        }).addTo(map);

        function loadMapPoints(dataName) {
            if (!dataName || dataName === "none") return;

            fetch('/data/' + dataName + '.geojson')
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    L.geoJSON(data, {
                        pointToLayer: function (feature, latlng) {
                            var customLeafletIcon = L.divIcon({
                                className: 'custom-map-marker',
                                html: customIconStr,
                                iconSize: [30, 30],
                                iconAnchor: [15, 15],
                                popupAnchor: [0, -15] 
                            });
                            return L.marker(latlng, {icon: customLeafletIcon});
                        },
                        onEachFeature: function (feature, layer) {
                            if (feature.properties && feature.properties.name) {
                                var popupContent = "<div style='min-width: 220px;'>";
                                popupContent += "<h3 style='margin: 0 0 10px 0; font-size: 1.2em; border-bottom: 1px solid var(--md-default-fg-color--lightest); padding-bottom: 4px;'>" + feature.properties.name + "</h3>";
                                
                                var ignoreKeys = ['name', 'url', 'internal_link'];
                                for (var key in feature.properties) {
                                    if (ignoreKeys.indexOf(key) === -1) {
                                        var val = feature.properties[key];
                                        var isLink = val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/');
                                        if (isLink) {
                                            popupContent += "<div style='margin-bottom: 8px;'><b>" + key + ":</b> <br><a href='" + val + "' target='_blank' rel='noopener noreferrer'>View Link 🔗</a></div>";
                                        } else {
                                            popupContent += "<p style='margin: 0 0 8px 0; font-size: 0.9em; line-height: 1.4;'><b>" + key + ":</b> " + val + "</p>";
                                        }
                                    }
                                }
                                // Popup content for destination on the map
                                popupContent += "<div style='margin-top: 12px; font-size: 0.9em; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--md-default-fg-color--lightest); padding-top: 8px;'>";
                                if (feature.properties.internal_link) {
                                    popupContent += "<a href='" + feature.properties.internal_link + "' style='font-weight: bold;'>📖 Read our Buffalo Profile</a>";
                                }
                                if (feature.properties.url) {
                                    popupContent += "<a href='" + feature.properties.url + "' target='_blank' rel='noopener noreferrer'>📍 View on Google Maps</a>";
                                }
                                popupContent += "</div></div>";
                                layer.bindPopup(popupContent);
                            }
                        }
                    }).addTo(map);
                })
                .catch(function(error) { console.error('Error loading map points:', error); });
        }

        if (boundaryName) {
            fetch('/data/' + boundaryName + '.geojson')
                .then(function(response) { return response.json(); })
                .then(function(boundaryData) {
                    var boundaryLayer = L.geoJSON(boundaryData);
                    
                    var layers = boundaryLayer.getLayers();
                    var polygonLayer = null;
                    
                    for (var i = 0; i < layers.length; i++) {
                        if (typeof layers[i].getLatLngs === 'function') {
                            polygonLayer = layers[i];
                            break; 
                        }
                    }

                    if (!polygonLayer) throw new Error("Could not find a valid Polygon in the GeoJSON to use as a mask.");

                    var bounds = polygonLayer.getBounds();
                    
                    targetBounds = bounds; 
                    map.fitBounds(bounds);
                    
                    var worldLatLngs = [
                        L.latLng(90, 180), L.latLng(90, -180),
                        L.latLng(-90, -180), L.latLng(-90, 180)
                    ];
                    
                    var rawLatLngs = polygonLayer.getLatLngs();

                    var holeLatLngs = rawLatLngs;
                    while (Array.isArray(holeLatLngs) && Array.isArray(holeLatLngs[0])) {
                        holeLatLngs = holeLatLngs[0];
                    }

                    L.polygon([worldLatLngs, holeLatLngs], {
                        color: 'none', 
                        fillColor: 'var(--md-default-bg-color)', 
                        fillOpacity: 0.85 
                    }).addTo(map);
                    
                    L.geoJSON(boundaryData, {
                        filter: function(feature) {
                            return feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon';
                        },
                        style: { color: 'var(--md-primary-fg-color)', weight: 3, fillOpacity: 0 }
                    }).addTo(map);

                    loadMapPoints(datasetName);
                })
                .catch(function(error) {
                    console.error('Error loading boundary, falling back to standard view:', error);
                    targetCenter = [42.8805, -78.8784];
                    targetZoom = 12;
                    map.setView(targetCenter, targetZoom);
                    loadMapPoints(datasetName);
                });
        } else {
            targetCenter = [42.8805, -78.8784];
            targetZoom = 12;
            map.setView(targetCenter, targetZoom);
            loadMapPoints(datasetName);
        }
    }); 

    // =========================================================================
    // PART 2: THE FRONT PAGE MASTER MAP (Clickable colorized routing overlay)
    // =========================================================================
    var frontPageMapElement = document.getElementById('front-page-map');
    
    if (frontPageMapElement) {
        var frontMap = L.map('front-page-map').setView([42.8864, -78.8784], 12);
        frontMap.attributionControl.setPrefix(false);
        
        // CARTO Positron Basemap for the front page
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd'
        }).addTo(frontMap);

        // A beautiful, distinct color palette for the neighborhoods
        var neighborhoodPalette = [
            "#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00",
            "#e6ab02", "#a65628", "#f781bf", "#1b9e77", "#d95f02",
            "#7570b3", "#e7298a", "#66a61e", "#e6a100", "#a6761d"
        ];

        // Simple hashing function to predictably pick a color based on the name
        function getColorFromName(name) {
            var hash = 0;
            for (var i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            return neighborhoodPalette[Math.abs(hash) % neighborhoodPalette.length];
        }

        // Fetch the master neighborhood file
        fetch('/data/locales/city-proper-boundary.geojson')
            .then(function(response) { return response.json(); })
            .then(function(data) {
                L.geoJSON(data, {
                    style: function (feature) {
                        var rawName = feature.properties.nbhdname || "Unknown";
                        var assignedColor = getColorFromName(rawName);
                        
                        return {
                            color: "#ffffff", // Clean white border between neighborhoods
                            weight: 1.5,
                            fillColor: assignedColor, 
                            fillOpacity: 0.45
                        };
                    },
                    onEachFeature: function (feature, layer) {
                        var rawName = feature.properties.nbhdname;
                        
                        if (rawName) {
                            // Translate the city's name to your snake_case MkDocs URL structure
                            var snakeId = rawName.replace(/[^a-zA-Z0-9]/g, '_')
                                                 .replace(/_+/g, '_')
                                                 .replace(/^_|_$/g, '')
                                                 .toLowerCase();

                            // Hover highlighting
                            layer.on('mouseover', function () {
                                this.setStyle({ fillOpacity: 0.75, weight: 2.5 });
                                layer.bringToFront(); // Pops the border over adjacent neighborhoods
                            });
                            layer.on('mouseout', function () {
                                this.setStyle({ fillOpacity: 0.45, weight: 1.5 });
                            });

                            // Route the user on click
                            layer.on('click', function () {
                                window.location.href = '/neighborhoods/' + snakeId + '/';
                            });

                            // Add the neighborhood name tooltip
                            layer.bindTooltip(rawName, { 
                                sticky: true, 
                                direction: 'top',
                                className: 'custom-map-tooltip'
                            });
                        }
                    }
                }).addTo(frontMap);
            })
            .catch(function(error) { console.error('Error loading master city geojson:', error); });
    }

});