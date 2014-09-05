/*global require, Buffer, console, process */

var http = require("http");
var request = require('request');
var querystring = require('querystring');
var fs = require("fs");
var helpers = require("./lib/helpers");

var doRouting = function (req, res, pathname) {

    // Serve specific static content directly (for the good and bad examples)
    if (pathname.indexOf("/static/") !== -1) {
        switch (pathname) {
            case "/site/http://localhost/static/css/bootstrap.min.css":
            case "/site/http://localhost/static/js/bootstrap.min.js":
            case "/site/http://localhost/static/google-code-prettify/prettify.css":
            case "/site/http://localhost/static/google-code-prettify/prettify.js":
                pathname = pathname.slice(pathname.indexOf("/static/"));
                break;
            default:
        }
    }

    if (pathname.indexOf("/site/") === -1) {
        // Standard, static files
        switch (pathname) {
            case "/favicon.ico":
                // Ignore requests for favicon.ico
                res.writeHead(200, {"Content-Type": "image/png"});
                res.end();
                return false;
            case "/robots.txt":
                helpers.serveFile(res, "static/robots.txt");
                return false;
            case "/":
                // Serve the home page if in site root
                helpers.serveFile(res, "static/index.htm");
                return false;
            case "/static/validator.js":
                helpers.serveFile(res, require("path").join(process.cwd(), "./node_modules/digitaldatavalidator/validator-web.js"));
                return false;
        }

        if (pathname.indexOf("../") !== -1) {
            return helpers.throw500(res);
        }

        pathname = require("path").join(process.cwd(), pathname);

        // Serve file if it exists in local directory
        if (fs.existsSync(pathname)) {
            helpers.serveFile(res, pathname);
        } else {
            helpers.return404(res);
        }
        return false;
    } else {
        // Get url of the requested website
        var site = helpers.getSite(res, pathname);
        if (!site || site === "") {
            console.log("Bad request: " + req.url);
            helpers.throw500(res);
            return false;
        }

        // User is trying to access this site
        if (site.indexOf(req.headers.host) !== -1) {
            switch (req.url) {
                case "/site/http://localhost:8888/static/example_good1.html":
                case "/site/http://localhost:8888/static/example_bad1.html":
                    break;
                default:
                    console.log("Forbidden from proxying self: " + req.url);
                    helpers.throw500(res);
                    return false;
            }
        }
        return site;
    }
};

http.createServer(function (req, res) {
    // Make sure to get any and all POST data
    var postData = "";
    req.on('data', function (chunk) {
        postData += chunk;
    });
    req.on('end', function () {
        var request_function, options;

        try {
            var pathname = helpers.getPathname(req.url);
            console.log("Request for " + pathname + " received.");

            var site = doRouting(req, res, pathname);
            if (!site) {
                return;
            }
            //console.log("Serving " + site + " ...");

            var proxy_host = req.headers.host;
            var proxy_prefix = "http://" + proxy_host + "/site/";
            var proxy_prefix_escaped = proxy_prefix.replace(/\//g, "\\/");

            // Handle headers and cookies
            var request_headers = helpers.getHeaders(req, site);
            //            if (request_headers.cookie) {
            //                console.log("req> "+request_headers.cookie);
            //            }

            var jar = request.jar();
            options = {
                uri: site,
                encoding: null,
                headers: request_headers,
                jar: jar
            };

            // Function to use to make request
            request_function = request;

            // Handle POST data if any
            if (options.headers.method === 'POST') {
                options.body = querystring.stringify(querystring.parse(postData));
                if (options.headers['content-length']) {
                    options.headers['content-length'] = options.body.length;
                }
                request_function = request.post;
            }
        } catch (e) {
            console.log("EXCEPTION occurred while parsing request: " + e);
            return helpers.throw500(res);
        }

        request_function(options, function (err, response, body) {

            // Error checking
            if (err || !response) {//} || !(response.statusCode===200||response.statusCode===302)) {
                console.log(pathname + ": Error in accessing the url.");
                if (err) {
                    console.log(pathname + ": Error: " + err);
                }
                if (!response) {
                    console.log(pathname + ": No response");
                }
                res.writeHead(200, {"Content-Type": "text/plain"});
                res.end("Sorry, could not retrieve page.");
                return;
            }

            if (response.statusCode !== 200) {
                console.log(pathname + ": Status Code: " + response.statusCode);
            }

            site = response.request.href; // Update correct href
            var protocol = response.request.uri.protocol;
            var host = response.request.host;
            var relPath = site.substring(0, site.lastIndexOf("/") + 1);
            var contentType = response.headers["content-type"];

            if (body) {
                try {
                    if (contentType.indexOf('image') === -1) {
                        // Replace urls to point to our domain
                        body = helpers.rewriteUrls(body, protocol, host, relPath, proxy_host, proxy_prefix, proxy_prefix_escaped);
                        // Remove anomalies that might interfere i.e. with iframes
                        body = helpers.fixAnomalies(body);
                    }
                } catch (e) {
                    console.log("EXCEPTION occurred while rewriting urls in target file.");
                }

                // Inject script
                try {
                    // Inject script only on normal html pages
                    // Not on AJAX or POST requests
                    if (contentType.indexOf('html') !== -1 && options.headers.method === 'GET' && ( !options.headers['content-type'] || (options.headers['content-type'].indexOf("json") !== -1 && options.headers['content-type'].indexOf("application") !== -1) )) {
                        body = helpers.injectScript(body);
                    }
                } catch (e) {
                    console.log("EXCEPTION occurred while injecting script.");
                }
            }

            var headers;

            // Headers
            try {
                // Account for capitalized names
                headers = helpers.toLowerCaseKeys(response.headers);

                if (headers.location) {
                    // This will cause redirects
                    headers.location = proxy_prefix + headers.location;
                }
                if (headers.host) {
                    headers.host = proxy_prefix + headers.host;
                }
                if (headers.origin) {
                    headers.origin = proxy_prefix + headers.origin;
                }
                if (headers.referer) {
                    headers.referer = proxy_prefix + headers.referer;
                }
                if (headers['access-control-allow-origin']) {
                    headers['access-control-allow-origin'] = '*';
                }
                // Fix 'content-length' attributes to correct size
                try {
                    if (typeof body === "string") {
                        headers['content-length'] = Buffer.byteLength(body);
                    } else {
                        headers['content-length'] = body.length;
                    }
                } catch (e) {
                    console.log("EXCEPTION occurred while updating content-length in header.");
                }
                // Make sure there is no caching
                headers["cache-control"] = "no-cache, no-store, must-revalidate";
                headers.pragma = "no-cache";
                headers.expires = "0";

                // Make sure cookies are sent so that they are saved
                // (removing expiry information etc so that they are stored as session cookies)
                if (headers['set-cookie'] && typeof headers['set-cookie'] === "object") {
                    for (var i = 0; i < headers['set-cookie'].length; i++) {
                        var lst = headers['set-cookie'][i].indexOf(';');
                        if (lst !== -1) {
                            headers['set-cookie'][i] = headers['set-cookie'][i].slice(0, lst);
                        }
                    }
                }

            } catch (e) {
                console.log("EXCEPTION occurred while processing served headers.");
            }

            // Serve page
            try {
                res.writeHead(response.statusCode, headers);
                res.end(body);
            } catch (e) {
                console.log("EXCEPTION occurred while serving page.");
            }
        });
    });
}).listen(8888, function () {
    console.log("Listening on http://localhost:8888");
});

/*
 Improvements that can be made:
 - Google's JavaScript on its page checks that urls/domains provided within
 the query part of the url matches the actual domain of the current page
 e.g. https://accounts.google.com/ServiceLogin?hl=en&continue=https://www.google.co.uk/
 ^^^^^^^^^^^^^^^^^^^^^^^^^
 => Can change/prepend the domain in the query for the user to see (this has
 to be done on the urls within the body of pages served to the url).
 But need to make sure to remove this changed/prepended domain when request
 goes back to the server.
 */
