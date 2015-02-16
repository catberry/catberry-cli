'use strict';

module.exports = SearchForm;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "search-form" component.
 * @constructor
 */
function SearchForm() {

}

/**
 * Gets data context for template engine.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Data context
 * for template engine.
 */
SearchForm.prototype.render = function () {
	return this.$context.getStoreData();
};

/**
 * Returns event binding settings for the component.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Binding settings.
 */
SearchForm.prototype.bind = function () {
	this.hideLoader();
	return {
		submit: {
			form: this._handleFormSubmit
		}
	};
};

/**
 * Handles click on submit button.
 * @private
 */
SearchForm.prototype._handleFormSubmit = function (event) {
	event.preventDefault();
	event.stopPropagation();
	this.showLoader();
	this.$context.redirect('/search?query=' + this.getQuery());
};

/**
 * Gets current specified query.
 * @returns {string}
 */
SearchForm.prototype.getQuery = function () {
	return this.$context.element
		.querySelector('input[name=query]')
		.value;
};

/**
 * Hides loader in template.
 */
SearchForm.prototype.hideLoader = function () {
	var loaders = this.$context.element.getElementsByTagName('cat-loader');
	for(var i = 0; i < loaders.length; i++) {
		loaders[i].style.display = 'none';
	}
};

/**
 * Shows loader in template.
 */
SearchForm.prototype.showLoader = function () {
	var loaders = this.$context.element.getElementsByTagName('cat-loader');
	for(var i = 0; i < loaders.length; i++) {
		loaders[i].style.display = '';
	}
};