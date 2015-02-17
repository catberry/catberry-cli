'use strict';

module.exports = HelloWorld;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of "hello-world" component.
 * @constructor
 */
function HelloWorld() {

}

/**
 * Gets data for template.
 * @returns {Promise<Object>} Promise for data.
 */
HelloWorld.prototype.render = function () {
	return this.$context.getStoreData();
};