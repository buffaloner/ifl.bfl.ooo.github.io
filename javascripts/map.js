let activeMaps = [];

// MkDocs Material SPA lifecycle hook
if (typeof document$ !== "undefined") {
    document$.subscribe(function() {
        initMaps();
    });
} else {
    document.addEventListener("DOMContentLoaded", initMaps);
}

function initMaps() {
    // Prevent memory leaks during Ajax navigations by destroying old instances
    activeMaps.forEach(function(m) {
        m.remove();
    });
    activeMaps = [];
    
    // =========================================================================
    // PART 1: INDIVIDUAL NEIGHBORHOOD MAPS (The .buffalo-map loop)
    // =========================================================================
    var mapElements = document.querySelectorAll('.buffalo-map');
    
    mapElements.forEach(function(mapElement) {
        
        var datasetName = mapElement.getAttribute('data-geojson');
        var boundaryName = mapElement.getAttribute('data-boundary');

        // --- ICON LOGIC ---
        // --- ICON LOGIC ---
        // Material Design 'location_on' SVG themed to MkDocs primary color
        var defaultSvgPin = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30"><path fill="var(--md-primary-fg-color)" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
        var customIconStr = defaultSvgPin; 
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

        var map = L.map(mapElement, {
            scrollWheelZoom: false // Prevents accidental page scrolling zoom
        });
        activeMaps.push(map);
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

        function loadMapPoints(dataName, boundaryGeoJson) {
            if (!dataName || dataName === "none") return;

            fetch('/data/' + dataName + '.geojson')
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    L.geoJSON(data, {
                        filter: function(feature) {
                            // Strict Geofence Filtering: Drop pins outside the neighborhood boundary
                            if (boundaryGeoJson && typeof turf !== 'undefined') {
                                try {
                                    // Iterate through boundary features (safeguard for complex MultiPolygons)
                                    for (var i = 0; i < boundaryGeoJson.features.length; i++) {
                                        if (turf.booleanPointInPolygon(feature, boundaryGeoJson.features[i])) {
                                            return true; // Point is inside the geofence
                                        }
                                    }
                                    return false; // Point failed all boundary checks, drop it
                                } catch (e) {
                                    console.error('Turf.js PIP calculation failed:', e);
                                    return true; // Fallback: render pin if math fails
                                }
                            }
                            return true; // Fallback: render pin if no boundary exists
                        },
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
                                var popupContent = '<div style="min-width: 220px;">';
                                popupContent += '<h3 style="margin: 0 0 10px 0; font-size: 1.2em; border-bottom: 1px solid var(--md-default-fg-color--lightest); padding-bottom: 4px;">' + feature.properties.name + '</h3>';
                                
                                var ignoreKeys = ['name', 'url', 'internal_link'];
                                for (var key in feature.properties) {
                                    if (ignoreKeys.indexOf(key) === -1) {
                                        var val = feature.properties[key];
                                        var isLink = val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/');
                                        // Inline SVGs using 'currentColor' to inherit MkDocs link hover states
                                        var inlinePin = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="vertical-align: text-bottom;"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
                                        var inlineBook = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="vertical-align: text-bottom;"><path fill="currentColor" d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-.75L9 9V4zm9 16H6V4h1v9l3-2.25L13 13V4h5v16z"/></svg>';

                                        if (isLink) {
                                            // Fix: Using double quotes for HTML attributes to prevent URLs with apostrophes from breaking the DOM
                                            popupContent += '<div style="margin-bottom: 8px;"><b>' + key + ':</b> <br><a href="' + val + '" target="_blank" rel="noopener noreferrer">View Link ' + inlinePin + '</a></div>';
                                        } else {
                                            popupContent += '<p style="margin: 0 0 8px 0; font-size: 0.9em; line-height: 1.4;"><b>' + key + ':</b> ' + val + '</p>';
                                        }
                                    }
                                }
                                // Popup content for destination on the map
                                popupContent += '<div style="margin-top: 12px; font-size: 0.9em; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--md-default-fg-color--lightest); padding-top: 8px;">';
                                if (feature.properties.internal_link) {
                                    popupContent += '<a href="' + feature.properties.internal_link + '" style="font-weight: bold;">' + inlineBook + ' Read our Buffalo Profile</a>';
                                }
                                if (feature.properties.url) {
                                    popupContent += '<a href="' + feature.properties.url + '" target="_blank" rel="noopener noreferrer">' + inlinePin + ' View on Google Maps</a>';
                                }
                                popupContent += '</div></div>';
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
                    
                    // UI Refinement: Asymmetric bounding to prevent top-edge popup clipping
                    var sw = bounds.getSouthWest();
                    var ne = bounds.getNorthEast();
                    var latSpan = ne.lat - sw.lat;
                    var lngSpan = ne.lng - sw.lng;
                    
                    // Enforce a minimum absolute latitude padding (~2km) so popups clear on tiny neighborhoods
                    var topPadding = Math.max(latSpan * 0.3, 0.02);
                    
                    var popupSafeBounds = L.latLngBounds(
                        L.latLng(sw.lat - (latSpan * 0.1), sw.lng - (lngSpan * 0.1)),
                        L.latLng(ne.lat + topPadding, ne.lng + (lngSpan * 0.1))
                    );
                    
                    map.setMaxBounds(popupSafeBounds);
                    map.setMinZoom(map.getBoundsZoom(bounds));map.setMinZoom(map.getBoundsZoom(bounds));
                    
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

                    loadMapPoints(datasetName, boundaryData);
                })
                .catch(function(error) {
                    console.error('Error loading boundary, falling back to standard view:', error);
                    targetCenter = [42.8805, -78.8784];
                    targetZoom = 12;
                    map.setView(targetCenter, targetZoom);
                    loadMapPoints(datasetName, null);
                });
        } else {
            targetCenter = [42.8805, -78.8784];
            targetZoom = 12;
            map.setView(targetCenter, targetZoom);
            loadMapPoints(datasetName, null);
        }
    }); 

    // =========================================================================
    // PART 2: THE FRONT PAGE MASTER MAP (Clickable colorized routing overlay)
    // =========================================================================
    var frontPageMapElement = document.getElementById('front-page-map');
    
    if (frontPageMapElement) {
        var frontMap = L.map('front-page-map', {
            scrollWheelZoom: false // Prevents accidental page scrolling zoom
        }).setView([42.8864, -78.8784], 12);
        activeMaps.push(frontMap);
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
                var cityLayer = L.geoJSON(data, {
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
                });
                
                cityLayer.addTo(frontMap);
                
                // UI Refinement: Asymmetric bounding to prevent top-edge popup clipping
                var cityBounds = cityLayer.getBounds();
                var cSw = cityBounds.getSouthWest();
                var cNe = cityBounds.getNorthEast();
                var cLatSpan = cNe.lat - cSw.lat;
                var cLngSpan = cNe.lng - cSw.lng;
                
                // Enforce a minimum absolute latitude padding (~2km)
                var cityTopPadding = Math.max(cLatSpan * 0.3, 0.02);
                
                var cityPopupSafeBounds = L.latLngBounds(
                    L.latLng(cSw.lat - (cLatSpan * 0.1), cSw.lng - (cLngSpan * 0.1)),
                    L.latLng(cNe.lat + cityTopPadding, cNe.lng + (cLngSpan * 0.1))
                );
                
                frontMap.setMaxBounds(cityPopupSafeBounds);
                frontMap.setMinZoom(frontMap.getBoundsZoom(cityBounds));
            })
            .catch(function(error) { console.error('Error loading master city geojson:', error); });
    }

}