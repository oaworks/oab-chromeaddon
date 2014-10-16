var current_page = location.pathname
var key = localStorage.getItem('api_key');
var serviceaddress = 'http://oabutton.cottagelabs.com';
var apiaddress = serviceaddress + '/api';

// These listeners are active on all pages
window.addEventListener('load', function () {
	document.getElementById('bug').addEventListener('click', function(){
		chrome.tabs.create({'url': "http:/openaccessbutton.org/chrome/bug"});
	});
	document.getElementById('help').addEventListener('click', function(){
		chrome.tabs.create({'url': "http:/openaccessbutton.org/chrome/help"});
	});
	document.getElementById('privacy').addEventListener('click', function(){
		chrome.tabs.create({'url': "http://openaccessbutton.org/user/" + localStorage.getItem('username')});
	});
	document.getElementById('logout').addEventListener('click', function(){
		if ('api_key' in localStorage) localStorage.removeItem('api_key');
		window.location.href = 'login.html';
	});
});

// Helpers
function get_id(id) { return document.getElementById(id); }
function get_value(id) { return document.getElementById(id).value; }

function display_error(warning){
	var warn_div = get_id('error');
	var content = '<div class="alert alert-danger" role="alert">' + warning + '</div>';
	warn_div.innerHTML = content;
}

function get_active_tab() {
	chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
	    console.log(tabs[0].url);
	    localStorage.setItem('active_tab', tabs[0].url);
	});
}

function handle_data(data) {
	var api_div = get_id('api_content');

	if (data.contentmine.hasOwnProperty('errors')){
		api_div.innerHTML = '<div class="alert alert-danger" role="alert"><p><strong>Error</strong> Are you sure this is an article page?</p>';
	} else {
		if (data.contentmine.metadata.hasOwnProperty('title')){
			api_div.innerHTML = '<h5>' + data.contentmine.metadata['title'] + '</h5><h5>Links</h5><p>Coming soon.</p><h5>Related papers</h5><p>Coming soon.</p><h5>Additional info</h5><ul><li>Blocked:' + data.blocked + '</li>' + '<li>Wishlist: ' + data.wishlist + '</li></ul>';
		} else {
			api_div.innerHTML = '<h5>Links</h5><p>Coming soon.</p><h5>Related papers</h5><p>Coming soon.</p><h5>Additional info</h5><ul><li>Blocked: ' + data.blocked + '</li>' + '<li>Wishlist: ' + data.wishlist + '</li></ul>';
		}
		display_metadata(data.contentmine.metadata);
	}
}

function display_metadata(metadata) {
	var start = '<h5>Meta Data</h5><div class="collapse">';
	var end = '</p>';
	var meta_div = get_id('meta-div');
	var meta_content = '';
	for (var key in metadata) {
		if (metadata.hasOwnProperty(key)) {
	 		meta_content += '<p><strong>'+ key + '</strong>: ' + JSON.stringify(metadata[key]) + '</div>';
		}
	}
	meta_div.innerHTML = start + meta_content + end;
}

function handle_api_error(data) {
	var error_text = '';
	if (data.hasOwnProperty('responseJSON') && data.responseJSON.hasOwnProperty('errors')) {
		if (data.responseJSON['errors'][0] == '401: Unauthorized') {
			error_text = 'Incorrect password.';
		} else if (data.responseJSON['errors'][0] == '404: Not Found') {
			error_text = 'Email address does not have an account.';
		} else if (data.responseJSON['errors'][0] == 'username already exists') {
			error_text = 'Email address already associated with an account.';
		} else {
			error_text = data.responseJSON['errors'][0];
		}
	}
	display_error(error_text);
}

function oab_api_request(api_request, data, requestor) {
	$.ajax({
        'type': 'POST',
        'url': apiaddress + api_request,
        'contentType': 'application/json; charset=utf-8',
        'dataType': 'JSON',
        'processData': false,
        'cache': false,
        'data': data,
        'success': function(data){
        	console.log(data);
    		if (requestor == 'accounts') {
    			localStorage.setItem('api_key', data.api_key);
    			localStorage.setItem('username', get_value('user_email'));
    			window.location.href = 'login.html'
    		} else if (requestor == 'status') {
    			handle_data(data);
    		} else if (requestor == 'blocked') {
    			localStorage.setItem('blocked_id', data.id);
    		} else if (requestor == 'blockpost') {
    			console.log('test')
    		} else if (requestor == 'wishlist'){
    			window.location.href = 'failure.html';
    		}
    	},
        'error': function(data){
    		console.log(data);
    		handle_api_error(data)
    	},
    });
}

function scrape_emails() {
	var all_emails = document.documentElement.innerHTML.toLowerCase().match(/([a-z0-9_\.\-\+]+@[a-z0-9_\-]+(\.[a-z0-9_\-]+)+)/g);
	if (all_emails == null) {
		return("emails", []);
	} else {
		var emails = [];

		for (var i=0; i<all_emails.length; i++) {
			var email = all_emails[i];
			if (!((email.indexOf("@elsevier.com") > -1) || (email.indexOf("@nature.com") > -1) || (email.indexOf("@sciencemag.com") > -1) || (email.indexOf("@springer.com") > -1))) {
				emails.push(email);
			}
		}

		return("emails", emails);
	}
}

function post_block_event(blockid) {
	var story_text = get_value('story');
	var block_request = '/blocked/' + blockid;
	var data = JSON.stringify({
            'api_key': key,
            'url': localStorage.getItem('active_tab'),
            'story': story_text
        });
	oab_api_request(block_request, data, 'blockpost');
}

// Setup
get_active_tab()

if (current_page == '/ui/login.html') {
	window.addEventListener('load', function () {

		// If we have a key, redirect to the main page.
		if (key){
			window.location.href = '/ui/main.html';
		}

		// Handle the register button.
	    document.getElementById('signup').addEventListener('click', function(){
	    	var user_email = get_value('user_email');
	    	var user_password = get_value('user_password');

	    	if (user_email && user_password){
	    		var api_request = '/register';
		    	data = JSON.stringify({
		            'email': user_email,
		            'password': user_password,
		        });
		    	oab_api_request(api_request, data, 'accounts');
	    	} else {
	    		display_error('You must supply an email address and a password to login or register.');
	    	}

	    	
	    });

	    // Handle the login button.
	    document.getElementById('login').addEventListener('click', function(){
	    	var user_email = get_value('user_email');
	    	var user_password = get_value('user_password');

	    	if (user_email && user_password){
	    		var api_request = '/retrieve';
		    	data = JSON.stringify({
		            'email': user_email,
		            'password': user_password,
		        });
	    		oab_api_request(api_request, data, 'accounts');
	    	} else {
	    		display_error('error', 'You must supply an email address and a password to login or register.');
	    	}
	    });

	    // Handle forgot button
	    document.getElementById('forgot').addEventListener('click', function(){
			window.open("http://openaccessbutton.org/chrome/forgot_password");
    	});

	});

} else if (current_page == '/ui/main.html' && key) {
		window.addEventListener('load', function () {

    	document.getElementById('meta-collapse').addEventListener('click', function(){
			var $this = $(this);
			var $collapse = $this.closest('.collapse-group').find('.collapse');
			$collapse.collapse('toggle');
    	});

    	document.getElementById('success').addEventListener('click', function(){
    		post_block_event(localStorage.getItem('blocked_id'));
 			window.location.href = 'success.html';
    	});

    	document.getElementById('failure').addEventListener('click', function(){
    		post_block_event(localStorage.getItem('blocked_id'));
    		var request = '/wishlist';
	    	data = JSON.stringify({
	            'api_key': key,
	            'url': localStorage.getItem('active_tab')
	        }),
			oab_api_request(request, data, 'wishlist');
    	});

		document.getElementById('why').addEventListener('click', function(){
			chrome.tabs.create({'url': "http://openaccessbutton.org/chrome/why"});
		});

    	if (!localStorage.getItem('blocked_id')) {
    		// Blocked Event, if we've not already sent a block event.
    		var blocked_request = '/blocked';
	    	status_data = JSON.stringify({
	            'api_key': key,
	            'url': localStorage.getItem('active_tab')
	        }),
			oab_api_request(blocked_request, status_data, 'blocked');
    	}

    	$('#story').keyup(function () {
		    var left = 85 - $(this).val().length;
		    if (left < 0) {
		        left = 0;
		    }
		    $('#counter').text(left);
		    var success = get_id('success');
		    var failure = get_id('failure');
		    if (left < 85) {
		    	failure.disabled = false;
		    } else {
		    	failure.disabled = true;
		    }
		});

    	// Get URL Status
    	var status_request = '/status';
    	status_data = JSON.stringify({
            'api_key': key,
            'url': localStorage.getItem('active_tab')
        }),
		oab_api_request(status_request, status_data, 'status');
	});

} else if (current_page == '/ui/success.html' && key) {
	document.getElementById('fb').addEventListener('click', function(){
		chrome.tabs.create({'url': "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fopenaccessbutton.org%2F"});
	});
	document.getElementById('tw').addEventListener('click', function(){
		chrome.tabs.create({'url': "https://twitter.com/intent/tweet?text=See%20what%20I%E2%80%99d%20do%20with%20access%20to%20this%20research%20paper%20at%20https%3A%2F%2Fopenaccessbutton.org%2Fstory%2Ff5ff652c9d3f4677a06bb44b0f74fd9c%20via%20%40oa_button.&source=webclient"});
	});
	document.getElementById('gp').addEventListener('click', function(){
		chrome.tabs.create({'url': "https://plus.google.com/share?url=https://openaccessbutton.org"});
	});
} else if (current_page == '/ui/failure.html' && key) {
	document.getElementById('fb').addEventListener('click', function(){
		chrome.tabs.create({'url': "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fopenaccessbutton.org%2F"});
	});
	document.getElementById('tw').addEventListener('click', function(){
		chrome.tabs.create({'url': "https://twitter.com/intent/tweet?text=See%20what%20I%E2%80%99d%20do%20with%20access%20to%20this%20research%20paper%20at%20https%3A%2F%2Fopenaccessbutton.org%2Fstory%2Ff5ff652c9d3f4677a06bb44b0f74fd9c%20via%20%40oa_button.&source=webclient"});
	});
	document.getElementById('gp').addEventListener('click', function(){
		chrome.tabs.create({'url': "https://plus.google.com/share?url=https://openaccessbutton.org"});
	});
} else {
	window.location.href = 'login.html';	
}
