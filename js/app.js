API_KEY = 'AIzaSyC0olpIT7VLMU4ERAk87VdIUQRGuFAloyI';

// Set up map
var map;
var infowindow;
var service;
var markers = [];
var initialLocation;
var reverseGeocodedInitial;

function clearOverlays() {
	for (var i = 0; i < markers.length; i++ ) {
		markers[i].setMap(null);
	}
	markers.length = 0;
};

function convertToMeters(miles) {
	return miles * 1609.344;
};

// Geocode request
function geocodeRequest(params, action) {
	var url = 'https://maps.googleapis.com/maps/api/geocode/json';

	$.ajax({
		async: false,
		type: 'GET',
		url: url,
		data: params,
		success: function(data) {
			action(data);
		}
	});
};

// Reverse geocode current location
function reverseGeocodeInitial() {
	var params = {
		latlng: initialLocation.A + ',' + initialLocation.F,
		result_type: 'locality',
		key: API_KEY
	};
	var action = function(data) {
		reverseGeocodedInitial = data.results[0].formatted_address;
	};
	geocodeRequest(params, action);
};

// Geocode a location
function geocode(location) {
	var geocoded = '';
	var params = {
		address: location,
		key: API_KEY
	};
	var action = function(data) {
		geocoded = data.results[0].geometry.location;
	};
	geocodeRequest(params, action);
	return geocoded;
}

// Search places for company in lashed location
function searchPlaces(company, location) {
	var params = {
		location: geocode(location),
		radius: radius,
		name: company,
		key: API_KEY
	};
	
	service.nearbySearch(params, callback);

	infowindow = new google.maps.InfoWindow();

	function callback(returned, status) {
		if (returned.length > 0) {
			if (status == google.maps.places.PlacesServiceStatus.OK) {
				for (var i = 0; i < returned.length; i++) {
					if (!returned[i].permanently_closed) {
						createMarker(returned[i]);
					}
				}
			}
			map.fitBounds(markers.reduce(function(bounds, marker) {
				return bounds.extend(marker.getPosition());
			}, new google.maps.LatLngBounds()));
		};
	};

	function createMarker(place) {
		var placeLoc = place.geometry.location;
		var marker = new google.maps.Marker({
			map: map,
			position: place.geometry.location
		});
		markers.push(marker);

		google.maps.event.addListener(marker, 'mouseover', function() {
			infowindow.setContent(place.name);
			infowindow.open(map, this);
		});
		google.maps.event.addListener(marker, 'mouseout', function() {
			infowindow.close();
		});
	};
};

function initialize() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function (position) {
			initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			reverseGeocodeInitial();
			var myLatlng1 = new google.maps.LatLng(53.65914, 0.072050);

			var mapOptions = {
				zoom: 12,
				center: initialLocation,
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};

			map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
			service = new google.maps.places.PlacesService(map);
		});
	};
};

var radius;
var page;

// Flash warning
function flashWarning(message) {
	$('#warn').text(message)
	.fadeIn(1000, function() {
		setTimeout(function() {
			$('#warn').fadeOut(1000);
		}, 1000);
	});
};

// Display results
var template;

function displayResults(results) {
	var employers = results.employers;
	var searchLocation = results.lashedLocation.longName;
	
	for (var i=0;i<employers.length;i++) {
		template = $('#result-template').clone();
		template.attr('id','result'+i).addClass('result').find('.company').text(employers[i].name);
		template.appendTo('#results');
		$('#result'+i).fadeIn(1000);
		// show in map
		searchPlaces(employers[i].name, searchLocation);
	};
	if (results.totalRecordCount > 10) {$('#nextpage').show()};
};

// JSONP Callback function
function processJSON(json) {
	var results = json['response'];
	console.log(results);
	displayResults(results);
};

// GlassDoor Request
function getGlassDoor(query, loc, page) {
	var params = {
		v: 1,
		format: 'json',
		callback: 'processJSON',
		't.p': 38928,
		't.k': 'feg0a3IFbL9',
		userip: '0.0.0.0',
		useragent: '',
		action: 'employers',
		q: query,
		l: loc,
		pn: page
	};
	var url = 'http://api.glassdoor.com/api/api.htm';

	$.ajax({
		url: url,
		jsonp: "processJSON",
		dataType: "jsonp",
		data: params,
		success: function(response) {
			console.log(response);
		}
	});
};

// Perform a search
function doSearch(page) {
	// remove previous results
	$('.result').remove();
	clearOverlays();

	if ($('#query').val() != '') {
		query = $('#query').val();
		if ($('#loc').val() != '') {
			loc = $('#loc').val();
		} else {
			flashWarning('Using current location');
			loc = reverseGeocodedInitial;
		};
		radius = convertToMeters($('#radius').val());
		getGlassDoor(query, loc, page);
	}
	else {
		flashWarning('Search term required!');
	};
};

$(function() {
	// Create map
	initialize();

	var submitSearch = function() {
		page = 1;
		doSearch(page);
		return false;
	}

	// Submit search
	$('#search-button').on('click', submitSearch);
	$('input').on('keypress', function(e) {
		if (e.which == 13) {
			$('#search-button').click();
		}
	})

	// Next page of results
	$('#nextpage').on('click', function() {
		page++;
		doSearch(page);
		$('#prevpage').show();
	})

	// Previous page of results
	$('#prevpage').on('click', function() {
		page--;
		doSearch(page);
		if (page == 1) $('#prevpage').hide();
	})
});