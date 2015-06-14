# Catberry CLI [![Build Status](https://travis-ci.org/catberry/catberry-cli.png?branch=master)](https://travis-ci.org/catberry/catberry-cli)

[![NPM](https://nodei.co/npm/catberry-cli.png)](https://nodei.co/npm/catberry-cli/)

<p align="center">
  <img src="https://raw.githubusercontent.com/catberry/catberry/master/docs/images/logo.png" />
</p>

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

## Contributing

There are a lot of ways to contribute:

* Give it a star
* Join the [Gitter](https://gitter.im/catberry/catberry) room and leave a feedback or help with answering users' questions
* [Submit a bug or a feature request](https://github.com/catberry/catberry-cli/issues)
* [Submit a PR](https://github.com/catberry/catberry-cli/blob/develop/CONTRIBUTING.md)
* If you like the logo, you might want to buy a Catberry [T-Shirt](http://www.redbubble.com/people/catberryjs/works/14439373-catberry-js-framework-logo?p=t-shirt) or a [sticker](http://www.redbubble.com/people/catberryjs/works/14439373-catberry-js-framework-logo?p=sticker)

Denis Rechkunov <denis.rechkunov@gmail.com>