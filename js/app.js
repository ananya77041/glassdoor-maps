API_KEY = 'AIzaSyC0olpIT7VLMU4ERAk87VdIUQRGuFAloyI';

// Set up map
var map;
var infowindow;
var markers = [];
var initialLocation;
var reverseGeocodedInitial;

function clearOverlays() {
  for (var i = 0; i < markers.length; i++ ) {
    markers[i].setMap(null);
  }
  markers.length = 0;
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
		radius: '5000',
		name: company,
		key: API_KEY
	};
	var service = new google.maps.places.PlacesService(map);
	service.nearbySearch(params, callback);

	infowindow = new google.maps.InfoWindow();

	function callback(results, status) {
		if (status == google.maps.places.PlacesServiceStatus.OK) {
			for (var i = 0; i < results.length; i++) {
				createMarker(results[i]);
			}
		}
		map.fitBounds(markers.reduce(function(bounds, marker) {
    		return bounds.extend(marker.getPosition());
		}, new google.maps.LatLngBounds()));
	}

	function createMarker(place) {
		var placeLoc = place.geometry.location;
		var marker = new google.maps.Marker({
			map: map,
			position: place.geometry.location
		});
		markers.push(marker);

		google.maps.event.addListener(marker, 'click', function() {
			infowindow.setContent(place.name);
			infowindow.open(map, this);
		});
	};

};

function initialize() {
	var myLatlng1 = new google.maps.LatLng(53.65914, 0.072050);

	var mapOptions = {
		zoom: 12,
		center: myLatlng1,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};

	map = new google.maps.Map(document.getElementById('map-canvas'),
		mapOptions);

	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function (position) {
			initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			map.setCenter(initialLocation);
			reverseGeocodeInitial();
		});
	};
};

var results;

// Check input
function checkInput(field) {
	if ($('#'+field).val() == '') {
		$('#'+field+'-warn').fadeIn(1000, function() {
			setTimeout(function() {
				$('#'+field+'-warn').fadeOut(1000);
			}, 1000);
		});
		return false;
	}
	else {
		return true;
	};
};

// Display results
var template;

function displayResults(results) {
	var employers = results.employers;
	var searchLocation = results.lashedLocation.longName;
	// map.setCenter(geocode(searchLocation));
	
	for (var i=0;i<employers.length;i++) {
		// show in results list
		template = $('#result-template').clone();
		template.attr('id','result'+i).addClass('result').find('p').text(employers[i].name);
		template.appendTo('#results');

		// show in map
		searchPlaces(employers[i].name, searchLocation);
	};
};

// JSONP Callback function
function processJSON(json) {
	results = json['response'];
	displayResults(results);
};

// GlassDoor Request
function getGlassDoor(query, loc) {
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


$(function() {
	// Create map
	initialize();

	// Submit search
	$('#search-button').on('click', function() {
		// remove previous results
		$('.result').remove();
		clearOverlays();

		if (checkInput('query')) {
			query = $('#query').val();
			loc = ( $('#loc').val() != '' ? $('#loc').val() : reverseGeocodedInitial );
			getGlassDoor(query, loc);
		};
		return false;
	});
});