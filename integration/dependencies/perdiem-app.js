var perDiemSwiper,
    perDiemSearch = {
        rates: {},
        query: {}
    },
    apiRoot = window.location.protocol + '//' + window.location.host,
    validDatesBegin = '10/1/2012',
    //must be updated when API is updated
    validDatesEnd = '09/30/2016';

//doc ready
$(function() {
    console.log('Initiating Per Diem App...')
        //set valid search dates to moment objs
    validDatesBegin = moment(validDatesBegin, 'MM/DD/YYYY');
    validDatesEnd = moment(validDatesEnd, 'MM/DD/YYYY')
        //init swiper
    perDiemSwiper = new Swiper('#perdiem-swiper', {
        onlyExternal: true,
        a11y: true,
        widgetPositioning: {
            horizontal: 'auto',
            vertical: 'bottom'
        }
    });

    perDiemSwiper.on('slideChangeStart', function() {
        $('html, body').animate({
            scrollTop: $("#perdiem-swiper").offset().top
        }, 0);
    });
    //global ajax settings
    $.ajaxSetup({
        timeout: 10000
    });
    //test for IE11, print userAgent
    var isIE11 = !!navigator.userAgent.match(/Trident\/7.0;(.*)rv(:*)11/);
    console.log('UserAgent:', navigator.userAgent)
    console.log('Is IE11?:', isIE11)

    //init date pickers
    $('#perdiem-start-date-group').datetimepicker({
        format: 'MM/DD/YYYY',
        keepInvalid: true,
        useCurrent: false,
        minDate: validDatesBegin,
        maxDate: validDatesEnd,
        debug: isIE11
    });
    $('#perdiem-end-date-group').datetimepicker({
        format: 'MM/DD/YYYY',
        keepInvalid: true,
        useCurrent: false,
        minDate: validDatesBegin,
        maxDate: validDatesEnd,
        debug: isIE11
    });

    //enable/disable functionality
    $('#perdiem-swiper').on('click', '#next:not(.disabled)', function() {
        perDiemSwiper.slideNext()
    })
    $('#perdiem-swiper').on('click', '#prev:not(.disabled)', function() {
            perDiemSwiper.slidePrev()
        })
        //geolocation
    $('#perdiem-current-location').on('click', useMyCurrentLocation);

    //clear location form
    $('#perdiem-clear-location-form').on('click', clearLocationForm);

    //reset search, back to first screen
    $('#perdiem-new-search').on('click', newSearch);

    //perform ajax calls, check for multiple rates
    $('#perdiem-multiple-rates-check').on('click', checkForMultipleRates);

    //validate multiple rate selection
    $('#perdiem-swiper').on('change', '#perdiem-fiscal-year-1,#perdiem-fiscal-year-2', validateMultipleRates);

    //perform calculation with selected rates
    $('#perdiem-swiper').on('click', '#perdiem-rates-selected', ratesSelected);

    //validate location
    $('#perdiem-city,#perdiem-zip').on('keyup', validateLocationParams)
    $('#perdiem-state').on('change', validateLocationParams)
    validateLocationParams();

    //validate dates
    $('#perdiem-start-date,#perdiem-end-date').on('keyup', validateDates)
    $('#perdiem-slide-dates:not(input)').on('click', validateDates)
    $('#perdiem-start-date-group').on('dp.change', validateDates)
    $('#perdiem-end-date-group').on('dp.change', validateDates)
    validateDates();

    //to date selection
    $('#perdiem-look-up-rates').on('click', function() {
        perDiemSwiper.slideTo(3)
    })

    //to calculate/lookup selection
    $('#perdiem-to-step-2').on('click', function() {
        perDiemSwiper.slideTo(1)
    })

    //on to date select
    $('#perdiem-swiper').on('click', '#perdiem-to-date-range', function() {
        perDiemSwiper.slideTo(2)
    })

    //launch gsa.gov rate lookup
    $('#perdiem-look-up-rates-submit').on('click', lookUpRatesSubmit);

    //overflow fix
    setTimeout(function() {
        perDiemSwiper.onResize();
    }, 250)
})

function newSearch() {
    console.log('========\n', 'New Search!')
    clearLocationForm()
    clearDateForm()
    perDiemSwiper.slideTo(0)
}

function resetErrors() {
    $('.perdiem-error').hide();
}

function clearLocationForm() {
    $('#perdiem-state').val('');
    $('#perdiem-zip').val('');
    $('#perdiem-city').val('');
    validateLocationParams();
    $('#perdiem-current-location').focus();
}

function clearDateForm() {
    $('#perdiem-start-date-group').data("DateTimePicker").clear()
    $('#perdiem-end-date-group').data("DateTimePicker").clear()
    validateDates();
}

function validateMultipleRates() {
    console.log('Validating Rates...')
    if ($('#perdiem-fiscal-year-1').val() === '' && $('#perdiem-fiscal-year-2').val()) {
        $('#perdiem-rates-selected').addClass('disabled').attr('disabled', 'disabled');
    } else {
        $('#perdiem-rates-selected').removeClass('disabled').removeAttr('disabled');
    }
}

function validateDates() {
    resetErrors();
    var valid = /\d{1,2}\/\d{1,2}\/\d{2,4}/;
    var startDateVal = $('#perdiem-start-date').val();
    var endDateVal = $('#perdiem-end-date').val();
    var startDate = moment(startDateVal, 'MM/DD/YYYY');
    var endDate = moment(endDateVal, 'MM/DD/YYYY');


    //text is valid and dates are valid
    if (startDateVal.match(valid) && endDateVal.match(valid) && startDate.isValid() && endDate.isValid()) {
        //dates are in acceptable range (THIS IS NOT INCLUSIVE)
        if (startDate.isBetween(validDatesBegin, validDatesEnd) && endDate.isBetween(validDatesBegin, validDatesEnd)) {
            //start is before or equal to end
            if (startDate.isBefore(endDate) || startDate.isSame(endDate)) {
                enableNext()
                $('#perdiem-start-date').removeClass('perdiem-invalid')
                $('#perdiem-end-date').removeClass('perdiem-invalid')
            } else {
                $('#perdiem-end-before-start').show();
                disableNext()
            }
        } else {
            disableNext()
        }
    } else {
        disableNext()
        if (!startDateVal.match(valid) || !startDate.isValid()) {
            if (startDateVal !== '') {
                $('#perdiem-start-date').addClass('perdiem-invalid')
            }

        }
        if (!endDateVal.match(valid) || !endDate.isValid()) {
            if (endDateVal !== '') {
                $('#perdiem-end-date').addClass('perdiem-invalid')
            }
        }
    }

    function disableNext() {
        $('#perdiem-multiple-rates-check').addClass('disabled').attr('disabled', 'disabled');
    }

    function enableNext() {
        $('#perdiem-multiple-rates-check').removeClass('disabled').removeAttr('disabled');
        resetErrors()
    }
}

function validateLocationParams() {
    resetErrors();
    var validZIP = /\d{5}/;
    console.log('Validating Location...')
        //if everything is blank
    if ($('#perdiem-city').val() === '' && $('#perdiem-state').val() === '' && $('#perdiem-zip').val().length < 5) {
        //disabled
        $('.perdiem-step-1 #next').addClass('disabled').attr('disabled', 'disabled');
        //console.log('All Blank')
        //if not everything is blank
    } else {
        //but zip and state are blank (city only)
        if (!$('#perdiem-zip').val().match(validZIP) && $('#perdiem-state').val() === '') {
            //disabled
            //console.log('No Zip or State')
            $('.perdiem-step-1 #next').addClass('disabled').attr('disabled', 'disabled');
        }
        //otherwise
        else {
            //console.log('Zip or State exists')
            //enabled
            $('.perdiem-step-1 #next').removeClass('disabled').removeAttr('disabled');
        }

    }
}

function checkForMultipleRates() {
    $('#perdiem-multiple-rates-check').html('Next <span class="glyphicon glyphicon-refresh spinning"></span>')
    resetErrors()
        //what fiscal year is start date
    perDiemSearch.startDate = moment($('#perdiem-start-date').val(), 'MM/DD/YYYY')
    if (perDiemSearch.startDate.month() > 8) {
        perDiemSearch.startFY = perDiemSearch.startDate.year() + 1
    } else {
        perDiemSearch.startFY = perDiemSearch.startDate.year()
    }
    //what fiscal year is end date?
    perDiemSearch.endDate = moment($('#perdiem-end-date').val(), 'MM/DD/YYYY')
    if (perDiemSearch.endDate.month() > 8) {
        perDiemSearch.endFY = perDiemSearch.endDate.year() + 1
    } else {
        perDiemSearch.endFY = perDiemSearch.endDate.year()
    }

    console.log('Start Date:', perDiemSearch.startDate.format('MM-DD-YYYY'), 'End Date:', perDiemSearch.endDate.format('MM-DD-YYYY'))
    console.log('Start FY:', perDiemSearch.startFY, 'End FY:', perDiemSearch.endFY)

    buildReq();

    var reqError = false;

    function buildReq(ignoreCity) {
        perDiemSearch.query.zip = $('#perdiem-zip').val();
        perDiemSearch.query.state = $('#perdiem-state').val();
        perDiemSearch.query.city = $('#perdiem-city').val();

        console.log('User Query:', 'State:', perDiemSearch.query.state, 'City:', perDiemSearch.query.city, 'ZIP:', perDiemSearch.query.zip)
        if (ignoreCity) {
            console.log('Ignoring City Param...')
        }
        if (perDiemSearch.query.zip !== '') {
            //zip is available
            console.log('Using ZIP...')
            var req = apiRoot + '/api/rs/perdiem/zip/' + perDiemSearch.query.zip;
            var reqType = 'zip';
        } else {
            if (perDiemSearch.query.city !== '' && !ignoreCity) {
                //city and state available
                console.log('Using City & State...')
                var req = apiRoot + '/api/rs/perdiem/city/' + perDiemSearch.query.city + '/state/' + perDiemSearch.query.state;
                var reqType = 'city-state';
            } else {
                //state only
                console.log('Using State Only...')
                var req = apiRoot + '/api/rs/perdiem/state/' + perDiemSearch.query.state;
                varreqType = 'state';
            }
        }

        getReq(req, reqType);

    }




    function getReq(req, reqType) {
        var fy1req = req + '/year/' + perDiemSearch.startFY;

        function getStartFY() {
            console.log('FY1 AJAX Call...')
            return $.ajax({
                    url: fy1req,
                }).done(function(data) {
                    //no rates
                    if (!data.rates || data.rates.length === 0) {
                        //if search has state, search again for state
                        if (reqType === 'city-state') {
                            //build a new request, ignore city
                            buildReq(true);
                        } else {
                            //else error
                            locationError()
                        }
                        reqError = true;
                    } else {
                        reqError = false;
                        var rates = data.rates[0].rate;
                        if (rates.length > 1) {
                            //multiple rates are available for FY1
                            for (i in rates) {
                                if (rates[i].county === ' ') {
                                    rates[i].county = 'Standard Rate'
                                }
                            }
                            perDiemSearch.rates.fy1 = {
                                year: perDiemSearch.startFY,
                                multiple: true,
                                rates: rates
                            }
                            console.log('Available Rates for FY1:', perDiemSearch.startFY, ':', rates)
                        } else {
                            console.log('Available Rate for FY1:', perDiemSearch.startFY, ':', rates[0])
                            perDiemSearch.rates.fy1 = {
                                year: perDiemSearch.startFY,
                                multiple: false,
                                rate: rates[0]
                            }
                        }
                    }
                })
                .fail(function() {
                    console.log('FY1 AJAX Call Failed!')
                    $('#perdiem-multiple-rates-check').html('Next')
                    reqError = true;
                    $('#perdiem-api-error').show()
                })
        }

        //if search includes 2 fiscal years
        function getEndFY() {
            if (perDiemSearch.startFY !== perDiemSearch.endFY) {
                console.log('FY2 AJAX Call...')
                var fy2req = req + '/year/' + perDiemSearch.endFY;
                return $.ajax({
                        url: fy2req,
                    }).done(function(data) {
                        //data = JSON.parse(data)
                        if (!data.rates || data.rates.length === 0) {
                            //if search has state, search again for state
                            if (reqType === 'city-state') {
                                //build a new request, ignore city
                                buildReq(true);
                            } else {
                                //else error
                                locationError()
                            }
                            reqError = true;
                        } else {
                            reqError = false;
                            var rates = data.rates[0].rate;
                            if (rates.length > 1) {
                                for (i in rates) {
                                    if (rates[i].county === ' ') {
                                        rates[i].county = 'Standard Rate'
                                    }
                                }
                                perDiemSearch.rates.fy2 = {
                                    year: perDiemSearch.endFY,
                                    multiple: true,
                                    rates: rates
                                }
                                console.log('Available Rates for FY2:', perDiemSearch.endFY, ': ', rates)
                            } else {
                                console.log('Available Rate for FY2:', perDiemSearch.endFY, ':', rates[0])
                                perDiemSearch.rates.fy2 = {
                                    year: perDiemSearch.endFY,
                                    multiple: false,
                                    rate: rates[0]
                                }
                            }
                        }
                    })
                    .fail(function() {
                        console.log('FY2 AJAX Call Failed!')
                        $('#perdiem-multiple-rates-check').html('Next')
                        $('#perdiem-api-error').show()
                        reqError = true;
                    })
            } else {
                return true
            }
        }

        console.log('Checking available rates...')

        $.when(getStartFY(), getEndFY()).done(function() {
            if (reqError === true) {
                console.log('AJAX Call(s) Returned Zero Results!')
            } else {
                console.log('AJAX Call(s) Successful!')
                    //if multiple rates available, show multiple rates UI

                if (perDiemSearch.rates.fy2) {
                    if (perDiemSearch.rates.fy1.multiple || perDiemSearch.rates.fy2.multiple) {
                        displayRates()
                    } else {
                        calculateRates()
                    }
                } else {
                    if (perDiemSearch.rates.fy1.multiple) {
                        displayRates()
                    } else {
                        calculateRates()
                    }
                }
            }

            function displayRates() {

                //sort rates, cause the API doesn't
                function countyAlpha(a, b) {
                    return a.county > b.county;
                }
                if (perDiemSearch.rates.fy1.multiple) {
                    perDiemSearch.rates.fy1.rates = perDiemSearch.rates.fy1.rates.sort(countyAlpha);
                }
                if (perDiemSearch.rates.fy2) {
                    if (perDiemSearch.rates.fy2.multiple) {
                        perDiemSearch.rates.fy2.rates = perDiemSearch.rates.fy2.rates.sort(countyAlpha);

                    }
                }
                //render template
                var template = $('#perdiem-templates .multiple-rates').html();
                var rendered = Mustache.render(template, {
                    rates: perDiemSearch.rates
                });
                $('.perdiem-choose-rates').html(rendered);
                perDiemSwiper.slideTo(4)
                $('#perdiem-multiple-rates-check').html('Next')
            }
        });
    }
}


function useMyCurrentLocation() {
    var $btn = $(this).button('loading')
    var geocodeResult = {
        city: '',
        state: '',
        zip: ''
    };
    //get location
    navigator.geolocation.getCurrentPosition(reverseGeocode, currentPositionError);
    geocoder = new google.maps.Geocoder();

    function reverseGeocode(position) {
        console.log('Reverse Geocoding: ', position)
        var latitude = position.coords.latitude,
            longitude = position.coords.longitude;

        var latlong = new google.maps.LatLng(latitude, longitude);

        geocoder.geocode({
            'latLng': latlong
        }, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                var addressComponents = results[0].address_components;
                //ZIP, use postal_code
                for (i in addressComponents) {
                    if (addressComponents[i].types[0] === 'postal_code') {
                        geocodeResult.zip = addressComponents[i].long_name;
                    }
                }
                //CITY, use locality
                for (i in addressComponents) {
                    if (addressComponents[i].types.indexOf('locality') > -1) {
                        geocodeResult.city = addressComponents[i].long_name;
                    }
                }
                //if no locality, use sublocality
                if (geocodeResult.city === '') {
                    for (i in addressComponents) {
                        if (addressComponents[i].types.indexOf('sublocality') > -1) {
                            geocodeResult.city = addressComponents[i].long_name;
                        }
                    }
                }
                //STATE, use administrative_area_level_1
                for (i in addressComponents) {
                    if (addressComponents[i].types.indexOf('administrative_area_level_1') > -1) {
                        geocodeResult.state = addressComponents[i].short_name;
                    }
                }
                populateForm();
                $btn.button('reset')
            } else {
                //error
                console.log('Geocode Error!')
            }
        });
    }

    function populateForm() {
        console.log('Populating Form With Reverse Geocode Results...')
        $('#perdiem-zip').val(geocodeResult.zip)
        $('#perdiem-city').val(geocodeResult.city)
        $('#perdiem-state option').each(function() {
            if ($(this).val() === geocodeResult.state) {
                $(this).attr('selected', 'selected');
            }
        })
        setTimeout(function() {
            validateLocationParams();
        }, 250)
        $('#perdiem-zip,#perdiem-city,#perdiem-state').addClass('animated flash');
        setTimeout(function() {
            $('#perdiem-zip,#perdiem-city,#perdiem-state').removeClass('animated flash');
        }, 2000)
    }

    function currentPositionError() {
        console.log('Current Position Error!')
    }
}

function locationError() {
    console.log('No Results for Location...')
    $('#perdiem-location-error').show()
    $('#perdiem-multiple-rates-check').html('Next')
    perDiemSwiper.slideTo(0)
}


function calculateRates() {
    $('#perdiem-multiple-rates-check').html('Next <span class="glyphicon glyphicon-refresh spinning"></span>')
    $('#perdiem-multiple-rates-check,#perdiem-rates-selected').html('Next')
    perDiemSearch.results = {
        breakdown: [],
        rateInfo: [],
        total: 0
    };
    console.log('Calculating...')
    var start = moment(perDiemSearch.startDate, 'MM/DD/YYYY');
    var end = moment(perDiemSearch.endDate, 'MM/DD/YYYY');
    var startDate = moment(perDiemSearch.startDate, 'MM/DD/YYYY');
    var endDate = moment(perDiemSearch.endDate, 'MM/DD/YYYY');
    //single day trip
    if (perDiemSearch.startDate === perDiemSearch.endDate) {
        console.log('One Day Trip (No Overnight):', 'MIE:', perDiemSearch.rates.fy1.rate.meals * 0.75)
            //mie only, at 75%
        var total = perDiemCalculator.rates.fy1.rate.meals * 0.75;
    }
    //multi-day trip
    else {
        var total = 0;
        var months = [];

        var pdsd = moment(perDiemSearch.startDate).format('MM-DD-YYYY');
        var pded = moment(perDiemSearch.endDate).format('MM-DD-YYYY');

        for (var date = start; !date.isAfter(end); date.add(1, 'days')) {

            var rateMonth = date.format('M') - 1;
            //console.log('Month index:',rateMonth)
            var rateYear = date.format('YYYY');

            //adjust for fiscal year
            //if after september
            if (rateMonth > 8) {
                //adjust fy by 1
                var fy = parseFloat(rateYear) + 1
            } else {
                //else keep the same
                var fy = parseFloat(rateYear);
            }
            var fys = Object.keys(perDiemSearch.rates);
            for (i in fys) {
                if (perDiemSearch.rates[fys[i]].year === fy) {
                    //select appropriate rate for this day
                    var rate = perDiemSearch.rates[fys[i]].rate;
                }
            }

            console.log('=========\n', 'Adding Date:', date.format('MM-DD-YYYY'), 'Fiscal Year:', fy)


            var lodgingRate = rate.months.month[rateMonth].value;
            var month = date.format('MMMM');


            //rate info now separate from breakdown
            var rateInfo = perDiemSearch.results.rateInfo;
            //loop through
            //console.log('rateInfo Length:', rateInfo.length)
            for (i in rateInfo) {
                //console.log(i, rateInfo[i].date)
                //determine if month has already been pushed
                //console.log(breakdown[i].date, month, '?')
                if (rateInfo[i].date === month) {
                    //console.log(month, 'Already Exists')
                    var monthAlreadyExists = true;
                } else {
                    var monthAlreadyExists = false;
                    //console.log(month, 'Does not yet exist in breakdown')
                }
            }
            if (rateInfo.length === 0) {
                var monthAlreadyExists = false;
                //console.log(month, 'Does not yet exist in rateInfo')
            }
            //console.log('monthAlreadyExists?', monthAlreadyExists)
            if (monthAlreadyExists === false) {
                //console.log(JSON.stringify(perDiemSearch.results.breakdown))
                //console.log('Pushing', month)
                perDiemSearch.results.rateInfo.push({
                        date: month,
                        lodging: formatCurrency(lodgingRate),
                        mie: formatCurrency(rate.meals)
                    })
                    //console.log(perDiemSearch.results.rateInfo)

            }

            //first day && not last day
            if (date.format('MM-DD-YYYY') === pdsd && pdsd !== pded) {
                console.log('First Day')
                    //set mie rate to 0.75
                var mieRate = rate.meals * 0.75;
                console.log('MIE at 75%:', mieRate)
                    //add mie to total
                total += mieRate;
                //add lodging to total
                console.log('Rate:', lodgingRate)
                total += lodgingRate;
                //console.log(JSON.stringify(perDiemSearch.results.breakdown))
                //console.log('Pushing First Day')
                var totalRate = lodgingRate + mieRate
                perDiemSearch.results.breakdown.push({
                        date: 'First Day',
                        fullDate: date.format('MM/DD/YY'),
                        lodging: formatCurrency(lodgingRate),
                        mie: formatCurrency(mieRate),
                        isFirstLast: true,
                        total: formatCurrency(totalRate)
                    })
                    //console.log(JSON.stringify(perDiemSearch.results.breakdown))
            }
            //last day (and only day if a same-day trip)
            else if (date.format('MM-DD-YYYY') === pded) {
                //if same-day, change breakdown text
                if (pdsd === pded) {
                    var dateText = 'Single Day';
                } else {
                    var dateText = 'Last Day'
                }
                console.log('Last Day')
                var mieRate = rate.meals * 0.75;
                console.log('MIE at 75%:', mieRate)
                    //add mie to total
                total += mieRate;
                //NO LODGING
                //console.log(JSON.stringify(perDiemSearch.results.breakdown))
                //console.log('Pushing Last Day...')
                perDiemSearch.results.breakdown.push({
                        date: dateText,
                        fullDate: date.format('MM/DD/YY'),
                        mie: formatCurrency(mieRate),
                        lodging: 0,
                        isFirstLast: true,
                        total: formatCurrency(mieRate)
                    })
                    //console.log(JSON.stringify(perDiemSearch.results.breakdown))
            }
            //all other days
            else {
                //mie at 100%
                var mieRate = rate.meals;
                console.log('Month:', month)
                console.log('Rate:', lodgingRate)
                console.log('MIE:', mieRate)
                total += lodgingRate;
                total += mieRate;
                //define existing breakdown
                var breakdown = perDiemSearch.results.breakdown;
                //loop through
                for (i in breakdown) {
                    //console.log(i)
                    //determine if month has already been pushed
                    //console.log(breakdown[i].date, month, '?')
                    if (breakdown[i].date === month) {
                        //console.log(month, 'Already Exists')
                        var monthAlreadyExists = true;
                    } else {
                        var monthAlreadyExists = false;
                        //console.log(month, 'Does not yet exist in breakdown')
                    }
                }
                //console.log('monthAlreadyExists?',monthAlreadyExists)
                if (!monthAlreadyExists) {
                    //console.log(JSON.stringify(perDiemSearch.results.breakdown))
                    //console.log('Pushing', month)
                    var totalRate = lodgingRate + mieRate
                    perDiemSearch.results.breakdown.push({
                            isRate: true,
                            date: month,
                            lodging: formatCurrency(lodgingRate),
                            mie: formatCurrency(mieRate),
                            total: formatCurrency(totalRate)
                        })
                        //console.log(JSON.stringify(perDiemSearch.results.breakdown))
                }
            }
        }
    }
    perDiemSearch.results.total = total;
    console.log('=========\n', 'Total:', perDiemSearch.results.total);
    console.log('=========\n', 'Breakdown:')
    console.table(perDiemSearch.results.breakdown)
        //if more than one FY, are FYs using same rate?
    if (perDiemSearch.rates.fy2) {
        if (perDiemSearch.rates.fy1.rate.county === perDiemSearch.rates.fy2.rate.county) {
            var sameRate = true;
        }
    }
    perDiemSearch.query.stateFormatted = USStates[perDiemSearch.query.state.toLowerCase()]
    perDiemSearch.results.totalFormatted = formatCurrency(perDiemSearch.results.total)
    var template = $('#perdiem-templates .calculator-results').html();
    var rendered = Mustache.render(template, {
        perDiemSearch: perDiemSearch,
        sameRate: sameRate
    });
    $('#perdiem-results').html(rendered);
    perDiemSwiper.slideTo(5)
};

function formatCurrency(n) {
    if (n % 1 != 0) {
        var formatted = n.toFixed(2)
    } else {
        var formatted = n
    }
    return formatted;
}

function ratesSelected() {
    if (perDiemSearch.rates.fy1.multiple) {
        var m = $('#perdiem-fiscal-year-1 option:selected').index() - 1;
        perDiemSearch.rates.fy1.rate = perDiemSearch.rates.fy1.rates[m]
        console.log('User Selected:', $('#perdiem-fiscal-year-1 option:selected').text(), 'For FY', perDiemSearch.rates.fy1.year)
    } else {
        //console.log('fy1 no multiple')
    }
    if (perDiemSearch.rates.fy2) {
        //console.log('fy2 exists')
        if (perDiemSearch.rates.fy2.multiple) {
            //console.log('fy2 exists with multiple')
            var n = $('#perdiem-fiscal-year-2 option:selected').index() - 1;
            perDiemSearch.rates.fy2.rate = perDiemSearch.rates.fy2.rates[n]
            console.log('User Selected:', $('#perdiem-fiscal-year-2 option:selected').text(), 'For FY', perDiemSearch.rates.fy2.year)
        }
    } else {
        //console.log('fy2 does not exist')
    }

    calculateRates()
}

function updateProgress(n) {
    $('.progress-bar').attr('aria-valuenow', n).css('width', n + '%')
}

function lookUpRatesSubmit() {
    var fullState = USStates[$('#perdiem-state').val().toLowerCase()];
    var url = "http://www.gsa.gov/portal/category/100120?perdiemSearchVO.year=" + $('#perdiem-rate-lookup-fiscal-year').val() + "&perdiemSearchVO.city=" + $('#perdiem-city').val() + "&perdiemSearchVO.state=" + fullState + "&perdiemSearchVO.zip=" + $('#perdiem-zip').val() + "&resultName=getPerdiemRatesBySearchVO&currentCategory.categoryId=100120&x=44&y=13";
    window.open(url)
}

var USStates = {
    "al": "Alabama",
    "ak": "Alaska",
    "az": "Arizona",
    "ar": "Arkansas",
    "ca": "California",
    "co": "Colorado",
    "ct": "Connecticut",
    "de": "Delaware",
    "fl": "Florida",
    "ga": "Georgia",
    "hi": "Hawaii",
    "id": "Idaho",
    "il": "Illinois",
    "in": "Indiana",
    "ia": "Iowa",
    "ks": "Kansas",
    "ky": "Kentucky",
    "la": "Louisiana",
    "me": "Maine",
    "md": "Maryland",
    "ma": "Massachusetts",
    "mi": "Michigan",
    "mn": "Montana",
    "ms": "Mississippi",
    "mo": "Missouri",
    "ne": "Nebraska",
    "nv": "Nevada",
    "nh": "New Hampshire",
    "nj": "New Jersey",
    "nm": "New Mexico",
    "ny": "New York",
    "nc": "North Carolina",
    "nd": "North Dakota",
    "oh": "Ohio",
    "ok": "Oklahoma",
    "or": "Oregon",
    "pa": "Pennsylvania",
    "ri": "Rhode Island",
    "sc": "South Carolina",
    "sd": "South Dakota",
    "tn": "Tennessee",
    "tx": "Texas",
    "ut": "Utah",
    "vt": "Vermont",
    "va": "Virginia",
    "wa": "Washington",
    "wv": "West Virginia",
    "wi": "Wisconsin",
    "wy": "Wyoming"
}
