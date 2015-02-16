# Catberry CLI [![Build Status](https://travis-ci.org/catberry/catberry-cli.png?branch=master)](https://travis-ci.org/catberry/catberry-cli)

[![NPM](https://nodei.co/npm/catberry-cli.png)](https://nodei.co/npm/catberry-cli/)

![Catberry](https://raw.githubusercontent.com/catberry/catberry/master/docs/images/logo.png)

## What is it?
This is a Command Line Interface for [Catberry Framework](https://github.com/catberry/catberry)
that helps to create projects.

It helps to:

### Create Catberry Applications using project template

```bash
catberry init [--dest=directory] <template>
```

Included templates:
* `example` - finished project that works with GitHub API and demonstrates
how to implement such isomorphic application using Catberry Framework
* `empty-handlebars` - empty project using [Handlebars](http://handlebarsjs.com/) template engine.
* `empty-dust` - empty project using [Dust](https://github.com/catberry/catberry-dust) template engine.
* `empty-jade` - empty project using [Jade](http://jade-lang.com/) template engine.

### Add [Store](https://github.com/catberry/catberry/blob/master/docs/index.md#stores) to the project
 
```bash
catberry addstore [--dest=directory] <storeName>
```

### Add [Cat-component](https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components) to the project

```bash
catberry addcomp [--dest=directory] [--preset=handlebars] <componentName>
```
Also you can use `preset` values such as:

* `handlebars` (by default)
* `dust`
* `jade`

## Installation

```bash
npm -g install catberry-cli
```

To get more usage details `catberry --help`

## Contribution
If you have found a bug, please create pull request with [mocha](https://www.npmjs.org/package/mocha) 
unit-test which reproduces it or describe all details in an issue if you can not
implement test. If you want to propose some improvements just create an issue or
a pull request but please do not forget to use `npm test` to be sure that your
code is awesome.

All changes should satisfy this [Code Style Guide](https://github.com/catberry/catberry/blob/4.0.0/docs/code-style-guide.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>