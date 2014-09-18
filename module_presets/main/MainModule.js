'use strict';

module.exports = MainModule;

/**
 * Creates new instance of main module.
 * @param {string} title Site title from config.
 * @constructor
 */
function MainModule(title) {
	this._title = title;
}

/**
 * Current site title.
 * @type {string}
 * @private
 */
MainModule.prototype._title = '';

/**
 * Renders HEAD element of page.
 * This method is called when need to render "head" template of module "main".
 * @returns {Promise<Object>|Object|undefined} Data context.
 */
MainModule.prototype.renderHead = function () {
	return {title: this._title};
};

/**
 * Renders root template on page.
 * This method is called when need to render "index" template of module "main".
 * @returns {Promise<Object>|Object|undefined} Data context.
 */
MainModule.prototype.renderIndex = function () {
	return {message: 'Hello, world!'};
};