'use strict';

module.exports = AboutModule;

var README_URL = 'https://api.github.com/repos/catberry/catberry/readme';

/**
 * Creates new instance of About module.
 * @param {UHR} $uhr Universal HTTP(S) request.
 * @constructor
 */
function AboutModule($uhr) {
	this._uhr = $uhr;
}

/**
 * Current UHR instance.
 * @type {UHR}
 * @private
 */
AboutModule.prototype._uhr = null;

/**
 * Renders document about Catberry Framework.
 * This method is called when need to render "index" template of module "about".
 * @returns {Promise<Object>|Object|undefined} Data context.
 */
AboutModule.prototype.renderIndex = function () {
	return this._uhr.get(README_URL, {
		headers: {
			Accept: 'application/vnd.github.VERSION.html+json'
		}
	})
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}
			return {html: result.content};
		});
};