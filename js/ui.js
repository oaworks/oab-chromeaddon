var current_page = location.pathname;
var key = localStorage.getItem('api_key');

// These listeners are active on all pages
window.addEventListener('load', function () {
    document.getElementById('bug').addEventListener('click', function () {
        chrome.tabs.create({'url': "http:/openaccessbutton.org/chrome/bug"});
    });
    document.getElementById('help').addEventListener('click', function () {
        chrome.tabs.create({'url': "http:/openaccessbutton.org/chrome/help"});
    });
    document.getElementById('privacy').addEventListener('click', function () {
        if (current_page == '/ui/login.html') {
            chrome.tabs.create({'url': "http://openaccessbutton.org/privacy"});
        } else {
            chrome.tabs.create({'url': "http://openaccessbutton.org/user/" + localStorage.getItem('username')});
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
        var opts = {timeout: 10000};        // 10 sec timeout
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat_lon = {geo: {lat: position.coords.latitude, lon: position.coords.longitude}};
            callback(lat_lon)
        }, function () {
            // Can't get location (permission denied or timed out)
            callback(null)
        }, opts);
    } else {
        // Browser does not support location
        callback(null)
    }
}

function display_error(warning) {
    var warn_div = get_id('error');
    warn_div.innerHTML = '<div class="alert alert-danger" role="alert">' + warning + '</div>';
}

function store_article_info(title, doi, author, journal) {
    localStorage.setItem('title', title);
    localStorage.setItem('doi', doi);
    localStorage.setItem('author', author);
    localStorage.setItem('journal', journal);
}

function handle_data(data) {
    var api_div = get_id('api_content');
    var blocked = data.blocked;
    var wishlist = data.wishlist;

    if (data.contentmine.hasOwnProperty('errors')) {
        // Try to scrape DC.
        chrome.runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
                var doc = (new DOMParser()).parseFromString(request.content, "text/html");
                var meta = doc.getElementsByTagName('meta');
                var title = oab.return_title(meta);
                var doi = oab.return_doi(meta);
                var author = oab.return_authors(meta);
                var journal = oab.return_journal(meta);
                store_article_info(title, doi, author, journal);

                var block_request = '/blocked/' + localStorage.getItem('blocked_id');
                var data = JSON.stringify({             // This is best-case (assume getting all info) for now.
                    'api_key': key,
                    'url': localStorage.getItem('active_tab'),
                    'metadata': {
                        'title': title,
                        'author': author,
                        'journal': journal,
                        'identifier': [{'type': 'doi', 'id': doi}]
                    }
                });
                oab.api_request(block_request, data, 'blockpost', process_api_response, handle_api_error);

                if (title) {
                    api_div.innerHTML = '<h5 class="title-emph">' + title + '</h5><h5>Links</h5><p><a target="_blank" href="http://scholar.google.co.uk/scholar?hl=en&q=' + encodeURI(title) + '">Google Scholar</a></p><h5>Related papers</h5><p>No results available.</p><h5>Additional info</h5><ul><li>Blocked:' + blocked + '</li>' + '<li>Wishlist: ' + wishlist + '</li></ul>';
                } else {
                    api_div.innerHTML = '<div class="alert alert-danger" role="alert"><p><strong>Error</strong> Are you sure this is an article page?</p>';
                }
            });

        var tab_id = parseInt(localStorage.getItem('tab_id'), 10);
        // Now inject a script onto the page
        chrome.tabs.executeScript(tab_id, {
            code: "chrome.runtime.sendMessage({content: document.head.innerHTML}, function(response) { console.log('success'); });"
        }, function () {
            console.log('done');
        });

    } else {
        var core_text;
        if (data.hasOwnProperty('core') && data.core.hasOwnProperty('url')) {
            core_text = '<a target="_blank" href="' + data.core.url + '">' + data.core.title + '</a>';
        } else {
            core_text = 'No results available';
        }
        if (data.contentmine.metadata.hasOwnProperty('title')) {
            api_div.innerHTML = '<h5>' + data.contentmine.metadata['title'] + '</h5><h5>Links</h5><p><a target="_blank" href="http://scholar.google.co.uk/scholar?hl=en&q=' + encodeURI(data.contentmine.metadata['title']) + '">Google Scholar</a></p><h5>Related papers</h5><p>' + core_text + '</p><h5>Additional info</h5><ul><li>Blocked:' + data.blocked + '</li>' + '<li>Wishlist: ' + data.wishlist + '</li></ul>';
        } else {
            api_div.innerHTML = '<h5>Links</h5><p>No results available.</p><h5>Related papers</h5><p>No results available.</p><h5>Additional info</h5><ul><li>Blocked: ' + data.blocked + '</li>' + '<li>Wishlist: ' + data.wishlist + '</li></ul>';
        }
        display_metadata(data.contentmine.metadata);
    }
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
        }
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
        url: localStorage.getItem('active_tab'),
        story: story_text
    };
    // Add author email if provided so oabutton can email them //todo: parse from page & populate field
    var given_auth_email = get_value('auth_email');
    if (given_auth_email) {
        data['email'] = [given_auth_email]
    }

    // Add location data to story if possible
    get_loc(function (pos_obj) {
        if (pos_obj) {
            data['location'] = pos_obj;
        }
        oab.api_request(block_request, JSON.stringify(data), 'blockpost', process_api_response, handle_api_error);
        callback()
    });
}

function display_metadata(metadata) {
    var start = '<h5>Meta Data</h5><div class="collapse">';
    var end = '</p>';
    var meta_div = get_id('meta-div');
    var meta_content = '';
    for (var key in metadata) {
        if (metadata.hasOwnProperty(key)) {
            meta_content += '<p><strong>' + key + '</strong>: ' + JSON.stringify(metadata[key]) + '</div>';
        }
    }
    meta_div.innerHTML = start + meta_content + end;
}

function process_api_response(data, requestor) {
    if (requestor == 'accounts') {
        localStorage.setItem('api_key', data.api_key);
        localStorage.setItem('username', get_value('user_email'));
        window.location.href = 'login.html'
    } else if (requestor == 'status') {
        handle_data(data);
    } else if (requestor == 'blocked') {
        localStorage.setItem('blocked_id', data.id);

        // Get URL Status
        var status_request = '/status';
        status_data = JSON.stringify({
            'api_key': key,
            'url': localStorage.getItem('active_tab')
        }),
            oab.api_request(status_request, status_data, 'status', process_api_response, handle_api_error);

    } else if (requestor == 'wishlist') {
        window.location.href = 'failure.html';
    }
}

if (current_page == '/ui/login.html') {
    window.addEventListener('load', function () {

        // If we have a key, redirect to the main page.
        if (key) {
            window.location.href = '/ui/main.html';
        }

        document.getElementById('terms').addEventListener('click', function () {
            chrome.tabs.create({'url': "http:/openaccessbutton.org/terms"});
        });

        // Handle the register button.
        document.getElementById('signup').addEventListener('click', function () {
            var user_email = get_value('user_email');
            var user_password = get_value('user_password');
            var user_name = get_value('user_name');
            var user_prof = get_value('user_prof');
            var privacy = get_id('privacy_c');
            var terms = get_id('terms_c');

            if (user_email && user_password && user_name && user_prof && privacy.checked && terms.checked) {
                var api_request = '/register';
                data = JSON.stringify({
                    'email': user_email,
                    'password': user_password,
                    'username': user_name,
                    'profession': user_prof
                });
                oab.api_request(api_request, data, 'accounts', process_api_response, handle_api_error);
            } else {
                display_error('You must supply an email address, password, username and profession to register. You must also agree to our privacy policy and terms by checking the boxes.');
            }
        });

        // Handle the login button.
        document.getElementById('login').addEventListener('click', function () {
            var user_email = get_value('user_email');
            var user_password = get_value('user_password');

            if (user_email && user_password) {
                var api_request = '/retrieve';
                data = JSON.stringify({
                    'email': user_email,
                    'password': user_password
                });
                oab.api_request(api_request, data, 'accounts', process_api_response, handle_api_error);
            } else {
                display_error('error', 'You must supply an email address and a password to login or register.');
            }
        });

        // Handle forgot button
        document.getElementById('forgot').addEventListener('click', function () {
            window.open("http://openaccessbutton.org/chrome/forgot_password");
        });
    });

} else if (current_page == '/ui/main.html' && key) {
    window.addEventListener('load', function () {
        document.getElementById('spin-greybox').style.visibility = 'hidden';

        document.getElementById('meta-collapse').addEventListener('click', function () {
            var $this = $(this);
            var $collapse = $this.closest('.collapse-group').find('.collapse');
            $collapse.collapse('toggle');
        });

        document.getElementById('email_auth_check').addEventListener('change', function () {
            if (this.checked){
                $('#auth_email').collapse('show')
            } else {
                $('#auth_email').collapse('hide')
            }
        });

        document.getElementById('success').addEventListener('click', function () {
            document.getElementById('spin-greybox').style.visibility = 'visible';
            post_block_event(localStorage.getItem('blocked_id'), function () {
                window.location.href = 'success.html';
            });
        });

        document.getElementById('failure').addEventListener('click', function () {
            document.getElementById('spin-greybox').style.visibility = 'visible';
            post_block_event(localStorage.getItem('blocked_id'), function () {
                var request = '/wishlist';
                data = JSON.stringify({
                    'api_key': key,
                    'url': localStorage.getItem('active_tab')
                }),
                    oab.api_request(request, data, 'wishlist', process_api_response, handle_api_error);
            });
        });

        document.getElementById('why').addEventListener('click', function () {
            chrome.tabs.create({'url': "http://openaccessbutton.org/chrome/why"});
        });

        if (!localStorage.getItem('blocked_id')) {
            // Blocked Event, if we've not already sent a block event.
            var blocked_request = '/blocked';
            status_data = JSON.stringify({
                'api_key': key,
                'url': localStorage.getItem('active_tab')
            }),
                oab.api_request(blocked_request, status_data, 'blocked', process_api_response, handle_api_error);
        } else {
            // Get URL Status
            var status_request = '/status';
            status_data = JSON.stringify({
                'api_key': key,
                'url': localStorage.getItem('active_tab')
            }),
                oab.api_request(status_request, status_data, 'status', process_api_response, handle_api_error);
        }

        $('#story').keyup(function () {
            var left = 85 - $(this).val().length;
            if (left < 0) {
                left = 0;
            }
            $('#counter').text(left);
            var failure = get_id('failure');
            if (left < 85) {
                failure.disabled = false;
            } else {
                failure.disabled = true;
            }
        });
    });

} else if (current_page == '/ui/success.html' && key) {
    var link = serviceaddress + '/story/' + localStorage.getItem('blocked_id');
    document.getElementById('fb').addEventListener('click', function () {
        chrome.tabs.create({'url': "https://www.facebook.com/sharer/sharer.php?u=" + link});
    });
    document.getElementById('tw').addEventListener('click', function () {
        chrome.tabs.create({'url': "https://twitter.com/intent/tweet?text=See%20what%20I%E2%80%99d%20do%20with%20access%20to%20this%20research%20paper%20at%20" + link + "%20via%20%40oa_button.&source=webclient"});
    });
    document.getElementById('gp').addEventListener('click', function () {
        chrome.tabs.create({'url': "https://plus.google.com/share?url=" + link});
    });
} else if (current_page == '/ui/failure.html' && key) {
    var link = serviceaddress + '/story/' + localStorage.getItem('blocked_id');
    document.getElementById('fb').addEventListener('click', function () {
        chrome.tabs.create({'url': "https://www.facebook.com/sharer/sharer.php?u=" + link});
    });
    document.getElementById('tw').addEventListener('click', function () {
        chrome.tabs.create({'url': "https://twitter.com/intent/tweet?text=See%20what%20I%E2%80%99d%20do%20with%20access%20to%20this%20research%20paper%20at%20" + link + "%20via%20%40oa_button.&source=webclient"});
    });
    document.getElementById('gp').addEventListener('click', function () {
        chrome.tabs.create({'url': "https://plus.google.com/share?url=" + link});
    });
} else {
    window.location.href = 'login.html';
}
