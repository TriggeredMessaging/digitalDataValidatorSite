/*global $, console, validator, ga */
/*exported validate */
/*jshint multistr: true */

//$('iframe')[0].contentWindow.digitalData

var currency = {
    "AUD": {"s": "$" },
    "CAD": {"s": "$" },
    "CHF": {"s": "CHF", "p": "a"},
    "EUR": {"s": "€" },
    "GBP": {"s": "£" },
    "NOK": {"s": "kr", "p": "a" },
    "SEK": {"s": "kr", "p": "a" },
    "USD": {"s": "$" },
    "ZAR": {"s": "R" },
    "JPY": {"s": "¥"},
    "RON": {"s": "lei"},
    "SGD": {"s": "$"},
    "AED": {"s": "د.إ"},
    "CNY": {"s": "¥"},
    "RUB": {"s": "руб "},
    "COP": {"s": "$"},
    "CLP": {"s": "$"}
};

var ui = {
    updateUrl: function() {
        try {
            var url = $('iframe#testPage')[0].contentWindow.location.href;
            this.updateUrlTo(url);
        } catch (e) {
            console.log(e);
        }
    },
    updateUrlTo: function(url) {
        try {
            url = String(url);
            if (!url || url === "about:blank") {
                return;
            }

            var url_start_index = url.indexOf('/site/');
            if (url_start_index !== -1) {
                url = url.substring(url_start_index + 6, url.length);
            }

            $('#urlText').val(url);
            window.location.hash = url;
        } catch (e) {
            console.log(e);
        }
    },
    updateTitle: function() {
        try {
            var title = $('iframe#testPage')[0].contentWindow.document.title;
            this.updateTitleTo(title);
        } catch (e) {
            console.log(e);
        }
    },
    updateTitleTo: function(title) {
        try {
            var prefix = "DDL Validator";
            if (title) {
                document.title = prefix + ": " + title;
            } else {
                document.title = prefix;
            }
        } catch (e) {
            console.log(e);
        }
    },
    testPageLoaded: function() {
        try {
            this.updateUrl();
            this.updateTitle();
        } catch (e) {
            console.log(e);
        }
    },
    testPageUnloading: function() {
        try {
            $('#loading').show();
            $('#refresh').hide();
        } catch (e) {
            console.log(e);
        }
    },
    loadHash: function() {
        try {
            var prefix = window.location.protocol + "//" + window.location.host + "/site/";
            var url = window.location.hash;

            if (!url) {
                return;
            }

            $('#main').show();
            $('#splash').hide();

            if (url[0] === '#') {
                url = url.slice(1, url.length);
            }

            try {
                ga('send', 'pageview', {
                    'page': '/site/' + url
                });
            } catch(e) {
            }

            var current_url = String($('iframe#testPage')[0].contentWindow.window.location).trim();

            url = String(prefix + url).trim();
            if (url !== current_url) {
                this.updateUrlTo(url);
                document.getElementById("testPage").src = url;
            }
        } catch (e) {
            console.log(e);
        }
    },
    urlSubmit: function() {
        try {
            // Get url
            var url = $('#urlText').val().trim();

            if (url && url === encodeURI(url)) {
                // Set url
                $('iframe#testPage').attr('src', "/site/" + url);
            } else {
                window.alert("That is not a valid url!");
            }
        } catch (e) {
            console.log(e);
        }
    },
    splashUrlSubmit: function() {
        try {
            var splashUrlTextVal = $('#splashUrlText').val();

            if (splashUrlTextVal === "") {
                return;
            }

            $('#urlText').val(splashUrlTextVal);

            $('#main').show();
            $('#splash').hide();

            $('#urlSubmit').click();

            // Set up the animation (undone in validate() function in validator.js)
            var ddlTestResultsContainer = $('#ddlTestResultsContainer');
            ddlTestResultsContainer.css('left', '-' + ddlTestResultsContainer.outerWidth() + 'px');
            $('#testPageContainer').css('left', '0px');
        } catch (e) {
            console.log(e);
        }
    },
    refresh: function() {
        try {
            var tms = $('iframe#testPage')[0].contentWindow.tms;
            var loading = $('#loading');
            var refresh = $('#refresh');

            if (tms && tms.refresh) {
                loading.show();
                refresh.hide();
                tms.refresh();
            } else {
                $('#ddlTestResults').html("<p>Injected script not found! Probably left proxy.</p>");
            }

            // For user's peace of mind
            if (!loading.is(':visible')) {
                loading.show();
                refresh.hide();
                setTimeout(function () {
                    loading.hide();
                    refresh.show();
                }, 500);
            }
        } catch (e) {
            console.log(e);
        }
    },
    validationResults: function(results) {
        try {
            $('#ddlTestResults').html(results);
        } catch (e) {
            console.log(e);
        }
    },
    splashInit: function() {
        try {
            // If no url was provided upon page load, focus on the url bar
            var splashUrlText = $('#splashUrlText');
            if (splashUrlText.val().length === 0) {
                splashUrlText.focus();
            }
        } catch (e) {
            console.log(e);
        }
    },
    initLeftPaneResizeHandle: function() {
        // Make left pane resizable
        try {
            var self = this;
            $("#ddlTestResultsContainer").resizable({
                handles: "e",
                minWidth: 200,
                maxWidth: 800,
                autoHide: true,
                ghost: true,
                start: function () {
                    $('#testPageEventBlocker').show(); // Stops mouse events hitting the iFrame
                },
                resize: function (event, ui) {
                    $('#testPageContainer').css('left', ui.size.width + 'px');
                },
                stop: function () {
                    $('#testPageContainer').css('left', $("#ddlTestResultsContainer").outerWidth() + 'px');
                    $('#testPageEventBlocker').hide();
                    self.updateLeftPaneResizeHandle();
                    $('#ddlTestResultsContainer').css('height', ''); // Stop height being fixed
                }
            });
        } catch(e) {
            console.log(e);
        }
    },
    updateLeftPaneResizeHandle: function() {
        // Adjust the 'resize' handle to fill left pane
        $('.ui-resizable-handle').css('height', '0px');
        setTimeout(function () {
            $('.ui-resizable-handle').css('height', $('#ddlTestResultsContainer')[0].scrollHeight + 'px');
        }, 300);
    }
};

var validatorResults = {
    emptyObjectsAsArray: function (data) {
        return this.findValueAndConvertResultToArray(data, '_isEmpty');
    },
    missingObjectsAsArray: function (data) {
        return this.findValueAndConvertResultToArray(data, '_isMissing');
    },
    findValueAndConvertResultToArray: function (data, value) {
        var self = this;
        var res = [];
        try {
            if (typeof data[value] !== "undefined" && data[value]) {
                if (typeof data._doc === "string" && data._doc !== "") {
                    return data._doc;
                } else {
                    return true;
                }
            }

            var delegate = function (res, key, val) {
                var sub = self.findValueAndConvertResultToArray(val, value);
                if (sub === true) {
                    res.push(key);
                } else if (typeof sub === 'string') {
                    res.push(key + ': ' + sub);
                } else {
                    for (var k = 0; k < sub.length; k++) {
                        if (typeof val[0] !== "undefined") {// if appended value is an array key
                            res.push(key + sub[k]);
                        } else {
                            res.push(key + '.' + sub[k]);
                        }
                    }
                }
                return res;
            };

            var key, val;

            if ($.isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                    key = '[' + i + ']';
                    val = data[i];
                    res = delegate(res, key, val, true);
                }
            } else if (typeof data === "object") {
                for (key in data) {
                    if(data.hasOwnProperty(key)) {
                        if (key[0] === "_") {
                            continue;
                        }
                        val = data[key];
                        if (!isNaN(key)) {
                            res = delegate(res, '[' + key + ']', val);
                        } else {
                            res = delegate(res, key, val);
                        }
                    }
                }
            }
        } catch (e) {
            console.log(e);
        }
        return res;
    },
    wrongTypesAsArray: function (data) {
        var self = this;
        var res = [];
        try {
            if (typeof data !== "undefined" && data._typeCheck === "failed") {
                return 'Expected ' + data._typeExpected + ', but found ' + data._typeFound;
            }

            var delegate = function (res, key, val) {
                var sub = self.wrongTypesAsArray(val);
                if (typeof sub === 'string') {
                    res.push(key + ': ' + sub);
                } else {
                    for (var k = 0; k < sub.length; k++) {
                        if (typeof val[0] !== "undefined") {// if appended value is an array key
                            res.push(key + sub[k]);
                        } else {
                            res.push(key + '.' + sub[k]);
                        }
                    }
                }
                return res;
            };

            var key, val;

            if ($.isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                    key = '[' + i + ']';
                    val = data[i];
                    res = delegate(res, key, val);
                }
            } else if (typeof data === "object") {
                for (key in data) {
                    if(data.hasOwnProperty(key)) {
                        if (key[0] === "_") {
                            continue;
                        }
                        val = data[key];
                        if (!isNaN(key)) {
                            res = delegate(res, '[' + key + ']', val);
                        } else {
                            res = delegate(res, key, val);
                        }
                    }
                }
            }
        } catch (e) {
            console.log(e);
        }
        return res;
    },
    printArray: function (arr) {
        try {
            if (arr.length === 0) {
                return '';
            }
            var s = '<div><ul>';
            for (var i = 0; i < arr.length; i++) {
                s += '<li>' + arr[i] + '</li>';
            }
            return s + '</ul></div>';
        } catch (e) {
            console.log(e);
        }
    },
    printPanel: function (body, heading_passed_text, heading_failed_text) {
        try {
            var el = 'h5';
            var s;
            if (body) {
                var img_failed = '<span class="glyphicon glyphicon-remove"></span> ';
                var heading_failed = '<' + el + ' class="panel-title">' + img_failed + heading_passed_text + '</' + el + '>';

                s = '<div class="panel panel-danger">\
 <div class="panel-heading">' + heading_failed + '</div>';
                if (body.trim()) {
                    s += '<div class="panel-body">' + body + '</div>';
                }
                s += '</div>';
            } else {
                var img_passed = '<span class="glyphicon glyphicon-ok"></span> ';
                var heading_passed = '<' + el + ' class="panel-title">' + img_passed + heading_failed_text + '</' + el + '>';

                s = '<div class="panel panel-success">\
 <div class="panel-heading">' + heading_passed + '</div>\
 </div>';
            }
            return s;
        } catch (e) {
            console.log(e);
        }
    },
    convertResultToStrings: function (results) {
        // Convert to list of strings
        results.emptyObjectsArray = this.emptyObjectsAsArray(results.emptyObjects);
        results.wrongTypesArray = this.wrongTypesAsArray(results.types);
        results.missingObjectsArray = this.missingObjectsAsArray(results.missingObjects);
        return results;
    },
    format: function (results) {
        try {
            results = this.convertResultToStrings(results);
            var emptyObjects_body = this.printArray(results.emptyObjectsArray);
            var missingObjects_body = this.printArray(results.missingObjectsArray);
            var wrongTypes_body = this.printArray(results.wrongTypesArray);

            var s = '';
            s += this.printPanel(emptyObjects_body, 'Empty objects found', 'No empty objects');
            s += this.printPanel(missingObjects_body, 'Expected objects not found', 'No missing objects');
            s += this.printPanel(wrongTypes_body, 'Incorrectly typed objects found', 'No Incorrectly typed objects');

            if (results.isProductsMissingInCategoryPage) {
                s += this.printPanel(' ', 'Page detected as category page but no products found', '');
            }
            if (results.isProductsMissingInCart) {
                s += this.printPanel(' ', 'Cart items exist but cannot be found', '');
            }

            return s;
        } catch (e) {
            console.log(e);
        }
    }
};

var contents = {
    unCamelCase: function (s) {
        s = s.replace(/([a-z])([A-Z0-9])/g, "$1 $2");
        s = s[0].toUpperCase() + s.slice(1);
        return s;
    },
    objectToList: function (obj, currentKey) {
        try {
            var s, ul='', li, key, val;
            if (typeof obj === "object") {
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        val = obj[key];
                        li = '<strong>' + this.unCamelCase(key) + ':</strong> ';
                        li += this.objectToList(val, key);
                        ul += '<li>'+li+'</li>';
                    }
                }
                s = '<ul>'+ul+'</ul>';
            } else {
                // Escape HTML entities
                s = $('<div />').html(String(obj)).text();
                // Add places where extra line breaks can occur
                s = s.replace(/([\-\.\\\/])/g, '<wbr>$1<wbr>').replace(/([0-9])([a-z])/gi, '$1<wbr>$2');

                switch(currentKey){
                    case "productURL":
                    case "destinationURL":
                        s = '<span><a href="'+obj+'" target="_blank">' + s + '</a></span>';
                        break;
                    case "productImage":
                    case "productThumbnail":
                        s = '<span><a href="'+obj+'" target="_blank"><img src="'+obj+'" class="detailsimage""/></a><br><a href="'+obj+'" target="_blank">' + s + '</a></span>';
                        break;
                    default:
                        s = '<span>' + s + '</span>';
                }
            }
            return s;
        } catch(e) {
            console.log(e);
        }
    },
    getPrice: function (price, curr) {
        try {
            if (isNaN(price)) {
                return "";
            } else {
                price = Number(price).toFixed(2);
            }
            if (typeof currency === "object") {
                var currCode = currency[curr];
                if (typeof currCode === "object") {
                    if (currCode.a) {
                        price = price + currCode.s;
                    } else {
                        price = currCode.s + price;
                    }
                }
            }
            return price;
        } catch (e) {
            console.log(e);
        }
    },
    printInfoPanel: function (body, heading, id) {
        try {
            var el = 'h5';
            var panel = '<div class="panel-heading"><' + el + ' class="panel-title">'+heading+'</' + el + '></div>';
            if (body) {
                panel += '<div class="panel-body">' + body + '</div>';
            }
            panel = '<div class="panel panel-info">'+panel+'</div>';
            if (id) {
                panel = panel.replace('<div', '<div id="'+id+'"');
            }
            return panel;
        } catch(e) {
            console.log(e);
        }
    },
    makeNestedDataCollapsible: function () {
        try {
            var ul, parent, link = '<button type="button" class="btn btn-default btn-xs"><small>More</small></button>';
            $('.nestedDataContainer').each(function(i, element){
                element = $(element);

                var showMoreContainer = element.find('.nestedDataShowMoreContainer').first();
                var list = element.find('.nestedData').first();

                // Make list items collapsible
                list.find('li').each(function(i, li){
                    li = $(li);
                    ul = li.find('ul');
                    if (ul.size()===0) {
                        return;
                    }
                    parent = li.find('> strong').first();
                    parent.html('&plusmn; <a>'+parent.html()+'</a>');
                    parent.click(function(){
                        var ul = $(this).next('ul');
                        if (ul.length) {
                            ul.slideToggle();
                        }
                    });
                });

                // Add 'Show more' link and toggle list with that
                if (showMoreContainer.hasClass('panel-heading')) {
                    showMoreContainer.prepend(link.replace('class="', 'class="pull-right '));
                } else {
                    showMoreContainer.append(link);
                }
                var button = showMoreContainer.find('button').first();
                button.click(function(){
                    list.slideToggle(function() {
                        $(button).find('small').text($(this).is(':hidden')? 'More' : 'Less');
                    });
                });

                // List should be hidden upon page load
                if (showMoreContainer.length) {
                    list.hide();
                }
            });
        } catch(e) {
            console.log(e);
        }
    },
    printProduct: function(product) {
        try {
            var curr = product.price.currency || '';
            var name = product.productInfo.productName || '';
            var url = product.productInfo.productURL || '';
            var img_tn = product.productInfo.productThumbnail || product.productInfo.productImage || '';
            var img = product.productInfo.productImage || '';
            var price = contents.getPrice(product.price.basePrice || product.price.priceWithTax, curr);

            // Price
            var priceHtml = '<td class="priceCell nestedDataShowMoreContainer"><div class="price">' + price + '</div></td>';
            // Name
            var nameHtml = '<strong>' + name + '</strong>';
            if (url) {
                nameHtml = '<a href="javascript:ui.updateUrlTo(\'' + url + '\');">' + nameHtml + '</a>';
            }
            nameHtml = '<td class="nameCell">' + nameHtml + '</td>';
            // Image
            var imageHtml = '<img src="' + img_tn + '" />';
            if (img) {
                imageHtml = '<a href="' + img + '" target="_blank">' + imageHtml + '</a>';
            }
            imageHtml = '<td class="imageCell">' + imageHtml + '</td>';
            // Row containing the main details of the product
            var productSummaryRow = '<tr>' + imageHtml + nameHtml + priceHtml + '</tr>';

            // Full product details
            var productDetailsRow = this.objectToList(product);
            productDetailsRow = '<div class="nestedData">'+productDetailsRow+'</div>';
            productDetailsRow = '<tr><td class="productDetails" colspan="3">' + productDetailsRow + '</td></tr>';

            var tableProduct = '<table class="product nestedDataContainer"><tbody>' + productSummaryRow + productDetailsRow + '</tbody></table>';
            return '<tr><td>' + tableProduct + '</td></tr>';
        } catch(e) {
            console.log(e);
        }
    },
    printProducts: function (products) {
        try {
            if (!products || !products.length) {
                return "";
            }

            var prods = '';
            for (var i = 0; i < products.length; i++) {
                prods += this.printProduct(products[i]);
            }
            if (prods) {
                prods = '<table class="products"><tbody>'+prods+'</tbody></table>';
            }

            return prods;
        } catch (e) {
            console.log(e);
        }
    },
    printProductsList: function (digitalData) {
        try {
            if (!digitalData || !digitalData.product || !digitalData.product.length) {
                return "";
            }

            var prods = this.printProducts(digitalData.product);

            return this.printInfoPanel(prods, 'Products', 'productsFound');
        } catch (e) {
            console.log(e);
        }
    },
    printCartProducts: function (digitalData) {
        try {
            if (!digitalData || !digitalData.cart || !digitalData.cart.price) {
                return "";
            }

            var totals = '', prods = '';

            var cartCurr = digitalData.cart.price.currency || "";
            var basePrice = contents.getPrice(digitalData.cart.price.basePrice, cartCurr);
            var priceWithTax = contents.getPrice(digitalData.cart.price.priceWithTax, cartCurr);
            var cartTotal = contents.getPrice(digitalData.cart.price.cartTotal, cartCurr);

            if (basePrice) {
                totals += '<div><strong>Subtotal:</strong> ' + basePrice + '</div>';
            }
            if (priceWithTax) {
                totals += '<div><strong>Subtotal inc. tax:</strong> ' + priceWithTax + '</div>';
            }
            if (cartTotal) {
                totals += '<div><strong>Total:</strong> ' + cartTotal + '</div>';
            }
            if (totals) {
                totals = '<div>' + totals + '</div>';
            }

            if (digitalData.cart.items && digitalData.cart.items.length) {
                prods = this.printProducts(digitalData.cart.items);
            }

            if (totals || prods) {
                return this.printInfoPanel(totals+prods, 'Cart', 'cartItemsFound');
            }

            return '';
        } catch (e) {
            console.log(e);
        }
    },
    print: function (digitalData) {
        try {
            var ddlInfo = "", ddlContents = "";

            ddlInfo += contents.printPageInfo(digitalData);
            ddlInfo += contents.printUserInfo(digitalData);
            $('#ddlInfo').html(ddlInfo);

            ddlContents += contents.printProductsList(digitalData);
            ddlContents += contents.printCartProducts(digitalData);
            $('#ddlContents').html(ddlContents);

            this.makeNestedDataCollapsible();
        } catch (e) {
            console.log(e);
        }
    },
    printPageInfo: function (digitalData) {
        try {
            if (!digitalData || !digitalData.page) {
                return "";
            }

            var heading = 'Page Info';
            if (digitalData.page.category && digitalData.page.category.pageType) {
                var page_type = digitalData.page.category.pageType || "";
                page_type = String(page_type).trim();
                page_type = page_type.charAt(0).toUpperCase() + page_type.substring(1); // Capitalise first letter
                heading = 'Page: ' + page_type;
            }

            var info = this.objectToList(digitalData.page);
            var panel = this.printInfoPanel(info, heading, 'pageInfo');
            panel = panel.replace('class="panel panel-info"', 'class="panel panel-info nestedDataContainer"');
            panel = panel.replace('class="panel-heading"', 'class="panel-heading nestedDataShowMoreContainer"');
            panel = panel.replace('class="panel-body"', 'class="panel-body nestedData"');

            return panel;
        } catch (e) {
            console.log(e);
        }
    },
    printUserInfo: function (digitalData) {
        try {
            if (!digitalData || !digitalData.user) {
                return "";
            }

            var info = this.objectToList(digitalData.user);
            info = '<div class="nestedData">'+info+'</div>';

            // If user's email exists
            var emailDiv = 'None';
            if (digitalData.user.profile &&
                digitalData.user.profile[0] &&
                digitalData.user.profile[0].profileInfo &&
                digitalData.user.profile[0].profileInfo.email) {
                emailDiv = digitalData.user.profile[0].profileInfo.email;
            }
            emailDiv = '<div><strong>User\'s Email:</strong> '+emailDiv+'</div>';
            info = emailDiv+info;

            var panel = this.printInfoPanel(info, 'User Info', 'userInfo');
            panel = panel.replace('class="panel panel-info"', 'class="panel panel-info nestedDataContainer"');
            panel = panel.replace('class="panel-heading"', 'class="panel-heading nestedDataShowMoreContainer"');

            return panel;
        } catch (e) {
            console.log(e);
        }
    }
};

var validate = function (digitalData) {
    try {
        $('#loading').hide();
        $('#refresh').show();

        // Animate for a nice visual effect (only needed immediately after splash has vanished)
        var ddlTestResultsContainer = $('#ddlTestResultsContainer');
        ddlTestResultsContainer.animate({
            left: "0px"
        });
        $('#testPageContainer').animate({
            left: ddlTestResultsContainer.outerWidth() + 'px'
        });

        if (!digitalData) {
            ui.validationResults("<p>Digital Data Layer not detected.</p>");
            contents.print(null);
            return;
        }

        var results = validator.run(digitalData);
//        console.log(JSON.stringify(digitalData));
//        console.log(JSON.stringify(results));

        // Print
        ui.validationResults(validatorResults.format(results));
        contents.print(digitalData);

        ui.updateLeftPaneResizeHandle();
    } catch (e) {
        console.log(e);
    }
};

$(document).ready(function () {
    try {
        // Preload the iframe with site if an url was given
        ui.loadHash();

        /* Attach code to events */

        $('#urlForm').submit(function (event) {
            event.preventDefault();
        });

        $('#urlSubmit').click(ui.urlSubmit);
        $('#splashUrlSubmit').click(ui.splashUrlSubmit);

        $('#refresh').click(ui.refresh);

        window.addEventListener("hashchange", ui.loadHash.bind(ui));

        ui.splashInit();

        ui.initLeftPaneResizeHandle();
    } catch (e) {
        console.log(e);
    }
});
