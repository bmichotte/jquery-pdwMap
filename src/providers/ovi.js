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
 * OVI API provider
 * http://api.maps.ovi.com
 */
jQuery.extend(jQuery.fn.pdwMap.providers,
    {
        ovi: {
            _loadScripts: function(i)
            {
                var scripts = [ "http://api.maps.ovi.com/base.js", "http://api.maps.ovi.com/search-nokia.js", "http://api.maps.ovi.com/routing-nokia.js",
                    "http://api.maps.ovi.com/positioning-w3c.js", "http://api.maps.ovi.com/gfx-canvas.js", "http://api.maps.ovi.com/map-js-p2d-dom.js",
                    "http://api.maps.ovi.com/ui-ovi_web.js", "http://api.maps.ovi.com/language-fr-FR.js" ];

                var script = document.createElement("script");
                script.setAttribute("type", "text/javascript");
                script.setAttribute("src", scripts[i]);
                var $this = $(this);
                script.onload = script.onreadystatechange = function()
                {
                    if (script.readyState && script.readyState != "loaded" && script.readyState != "complete")
                    {
                        return;
                    }
                    script.onload = script.onreadystatechange = null;

                    if (i == scripts.length - 1)
                    {
                        pdwMapInit();
                    }
                    else
                    {
                        $this.pdwMap('_loadScripts', ++i);
                    }
                };
                $(this).pdwMap('_appendScriptToHead', script);
            },

            loadScript: function()
            {
                var options = $(this).data('options');
                if (typeof options.apiKeys.oviAppId == "undefined" || typeof options.apiKeys.ovi == "undefined")
                {
                    $.error("You need an app ID and authentication token for OVI");
                    return;
                }

                __pdw_map_loader = $(this);
                var script = document.createElement("script");
                script.setAttribute("type", "text/javascript");
                script.setAttribute("src", "http://api.maps.ovi.com/jsl.js");
                var $this = $(this);
                script.onload = script.onreadystatechange = function()
                {
                    if (script.readyState && script.readyState != "loaded" && script.readyState != "complete")
                    {
                        return;
                    }
                    script.onload = script.onreadystatechange = null;
                    $this.pdwMap('_loadScripts', 0);
                };
                $(this).pdwMap('_appendScriptToHead', script);
            },

            initProvider: function()
            {
                var options = $(this).data('options');

                ovi.mapsapi.util.ApplicationContext.set({
                    "appId": options.apiKeys.oviAppId,
                    "authenticationToken": options.apiKeys.ovi
                });
                ovi.mapsapi.util.ApplicationContext.set("defaultLanguage", options.lang);

                var center = [ options.defaultPosition.lat, options.defaultPosition.lng ];
                if (options.browserGeoloc && navigator.geolocation)
                {
                    navigator.geolocation.getCurrentPosition(function(position)
                        {
                            map.setCenter(new ovi.mapsapi.geo.Coordinate(position.coords.latitude, position.coords.longitude));
                        },
                        function()
                        {
                        });
                }

                var components = [];
                if (!options.staticMap)
                {
                    var infoBubbles = new ovi.mapsapi.map.component.InfoBubbles();
                    components = [
                        new ovi.mapsapi.map.component.Behavior(),
                        new ovi.mapsapi.map.component.TypeSelector(),
                        new ovi.mapsapi.map.component.ZoomBar(),
                        new ovi.mapsapi.map.component.ViewControl(),
                        new ovi.mapsapi.map.component.RightClick(),
                        infoBubbles
                    ];

                    $(this).data('infoBubbles', infoBubbles);
                }

                $(this).data('locs', []);
                $(this).data('markers', []);

                var $this = $(this),
                    map = new ovi.mapsapi.map.Display($(this).get(0),
                        {
                            zoomLevel: options.maps.zoom,
                            center: center,
                            components: components,
                            eventListener: {
                                mapviewchangeend: [function(event)
                                {
                                    var map = $this.data('map');
                                    if ($this.data('circleArea'))
                                    {
                                        var zoom = map.zoomLevel;
                                        $this.data('circleArea').visibility = zoom <= 10;
                                        map.update(10, false);
                                    }

                                    if (options.onMapLoaded && typeof options.onMapLoaded == 'function')
                                    {
                                        options.onMapLoaded.apply($this, $this);
                                        options.onMapLoaded = false;
                                    }
                                }, true, null]
                            },
                            fading: 250
                        });

                $(this).pdwMap('_hideOverlay');
                return map;
            },

            cleanMarkers: function()
            {
                var $this = $(this);
                if ($(this).data('markers'))
                {
                    $.each($(this).data('markers'), function(i, n)
                    {
                        if (typeof n != 'function')
                        {
                            $this.data('map').objects.remove(n);
                        }
                    });
                }
                $(this).data('locs', []);
                $(this).data('markers', []);
            },

            cleanCircle: function()
            {
            },

            addMarker: function(point)
            {
                var options = $(this).data('options'),
                    map = $(this).data('map'),
                    $this = $(this),
                    markerOptions = {
                        eventListener: {
                            click: [function(event)
                            {
                                $this.pdwMap('closeMarker');
                                var infoHtml = $this.pdwMap('formatInfo', point);
                                var infoBubbles = $this.data('infoBubbles');
                                var bubble = infoBubbles.addBubble('<h2>' + infoHtml.title + '</h2>' + infoHtml.content, new ovi.mapsapi.geo.Coordinate(point.lat, point.lng));
                                $this.data('bubble', bubble);

                                // callback
                                if (options.onMarkerClicked && typeof options.onMarkerClicked == 'function')
                                {
                                    options.onMarkerClicked.apply(this, [ point ]);
                                }
                            }, false, null]
                        }
                    };

                if (options.marker != false)
                {
                    var iconUrl = options.marker.url;
                    if (options.marker.dynamic)
                    {
                        iconUrl += '?type=' + point.type;
                    }
                    markerOptions.icon = iconUrl;
                }

                var marker = new ovi.mapsapi.map.Marker([point.lat, point.lng], markerOptions);
                map.objects.add(marker);
                $(this).data('markers').push(marker);
                $(this).data('locs').push([point.lat, point.lng]);
            },

            openMarker: function(marker)
            {
                $(this).pdwMap('closeMarker');
                var infoHtml = $(this).pdwMap('formatInfo', marker),
                    infoBubbles = $(this).data('infoBubbles'),
                    bubble = infoBubbles.addBubble('<h2>' + infoHtml.title + '</h2>' + infoHtml.content, new ovi.mapsapi.geo.Coordinate(marker.lat, marker.lng));
                $(this).data('bubble', bubble);
            },

            closeMarker: function()
            {
                if (undefined != $(this).data('bubble'))
                {
                    var infoBubbles = $(this).data('infoBubbles'),
                        bubble = $(this).data('bubble');
                    if (infoBubbles.bubbleExists(bubble))
                    {
                        infoBubbles.removeBubble(bubble);
                    }
                }
            },

            centerMap: function()
            {
                var bounds = []
                $.each($(this).data('locs'), function(i, n)
                {
                    bounds.push(new ovi.mapsapi.geo.Coordinate(n[0], n[1]));
                });

                var boundingBox = ovi.mapsapi.geo.BoundingBox.coverAll(bounds),
                    zoom = $(this).data('map').getBestZoomLevel([ boundingBox ]);

                $(this).data('map').setZoomLevel(zoom, "default");
                $(this).data('map').setCenter(boundingBox.getCenter());
            },

            setCenter: function(lat, lng, radius)
            {
                var options = $(this).data('options');
                if (options.circle === false)
                {
                    return;
                }

                radius *= 1000;

                var coord = new ovi.mapsapi.geo.Coordinate(lat, lng),
                    circle = new ovi.mapsapi.map.Circle(coord, radius,
                        {
                            pen: {
                                strokeColor: options.maps.circle.stroke + '7F',
                                lineWidth: 1
                            },
                            brush: {
                                color: options.maps.circle.fill + '2F'
                            }
                        });
                $(this).data('map').objects.add(circle);
                $(this).data('circleArea', circle);
            }
        }
    });