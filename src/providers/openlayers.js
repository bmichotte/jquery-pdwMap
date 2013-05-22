/*
 * Copyright (c) 2013 Benjamin Michotte <benjamin@produweb.be>
 *     ProduWeb SA <http://www.produweb.be>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished
 * to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * OpenLayers API provider
 * http://openlayers.org/
 */
jQuery.extend(jQuery.fn.pdwMap.providers,
    {
        openlayers: {
            loadScript: function()
            {
                __pdw_map_loader = $(this);
                var options = $(this).data('options');
                if (options.staticMap)
                {
                    pdwMapInit();
                    return;
                }

                var script = document.createElement("script");
                script.setAttribute("type", "text/javascript");
                script.setAttribute("src", "http://www.openlayers.org/api/OpenLayers.js");
                script.onload = script.onreadystatechange = function()
                {
                    if (script.readyState && script.readyState != "loaded" && script.readyState != "complete")
                    {
                        return;
                    }
                    script.onload = script.onreadystatechange = null;
                    pdwMapInit();
                };
                $(this).pdwMap('_appendScriptToHead', script);
            },

            initProvider: function()
            {
                var options = $(this).data('options');
                if (options.staticMap)
                {
                    var url = "http://pafciu17.dev.openstreetmap.org/?module=map&center=" +
                        options.defaultPosition.lng + "," + options.defaultPosition.lat + "&zoom=" + options.maps.zoom +
                        "&width=" + $(this).pdwMap('_containerSize', '&height=');

                    $(this).pdwMap('_setMapImage', url);
                    return null;
                }

                $(this).data('markers', []);
                var center = new OpenLayers.LonLat(options.defaultPosition.lng, options.defaultPosition.lat);
                if (options.browserGeoloc && navigator.geolocation)
                {
                    navigator.geolocation.getCurrentPosition(function(position)
                        {
                            map.setCenter(new OpenLayers.LonLat(position.coords.longitude, position.coords.latitude).transform(fromProjection, map.getProjectionObject()), options.maps.zoom);
                        },
                        function()
                        {
                        });
                }
                var fromProjection = new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                    map = new OpenLayers.Map($(this).attr('id'), {
                        sphericalMercator: true,
                        'maxExtent': new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34)
                    }),
                    $this = $(this),
                    circleAreaLayer = new OpenLayers.Layer.Vector("circleArea");

                map.addLayer(new OpenLayers.Layer.OSM());
                map.addLayer(circleAreaLayer);
                $(this).data('circleAreaLayer', circleAreaLayer);

                map.events.register('zoomend', map, function()
                {
                    if ($this.data('circleArea'))
                    {
                        var zoom = map.getZoom();
                        $this.data('circleArea').style = {
                            strokeOpacity: zoom <= 10 ? .6 : 0,
                            fillOpacity: zoom <= 10 ? .15 : 0,
                            strokeColor: options.maps.circle.stroke,
                            fillColor: options.maps.circle.fill,
                            strokeWidth: 1
                        };
                        $this.data('circleAreaLayer')[zoom <= 10 ? 'addFeatures' : 'removeFeatures']([ $this.data('circleArea') ]);
                        $this.data('circleAreaLayer').redraw();
                    }
                });

                map.setCenter(center.transform(fromProjection, map.getProjectionObject()), options.maps.zoom);

                if (options.onMapLoaded && typeof options.onMapLoaded == 'function')
                {
                    setTimeout(function()
                    {
                        options.onMapLoaded.apply($this, $this);
                        options.onMapLoaded = false;
                    }, 250);
                }

                $(this).pdwMap('_hideOverlay');
                return map;
            },

            cleanMarkers: function()
            {
                var map = $(this).data('map');

                if ($(this).data('markersLayer'))
                {
                    map.removeLayer($(this).data('markersLayer'));
                    $(this).data('markersLayer').destroy();
                    $(this).data('markersLayer', null);
                }
                $(this).data('markers', []);
            },

            cleanCircle: function()
            {
                if ($(this).data('circleArea'))
                {
                    $(this).data('circleArea').destroy();
                    $(this).data('circleArea', null);
                }
            },

            addMarker: function(point)
            {
                var options = $(this).data('options'),
                    map = $(this).data('map'),
                    lonLat = new OpenLayers.LonLat(point.lng, point.lat).transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject()),
                    markers = $(this).data('markersLayer');

                if (!markers)
                {
                    markers = new OpenLayers.Layer.Markers("Markers");
                    $(this).data('markersLayer', markers);
                }
                map.addLayer(markers);

                var icon = null;
                if (options.marker != false)
                {
                    if (typeof options.marker.anchor == 'undefined')
                    {
                        options.marker.anchor = { x: 0, y: 0 };
                    }
                    var iconUrl = options.marker.url;
                    if (options.marker.dynamic)
                    {
                        iconUrl += '?type=' + point.type;
                    }

                    var size = new OpenLayers.Size(options.marker.size.width, options.marker.size.height),
                        offset = new OpenLayers.Pixel(options.marker.anchor.x, options.marker.anchor.y);
                    icon = new OpenLayers.Icon(iconUrl, size, offset);
                }

                var marker = new OpenLayers.Marker(lonLat, icon),
                    $this = $(this);
                marker.events.register('mousedown', marker, function(evt)
                {
                    OpenLayers.Event.stop(evt);
                    var popup = $this.data('openPopup');
                    if (popup)
                    {
                        map.removePopup(popup);
                    }

                    var infoHtml = $this.pdwMap('formatInfo', point);
                    popup = new OpenLayers.Popup("chicken", lonLat, null, '<h2>' + infoHtml.title + '</h2>' + infoHtml.content, true);
                    map.addPopup(popup);
                    $this.data('openPopup', popup);

                    // callback
                    if (options.onMarkerClicked && typeof options.onMarkerClicked == 'function')
                    {
                        options.onMarkerClicked.apply(this, [ point ]);
                    }
                });
                markers.addMarker(marker);
                $(this).data('markers').push(lonLat);
            },

            openMarker: function(marker)
            {
                var popup = $(this).data('openPopup');
                if (popup)
                {
                    $(this).data('map').removePopup(popup);
                }

                var lonLat = new OpenLayers.LonLat(marker.lng, marker.lat).transform(new OpenLayers.Projection("EPSG:4326"), $(this).data('map').getProjectionObject()),
                    infoHtml = $(this).pdwMap('formatInfo', marker);
                popup = new OpenLayers.Popup("chicken", lonLat, null, '<h2>' + infoHtml.title + '</h2>' + infoHtml.content, true);
                $(this).data('map').addPopup(popup);
                $(this).data('openPopup', popup);
            },

            closeMarker: function()
            {
                if ($(this).data('openPopup'))
                {
                    $(this).data('map').removePopup($(this).data('openPopup'));
                }
            },

            centerMap: function()
            {
                var bounds = new OpenLayers.Bounds();
                $.each($(this).data('markers'), function(i, n)
                {
                    bounds.extend(n);

                });
                $(this).data('map').zoomToExtent(bounds, false);
            },

            /*
             * APIMethod: createGeodesicPolygon
             * Create a regular polygon around a radius. Useful for creating circles
             * and the like.
             *
             * Parameters:
             * origin - {<OpenLayers.Geometry.Point>} center of polygon.
             * radius - {Float} distance to vertex, in map units.
             * sides - {Integer} Number of sides. 20 approximates a circle.
             * rotation - {Float} original angle of rotation, in degrees.
             * projection - {<OpenLayers.Projection>} the map's projection
             */
            _createGeodesicPolygon: function(latlon, radius, sides, rotation, projection)
            {
                if (projection.getCode() !== "EPSG:4326")
                {
                    latlon.transform(projection, new OpenLayers.Projection("EPSG:4326"));
                }

                var angle,
                    newLonlat,
                    geomPoint,
                    points = [];

                for (var i = 0; i < sides; i++)
                {
                    angle = (i * 360 / sides) + rotation;
                    newLonlat = OpenLayers.Util.destinationVincenty(latlon, angle, radius);
                    newLonlat.transform(new OpenLayers.Projection("EPSG:4326"), projection);
                    geomPoint = new OpenLayers.Geometry.Point(newLonlat.lon, newLonlat.lat);
                    points.push(geomPoint);
                }
                var ring = new OpenLayers.Geometry.LinearRing(points);
                return new OpenLayers.Geometry.Polygon([ring]);
            },

            setCenter: function(lat, lng, radius)
            {
                var map = $(this).data('map'),
                    options = $(this).data('options');

                if (options.circle === false)
                {
                    return;
                }

                radius *= 1000;

                var origin = new OpenLayers.LonLat(lng, lat).transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject()),
                    circle = $(this).pdwMap('_createGeodesicPolygon', origin, radius, 50, 0, map.getProjectionObject()),
                    circleAreaLayer = $(this).data('circleAreaLayer'),
                    circleArea = new OpenLayers.Feature.Vector(circle, null, {
                        strokeColor: options.maps.circle.stroke,
                        strokeOpacity: .6,
                        fillColor: options.maps.circle.fill,
                        fillOpacity: .15,
                        strokeWidth: 1
                    });
                circleAreaLayer.addFeatures([ circleArea ]);
                $(this).data('circleArea', circleArea);
            }
        }
    });