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
 * Yandex Maps API provider
 * http://api.yandex.ru/maps/
 */
jQuery.extend(jQuery.fn.pdwMap.providers,
    {
        yandex: {
            _loadScripts: function()
            {
                var $this = $(this);
                setTimeout(function()
                {
                    if (ymaps && ymaps.Map)
                    {
                        pdwMapInit();
                    }
                    else
                    {
                        $this.pdwMap('_loadScripts');
                    }
                }, 100);
            },

            loadScript: function()
            {
                var options = $(this).data('options');

                if (typeof options.apiKeys.yandex == "undefined")
                {
                    $.error("You need an api key for Yandex");
                    return;
                }

                __pdw_map_loader = $(this);

                var script = document.createElement("script"),
                    $this = $(this),
                    apiKey = "";

                script.setAttribute("type", "text/javascript");
                if (options.apiKeys && options.apiKeys.yandex)
                {
                    apiKey = "&key=" + options.apiKeys.yandex;
                }
                script.setAttribute("src", "http://api-maps.yandex.ru/2.0/?load=package.full" + apiKey + "&lang=" + options.lang);

                script.onload = script.onreadystatechange = function()
                {
                    if (script.readyState && script.readyState != "loaded" && script.readyState != "complete")
                    {
                        return;
                    }
                    script.onload = script.onreadystatechange = null;
                    $this.pdwMap('_loadScripts');
                };
                $(this).pdwMap('_appendScriptToHead', script);
            },

            initProvider: function()
            {
                var options = $(this).data('options'),
                    $this = $(this),
                    map = new ymaps.Map($(this).attr('id'),
                    {
                        center: [options.defaultPosition.lat, options.defaultPosition.lng],
                        zoom: options.maps.zoom
                    });
                map.controls
                    .add('zoomControl')
                    .add('typeSelector');
                $this.pdwMap('_hideOverlay');

                var center = [ options.defaultPosition.lat, options.defaultPosition.lng ];
                if (options.browserGeoloc && navigator.geolocation)
                {
                    navigator.geolocation.getCurrentPosition(function(position)
                        {
                            map.panTo([position.coords.latitude, position.coords.longitude]);
                        },
                        function()
                        {
                        });
                }
                return map;
            },

            cleanMarkers: function()
            {
                var $this = $(this);
                $(this).data('map').geoObjects.each(function(i)
                {
                    $this.data('map').geoObjects.remove(i);
                });
            },

            cleanCircle: function()
            {
            },

            addMarker: function(point)
            {
                var options = $(this).data('options'),
                    infoHtml = $(this).pdwMap('formatInfo', point),
                    marker;

                if (options.marker != false)
                {
                    var iconUrl = options.marker.url;
                    if (options.marker.dynamic)
                    {
                        iconUrl += '?type=' + point.type;
                    }
                    marker = new ymaps.Placemark([ point.lat, point.lng ],
                        {
                            balloonContent: '<h2>' + infoHtml.title + '</h2>' + infoHtml.content
                        }, {
                            iconImageHref: iconUrl,
                            iconImageSize: [ options.marker.size.width, options.marker.size.height ],
                            iconImageOffset: [ options.marker.origin.x, options.marker.origin.y ]
                        });
                }
                else
                {
                    marker = new ymaps.Placemark([ point.lat, point.lng ]);
                }
                $(this).data('map').geoObjects.add(marker);
            },

            openMarker: function(marker)
            {
                var $this = $(this);
                $(this).data('map').geoObjects.each(function(i)
                {
                    var coordinates = i.geometry.getCoordinates();
                    if (coordinates[0] == marker.lat && coordinates[1] == marker.lng)
                    {
                        i.balloon.open($this.data('map').getCenter());
                    }
                });
            },

            closeMarker: function()
            {
                $(this).data('map').geoObjects.each(function(i)
                {
                    i.balloon.close();
                });
            },

            centerMap: function()
            {
                var lower = null,
                    upper = null;

                $(this).data('map').geoObjects.each(function(i)
                {
                    var coords = i.geometry.getCoordinates();
                    if (lower == null || lower[0] > coords[0] || lower[1] < coords[1])
                    {
                        lower = coords;
                    }
                    if (upper == null || upper[0] < coords[0] || upper[1] > coords[1])
                    {
                        upper = coords;
                    }
                });

                var options = $(this).data('options');

                ymaps.util.bounds.getCenterAndZoom(
                    [ lower, upper ],
                    [ $(this).width(), $(this).height() ]
                );
                $(this).data('map').setBounds([ lower, upper ], {
                    checkZoomRange: true
                });
            },

            setCenter: function(lat, lng, radius)
            {
                var options = $(this).data('options');
                if (options.circle === false)
                {
                    return;
                }
                /*
                 var circle = new ymaps.Circle([
                 [ lat, lng ],
                 radius * 1000
                 ],
                 {
                 fillColor: options.maps.circle.fill,
                 strokeColor: options.maps.circle.stroke,
                 strokeOpacity: .6,
                 strokeWidth: 1,
                 draggable: false
                 });
                 $(this).data('map').geoObjects.add(circle);
                 */
            }
        }
    });