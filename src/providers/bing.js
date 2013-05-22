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
 * Bing Maps API provider
 * http://www.microsoft.com/maps/developers/web.aspx
 */
jQuery.extend(jQuery.fn.pdwMap.providers,
    {
        bing: {
            loadScript: function()
            {
                var options = $(this).data('options');
                if (typeof options.apiKeys.bing == "undefined")
                {
                    $.error("You need an api key for Bing");
                    return;
                }

                __pdw_map_loader = $(this);

                if (options.staticMap)
                {
                    // no need to load js
                    pdwMapInit();
                    return;
                }

                var script = document.createElement("script");
                script.setAttribute("type", "text/javascript");
                script.setAttribute("src", "http://ecn.dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=7.0&mkt=" + options.lang + "&onscriptload=pdwMapInit");
                $(this).pdwMap('_appendScriptToHead', script);
            },

            initProvider: function()
            {
                var $this = $(this),
                    options = $this.data('options');

                if (options.staticMap)
                {
                    var url = "http://dev.virtualearth.net/REST/v1/Imagery/Map/AerialWithLabels/" + options.defaultPosition.lat + "," + options.defaultPosition.lng +
                        "/" + options.maps.zoom + "?mapSize=" + $this.pdwMap('_containerSize', ",") + "&key=" + options.apiKeys.bing;

                    $this.pdwMap('_setMapImage', url);

                    return null;
                }

                var map = new Microsoft.Maps.Map($this.get(0),
                    {
                        credentials: options.apiKeys.bing,
                        zoom: options.maps.zoom,
                        enableClickableLogo: false,
                        enableSearchLogo: false
                    });

                map.entities.clear();
                $this.data('markers', []);
                Microsoft.Maps.Events.addHandler(map, 'viewchangeend', function()
                {
                    if ($this.data('circleArea'))
                    {
                        var zoom = map.getZoom();

                        var backgroundColor = Microsoft.Maps.Color.fromHex(options.maps.circle.fill),
                            borderColor = Microsoft.Maps.Color.fromHex(options.maps.circle.stroke);

                        backgroundColor.a = zoom <= 10 ? 60 : 0;
                        borderColor.a = zoom <= 10 ? 255 : 0;

                        $this.data('circleArea').setOptions({
                            fillColor: backgroundColor,
                            strokeColor: borderColor,
                            strokeThickness: 1
                        });
                    }

                    if (options.onMapLoaded && typeof options.onMapLoaded == 'function')
                    {
                        self.setTimeout(function()
                        {
                            options.onMapLoaded.apply($this, $this);
                            options.onMapLoaded = false;
                        }, 200);
                    }
                });
                var center = new Microsoft.Maps.Location(options.defaultPosition.lat, options.defaultPosition.lng);
                if (options.browserGeoloc && navigator.geolocation)
                {
                    navigator.geolocation.getCurrentPosition(function(position)
                        {
                            map.setView({center: new Microsoft.Maps.Location(position.coords.latitude, position.coords.longitude)});
                        },
                        function()
                        {
                        });
                }

                map.setView({
                    center: center
                });
                $this.pdwMap('_hideOverlay');
                return map;
            },

            cleanMarkers: function()
            {
                $(this).data('map').entities.clear();
                $(this).data('markers', []);
            },

            cleanCircle: function()
            {

            },

            addMarker: function(point)
            {
                var options = $(this).data('options'),
                    pushpinOptions = {};

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
                    pushpinOptions = {
                        icon: iconUrl,
                        width: options.marker.size.width,
                        height: options.marker.size.height,
                        anchor: new Microsoft.Maps.Point(options.marker.anchor.x, options.marker.anchor.y)
                    };
                }
                var loc = new Microsoft.Maps.Location(point.lat, point.lng),
                    pushpin = new Microsoft.Maps.Pushpin(loc, pushpinOptions),
                    $this = $(this);

                $(this).data('markers').push(loc);
                Microsoft.Maps.Events.addHandler(pushpin, 'click', function(e)
                {
                    var display = $this.data('Infobox');
                    if (display)
                    {
                        $this.data('map').entities.remove(display);
                    }

                    var infoHtml = $this.pdwMap('formatInfo', point),
                        infoboxOptions = {
                            title: infoHtml.title,
                            description: infoHtml.content
                        };

                    if (point.sells && point.sells.length > 0)
                    {
                        infoboxOptions.height = 200;
                    }
                    display = new Microsoft.Maps.Infobox(new Microsoft.Maps.Location(point.lat, point.lng), infoboxOptions);
                    $this.data('Infobox', display);
                    $this.data('map').entities.push(display);

                    // callback
                    if (options.onMarkerClicked && typeof options.onMarkerClicked == 'function')
                    {
                        options.onMarkerClicked.apply(this, [ point ]);
                    }
                });
                $(this).data('map').entities.push(pushpin);
            },

            openMarker: function(marker)
            {
                var display = $(this).data('Infobox');
                if (display)
                {
                    $(this).data('map').entities.remove(display);
                }

                var infoHtml = $(this).pdwMap('formatInfo', marker),
                    infoboxOptions = {
                    title: infoHtml.title,
                    description: infoHtml.content
                };

                if (marker.sells && marker.sells.length > 0)
                {
                    infoboxOptions.height = 200;
                }
                display = new Microsoft.Maps.Infobox(new Microsoft.Maps.Location(marker.lat, marker.lng), infoboxOptions);
                $(this).data('Infobox', display);
                $(this).data('map').entities.push(display);
            },

            closeMarker: function()
            {
                if ($(this).data('Infobox'))
                {
                    $(this).data('map').entities.remove($(this).data('Infobox'));
                }
            },

            centerMap: function()
            {
                var bounds = [];
                $.each($(this).data('markers'), function(i, n)
                {
                    bounds.push(n);
                });

                var bestview = Microsoft.Maps.LocationRect.fromLocations(bounds);
                $(this).data('map').setView({
                    bounds: bestview
                });
            },

            setCenter: function(lat, lng, radius)
            {
                var options = $(this).data('options');

                if (options.circle === false)
                {
                    return;
                }

                var R = 6371, // earth's mean radius in km
                    backgroundColor = Microsoft.Maps.Color.fromHex(options.maps.circle.fill),
                    borderColor = Microsoft.Maps.Color.fromHex(options.maps.circle.stroke),
                    circlePoints = [],
                    d = parseFloat(radius) / R;

                backgroundColor.a = 60;
                lat = (lat * Math.PI) / 180;
                lng = (lng * Math.PI) / 180;

                for (var x = 0; x <= 360; x++)
                {
                    var p2 = new Microsoft.Maps.Location(0, 0),
                        brng = x * Math.PI / 180; //rad

                    p2.latitude = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(brng));
                    p2.longitude = ((lng + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(p2.latitude))) * 180) / Math.PI;
                    p2.latitude = (p2.latitude * 180) / Math.PI;
                    circlePoints.push(p2);
                }

                var polygon = new Microsoft.Maps.Polygon(circlePoints, {
                    fillColor: backgroundColor,
                    strokeColor: borderColor,
                    strokeThickness: 1
                });
                $(this).data('map').entities.push(polygon);
                $(this).data('circleArea', polygon);
            }
        }
    });