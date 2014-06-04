/*
 *
 * Republished from Node.js the Right Way
 * the Pragmactic Bookshelf, per their Copyrights
 * 
 * app.js
 *
 */

 (function () {
 	"use strict";

 	var templates = {},
 	    bundles,
        //pull down remote copy from server
 	    getBundles = function () {
 	    	$.ajax({
 	    		url: '/api/user/bundles'
 	    	}).then(
 	    	function (data, status, xhr) {
                //local copy of user bundles stored on server
 	    		bundles = data;
 	    		showBundles();
 	    	}, 
            function (xhr, status, err) {
 	    		if (xhr.status >= 500) {
 	    			showErr(xhr, status, err);
 	    		}
 	    		bundles = {};
 	    		showBundles();
 	    	});
 	    },
 	    saveBundles = function (bundles, callback) {
 	    	$.ajax({
 	    		type: 'PUT',
 	    		url: '/api/user/bundles',
 	    		data: JSON.stringify(bundles),
                //preserialized as json
 	    		contentType: 'application/json; charset=utf-8',
 	    		accepts: 'application/json'
 	    	}).then(
 	    	function (data, status, xhr) {
 	    		callback(null, data);
 	    	}, 
            function (xhr, status, err) {
 	    		callback(err);
 	    	});
 	    },
 	    showErr = function (xhr, status, err) {
 	    	$('.alert-danger').fadeIn().find('.message').text(err);
 	    },
        //takes selected param (name of view we want) set window.loc
        //then hide other views
 	    showView = function (selected) {
 	    	window.location.hash = '#' + selected;
 	    	$('.view').hide().filter('#' + selected + '-view').show();
 	    },
 	    showBundles = function () {
 	    	showView('list-bundles');
 	    	$('.bundles').html(templates['list-bundles']({ bundles: bundles }));
 	    },
 	    showBundle = function (bundle) {
 	    	showView('edit-bundle');
 	    	$('#edit-bundle-view')
 	    	  .find('h2').data('id', bundle._id).end()
 	    	  .find('h2 span').text(bundle.name).end()
 	    	  .find('.bundle-books')
 	    	    .html(templates['list-books']({ books: bundle.books }));
 	    };

 	//Setup for handlebars templates
 	$('script[type="text/x-handlebars-templates"]').each(function () {
 		var name = this.id.replace(/-template$/, '');
 		templates[name] = Handlebars.compile($(this).html());
 	});
    //responds to direct URL changes for specific views
 	$(window).on('hashchange', function (event) {
 		var view = (window.location.hash || '').replace(/^#/, '');
        //check to see if there is an elem on pg with matching view ID
 		if ($('#' + view + '-view').length) {
 			showView(view);
 		}
 	});
    //get user data, proceed to list-bundles or welcome
    //two handlers on then: success/failure
    $.ajax({
    	url: '/api/user',
    	accepts: 'application/json'
    }).then(
    function (data, status, xhr) {
        //success
    	getBundles();
    }, 
    function (xhr, status, err) {
        //failure
    	showView('welcome');
    });
    //implement adding a new bundle
    $('.new-bundle-form').submit(function (event) {
    	event.preventDefault();
    	
    	var name = $('#new-bundle-name').val();

        $.ajax({
        	type: 'POST',
        	url: '/api/bundle?name=' + encodeURIComponent(name),
        	accepts: 'applicaion/json'
        }).then(
        function (data, status, xhr) {
        	bundles[data.id] = name;
        	saveBundles(bundles, function (err, body) {
        		if (err) {
        			showErr(null, null, err);
        		} else {
        			showBundles();
        		}
        	});
        }, showErr);
    });
    //Field Search typeahead
    $('.fine-book.by-subject .search').typeahead({
    	name: 'subject',
    	limit: 10,
    	remote: '/api/search/subject?q=%QUERY'
    });
    $('.find-book.by-author .search').typeahead({
    	name: 'author',
    	limit: 10,
    	remote: '/api/search/author?q=%QUERY'
    });
    //Field Search Results
    $('.find-book').submit(function (event) {
    	event.preventDefault();

    	var $form = $(this),
    	    field = $form.find('[name="field"]').val(),
    	    q = $(this).find('.search').val();
    	$.ajax({
    		url: '/api/search/book/by_' + field + '?q=' + encodeURIComponent(q),
    		accepts: 'application.json'
    	}).then(
    	function (data, status, xhr) {
    		$('.books-results').html(templates['list-books']({ books: data }));
    	}, showErr);
    });
    //Bundle Book List Results
    $('.bundle-books').click(function (event) {
    	var $button = $(event.target).closest('button'),
    	    id,
    	    pgid,
    	    title;
    	
    	if (!$button.length) {
    		return;
    	}
        id = $button.closest('.view').find('h2').data('id');
        pgid = $button.closest('tr').data('id');
        title = $button.closest('tr').find('a').first().text();

        if (confirm('Remove "' + title + '"?')) {
        	$.ajax({
        		type: 'DELETE',
        		url: '/api/bundle/' + id + '/book/' + pgid,
        		accepts: 'application/json'
        	}).then(
        	function (resp, status, xhr) {
        		return $,ajax({
        			url: '/api/bundle/' + id,
        			accepts: 'application/json'
        		});
        	}).then(showBundle, showErr);
        }
    });
    //Book Search Results
    $('.books-results').click(function (event) {
    	var $button = $(event.target).closest('button'),
    	    id,
    	    pgid;

    	if (!$button.length) {
    		return;
    	}

    	id = $button.closest('.view').find('h2').data('id');
    	pgid = $button.closest('tr').data('id');

    	$.ajax({
    		type: 'PUT',
    		url: '/api/bundle/' + id + '/book/' + pgid,
    		accepts: 'application/json'
    	}).then(
    	function (resp, status, xhr) {
    		return $.ajax({
    			url: '/api/bundle/' + id,
    			accepts: 'application/json'
    		});
    	}).then(showBundle, showErr);
    });
    //Setup Close Button
    $('.alert-danger .close').click(function (event) {
    	$(event.target).closest('.alert-danger').hide();
    });
    //Edit bundle buttons
    $('.bundles').click(function (event) {
    	var $button = $(event.target).closest('button'),
    	    id,
    	    name;
    	if (!$button.length) {
    		return;
    	}

    	id = $button.closest('tr').data('id');
    	name = $button.closest('tr').find('td').eq(0).text();

    	if ($button.is('.delete')) {
    		if (confirm('Delete "' + name + '"?')) {
    			delete bundles[id];
    			saveBundles(bundles, function (err, body) {
    				if (err) {
    					showErr(null, null, err);
    				} else {
    					showBundles();
    				}
    			});
    		}
    	} else {
    		$.ajax({
    			url: '/api/bundle/' + id,
    			accepts: 'application/json'
    		}).then(showBundle, showErr);
    	}
    });
 })();