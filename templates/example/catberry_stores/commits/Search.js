'use strict';

module.exports = Search;

/*
 * This is a Catberry Store file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#stores
 */

/**
 * Creates new instance of the "commits/Search" store.
 * @param {UHR} $uhr Universal HTTP request.
 * @constructor
 */
function Search($uhr) {
	this._uhr = $uhr;
}

/**
 * Current universal HTTP request to do it in isomorphic way.
 * @type {UHR}
 * @private
 */
Search.prototype._uhr = null;

/**
 * Current lifetime of data (in milliseconds) that is returned by this store.
 * @type {number} Lifetime in milliseconds.
 */
Search.prototype.$lifetime = 60000;

/**
 * Loads data from remote source.
 * @returns {Promise<Object>|Object|null|undefined} Loaded data.
 */
Search.prototype.load = function () {
	var query = this.$context.state.query;
	if (!query) {
		return;
	}
	return this._uhr.get(
		'https://api.github.com/search/code?q=' +
		query +
		'+in:file+repo:catberry/catberry'
	)
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}
			result.content.query = query;
			// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
			result.content.hasResults = (result.content.total_count > 0);
			return result.content;
		});
};
