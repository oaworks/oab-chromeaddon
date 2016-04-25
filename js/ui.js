var current_page = location.pathname;
var key = localStorage.getItem('api_key');
var active_tab = undefined;

// These listeners are active on all pages
window.addEventListener('load', function () {
    document.getElementById('bug').addEventListener('click', function () {
        if (chrome.runtime.getManifest()['version_name'].indexOf('firefox') >= 0) {
            chrome.tabs.create({'url': "https://openaccessbutton.org/firefox/bug"});
        } else {
            chrome.tabs.create({'url': "https://openaccessbutton.org/chrome/bug"});
        }
    });
    document.getElementById('logout').addEventListener('click', function () {
        if ('api_key' in localStorage) localStorage.removeItem('api_key');
        window.location.href = 'login.html';
    });
});

// Helpers
function get_id(id) {
    return document.getElementById(id);
}
function get_value(id) {
    return document.getElementById(id).value;
}
function get_loc(callback) {
    if (navigator.geolocation) {
        var opts = {timeout: 5000};        // 5 sec timeout
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat_lon = {geo: {lat: position.coords.latitude, lon: position.coords.longitude}};
            callback(lat_lon)
        }, function (error) {
            // Can't get location (permission denied or timed out)
            console.log(error.message);
            callback(null);
        }, opts);
    } else {
        // Browser does not support location
        console.log('GeoLocation is unsupported.');
        callback(null)
    }
}

function display_error(warning) {
    var warn_div = get_id('error');
    warn_div.innerHTML = '<div class="alert alert-danger med-text" role="alert"></div>';
    warn_div.firstChild.textContent = warning;
}

function hide_email_fields() {
    var em = $('#auth_email');
    var ti = $('#article_title');
    em.collapse('hide');
    ti.collapse('hide');
}

function fill_email_fields(author_email, article_title) {
    var em = $('#auth_email');
    var ti = $('#article_title');
    // pre-fill the text fields with supplied data if available
    if (author_email) {
        em.val(author_email);
    }
    if (article_title) {
        ti.val(article_title);
    }
}

function set_button(button_text, button_target, post_story) {
    //fixme: this could be much more efficient!
    var button = $('#submit');
    button.text(button_text);

    if (button_target && post_story) { // story and redirect, redirect after post made
        button.click(function() {
            document.getElementById('spin-greybox').style.visibility = 'visible';
            post_block_event(localStorage.getItem('blocked_id'), function () {
                chrome.tabs.create({url: button_target});
                var pp = chrome.extension.getViews({type: 'popup'})[0];
                pp.close();
            });
        });
    } else if (post_story) { // story only; we need to tell the popup to close once it is sent
        button.click(function () {
            // check we have an email before sending    //fixme: this should really be done by not activating the button
            if (!get_value('auth_email') || !get_value('article_title')) {
                display_error("Please complete all fields!")
            } else {
                document.getElementById('spin-greybox').style.visibility = 'visible';
                post_block_event(localStorage.getItem('blocked_id'), function () {
                    var pp = chrome.extension.getViews({type: 'popup'})[0];
                    pp.close();
                });
            }
        });
    } else if (button_target) { // target only, just open tab when button is clicked
        button.click(function() {
            chrome.tabs.create({url: button_target})
        });
    }
}

function handle_data(data) {
    var api_div = get_id('api_content');

    if (data.hasOwnProperty('provided')) {
        // we have found the data; send the user to its url
        hide_email_fields();
        $('#story_div').collapse('hide');
        get_id('submit').disabled = false;

        api_div.innerHTML = '<h4 class="title">We found this data!</h4>';
        set_button("See your data", data.provided.url, false);
    } else if (data.hasOwnProperty('request')) {
        // submit user story and redirect to request URL (add story to existing request)
        hide_email_fields();
        api_div.innerHTML = '<h5 class="title">We\'ve found an existing request. Add your story to support this request.</h5>';
        set_button("Submit and view request", siteaddress + "/request/" + data.request, true);
    } else {
        // submit user story with email and title fields (create new request)
        api_div.innerHTML = '<h4 class="title">This data isn\'t available.</h4><p>You can submit a request to the author.</p>';
        set_button("Send a new request", undefined, true);

        // Extract more metadata from the page to augment the blocked request FIXME: This is a strange way of doing it.
        chrome.runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
                var doc = (new DOMParser()).parseFromString(request.content, "text/html");
                var meta = doc.getElementsByTagName('meta');
                var title = oab.return_title(meta);
                var doi = oab.return_doi(meta);
                var author = oab.return_authors(meta);
                var journal = oab.return_journal(meta);
                fill_email_fields(undefined, title);                // fixme: we can't reliably scrape emails yet

                var block_request = '/blocked/' + localStorage.getItem('blocked_id');
                var data = {             // This is best-case (assume getting all info) for now.
                    'api_key': key,
                    'url': active_tab,
                    'metadata': {
                        'title': title,
                        'author': author,
                        'journal': journal,
                        'identifier': [{'type': 'doi', 'id': doi}]
                    }
                };
                oab.api_request(block_request, data, 'blockpost', process_api_response, handle_api_error);
            });

        // Now inject a script onto the page
        chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
            chrome.tabs.executeScript(tabs[0].id, {
                code: "chrome.runtime.sendMessage({content: document.head.innerHTML}, function(response) { console.log('success'); });"
            });
        });
    }
}

function handle_api_error(data) {               // todo: check for more errors
    var error_text = '';
    if (data.status == 401) {
        error_text = "Unauthorised - check your API key is valid."
    } else if (data.status == 403) {
        error_text = "Forbidden - account may already exist."
    }
    if (error_text != '') {
        display_error(error_text);
    }
}

function post_block_event(blockid, callback) {
    var story_text = get_value('story');
    var block_request = '/blocked/' + blockid;
    var data = {
        api_key: key,
        url: active_tab,
        story: story_text
    };
    // Add author email if provided so oabutton can email them //todo: parse from page & populate field
    var given_auth_email = get_value('auth_email');
    if (given_auth_email) {
        data['email'] = [given_auth_email];
    }

    try {
        // Add location data to story if possible
        get_loc(function (pos_obj) {
            if (pos_obj) {
                data['location'] = pos_obj;
            }
            oab.api_request(block_request, data, 'blockpost', process_api_response, handle_api_error);
            callback()
        });
    } catch (e) {
        console.log("A location error has occurred.");
        oab.api_request(block_request, data, 'blockpost', process_api_response, handle_api_error);
        callback()
    }
}

function process_api_response(data, requestor) {
    if (requestor == 'accounts') {
        if (data.apikey) {
            localStorage.setItem('api_key', data.apikey);
            localStorage.setItem('username', get_value('user_email'));
            window.location.href = 'login.html'
        }
    } else if (requestor == 'blocked') {
        localStorage.setItem('blocked_id', data._id);
        handle_data(data);
    }
}

if (current_page == '/ui/login.html') {
    window.addEventListener('load', function () {

        // If we have a key, redirect to the main page.
        if (key) {
            window.location.href = '/ui/main.html';
        }

        document.getElementById('terms').addEventListener('click', function () {
            chrome.tabs.create({'url': "https://openaccessbutton.org/terms"});
        });

        document.getElementById('privacy').addEventListener('click', function () {
            chrome.tabs.create({'url': "https://openaccessbutton.org/privacy"});
        });

        document.getElementById('acc').addEventListener('click', function () {
            chrome.tabs.create({'url': "https://opendatabutton.org/account"});
        });

        // Handle the register button.
        document.getElementById('signup').addEventListener('click', function () {
            var user_email = get_value('user_email');
            var user_name = get_value('user_name');
            var user_prof = get_value('user_prof');
            var privacy = get_id('privacy_c');
            var terms = get_id('terms_c');

            if (user_email && user_name && user_prof && privacy.checked && terms.checked) {
                var api_request = '/register';
                data = {
                    'email': user_email,
                    'username': user_name,
                    'profession': user_prof
                };
                oab.api_request(api_request, data, 'accounts', process_api_response, handle_api_error);
            } else {
                display_error('You must supply an email address, username and profession to register. You must also agree to our privacy policy and terms by checking the boxes.');
            }
        });

        // Handle the login button.
        document.getElementById('login').addEventListener('click', function () {
            var user_key = get_value('user_key');

            if (user_key) {
                var api_request = '/blocked';
                data = {
                    'api_key': user_key
                };
                oab.api_request(api_request, data, 'accounts', function(){
                    localStorage.setItem('api_key', user_key);
                    window.location.href="login.html";
                }, handle_api_error);
            } else {
                display_error('You must supply an API key to authenticate.');
            }
        });
    });

} else if (current_page == '/ui/main.html' && key) {
    window.addEventListener('load', function () {
        document.getElementById('spin-greybox').style.visibility = 'hidden';
        
        document.getElementById('why').addEventListener('click', function () {
            chrome.tabs.create({'url': "https://opendatabutton.org/why"});
        });

        chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
            // Blocked Event, if we've not already sent a block event.
            var blocked_request = '/blocked';

            active_tab = tabs[0].url;
            status_data = {
                'api_key': key,
                'url': active_tab
            },
                oab.api_request(blocked_request, status_data, 'blocked', process_api_response, handle_api_error);
        });

        $('#story').keyup(function () {
            var left = 85 - $(this).val().length;
            if (left < 0) {
                left = 0;
            }
            $('#counter').text(left);
            var submit_btn = get_id('submit');
            if (left < 85) {
                submit_btn.disabled = false;
            } else {
                submit_btn.disabled = true;
            }
        });
    });

} else {
    window.location.href = 'login.html';
}
