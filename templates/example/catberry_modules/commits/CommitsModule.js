'use strict';

module.exports = CommitsModule;

var util = require('util');

var COMMITS_URL = 'https://api.github.com/repos/catberry/catberry/commits',
	COMMITS_PAGE_URL_FORMAT = COMMITS_URL + '?page=%d&per_page=%d',
	PER_PAGE = 50;

/**
 * Creates new instance of Commits module.
 * @param {UHR} $uhr Universal HTTP(S) request.
 * @param {jQuery} $jQuery jQuery library.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve plugin.
 * @constructor
 */
function CommitsModule($uhr, $jQuery, $serviceLocator) {
	this._uhr = $uhr;
	this.$ = $jQuery;
	if (this.$context.isBrowser) {
		this.lazyLoader = $serviceLocator.resolve('lazyLoader');
		this.lazyLoader.containerId = 'commits-feed';
		this.lazyLoader.loaderId = 'commits-loader';
		this.lazyLoader.moreItemsCount = PER_PAGE;
		this.lazyLoader.maxItemsCount = 10000;
		this.lazyLoader.itemTemplateName = 'commits__item';
		// factory to get next N items from data source
		this.lazyLoader.factory =
			CommitsModule.prototype.itemsFactory.bind(this);
	}
}

/**
 * Current UHR instance.
 * @type {UHR}
 * @private
 */
CommitsModule.prototype._uhr = null;

/**
 * Current jQuery instance.
 * @type {jQuery}
 */
CommitsModule.prototype.$ = null;

/**
 * Current lazy loader for infinite scroll.
 * @type {LazyLoader}
 * @private
 */
CommitsModule.prototype.lazyLoader = null;

/**
 * Current page number.
 * @type {number}
 * @private
 */
CommitsModule.prototype._page = 1;

/**
 * Renders commit list of Catberry Framework repository.
 * This method is called when need to render "index" template
 * of module "commits".
 * @returns {Promise<Object>|Object|undefined} Data context.
 */
CommitsModule.prototype.renderIndex = function () {
	return this.getItems(1, PER_PAGE)
		.then(function (items) {
			return {commits: items};
		});
};

/**
 * Does something after index placeholder is rendered.
 * This method is invoked only in browser.
 */
CommitsModule.prototype.afterRenderIndex = function () {
	this.lazyLoader.enableInfiniteScroll();
};

/**
 * Current factory for feed items.
 * @param {jQuery} last Last element in feed.
 * @param {number} limit How many items to load.
 * @returns {Promise<Array>} Promise for next chunk of items.
 */
CommitsModule.prototype.itemsFactory = function (last, limit) {
	var self = this;
	return this.getItems(this._page + 1, limit)
		.then(function (items) {
			self._page++;
			return items;
		});
};

/**
 * Gets specified page of items.
 * @param {number} page Page number.
 * @param {number} limit Items count to load.
 * @returns {Promise<Array>} Promise for items.
 */
CommitsModule.prototype.getItems = function (page, limit) {
	return this._uhr.get(
		util.format(COMMITS_PAGE_URL_FORMAT, page, limit)
	)
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}

			return result.content;
		});
};

/**
 * Handles commit details hash change.
 * @param {Object} event Event object.
 * @returns {Promise|undefined} Promise for nothing.
 */
CommitsModule.prototype.handleDetails = function (event) {
	if (event.isEnding) {
		this.$('#details-' + event.args.sha).remove();
		return;
	}

	var self = this,
		link = this.$('#' + event.args.sha);

	link.addClass('loading');

	return this._uhr.get(COMMITS_URL + '/' + event.args.sha)
		.then(function (result) {
			link.removeClass('loading');
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}

			return self.$context.render(
				self.$context.name, 'details', result.content
			);

		}, function (reason) {
			link.removeClass('loading');
			throw reason;
		})
		.then(function (content) {
			self.$(content)
				.attr('id', 'details-' + event.args.sha)
				.insertAfter(link);
		});
};