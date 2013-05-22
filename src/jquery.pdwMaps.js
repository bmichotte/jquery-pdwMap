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
var __pdw_map_loader,
    pdwMapInit = function()
    {
        __pdw_map_loader.pdwMap('load');
    };

(function($)
{
    "use strict";

    $.fn.pdwMap = function(method)
    {
        var options = $(this).data('options');
        // search first for providers...
        // providers can overwrite methods
        if (options != null && options.provider != null)
        {
            if (typeof $.fn.pdwMap.providers[options.provider] == "undefined")
            {
                $.error(options.provider + ' is not a valid provider');
                return null;
            }
            methods._dump.apply(this, [ options.provider, method, Array.prototype.slice.call(arguments, 1) ]);
        }
        if (options != null && options.provider != null && $.fn.pdwMap.providers[options.provider][method])
        {
            return $.fn.pdwMap.providers[options.provider][method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (methods[method])
        {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method)
        {
            return methods.init.apply(this, arguments);
        }
        else
        {
            $.error('Method ' + method + ' does not exist on jQuery.pdwMap');
            return null;
        }
    };

    var methods =
    {
        /**
         * Init the map
         *
         * @param options object
         * @returns {*}
         */
        init: function(options)
        {
            options = $.extend(true, $.fn.pdwMap.defaults, options || {});

            return this.each(function()
            {
                $(this).data('markers', []);
                $(this).data('options', options);
                $(this).pdwMap('_showOverlay');
                $(this).pdwMap('loadScript');
            });
        },

        /**
         * Load the map
         */
        load: function()
        {
            var map = $(this).pdwMap('initProvider');
            $(this).data('map', map);
        },

        /**
         * Remove all markers and circle from the map
         */
        cleanMap: function()
        {
            $(this).pdwMap('cleanMarkers');
            $(this).pdwMap('cleanCircle');
        },

        /**
         * Call options.searchUrl with the params
         *
         * @param city string
         * @param state string
         * @param country string
         * @param radius number
         * @param type extra type
         */
        search: function(city, state, country, radius, type)
        {
            var $this = $(this),
                options = $this.data('options');

            if (options.search !== false && typeof options.search == 'function')
            {
                options.search.apply(this, [city, state, country, radius, type]);
                return;
            }

            $.ajax({
                url: options.searchUrl,
                type: 'POST',
                data: {
                    city: city,
                    state: state,
                    country: country,
                    radius: radius,
                    types: type
                },
                dataType: 'json',
                beforeSend: function()
                {
                    $this.pdwMap('_showOverlay');
                    $this.pdwMap('cleanMap');
                }
            })
                .done(function(data)
                {
                    if (! data.markers)
                    {
                        // callback
                        if (options.onMarkersAdded !== false && typeof options.onMarkersAdded == 'function')
                        {
                            options.onMarkersAdded.apply(this, []);
                        }
                        return;
                    }
                    // set center
                    if (options.maps.circle.enabled)
                    {
                        $this.pdwMap('setCenter', data.center.lat, data.center.lng, data.radius);
                    }

                    // add markers
                    $this.pdwMap('addMarkers', data.markers);

                    // callback
                    if (options.onMarkersAdded !== false && typeof options.onMarkersAdded == 'function')
                    {
                        options.onMarkersAdded.apply(this, [ data.markers ]);
                    }
                })
                .fail(function(jqXHR, textStatus, errorThrown)
                {
                    $.error(textStatus, errorThrown);
                })
                .always(function()
                {
                    $this.pdwMap('_hideOverlay');
                });
        },

        /**
         * Add markers to the map
         *
         * A point, must, as least, have the following fields
         *
         * {
         *     lat: number,
         *     lng: number
         * }
         *
         * If you want to use the default formatting, you have to add
         * {
         *      title: "name of my point",
         *      content: "some usefull information"
         * }
         *
         * If you use dynamic markers, you have to add
         * {
         *      type: "whatever you want"
         * }
         *
         * @param points array
         */
        addMarkers: function(points)
        {
            var $this = $(this);
            $this.data('_markers', points);
            $.each(points, function(i, n)
            {
                $this.pdwMap('addMarker', n);
            });
            $this.pdwMap('centerMap');
        },

        /**
         * Allow extra formating before printing of the map
         *
         * @param point object
         * @returns object
         */
        formatInfo: function(point)
        {
            var options = $(this).data('options');
            if (options.formatInfo !== false && typeof options.formatInfo == 'function')
            {
                return options.formatInfo.apply(this, point);
            }

            return {
                title: point.title,
                content: "<p>" + point.content + " " + "</p>"
            };
        },

        /**
         * Private methods
         */

        /**
         * Get the container size
         * @param separator string
         * @returns {*}
         * @private
         */
        _containerSize: function(separator)
        {
            var options = $(this).data('options');
            return $(this).width() + separator + $(this).height();
        },

        /**
         * Used with static maps
         * @param url string
         * @private
         */
        _setMapImage: function(url)
        {
            var options = $(this).data('options');

            var image = $('<img />').attr('src', url);
            $(this).append(image);

            $(this).pdwMap('_hideOverlay');
        },

        /**
         * Hide the overlay if options.loader is set
         * @private
         */
        _hideOverlay: function()
        {
            var options = $(this).data('options');
            if (options.loader !== false)
            {
                $(options.loader).hide();
            }
        },

        /**
         * Show the overlay if options.loader is set
         * @private
         */
        _showOverlay: function()
        {
            var options = $(this).data('options');
            if (options.loader !== false)
            {
                $(options.loader).show();
            }
        },

        /**
         * Dump information to console
         * @private
         */
        _dump: function()
        {
            var options = $(this).data('options');
            if (options.debug !== false && typeof window.console !== "undefined")
            {
                window.console.log(arguments);
            }
        },

        /**
         * Add script to <head>
         *
         * (avoid a IE9 bug)
         *
         * @param script
         * @private
         */
        _appendScriptToHead: function(script)
        {
            var head;
            if (document.head)
            {
                head = document.head;
            }
            else if (document.getElementsByTagName('head'))
            {
                head = document.getElementsByTagName('head')[0];
            }

            if (head)
            {
                $(this).pdwMap('_dump', [head, script]);
                head.appendChild(script);
            }
        }
    };

    $.fn.pdwMap.providers = {};

    $.fn.pdwMap.defaults = {
        /**
         * The provider you want to use
         * @see providers/*.js
         */
        provider: "",

        /**
         * The language of your map
         */
        lang: "en",

        /**
         * You can here define a dom object to show a loading message
         */
        loader: false,

        /**
         * If you want to print some debug message
         */
        debug: false,

        /**
         * If the map is static (is an image)
         */
        staticMap: false,

        /**
         * We can use the geolocation of the browser to initialize maps
         */
        browserGeoloc: true,

        /**
         * You can use your own markers by setting
         *
         marker: {
            // the url to the marker image
            url : false,

            // the anchor of the image
            anchor: {
                x: 0,
                y: 0
            },

            // the size of the image
            size: {
                width: 0,
                height: 0
            },

            // the origin of the image
            origin: {
                x: 0,
                y: 0
            },

            // if the marker is dynamic, the url to the image will be appended by ?type=marker.type
            // see the examples for a dynamic marker
            dynamic: true,

            // shadow, mandatory, can be false
            // atm, only gmaps use it
            shadow: {
                // the url to the marker image shadow
                url : false,

                // the anchor of the image
                anchor: {
                    x: 0,
                    y: 0
                },

                // the size of the image
                size: {
                    width: 0,
                    height: 0
                },

                // the origin of the image
                origin: {
                    x: 0,
                    y: 0
                },
            }
        }
         */
        marker: false,

        /**
         * The default lat & lng for the map
         */
        defaultPosition: {
            lat: 48.856614,
            lng: 2.3522219
        },

        /**
         * The api keys for the providers.
         *
         * If you want to use gmaps, use
         * apiKeys: {
         *  gmaps: "my api key"
         * }
         */
        apiKeys: {
        },

        /**
         * Default map configuration
         */
        maps: {
            /**
             * Default zoom
             */
            zoom: 7,

            /**
             * Configuration for the range circle.
             * To disable, circle: false
             */
            circle: {
                stroke: '#2E799F',
                fill: '#2E799F'
            }
        },

        /**
         * The search url.
         *
         * @see search for more informations
         */
        searchUrl: false,

        /**
         * Methods overwriting
         */

        /**
         * Format the info to be shown on the "info marker"
         *
         * formartInfo: function(point:Object)
         */
        formatInfo: false,

        /**
         * Perform a search
         *
         * search: function(city, state, country, radius, type)
         */
        search: false,

        /**
         * Callbacks
         */

        /**
         * Fired when the map is fully loaded
         *
         * onMapLoaded: function(div:MapDiv)
         */
        onMapLoaded: false,

        /**
         * Fired when markers are added to the map
         *
         * onMarkersAdded: function(markers:Array)
         */
        onMarkersAdded: false,

        /**
         * onMarkerClicked: function(marker:Object)
         */
        onMarkerClicked: false
    };
})(jQuery);