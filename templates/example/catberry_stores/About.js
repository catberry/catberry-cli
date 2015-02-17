'use strict';

module.exports = About;

/*
 * This is a Catberry Store file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#stores
 */

var README_URL = 'https://api.github.com/repos/catberry/catberry/readme';

/**
 * Creates new instance of the "About" store.
 * @param {UHR} $uhr Universal HTTP request.
 * @constructor
 */
function About($uhr) {
	this._uhr = $uhr;
}

/**
 * Current universal HTTP request to do it in isomorphic way.
 * @type {UHR}
 * @private
 */
About.prototype._uhr = null;

/**
 * Current lifetime of data (in milliseconds) that is returned by this store.
 * @type {number} Lifetime in milliseconds.
 */
About.prototype.$lifetime = 3600000;

/**
 * Loads data from remote source.
 * @returns {Promise<Object>|Object|null|undefined} Loaded data.
 */
About.prototype.load = function () {
	return this._uhr.get(README_URL, {
		headers: {
			Accept: 'application/vnd.github.VERSION.html+json'
		}
	})
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}
			return {readmeHTML: result.content};
		});
};