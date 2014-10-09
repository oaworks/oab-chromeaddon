var page_main = ""
var current_page = location.pathname
var key = ""

if (current_page == '/ui/login.html') {
	chrome.storage.sync.get('api_key', function (result) {
		if (result.api_key) {
			window.location.href = "main.html";
		}
    });
	window.addEventListener('load', function () {

    document.getElementById("signup").addEventListener('click', function(){
    	var response = ''
    	var serviceaddress = 'http://oabutton.cottagelabs.com';
		var apiaddress = serviceaddress + '/api';
		var api_key = '';
		var username = '';
	    $.ajax({
	        'type': 'POST',
	        'url': apiaddress + '/register',
	        'contentType': 'application/json; charset=utf-8',
	        'dataType': 'JSON',
	        'processData': false,
	        'cache': false,
	        'data': JSON.stringify({
	            'email': document.getElementById("user_email").value,
	            'password': document.getElementById('user_password').value,
	        }),
	        'success': function(data){
	        	console.log(data)
	        	chrome.storage.sync.set({'api_key': data.api_key}, function() {
		        console.log('Settings saved');
        });
        	},
	        'error': function(data){
            	console.log(data)
        	},
	    });

    });

    // Handle login
    document.getElementById("login").addEventListener('click', function(){
    	window.location.href = "main.html";
    	
    });

});
}