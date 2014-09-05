/*global require, module, console */

var url = require('url');
var fs = require('fs');

var exports = {
    throw500: function (res) {
        if(!res._header) {
            res.writeHead(500);
        }
        res.end();
    },
    return404: function (res) {
        if(!res._header) {
            res.writeHead(404);
        }
        res.end();
    },
    getPathname: function (uri) {
        var pathname = url.parse(uri).pathname;

        if(url.parse(uri).search) {
            pathname += url.parse(uri).search;
        }

        return pathname;
    },
    serveFile: function (res, filename) {
        var contentType = "text/html";
        if(filename.indexOf(".css") !== -1) {
            contentType = "text/css";
        } else if(filename.indexOf(".js") !== -1) {
            contentType = "application/javascript";
        } else if(filename.indexOf(".gif") !== -1) {
            contentType = "image/gif";
        } else if(filename.indexOf(".jpg") !== -1) {
            contentType = "image/jpeg";
        } else if(filename.indexOf(".png") !== -1) {
            contentType = "image/png";
        } else if(filename.indexOf(".woff") !== -1) {
            contentType = "application/x-font-woff";
        } else if(filename.indexOf(".txt") !== -1) {
            contentType = "text/plain";
        }

        res.writeHead(200, {"Content-Type": contentType});

        var fileStream = fs.createReadStream(filename);
        fileStream.on('error', function () {
            console.log("There was an error with serving " + filename);
            res.writeHead(500);
            res.end();
        });
        fileStream.on('end', function () {
            res.end();
        });
        fileStream.pipe(res);
    },
    getSite: function (res, pathname) {
        // Get url of the requested website
        var site;

        if(pathname.indexOf("/site/") === 0 && pathname.length > 6) {
            site = pathname.substring(6, pathname.length);

            if(site.indexOf("://") === -1) {
                site = "http://" + site;
            }
        } else {
            // Don't entertain bad requests
            res.writeHead(200, {"Content-Type": "text/plain"});
            res.end();
            return "";
        }

        // if in in root url, make sure it ends in a slash
        // i.e. http://google.com => http://google.com/
        if(site.indexOf('/', site.indexOf('://') + 3) === -1) {
            site += '/';
        }

        return site;
    },
    getHeaders: function (req, site) {
        var host = site.substring(site.indexOf('/') + 2, site.indexOf('/', site.indexOf('/') + 2));

        var headers = {};
        var _headers = exports.toLowerCaseKeys(req.headers);
        headers.host = host;
        if(_headers.origin) {
            headers.origin = host;
        }

        headers.method = req.method;

        if(_headers.referer) {
            var r = _headers.referer;
            if(r.indexOf('/site/') !== -1) {
                r = r.slice(r.indexOf('/site/') + 6, r.length);
                if(r !== "") {
                    headers.referer = r;
                }
            }
        }

        if(_headers.cookie) {
            headers.cookie = _headers.cookie;
        }
        if(_headers['content-type']) {
            headers['content-type'] = _headers['content-type'];
        }
        if(_headers['content-length']) {
            headers['content-length'] = _headers['content-length'];
        }
        if(_headers['user-agent']) {
            headers['user-agent'] = _headers['user-agent'];
        }
        if(_headers.accept) {
            headers.accept = _headers.accept;
        }
        if(_headers['accept-language']) {
            headers['accept-language'] = _headers['accept-language'];
        }
        if(_headers.connection) {
            headers.connection = _headers.connection;
        }
        if(_headers.authorization) {
            headers.authorization = _headers.authorization;
            console.log(JSON.stringify(headers));
        }

        if(headers.location) {
            console.log("location given in header: " + headers.location);
        }

        return headers;
    },
    rewriteUrls: function (body, protocol, host, relPath, proxy_host, proxy_prefix, proxy_prefix_escaped) {
        body = String(body);
        body = body
            .replace(/(href|src|url|action|location)\s*(=|\()\s*('|"|)\s*\/\//g, "$1$2$3" + "http://") // "//" => "http://"
            .replace(/(href|src|url|action|location)\s*(=|\()\s*('|"|)\s*http/g, "$1$2$3" + proxy_prefix + "http")// "http" => ".../site/http"
            .replace(/(href|src|url|action|location)\s*(=|\()\s*('|"|)\/([A-Za-z0-9\/\"\'])/g, "$1$2$3" + proxy_prefix + protocol + "//" + host + "/$4")// "/" needs absolute url
            // Shouldn't match: ,$href=/^#\w/.test(href
            .replace(/(href|src|url|action|location)\s*(=|\()\s*('|"|)^((?!http).)/g, "$1$2$3" + proxy_prefix + relPath) // otherwise relative url
        ;

        // replace escaped strings too (e.g. in YouTube)
        var regex1 = new RegExp(':\\s*("|\')http(s|):\\/\\/(?!'+proxy_host+')', 'g');
        var regex2 = new RegExp('("|\')http(s|):\\/\\/(?!'+proxy_host+')', 'g');
        body = body
            .replace(regex1, ': $1' + proxy_prefix_escaped + "http$2://") // ': "http://'
            .replace(regex2, '$1' + proxy_prefix + "http$2://") // '"http://'
        ;

        try {
            // Replace target="..." links so that page does not navigate away from iframe
            body = body.replace(/\s+target\s*=\s*['"][^'"]+['"]/g, ' ');

            //        if (targets && targets.length!==0) {
            //            console.log(body.slice(targets.index, targets.index+30));
            //            console.log("PAGE CONTAINS A 'target=' LINK ! ::: "+relPath);
            //        }
        } catch(e) {
            console.log("EXCEPTION occurred while replacing target='...' links");
        }

        return body;
    },
    /*
    getScriptStartPos: function (body) {
        // If script should be run before all other scripts
        var start_pos = body.indexOf('<script'); // Find first <script> tag
        if(start_pos === -1) {
            start_pos = body.indexOf('</head>'); // Find closing </head> tag
        }
        if(start_pos === -1) {
            start_pos = body.indexOf('<body'); // Find <body> tag
        }
        if(start_pos === -1) {
            var matches = /<head/i.exec(body); // Find <head> tag

            if(matches && matches.length !== 0) {
                start_pos = matches.index;
                start_pos = body.indexOf('>', start_pos) + 1;
            }
        }
        if(start_pos === -1) {
            start_pos = 0;
        }

        return start_pos;
    },
    //*/
    getScriptEndPos: function (body) {
        // If script should be run before all other scripts
        var start_pos = body.lastIndexOf('</script>'); // Find last </script> tag
        if(start_pos !== -1) {
            start_pos += 9;
        }

        if(start_pos === -1) {
            start_pos = body.indexOf('</head>'); // Find closing </head> tag
        }
        if(start_pos === -1) {
            start_pos = body.indexOf('</body>'); // Find closing </body> tag
        }
        if(start_pos === -1) {
            start_pos = body.indexOf('</html>'); // Find closing </html> tag
        }
        if(start_pos === -1) {
            start_pos = body.length;
        }

        return start_pos;
    },
    injectScriptAt: function (body, script, pos) {

        body = body.slice(0, pos) + script + body.slice(pos, body.length);

        return body;
    },
    injectScript: function (body) {
        if(typeof body !== "string") {
            return body;
        }

        var script = fs.readFileSync("static/inject.js", 'utf8');
        script = "<script>" + script + "</script>";

        var pos = exports.getScriptEndPos(body);

        body = exports.injectScriptAt(body, script, pos);
        return body;
    },
    toLowerCaseKeys: function (obj) {
        var key, keys = Object.keys(obj);
        var n = keys.length;
        var newobj = {};
        while(n--) {
            key = keys[n];
            newobj[key.toLowerCase()] = obj[key];
        }
        return newobj;
    },
    fixAnomalies: function (body) {
        if(typeof body !== "string") {
            return body;
        }

        body = body.replace(/window\.top/g, 'window');
        body = body.replace(/window\.parent/g, 'window');

        return body;
    }

};

module.exports = exports;