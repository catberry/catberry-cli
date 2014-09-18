'use strict';

module.exports = SearchModule;

/**
 * Creates new instance of Commits module.
 * @param {UHR} $uhr Universal HTTP(S) request.
 * @constructor
 */
function SearchModule($uhr) {
	this._uhr = $uhr;
}

/**
 * Current UHR instance.
 * @type {UHR}
 * @private
 */
SearchModule.prototype._uhr = null;

/**
 * Renders result list for search query in Catberry Framework repository.
 * This method is called when need to render "index" template
 * of module "search".
 * @returns {Promise<Object>|Object|undefined} Data context.
 */
SearchModule.prototype.renderResults = function () {
	if (!this.$context.state.query) {
		return;
	}

	return this._uhr.get(
			'https://api.github.com/search/code?q=' +
			this.$context.state.query +
			'+in:file+repo:catberry/catberry'
	)
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}
			return result.content;
		});
};

/**
 * Renders search form.
 * This method is called when need to render "form" template of module "search".
 * @returns {Promise<Object>|Object|undefined} Data context.
 */
SearchModule.prototype.renderForm = function () {
	return {query: this.$context.state.query};
};

/**
 * Searches in code of Catberry repository.
 * @param {Object} event Event object.
 * @returns {Promise|undefined} Promise for nothing.
 */
SearchModule.prototype.submitSearchInCode = function (event) {
	if (!event.values.query) {
		return;
	}
	this.$context.redirect('/search?query=' + event.values.query);
};