var current_page = location.pathname
var key = localStorage.getItem("api_key");

if (current_page == '/ui/login.html') {
	window.addEventListener('load', function () {

	if (key){
		window.location.href = '/ui/main.html';
	}

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
        		localStorage.setItem("api_key", data.api_key);
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
} else if (current_page == '/ui/main.html' && key) {
	console.log(key)
} else {
	window.location.href = "login.html";	
}