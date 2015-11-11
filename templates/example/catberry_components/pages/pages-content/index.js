'use strict';

module.exports = PagesContent;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "pages-content" component.
 * @constructor
 */
function PagesContent() { }

/**
 * Gets data context for template engine.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Data context
 * for template engine.
 */
PagesContent.prototype.render = function () {
	return this.$context.getStoreData();
};

/**
 * Returns event binding settings for the component.
 */
PagesContent.prototype.bind = function () {
	this.hideLoader();
};

/**
 * Hides loader in template.
 */
PagesContent.prototype.hideLoader = function () {
	var loaders = this.$context.element.getElementsByTagName('cat-loader');
	for (var i = 0; i < loaders.length; i++) {
		loaders[i].style.display = 'none';
	}
};