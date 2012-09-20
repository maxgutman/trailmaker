String.prototype.startsWith = function(str) {
    return ( str === this.substr( 0, str.length ) );
}

$(function() {
    // Define variables
    var username = $('#username'),
        login = $('#login'),
        password = $('#password'),
        loginBox = $('#login-box'),
        addUserBox = $('#add-user-box'),
        delicious = {},
        trails = {},
        bookmarks = {};

    Memex = {
        // initialize event handler: clicks and keypress
        init: function() {
            // Login a user and display his trails
            loginBox.submit(function(e) {
                delicious.username = login.val();
                delicious.password = password.val(); // Not secure!
                Memex.addTrails(login.val());
                loginBox.hide();
                addUserBox.show();
                return false;
            });
            // Display trails from other users
            addUserBox.submit(function(e) {
                Memex.addTrails(username.val());
                return false;
            });
		    // When users click on a link, open it in a new window
		    $('a.bookmarks').live('click', function() {
		        window.open($(this).attr('href'));
	            return false;
		    });
		    // Clicking on a trail should display its bookmarks
            $('.trail').live('click', function() {
                Memex.addBookmarks($(this).data('user'), $(this).data('tag'));
             });
        },
        // Fetch and render trails for a single user
        addTrails: function(user) {
            var url = 'http://feeds.delicious.com/v2/json/tags/' + user + '?callback=?';
            $.getJSON(url, function(json){
                trails[user] = json;
                Memex.renderTrails();
            });
        },
        // Fetch and render bookmarks for a single user and trail (tag)
        addBookmarks: function(user, tag) {
            var url = 'http://feeds.delicious.com/v2/json/' + user + '/' + tag + '?callback=?';
            $.getJSON(url, function(json){
                bookmarks[user] = json;
                Memex.renderBookmarks();
            });
        },
        // URL hack to load the icon for each bookmark
        favicon: function(url) {
            src = url.split('/').splice(0, 3).join('/') + '/favicon.ico';
            return $('<img />', {
                src: src,
                height: 16,
                width: 16,
                border: 0,
                class: 'favicon'
            });
        },
        // Sort Delicious arrays by the first matched step tag.
        sortData: function(data) {
            var keys = [];
            $.each(data, function(k, v) {
                var step = /step\:(.+?)(,?)/g.exec(v.t);
                var step = !!step ? parseInt(step[1]) : 0;
                keys.push([step, v]);
            });
            return keys.sort(function(a, b) {
                if (a[0] == b[0]) { return 0; }
                if (a[0] > b[0]) {
                    return 1;
                } else {
                    return -1;
                }
            });
        },
        // Process all the trails from pre-computed data and render on template
        renderTrails: function() {
            $('#trails').html('');
            $.each(trails, function(user, data) {
                var id = 'trail:',
                    cls = login.val() == user ? 'primary list-items nav nav-list' : 'list-items nav nav-list',
                    tags = {},
                    header = $('<h3 />', {'html': user, 'class': ''}),
                    target = $('<ul />', {'class': cls})
                        .html(header)
                        .appendTo('#trails');

                $.each(data, function(tag, count) {
                    if(tag && tag.startsWith(id)) {
                        $('<a />', {
                                'href' : '#',
                                'class': 'trail',
                                'title' : tag + ' ('+ count +')',
                                'text' : tag.replace(id, '') + ' ('+ count +')'
                            })
                            .data('tag', tag)
                            .data('user', user)
                            .appendTo($('<li />')
                            .appendTo(target));
                    }
                });
            });
            // The first set of trails (for logged-in user) can have boomarks be added to
            $('.primary li').droppable({
                accept: 'li',
                drop: function(event, ui) {
                    var toTag = $(this).find('a').data('tag');
                    $(ui.draggable)
                        .draggable('disable')
                        .css({top: '0px', left: '0px'})
                        .appendTo('#bookmarks ul');
                    Memex.saveBookmark($(ui.draggable).find('a'), toTag);
                }
            });
        },
        // Process all the bookmarks from pre-computed data and render on template
        renderBookmarks: function() {
            $('#bookmarks').html('');
            $.each(bookmarks, function(user, data) {
                var header = $('<h3 />', {'html': user, 'class': ''}),
                    target = $('<ul />', {'class': 'list-items nav-list'})
                        .html(header)
                        .appendTo('#bookmarks');
                var sortedData = Memex.sortData(data);
                $.each(sortedData, function(index, data) {
                    val = data[1];
                    var icon = Memex.favicon(val.u),
                        link = $('<a />', {
                            'href' : val.u,
                            'class' : 'bookmarks',
                            'title' : val.d,
                            'text' : val.d})
                        .data('extended', val.n)
                        .data('user', user)
                        .data('id', val.d)
                        .data('tags', val.t);

                    icon.add(link)
                        .appendTo($('<li />')
                        .appendTo(target));
                });
                // Bookmarks can be added to trails of logged-in user
                $('#bookmarks li').draggable({revert: true});
            });

        },
        // Stpre bookmark and tag elements on Delicious and re-display
        saveBookmark: function(bookmark, tag) {
            $('.progress').show();
            tag += ",step:" + (trails[delicious.username][tag] + 1);
            var postData = {
                url: bookmark.attr('href'),
                description: bookmark.text(),
                extended: bookmark.data('extended'),
                tags: tag,
                method: 'posts/add',
                username: delicious.username,
                password: delicious.password
            };
            // Proxy
            var url = 'http://courses.ischool.berkeley.edu/i290-iol/f12/resources/trailmaker/delicious_proxy.php?callback=?'
            $.getJSON(url, postData, function(rsp){
                if (rsp.result_code === "access denied") {
                    alert('The provided Delicious username and password are incorrect.');
                } else if (rsp.result_code === "something went wrong") {
                    alert('There was an unspecified error communicating with Delicious.');
                } else if (rsp.result_code === "done") {
                    Memex.addTrails(delicious.username);
                    Memex.renderTrails();
                }
                $('.progress').hide();
            });
        },
        // General method for rendering -- may be unused
        render: function() {

        }
     };
     /* initialize and render for the first time */
     Memex.init();
     Memex.render();
});

