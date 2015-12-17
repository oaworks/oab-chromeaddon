var serviceaddress = 'https://openaccessbutton.org';
var apiaddress = serviceaddress + '/api';

var oab = {
    ///////////////////////////////////
    // Using the oab api
    ///////////////////////////////////
    api_request: function(request_type, data, requestor, success_callback, failure_callback) {
        $.ajax({
            'type': 'POST',
            'url': apiaddress + request_type,
            'contentType': 'application/json; charset=utf-8',
            'dataType': 'JSON',
            'processData': false,
            'cache': false,
            'data': data,
            'success': function(data){
                success_callback(data, requestor)
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
                authors.push(metas[i].getAttribute("content"));
            }
        }
        return authors;
    },

    return_journal: function(metas) {
        for (i=0; i<metas.length; i++) {
            if (metas[i].getAttribute("name") == "citation_journal_title") {
                return metas[i].getAttribute("content");
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