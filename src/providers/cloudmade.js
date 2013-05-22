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
 * Cloudmade API provider
 * http://www.cloudmade.com
 */
jQuery.extend(jQuery.fn.pdwMap.providers,
    {
        cloudmade: {
            loadScript: function()
            {
                var options = $(this).data('options');

                if (typeof options.apiKeys.cloudmade == "undefined")
                {
                    $.error("You need an api key for Cloudmade");
                    return;
                }

                __pdw_map_loader = $(this);

                if (options.staticMap)
                {
                    pdwMapInit();
                    return;
                }

                var script = document.createElement("script");
                script.setAttribute("type", "text/javascript");
                script.setAttribute("src", "http://tile.cloudmade.com/wml/latest/web-maps-lite.js");
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
                    var url = "http://staticmaps.cloudmade.com/" + options.apiKeys.cloudmade + "/staticmap?center=" +
                        options.defaultPosition.lat + "," + options.defaultPosition.lng + "&zoom=" + options.maps.zoom +
                        "&size=" + $(this).pdwMap('_containerSize', 'x');

                    $(this).pdwMap('_setMapImage', url);
                    return null;
                }
                $(this).pdwMap('_hideOverlay');
                $(this).data('markers', []);

                var center = new CM.LatLng(options.defaultPosition.lat, options.defaultPosition.lng);
                if (options.browserGeoloc && navigator.geolocation)
                {
                    navigator.geolocation.getCurrentPosition(function(position)
                        {
                            map.setCenter(new CM.LatLng(position.coords.latitude, position.coords.longitude), options.maps.zoom);
                        },
                        function()
                        {
                        });
                }

                var cloudmade = new CM.Tiles.CloudMade.Web({
                    key: options.apiKeys.cloudmade
                }),
                    map = new CM.Map($(this).attr('id'), cloudmade),
                    $this = $(this);

                $(this).data('map', map);
                CM.Event.addListener(map, 'load', function()
                {
                    if (options.onMapLoaded && typeof options.onMapLoaded == 'function')
                    {
                        options.onMapLoaded.apply($this, $this);
                        options.onMapLoaded = false;
                    }
                });

                map.setCenter(center, options.maps.zoom);
                map.addControl(new CM.ScaleControl());
                map.addControl(new CM.LargeMapControl());

                CM.Event.addListener(map, 'zoomend', function()
                {
                    if ($this.data('circleArea'))
                    {
                        var zoom = map.getZoom();
                        $this.data('circleArea')[zoom <= 10 ? 'show' : 'hide']();
                    }
                });

                return map;
            },

            cleanMarkers: function()
            {
                var map = $(this).data('map');
                if ($(this).data('markers'))
                {
                    $.each($(this).data('markers'), function(i, n)
                    {
                        map.removeOverlay(n);
                    });
                }
                $(this).data('markers', []);
            },

            cleanCircle: function()
            {
                if ($(this).data('circleArea'))
                {
                    $(this).data('map').removeOverlay($(this).data('circleArea'));
                    $(this).data('circleArea', null);
                }
            },

            addMarker: function(point)
            {
                var options = $(this).data('options'),
                    map = $(this).data('map'),
                    infoHtml = $(this).pdwMap('formatInfo', point),
                    markerOptions = {
                    title: infoHtml.title,
                    clickable: true
                };

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

                    var icon = new CM.Icon();
                    icon.image = iconUrl;
                    icon.iconSize = new CM.Size(options.marker.size.width, options.marker.size.height);
                    icon.iconAnchor = new CM.Point(options.marker.anchor.x, options.marker.anchor.y);
                    markerOptions.icon = icon;
                }

                var loc = new CM.LatLng(point.lat, point.lng),
                    marker = new CM.Marker(loc, markerOptions);

                CM.Event.addListener(marker, 'click', function(pos)
                {
                    marker.openInfoWindow('<h2>' + infoHtml.title + '</h2>' + infoHtml.content);

                    // callback
                    if (options.onMarkerClicked && typeof options.onMarkerClicked == 'function')
                    {
                        options.onMarkerClicked.apply(this, [ point ]);
                    }
                });

                map.addOverlay(marker);

                $(this).data('markers').push(marker);
            },

            openMarker: function(marker)
            {
                if ($(this).data('markers'))
                {
                    var loc = new CM.LatLng(marker.lat, marker.lng),
                        infoHtml = $(this).pdwMap('formatInfo', marker);

                    $.each($(this).data('markers'), function(i, n)
                    {
                        if (n.getLatLng().lat() == loc.lat() && n.getLatLng().lng() == loc.lng() && n.getTitle() == infoHtml.title)
                        {
                            n.openInfoWindow('<h2>' + infoHtml.title + '</h2>' + infoHtml.content);
                        }
                    });
                }
            },

            closeMarker: function()
            {
                if ($(this).data('markers'))
                {
                    $.each($(this).data('markers'), function(i, n)
                    {
                        n.closeInfoWindow();
                    });
                }
            },

            centerMap: function()
            {
                var bounds;
                $.each($(this).data('markers'), function(i, n)
                {
                    if (!bounds)
                    {
                        bounds = new CM.LatLngBounds(n.getLatLng(), n.getLatLng());
                    }
                    else
                    {
                        bounds.extend(n.getLatLng());
                    }

                });
                $(this).data('map').zoomToBounds(bounds);
            },

            setCenter: function(lat, lng, radius)
            {
                var options = $(this).data('options');
                if (options.circle === false)
                {
                    return;
                }

                radius *= 1000;

                var map = $(this).data('map'),
                    getLngRadius = function(mRadius)
                    {
                        var equatorLength = 40075017,
                            hLength = equatorLength * Math.cos(Math.PI / 180 * map.getCenter().lat());
                        return (mRadius / hLength) * 360;
                    },
                    getPixRadius = function(lat, lng, mRadius)
                    {
                        var lngRadius = getLngRadius(mRadius), latlng2 = new CM.LatLng(lat, lng - lngRadius, true), point2 = map.fromLatLngToContainerPixel(latlng2),
                            point = map.fromLatLngToContainerPixel(new CM.LatLng(lat, lng));

                        return Math.round(point.x - point2.x);
                    },
                    circleArea = new CM.Circle(new CM.LatLng(lat, lng), getPixRadius(lat, lng, radius), options.maps.circle.stroke, 1, .6, options.maps.circle.fill, .15);

                circleArea._wantedRadius = radius;
                map.addOverlay(circleArea);
                $(this).data('circleArea', circleArea);

                CM.Event.addListener(map, "zoomend", function()
                {
                    circleArea._radius = getPixRadius(circleArea._latlng.lat(), circleArea._latlng.lng(), circleArea._wantedRadius);
                    circleArea.redraw();
                });
            }
        }
    });