'use strict';

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
module.exports = __ModuleName__Module;

/**
 * Creates new instance of "__moduleName__" module.
 * @constructor
 */
function __ModuleName__Module() {
	/* constructor code here */
}

/**
 * Renders index template of module.
 * This method is called when need to render "index" template
 * of module "__moduleName__".
 * @returns {Promise<Object>|Object|undefined} Data context.
 */
__ModuleName__Module.prototype.renderIndex = function () {
	return {text: 'Awesome content'};
};