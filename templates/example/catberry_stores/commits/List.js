'use strict';

module.exports = List;

/*
 * This is a Catberry Store file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#stores
 */

var util = require('util');

var COMMITS_URL = 'https://api.github.com/repos/catberry/catberry/commits',
	COMMITS_PAGE_URL_FORMAT = COMMITS_URL + '?page=%d&per_page=%d',
	PER_PAGE = 50;

/**
 * Creates new instance of the "commits/List" store.
 * @param {UHR} $uhr Universal HTTP request.
 * @constructor
 */
function List($uhr) {
	this._uhr = $uhr;
	this._currentFeed = [];
}

/**
 * Current feed items.
 * @type {Array}
 * @private
 */
List.prototype._currentFeed = null;

/**
 * Current pages of feed.
 * @type {number}
 * @private
 */
List.prototype._currentPage = 1;

/**
 * Current state of feed loading.
 * @type {boolean}
 * @private
 */
List.prototype._isFinished = false;

/**
 * Current universal HTTP request to do it in isomorphic way.
 * @type {UHR}
 * @private
 */
List.prototype._uhr = null;

/**
 * Current lifetime of data (in milliseconds) that is returned by this store.
 * @type {number} Lifetime in milliseconds.
 */
List.prototype.$lifetime = 60000;

/**
 * Loads data from remote source.
 * @returns {Promise<Object>|Object|null|undefined} Loaded data.
 */
List.prototype.load = function () {
	var self = this;
	return this.getItems(this._currentPage, PER_PAGE)
		.then(function (result) {
			if (!result || result.length === 0) {
				self._isFinished = true;
				return self._currentFeed;
			}
			self._currentFeed = self._currentFeed.concat(result);
			return self._currentFeed;
		});
};

/**
 * Gets commits from GitHub API.
 * @param {number} page Page number.
 * @param {number} limit Limit for items.
 * @returns {Promise<Object>} Promise for result.
 */
List.prototype.getItems = function (page, limit) {
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
 * Handles action named "some-action" from any component.
 * @returns {Promise<Object>|Object|null|undefined} Response to component.
 */
List.prototype.handleGetDetails = function (args) {
	if (!args.sha) {
		throw new Error('Commit not found');
	}
	return this._uhr.get(COMMITS_URL + '/' + args.sha)
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}

			return result.content;
		});
};

/**
 * Handles 'load-more' action for commit list.
 */
List.prototype.handleLoadMore = function () {
	if (this._isFinished) {
		return;
	}
	this._currentPage++;
	this.$context.changed();
};