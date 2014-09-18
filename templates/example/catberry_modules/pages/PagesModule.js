'use strict';

module.exports = PagesModule;

/**
 * Creates new instance of Pages module.
 * @constructor
 */
function PagesModule() {
}

/**
 * Renders page content.
 * This method is called when need to render index template of module pages.
 * @returns {Promise<Object>|Object|undefined} Data context.
 */
PagesModule.prototype.renderIndex = function () {
	return {page: this.$context.state.page};
};

/**
 * Renders page navigation tabs.
 * This method is called when need to render "navigation" template
 * of module "pages".
 * @returns {Promise<Object>|Object|undefined} Data context.
 */
PagesModule.prototype.renderNavigation = function () {
	if (!this.$context.state.page) {
		this.$context.redirect('/about');
		return;
	}
	var data = {};
	data[this.$context.state.page] = true;
	return data;
};