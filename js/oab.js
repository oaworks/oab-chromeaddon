var apiaddress = 'https://api.opendatabutton.org';
var siteaddress = "https://opendatabutton.org";

var oab = {
    ///////////////////////////////////
    // Using the oab api
    ///////////////////////////////////

    // Tell the API which plugin version is in use for each POST
    plugin_version_sign: function(pdata) {
        var manifest = chrome.runtime.getManifest();
        return $.extend(pdata, { plugin: manifest['version_name'] } );
    },

    api_request: function(request_type, data, requestor, success_callback, failure_callback) {
        $.ajax({
            'type': 'POST',
            'url': apiaddress + request_type,
            'contentType': 'application/json; charset=utf-8',
            'dataType': 'JSON',
            'processData': false,
            'cache': false,
            'data': JSON.stringify(this.plugin_version_sign(data)),
            'success': function(data){
                success_callback(data['data'], requestor)
            },
            'error': function(data){
                failure_callback(data)
            }
        });
        console.log(request_type + JSON.stringify(data));
    },

    ///////////////////////////////////
    // Functions for extracting content
    ///////////////////////////////////
    return_title: function(metas) {
        for (i=0; i<metas.length; i++) {
            if (metas[i].getAttribute("name") == "citation_title") {
                return metas[i].getAttribute("content");
            }
        }
    },

    return_doi: function(metas) {
        for (i=0; i<metas.length; i++) {
            if (metas[i].getAttribute("name") == "citation_doi") {
                return metas[i].getAttribute("content");
            }
        }
    },

    return_authors: function(metas) {
        var authors = [];
        for (i=0; i<metas.length; i++) {
            if (metas[i].getAttribute("name") == "citation_author") {
                var authname = metas[i].getAttribute("content");
                authors.push( { name: authname } );
            }
        }
        return authors;
    },

    return_author_email: function(metas) {
        var authors = [];
        for (i=0; i<metas.length; i++) {
            if (metas[i].getAttribute("name") == "citation_author_email") {
                var email = metas[i].getAttribute("content");
                authors.push(email);
            }
        }
        return authors;
    },

    return_journal: function(metas) {
        for (i=0; i<metas.length; i++) {
            if (metas[i].getAttribute("name") == "citation_journal_title") {
                var jtitle = metas[i].getAttribute("content");
                return { name: jtitle }
            }
        }
    },

    scrape_emails: function() {
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
};