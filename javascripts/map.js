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
    
    var mapObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var mapElement = entry.target;
                if (!mapElement.classList.contains('leaflet-container')) {
                    initializeSingleMap(mapElement);
                }
            }
        });
    });

    mapElements.forEach(function(mapElement) {
        mapObserver.observe(mapElement);
    });

    function initializeSingleMap(mapElement) {
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
                                var inlinePin = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="vertical-align: text-bottom;"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
                                var inlineBook = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="vertical-align: text-bottom;"><path fill="currentColor" d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-.75L9 9V4zm9 16H6V4h1v9l3-2.25L13 13V4h5v16z"/></svg>';

                                // Loop over extra properties (address, vibe, etc)
                                for (var key in feature.properties) {
                                    if (ignoreKeys.indexOf(key) === -1) {
                                        // Cast to String to prevent .startsWith() TypeErrors on pure numbers (like zip codes)
                                        var val = String(feature.properties[key]); 
                                        
                                        if (val.trim() === '') continue; // Skip empty CSV cells

                                        var isLink = val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/');
                                        
                                        if (isLink) {
                                            popupContent += '<div style="margin-bottom: 8px;"><b>' + key + ':</b> <br><a href="' + val + '" target="_blank" rel="noopener noreferrer">View Link ' + inlinePin + '</a></div>';
                                        } else {
                                            popupContent += '<p style="margin: 0 0 8px 0; font-size: 0.9em; line-height: 1.4;"><b>' + key + ':</b> ' + val + '</p>';
                                        }
                                    }
                                }
                                
                                // Bottom links
                                popupContent += '<div style="margin-top: 12px; font-size: 0.9em; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--md-default-fg-color--lightest); padding-top: 8px;">';
                                if (feature.properties.internal_link) {
                                    popupContent += '<a href="' + feature.properties.internal_link + '" style="font-weight: bold;">' + inlineBook + ' Read our Buffalo Profile</a>';
                                }
                                if (feature.properties.url) {
                                    popupContent += '<a href="' + feature.properties.url + '" target="_blank" rel="noopener noreferrer">' + inlinePin + ' View on Google Maps</a>';
                                }
                                popupContent += '</div></div>';
                                
                                // Inject mobile-friendly popup constraints
                                layer.bindPopup(popupContent, {
                                    maxWidth: 280, // Prevent it from blowing out small phone screens
                                    minWidth: 200, // Matches our inline CSS for safety
                                    autoPanPadding: [15, 15] // Enforces a 15px clearance from the viewport edge
                                });
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
                    
                    var bounds = boundaryLayer.getBounds();
                    targetBounds = bounds; 
                    map.fitBounds(bounds);
                    
                    // UI Refinement: Asymmetric bounding to prevent popup clipping
                    var sw = bounds.getSouthWest();
                    var ne = bounds.getNorthEast();
                    var latSpan = ne.lat - sw.lat;
                    var lngSpan = ne.lng - sw.lng;
                    var topPadding = Math.max(latSpan * 0.3, 0.02);
                    
                    // Enforce a minimum absolute longitude padding so popups clear East/West edges on mobile screens
                    var sidePadding = Math.max(lngSpan * 0.1, 0.02); 
                    
                    var popupSafeBounds = L.latLngBounds(
                        L.latLng(sw.lat - (latSpan * 0.1), sw.lng - sidePadding),
                        L.latLng(ne.lat + topPadding, ne.lng + sidePadding)
                    );
                    
                    map.setMaxBounds(popupSafeBounds);
                    map.setMinZoom(map.getBoundsZoom(bounds));

                    // --- BRANCHING LOGIC FOR MASTER MAP VS NEIGHBORHOOD MASKS ---
                    if (boundaryName === 'locales/city-proper-boundary') {
                        
                        if (datasetName === 'none') {
                            // 1. OVERVIEW TAB: Restore the interactive chloropleth (colored neighborhoods)
                            var neighborhoodPalette = [
                                "#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00",
                                "#e6ab02", "#a65628", "#f781bf", "#1b9e77", "#d95f02",
                                "#7570b3", "#e7298a", "#66a61e", "#e6a100", "#a6761d"
                            ];
                            function getColorFromName(name) {
                                var hash = 0;
                                for (var i = 0; i < name.length; i++) {
                                    hash = name.charCodeAt(i) + ((hash << 5) - hash);
                                }
                                return neighborhoodPalette[Math.abs(hash) % neighborhoodPalette.length];
                            }

                            L.geoJSON(boundaryData, {
                                style: function (feature) {
                                    var rawName = feature.properties.nbhdname || "Unknown";
                                    return {
                                        color: "#ffffff", weight: 1.5,
                                        fillColor: getColorFromName(rawName), fillOpacity: 0.45
                                    };
                                },
                                onEachFeature: function (feature, layer) {
                                    var rawName = feature.properties.nbhdname;
                                    if (rawName) {
                                        var snakeId = rawName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase();
                                        layer.on('mouseover', function () {
                                            this.setStyle({ fillOpacity: 0.75, weight: 2.5 });
                                            layer.bringToFront();
                                        });
                                        layer.on('mouseout', function () {
                                            this.setStyle({ fillOpacity: 0.45, weight: 1.5 });
                                        });
                                        layer.on('click', function () {
                                            window.location.href = '/neighborhoods/' + snakeId + '/';
                                        });
                                        layer.bindTooltip(rawName, { sticky: true, direction: 'top', className: 'custom-map-tooltip' });
                                    }
                                }
                            }).addTo(map);

                        } else {
                            // 2. CATEGORY TABS: Draw clean borders and load pins. 
                            // We SKIP the inverted mask because Leaflet cannot reliably invert an SVG path with 35 touching holes!
                            L.geoJSON(boundaryData, {
                                filter: function(feature) { return feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'; },
                                style: { color: 'var(--md-primary-fg-color)', weight: 1.5, fillOpacity: 0.05 }
                            }).addTo(map);
                            
                            loadMapPoints(datasetName, boundaryData);
                        }

                    } else {
                        // 3. INDIVIDUAL NEIGHBORHOODS: Apply the dark inverted mask overlay
                        var layers = boundaryLayer.getLayers();
                        var hasPolygons = layers.some(function(l) { return typeof l.getLatLngs === 'function'; });
                        if (!hasPolygons) throw new Error("No Polygon found for mask.");

                        var worldLatLngs = [ L.latLng(90, 180), L.latLng(90, -180), L.latLng(-90, -180), L.latLng(-90, 180) ];
                        var maskShapes = [worldLatLngs];
                        
                        layers.forEach(function(layer) {
                            if (typeof layer.getLatLngs === 'function') {
                                function extractHoles(coords) {
                                    if (Array.isArray(coords) && coords.length > 0 && (coords[0] instanceof L.LatLng || (typeof coords[0] === 'object' && 'lat' in coords[0]))) {
                                        maskShapes.push(coords);
                                    } else if (Array.isArray(coords)) {
                                        coords.forEach(extractHoles);
                                    }
                                }
                                extractHoles(layer.getLatLngs());
                            }
                        });

                        L.polygon(maskShapes, { color: 'none', fillColor: 'var(--md-default-bg-color)', fillOpacity: 0.85 }).addTo(map);
                        
                        L.geoJSON(boundaryData, {
                            filter: function(feature) { return feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'; },
                            style: { color: 'var(--md-primary-fg-color)', weight: 3, fillOpacity: 0 }
                        }).addTo(map);

                        loadMapPoints(datasetName, boundaryData);
                    }
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
    }
}