'use strict';

module.exports = CommitsModule;

var COMMITS_URL = 'https://api.github.com/repos/catberry/catberry/commits';

/**
 * Creates new instance of Commits module.
 * @param {UHR} $uhr Universal HTTP(S) request.
 * @param {jQuery} $jQuery jQuery library.
 * @constructor
 */
function CommitsModule($uhr, $jQuery) {
	this._uhr = $uhr;
	this.$ = $jQuery;
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
 * Renders commit list of Catberry Framework repository.
 * This method is called when need to render "index" template
 * of module "commits".
 * @returns {Promise<Object>|Object|undefined} Data context.
 */
CommitsModule.prototype.renderIndex = function () {
	return this._uhr.get(COMMITS_URL)
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}
			return {commits: result.content};
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