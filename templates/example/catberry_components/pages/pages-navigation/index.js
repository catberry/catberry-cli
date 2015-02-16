'use strict';

module.exports = PagesNavigation;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "pages-navigation" component.
 * @constructor
 */
function PagesNavigation() {

}

/**
 * Gets data context for template engine.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Data context
 * for template engine.
 */
PagesNavigation.prototype.render = function () {
	return this.$context.getStoreData();
};