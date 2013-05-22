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
 * Google Maps API provider
 * https://developers.google.com/maps/
 */
jQuery.extend(jQuery.fn.pdwMap.providers,
    {
        gmaps: {
            loadScript: function()
            {
                var options = $(this).data('options');
                __pdw_map_loader = $(this);
                if (options.staticMap)
                {
                    // no need to load js
                    pdwMapInit();
                    return;
                }
                var script = document.createElement("script"),
                    apiKey = "";

                script.setAttribute("type", "text/javascript");

                if (options.apiKeys && options.apiKeys.gmaps)
                {
                    apiKey = "key=" + options.apiKeys.gmaps + "&";
                }
                script.setAttribute("src", "http://maps.google.com/maps/api/js?" + apiKey + "sensor=true&region=" + options.lang + "&callback=pdwMapInit");
                $(this).pdwMap('_appendScriptToHead', script);
            },

            initProvider: function()
            {
                var $this = $(this),
                    options = $this.data('options');

                if (options.staticMap)
                {
                    var url = "http://maps.googleapis.com/maps/api/staticmap?size=" + $this.pdwMap('_containerSize', "x") +
                        "&maptype=roadmap&language=" + options.lang + "&center=" + options.defaultPosition.lat + "," + options.defaultPosition.lng +
                        "&zoom=" + options.maps.zoom + "&sensor=true";

                    $(this).pdwMap('_setMapImage', url);
                    return null;
                }

                var mapOptions = {
                        zoom: options.maps.zoom,
                        mapTypeId: google.maps.MapTypeId.ROADMAP,
                        mapTypeControlOptions: {
                            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
                        },
                        navigationControl: true,
                        navigationControlOptions: {
                            style: google.maps.NavigationControlStyle.SMALL
                        }
                    },
                    map = new google.maps.Map($this.get(0), mapOptions);

                google.maps.event.addListener(map, 'zoom_changed', function()
                {
                    if ($this.data('circleArea'))
                    {
                        var zoom = map.getZoom();
                        $this.data('circleArea').setVisible(zoom <= 10);
                    }
                });

                $this.data('markers', []);
                $this.data('infoClientWindows', []);

                var center = new google.maps.LatLng(options.defaultPosition.lat, options.defaultPosition.lng);
                if (options.browserGeoloc && navigator.geolocation)
                {
                    navigator.geolocation.getCurrentPosition(function(position)
                        {
                            map.setCenter(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
                        },
                        function()
                        {
                        });
                }
                google.maps.event.addListener(map, "idle", function()
                {
                    $this.pdwMap('_hideOverlay');

                    if (options.onMapLoaded && typeof options.onMapLoaded == 'function')
                    {
                        options.onMapLoaded.apply($this, $this);
                        options.onMapLoaded = false;
                    }
                });

                map.setCenter(center);
                return map;
            },

            cleanMarkers: function()
            {
                if ($(this).data('markers'))
                {
                    $.each($(this).data('markers'), function(i, n)
                    {
                        n.setMap(null);
                    });
                }
                $(this).data('markers', []);
                $(this).data('infoClientWindows', []);
            },

            cleanCircle: function()
            {
                if ($(this).data('circleArea'))
                {
                    $(this).data('circleArea').setMap(null);
                    $(this).data('circleArea', null);
                }
            },

            addMarker: function(point)
            {
                var $this = $(this),
                    options = $this.data('options'),
                    markerOptions = {
                        position: new google.maps.LatLng(point.lat, point.lng),
                        map: $this.data('map')
                    };

                if (options.marker !== false)
                {
                    if (typeof options.marker.origin == 'undefined')
                    {
                        options.marker.origin = { x: 0, y: 0 };
                    }
                    if (typeof options.marker.anchor == 'undefined')
                    {
                        options.marker.anchor = { x: 0, y: 0 };
                    }

                    var size = new google.maps.Size(options.marker.size.width, options.marker.size.height),
                        origin = new google.maps.Point(options.marker.origin.x, options.marker.origin.y),
                        anchor = new google.maps.Point(options.marker.anchor.x, options.marker.anchor.y),
                        iconUrl = options.marker.url;

                    if (options.marker.dynamic)
                    {
                        iconUrl += '?type=' + point.type;
                    }
                    markerOptions.icon = new google.maps.MarkerImage(iconUrl, size, origin, anchor);
                }
                var marker = new google.maps.Marker(markerOptions);

                if (options.marker !== false && options.marker.shadow !== false)
                {
                    size = new google.maps.Size(options.marker.shadow.size.width, options.marker.shadow.size.height);
                    if (typeof options.marker.shadow.origin == 'undefined')
                    {
                        options.marker.shadow.origin = { x: 0, y: 0 };
                    }
                    origin = new google.maps.Point(options.marker.shadow.origin.x, options.marker.shadow.origin.y);

                    if (typeof options.marker.shadow.anchor == 'undefined')
                    {
                        options.marker.shadow.anchor = { x: 0, y: 0 };
                    }
                    anchor = new google.maps.Point(options.marker.shadow.anchor.x, options.marker.shadow.anchor.y);
                    marker.setShadow(new google.maps.MarkerImage(options.marker.shadow.url, size, origin, anchor));
                }

                $this.data('markers').push(marker);

                var infoHtml = $this.pdwMap('formatInfo', point),
                    infoClientWindow = new google.maps.InfoWindow({
                        content: '<h2>' + infoHtml.title + '</h2>' + infoHtml.content
                    });
                $this.data('infoClientWindows').push(infoClientWindow);
                marker.setTitle(infoHtml.title);

                var openMarker = function()
                {
                    $.each($this.data('infoClientWindows'), function(i, n)
                    {
                        n.close();
                    });
                    infoClientWindow.open($this.data('map'), marker);

                    // callback
                    if (options.onMarkerClicked && typeof options.onMarkerClicked == 'function')
                    {
                        options.onMarkerClicked.apply(this, [ point ]);
                    }
                };
                google.maps.event.addListener(marker, "click", openMarker);
            },

            openMarker: function(marker)
            {
                var $this = $(this);
                if ($this.data('markers'))
                {
                    var loc = new google.maps.LatLng(marker.lat, marker.lng),
                        infoHtml = $this.pdwMap('formatInfo', marker),
                        title = infoHtml.title;

                    $.each($this.data('markers'), function(i, n)
                    {
                        if (n.getPosition().lat() == loc.lat() && n.getPosition().lng() == loc.lng() && n.getTitle() == title)
                        {
                            var infoClientWindow = new google.maps.InfoWindow({
                                content: '<h2>' + infoHtml.title + '</h2>' + infoHtml.content
                            });
                            $this.data('infoClientWindows').push(infoClientWindow);
                            $.each($this.data('infoClientWindows'), function(i, n)
                            {
                                n.close();
                            });
                            infoClientWindow.open($this.data('map'), n);
                        }
                    });
                }
            },

            closeMarker: function()
            {
                if ($this.data('infoClientWindows'))
                {
                    $.each($this.data('infoClientWindows'), function(i, n)
                    {
                        n.close();
                    });
                }
            },

            centerMap: function()
            {
                var bounds = new google.maps.LatLngBounds();
                $.each($(this).data('markers'), function(i, n)
                {
                    bounds.extend(n.getPosition());
                });
                $(this).data('map').setCenter(bounds.getCenter());
                $(this).data('map').fitBounds(bounds);
            },

            setCenter: function(lat, lng, radius)
            {
                var options = $(this).data('options');
                if (options.circle === false)
                {
                    return;
                }

                var circleArea = new google.maps.Circle({
                        strokeColor: options.maps.circle.stroke,
                        strokeOpacity: .6,
                        strokeWeight: 1,
                        fillColor: options.maps.circle.fill,
                        fillOpacity: .15,
                        map: $(this).data('map'),
                        center: new google.maps.LatLng(lat, lng),
                        radius: radius * 1000
                    });

                $(this).data('circleArea', circleArea);
            }
        }
    });