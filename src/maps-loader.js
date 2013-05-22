if (jQuery)
{
    (function($)
    {
        var isValidSearch = function()
        {
            $('#srch').removeClass('disabled');
            var search = $('#searchMapAsk').val();
            if (search == '')
            {
                $('#srch').addClass('disabled');
            }

            if ($('#searchMapState').length == 1)
            {
                if ($('#searchMapState').val() == '')
                {
                    $('#srch').addClass('disabled');
                }
            }

            var radius = $('#searchMapAskRange').val();
            if (radius > maxRange)
            {
                $('#searchMapAskRange').val(maxRange);
            }
            if ($('.geoTypes:checked').length == 0)
            {
                $('#srch').addClass('disabled');
            }
        };

        $(function()
        {
            $('#srch').click(function(e)
            {
                e.preventDefault();

                if ($(this).is('.disabled'))
                {
                    alert(trans.missingFields, trans.alert);
                }
                else
                {
                    var search = $('#searchMapAsk').val();
                    var state = $('#searchMapState').length == 1 ? $('#searchMapState').val() : null;
                    var country = $('#searchMapCountry').val();
                    var radius = $('#searchMapAskRange').val();
                    if (radius == "" || radius > maxRange)
                    {
                        radius = maxRange;
                    }
                    var types = [];
                    $.each($('.geoTypes:checked'), function(i, n)
                    {
                        types.push($(n).attr('id'));
                        _gaq.push(['_trackEvent', trans.search, $(n).attr('data-label'), search, Number(radius) ]);
                    });

                    $('#results').empty();
                    $('#gmapContainer').pdwMap('search', search, state, country, radius, types);
                }
            });

            $('#searchMapAsk, #searchMapAskRange').keyup(isValidSearch);
            $('#searchMapAsk, #searchMapState, #searchMapCountry, #searchMapAskRange').focusout(isValidSearch).trigger('focusout');
            $('.geoTypes').click(isValidSearch);

            $('#searchMapAsk, #searchMapAskRange').keypress(function(e)
            {
                if (e.keyCode == 13)
                {
                    e.preventDefault();
                    $('#srch').click();
                }
            });

            $('#gmapContainer').pdwMap({
                provider: provider,
                loader: '.mapLoader',
                mapId: '#gmap',
                debug: false,
                staticMap: isStaticMap,
                browserGeoloc: false,
                marker: {
                    url: urlMarkers,
                    size: { width: 22, height: 30 },
                    anchor: { x: 11, y: 30 },
                    dynamic: true
                },
                markerShadow: {
                    url: "/medias/iamges/map-pin-shadow.png",
                    size: { width: 30, height: 30 },
                    anchor: { x: 11, y: 30 }
                },
                apiKeys: apiKeys,
                lang: actualLanguage,
                searchUrl: urlSearch,
                trans: trans,
                defaultPosition: {
                    lat: mapDefaultLat,
                    lng: mapDefaultLng
                },
                maps: {
                    zoom: mapDefaultZoom
                },
                onMarkersAdded: function(markers)
                {
                    var div = $('#results');
                    var table = $('<table />');
                    div.empty().append(table);

                    $.each(markers, function(i, n)
                    {
                        var tr = $('<tr />').appendTo(table);
                        var td = $('<td />').appendTo(tr);

                        var check = $('<input type="checkbox" />')
                            .addClass('pos')
                            .click(function()
                            {
                                actualMarker = n;
                                if ($(this).is(':checked'))
                                {
                                    $('#gmapContainer').pdwMap('openMarker', n);
                                }
                                else
                                {
                                    $('#gmapContainer').pdwMap('closeMarker', n);
                                }
                            })
                            .attr('id', n.geo_address_id)
                            .val(n.geo_address_id)
                            .appendTo(td);

                        td = $('<td />').appendTo(tr);
                        var label = $('<label />').attr('for', n.geo_address_id)
                            .css('color', n.color)
                            .appendTo(td);
                        label.html(n.name + ' (' + n.distance.toPrecision(2) + ' ' + unit + ')');
                    });
                },
                onMarkerClicked: function(marker)
                {
                    var m = $('#' + marker.geo_address_id).attr('checked', 'checked');
                    $('#found').scrollTo(m, 'slow', { margin: true, offset: -20 });
                    actualMarker = marker;

                    if (typeof _gaq != 'undefined')
                    {
                        _gaq.push(['_trackEvent', trans.search, trans.show, marker.name, Number(marker.geo_address_id) ]);
                    }
                }
            });
        });
    })(jQuery);
}
