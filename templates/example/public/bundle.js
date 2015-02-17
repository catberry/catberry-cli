/* catberry-example: 0.0.0 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],6:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":5,"_process":3,"inherits":2}],7:[function(require,module,exports){
'use strict';

var catberry = require('catberry'),
	// this config will be replaced by `./config/browser.json` when building
	// because of `browser` field in `package.json`
	config = require('./config/environment.json'),
	templateEngine = require('catberry-handlebars'),
	cat = catberry.create(config);

// register template provider to Catberry Service Locator
templateEngine.register(cat.locator);

cat.startWhenReady();

},{"./config/environment.json":23,"catberry":35,"catberry-handlebars":26}],8:[function(require,module,exports){
'use strict';

module.exports = About;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "about" component.
 * @constructor
 */
function About() {

}

/**
 * Gets data context for template engine.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Data context
 * for template engine.
 */
About.prototype.render = function () {
	return this.$context.getStoreData();
};
},{}],9:[function(require,module,exports){
'use strict';

module.exports = CommitsDetails;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "commits-details" component.
 * @constructor
 */
function CommitsDetails() {

}

CommitsDetails.prototype.setDetails = function (details) {
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	this.setAdditions(details.stats.additions);
	this.setDeletions(details.stats.deletions);
	this.setTotal(details.stats.total);
	this.setCommentCount(details.commit.comment_count);
	this.setCommentLink(details.html_url);
};

CommitsDetails.prototype.setAdditions = function (count) {
	this.$context.element
		.getElementsByClassName('additions')[0].innerHTML = count;
};

CommitsDetails.prototype.setDeletions = function (count) {
	this.$context.element
		.getElementsByClassName('deletions')[0].innerHTML = count;
};

CommitsDetails.prototype.setTotal = function (count) {
	this.$context.element
		.getElementsByClassName('total')[0].innerHTML = count;
};

CommitsDetails.prototype.setCommentCount = function (count) {
	this.$context.element
		.getElementsByClassName('comment-count')[0].innerHTML = count;
};

CommitsDetails.prototype.setCommentLink = function (link) {
	this.$context.element
		.getElementsByClassName('comments-link')[0]
		.setAttribute('href', link);
};
},{}],10:[function(require,module,exports){
'use strict';

module.exports = CommitsList;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "commits-list" component.
 * @constructor
 */
function CommitsList($serviceLocator) {
	// we can use window from the locator in a browser only
	if (this.$context.isBrowser) {
		this._window = $serviceLocator.resolve('window');
		this._handleScroll = this._handleScroll.bind(this);
	}
}

CommitsList.prototype._window = null;
/**
 * Gets data context for template engine.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Data context
 * for template engine.
 */
CommitsList.prototype.render = function () {
	return this.$context.getStoreData()
		.then(function (result) {
			return {commits: result};
		});
};

/**
 * Returns event binding settings for the component.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Binding settings.
 */
CommitsList.prototype.bind = function () {
	this._window.addEventListener('scroll', this._handleScroll);
	return {
		click: {
			'a.js-commit': this._handleClickDetails
		}
	};
};

/**
 * Unbinds all unmanaged event handlers.
 */
CommitsList.prototype.unbind = function () {
	this._window.removeEventListener('scroll', this._handleScroll);
};

/**
 * Handles window scroll for infinite scroll loading.
 * @private
 */
CommitsList.prototype._handleScroll = function () {
	var windowHeight = this._window.innerHeight,
		scrollTop = this._window.pageYOffset,
		doc = this._window.document.documentElement;
	try {
		if (scrollTop >= (doc.scrollHeight - windowHeight) ||
			doc.scrollHeight <= windowHeight) {
			this._loadMoreItems();
		}
	} catch (e) {
		// do nothing
	}
};

/**
 * Loads more items to feed.
 * @private
 */
CommitsList.prototype._loadMoreItems = function () {
	this.$context.sendAction('load-more');
};

/**
 * Handles click event when click on commit item.
 * @param {Event} event DOM event.
 * @private
 */
CommitsList.prototype._handleClickDetails = function (event) {
	event.preventDefault();
	event.stopPropagation();

	var self = this,
		commitElement = event.currentTarget,
		commitSha = commitElement.getAttribute('id');

	this._clearAllDetails();

	var detailsId = 'details-' + commitSha;

	this._showDetailsLoader(commitElement)
		.then(function () {
			return self.$context.sendAction('get-details', {
				sha: commitSha
			});
		})
		.then(function (details) {
			return self.$context.createComponent(
				'cat-commits-details', {
					id: detailsId
				}
			)
				.then(function (element) {
					self.$context
						.getComponentById(detailsId)
						.setDetails(details);
					self._insertAfterCommit(commitElement, element);
					self._hideDetailsLoader(commitElement);
				});
		});
};

/**
 * Clears all details items from list.
 * @private
 */
CommitsList.prototype._clearAllDetails = function () {
	var details = this.$context.element
		.getElementsByTagName('cat-commits-details');
	for (var i = 0; i < details.length; i++) {
		details[i].parentNode.removeChild(details[i]);
	}
	this.$context.collectGarbage();
};

/**
 * Creates and show loader component after commit item.
 * @param {Element} commitElement Commit DOM element.
 * @returns {Promise} Promise for done operation.
 * @private
 */
CommitsList.prototype._showDetailsLoader = function (commitElement) {
	var commitSha = commitElement.getAttribute('id'),
		loaderId = 'loader-' + commitSha,
		self = this;
	return this.$context.createComponent('cat-loader', {id: loaderId})
		.then(function (element) {
			self._insertAfterCommit(commitElement, element);
		});
};

/**
 * Hides loader from commit details.
 * @param {Element} commitElement Commit DOM element.
 * @private
 */
CommitsList.prototype._hideDetailsLoader = function (commitElement) {
	var commitSha = commitElement.getAttribute('id'),
		loaderId = 'loader-' + commitSha,
		element = this.$context.element.querySelector('#' + loaderId);

	element.parentNode.removeChild(element);
};

/**
 * Inserts element after commit item.
 * @param {Element} commitElement Commit DOM element.
 * @param {Element} element Element to insert after commit item.
 * @private
 */
CommitsList.prototype._insertAfterCommit = function (commitElement, element) {
	if (commitElement.nextSibling) {
		commitElement.parentNode.insertBefore(
			element, commitElement.nextSibling
		);
		return;
	}
	commitElement.parentNode.appendChild(element);
};
},{}],11:[function(require,module,exports){
'use strict';

module.exports = Document;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "document" component.
 * @constructor
 */
function Document() {

}

/**
 * Gets data context for template engine.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Data context
 * for template engine.
 */
Document.prototype.render = function () {

};

/**
 * Returns event binding settings for the component.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Binding settings.
 */
Document.prototype.bind = function () {

};

/**
 * Does cleaning for everything that have NOT been set by .bind() method.
 * This method is optional.
 * @returns {Promise|undefined} Promise or nothing.
 */
Document.prototype.unbind = function () {

};

},{}],12:[function(require,module,exports){
'use strict';

module.exports = Head;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "head" component.
 * @constructor
 */
function Head() {
}

/**
 * Gets data context for template engine.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Data context
 * for template engine.
 */
Head.prototype.render = function () {
	return this.$context.getStoreData();
};

},{}],13:[function(require,module,exports){
'use strict';

module.exports = Loader;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "loader" component.
 * @constructor
 */
function Loader() {

}

},{}],14:[function(require,module,exports){
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
function PagesContent() {

}

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
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Binding settings.
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
},{}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
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
},{}],17:[function(require,module,exports){
'use strict';

module.exports = SearchResults;

/*
 * This is a Catberry Cat-component file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#cat-components
 */

/**
 * Creates new instance of the "search-results" component.
 * @constructor
 */
function SearchResults() {

}

/**
 * Gets data context for template engine.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Data context
 * for template engine.
 */
SearchResults.prototype.render = function () {
	return this.$context.getStoreData();
};

/**
 * Returns event binding settings for the component.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Binding settings.
 */
SearchResults.prototype.bind = function () {
	return {
		submit: {
			form: this._handleFormSubmit
		}
	};
};
},{}],18:[function(require,module,exports){
'use strict';

module.exports = About;

/*
 * This is a Catberry Store file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#stores
 */

var README_URL = 'https://api.github.com/repos/catberry/catberry/readme';

/**
 * Creates new instance of the "About" store.
 * @param {UHR} $uhr Universal HTTP request.
 * @constructor
 */
function About($uhr) {
	this._uhr = $uhr;
}

/**
 * Current universal HTTP request to do it in isomorphic way.
 * @type {UHR}
 * @private
 */
About.prototype._uhr = null;

/**
 * Current lifetime of data (in milliseconds) that is returned by this store.
 * @type {number} Lifetime in milliseconds.
 */
About.prototype.$lifetime = 3600000;

/**
 * Loads data from remote source.
 * @returns {Promise<Object>|Object|null|undefined} Loaded data.
 */
About.prototype.load = function () {
	return this._uhr.get(README_URL, {
		headers: {
			Accept: 'application/vnd.github.VERSION.html+json'
		}
	})
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}
			return {readmeHTML: result.content};
		});
};
},{}],19:[function(require,module,exports){
'use strict';

module.exports = Pages;

/*
 * This is a Catberry Store file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#stores
 */

var PAGES = {
	about: 'About Catberry Framework',
	commits: 'Commits to Catberry Framework repository',
	search: 'Search in Catberry\'s code'
};

/**
 * Creates new instance of the "Pages" store.
 * @param {Object} $config Application config.
 * @constructor
 */
function Pages($config) {
	this._config = $config;
}

/**
 * Current application config.
 * @type {Object}
 * @private
 */
Pages.prototype._config = null;

/**
 * Current lifetime of data (in milliseconds) that is returned by this store.
 * @type {number} Lifetime in milliseconds.
 */
Pages.prototype.$lifetime = 3600000;

/**
 * Loads data from remote source.
 * @returns {Promise<Object>|Object|null|undefined} Loaded data.
 */
Pages.prototype.load = function () {
	var currentPage = this.$context.state.page;
	if (!currentPage) {
		return this.$context.redirect('/about');
	}

	if (!PAGES.hasOwnProperty(currentPage)) {
		throw new Error(currentPage + ' page not found');
	}
	var result = {
		title: this._config.title,
		subtitle: PAGES[currentPage],
		current: currentPage,
		isActive: {}
	};
	Object.keys(PAGES)
		.forEach(function (page) {
			result.isActive[page] = (currentPage === page);
		});

	return result;
};
},{}],20:[function(require,module,exports){
'use strict';

module.exports = Feed;

/*
 * This is a Catberry Store file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#stores
 */

/**
 * Creates new instance of the "commits/Feed" store.
 * @param {UHR} $uhr Universal HTTP request.
 * @constructor
 */
function Feed($uhr) {
	this._uhr = $uhr;
}

/**
 * Current universal HTTP request to do it in isomorphic way.
 * @type {UHR}
 * @private
 */
Feed.prototype._uhr = null;

/**
 * Current lifetime of data (in milliseconds) that is returned by this store.
 * @type {number} Lifetime in milliseconds.
 */
Feed.prototype.$lifetime = 60000;

/**
 * Loads data from remote source.
 * @returns {Promise<Object>|Object|null|undefined} Loaded data.
 */
Feed.prototype.load = function () {
	// Here you can do any HTTP requests using this._uhr.
	// Please read details here https://github.com/catberry/catberry-uhr.
};

/**
 * Handles action named "some-action" from any component.
 * @returns {Promise<Object>|Object|null|undefined} Response to component.
 */
Feed.prototype.handleSomeAction = function () {
	// Here you can call this.$context.changed() if you know
	// that remote data source has been changed.
	// Also you can have many handle methods for other actions.
};

},{}],21:[function(require,module,exports){
'use strict';

module.exports = List;

/*
 * This is a Catberry Store file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#stores
 */

var util = require('util');

var COMMITS_URL = 'https://api.github.com/repos/catberry/catberry/commits',
	COMMITS_PAGE_URL_FORMAT = COMMITS_URL + '?page=%d&per_page=%d',
	PER_PAGE = 50;

/**
 * Creates new instance of the "commits/List" store.
 * @param {UHR} $uhr Universal HTTP request.
 * @constructor
 */
function List($uhr) {
	this._uhr = $uhr;
	this._currentFeed = [];
}

/**
 * Current feed items.
 * @type {Array}
 * @private
 */
List.prototype._currentFeed = null;

/**
 * Current pages of feed.
 * @type {number}
 * @private
 */
List.prototype._currentPage = 1;

/**
 * Current state of feed loading.
 * @type {boolean}
 * @private
 */
List.prototype._isFinished = false;

/**
 * Current universal HTTP request to do it in isomorphic way.
 * @type {UHR}
 * @private
 */
List.prototype._uhr = null;

/**
 * Current lifetime of data (in milliseconds) that is returned by this store.
 * @type {number} Lifetime in milliseconds.
 */
List.prototype.$lifetime = 60000;

/**
 * Loads data from remote source.
 * @returns {Promise<Object>|Object|null|undefined} Loaded data.
 */
List.prototype.load = function () {
	var self = this;
	return this.getItems(this._currentPage, PER_PAGE)
		.then(function (result) {
			if (!result || result.length === 0) {
				self._isFinished = true;
				return self._currentFeed;
			}
			self._currentFeed = self._currentFeed.concat(result);
			return self._currentFeed;
		});
};

/**
 * Gets commits from GitHub API.
 * @param {number} page Page number.
 * @param {number} limit Limit for items.
 * @returns {Promise<Object>} Promise for result.
 */
List.prototype.getItems = function (page, limit) {
	return this._uhr.get(
		util.format(COMMITS_PAGE_URL_FORMAT, page, limit)
	)
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}

			return result.content;
		});
};

/**
 * Handles action named "some-action" from any component.
 * @returns {Promise<Object>|Object|null|undefined} Response to component.
 */
List.prototype.handleGetDetails = function (args) {
	if (!args.sha) {
		throw new Error('Commit not found');
	}
	return this._uhr.get(COMMITS_URL + '/' + args.sha)
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}

			return result.content;
		});
};

List.prototype.handleLoadMore = function () {
	if (this._isFinished) {
		return;
	}
	this._currentPage++;
	this.$context.changed();
};

List.prototype.resetFeed = function () {
	this._currentPage = 1;
	this._isFinished = true;
	this.$context.changed();
};
},{"util":6}],22:[function(require,module,exports){
'use strict';

module.exports = Search;

/*
 * This is a Catberry Store file.
 * More details can be found here
 * https://github.com/catberry/catberry/blob/master/docs/index.md#stores
 */

/**
 * Creates new instance of the "commits/Search" store.
 * @param {UHR} $uhr Universal HTTP request.
 * @constructor
 */
function Search($uhr) {
	this._uhr = $uhr;
}

/**
 * Current universal HTTP request to do it in isomorphic way.
 * @type {UHR}
 * @private
 */
Search.prototype._uhr = null;

/**
 * Current lifetime of data (in milliseconds) that is returned by this store.
 * @type {number} Lifetime in milliseconds.
 */
Search.prototype.$lifetime = 60000;

/**
 * Loads data from remote source.
 * @returns {Promise<Object>|Object|null|undefined} Loaded data.
 */
Search.prototype.load = function () {
	var query = this.$context.state.query;
	if (!query) {
		return;
	}
	return this._uhr.get(
		'https://api.github.com/search/code?q=' +
		query +
		'+in:file+repo:catberry/catberry'
	)
		.then(function (result) {
			if (result.status.code >= 400 && result.status.code < 600) {
				throw new Error(result.status.text);
			}
			result.content.query = query;
			result.content.hasResults = (result.content.total_count > 0);
			return result.content;
		});
};

},{}],23:[function(require,module,exports){
module.exports={
	"title": "Catberry Application",
	"server": {
		"port": 3000
	}
}
},{}],24:[function(require,module,exports){
/*
 * catberry-handlebars
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
 *
 * catberry-handlebars's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry-handlebars that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = TemplateProvider;

/**
 * Creates new instance of Handlebars template provider.
 * @param {Handlebars} $handlebars Handlebars factory.
 * @constructor
 */
function TemplateProvider($handlebars) {
	this._handlebars = $handlebars;
	this._templates = {};
}

/**
 * Current Handlebars factory.
 * @type {Handlebars}
 * @private
 */
TemplateProvider.prototype._handlebars = null;

/**
 * Current set of registered templates.
 * @type {Object}
 * @private
 */
TemplateProvider.prototype._templates = null;

/**
 * Registers compiled (precompiled) Handlebars template.
 * http://handlebarsjs.com/reference.html
 * @param {String} name Template name.
 * @param {String} compiled Compiled template source.
 */
TemplateProvider.prototype.registerCompiled = function (name, compiled) {
	// jshint evil:true
	var specs = new Function('return ' + compiled + ';');
	this._templates[name] = this._handlebars.template(specs());
};

/**
 * Renders template with specified data.
 * @param {String} name Name of template.
 * @param {Object} data Data context for template.
 * @returns {*}
 */
TemplateProvider.prototype.render = function (name, data) {
	if (!this._templates.hasOwnProperty(name)) {
		return Promise.reject(new Error('No such template'));
	}

	var promise;
	try {
		promise = Promise.resolve(this._templates[name](data));
	} catch(e) {
		promise = Promise.reject(e);
	}
	return promise;
};
},{}],25:[function(require,module,exports){
/*!

 handlebars v2.0.0

Copyright (C) 2011-2014 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

@license
*/
/* exported Handlebars */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Handlebars = root.Handlebars || factory();
  }
}(this, function () {
// handlebars/safe-string.js
var __module3__ = (function() {
  "use strict";
  var __exports__;
  // Build out our basic SafeString type
  function SafeString(string) {
    this.string = string;
  }

  SafeString.prototype.toString = function() {
    return "" + this.string;
  };

  __exports__ = SafeString;
  return __exports__;
})();

// handlebars/utils.js
var __module2__ = (function(__dependency1__) {
  "use strict";
  var __exports__ = {};
  /*jshint -W004 */
  var SafeString = __dependency1__;

  var escape = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;"
  };

  var badChars = /[&<>"'`]/g;
  var possible = /[&<>"'`]/;

  function escapeChar(chr) {
    return escape[chr];
  }

  function extend(obj /* , ...source */) {
    for (var i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          obj[key] = arguments[i][key];
        }
      }
    }

    return obj;
  }

  __exports__.extend = extend;var toString = Object.prototype.toString;
  __exports__.toString = toString;
  // Sourced from lodash
  // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
  var isFunction = function(value) {
    return typeof value === 'function';
  };
  // fallback for older versions of Chrome and Safari
  /* istanbul ignore next */
  if (isFunction(/x/)) {
    isFunction = function(value) {
      return typeof value === 'function' && toString.call(value) === '[object Function]';
    };
  }
  var isFunction;
  __exports__.isFunction = isFunction;
  /* istanbul ignore next */
  var isArray = Array.isArray || function(value) {
    return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
  };
  __exports__.isArray = isArray;

  function escapeExpression(string) {
    // don't escape SafeStrings, since they're already safe
    if (string instanceof SafeString) {
      return string.toString();
    } else if (string == null) {
      return "";
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = "" + string;

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  }

  __exports__.escapeExpression = escapeExpression;function isEmpty(value) {
    if (!value && value !== 0) {
      return true;
    } else if (isArray(value) && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }

  __exports__.isEmpty = isEmpty;function appendContextPath(contextPath, id) {
    return (contextPath ? contextPath + '.' : '') + id;
  }

  __exports__.appendContextPath = appendContextPath;
  return __exports__;
})(__module3__);

// handlebars/exception.js
var __module4__ = (function() {
  "use strict";
  var __exports__;

  var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

  function Exception(message, node) {
    var line;
    if (node && node.firstLine) {
      line = node.firstLine;

      message += ' - ' + line + ':' + node.firstColumn;
    }

    var tmp = Error.prototype.constructor.call(this, message);

    // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
    for (var idx = 0; idx < errorProps.length; idx++) {
      this[errorProps[idx]] = tmp[errorProps[idx]];
    }

    if (line) {
      this.lineNumber = line;
      this.column = node.firstColumn;
    }
  }

  Exception.prototype = new Error();

  __exports__ = Exception;
  return __exports__;
})();

// handlebars/base.js
var __module1__ = (function(__dependency1__, __dependency2__) {
  "use strict";
  var __exports__ = {};
  var Utils = __dependency1__;
  var Exception = __dependency2__;

  var VERSION = "2.0.0";
  __exports__.VERSION = VERSION;var COMPILER_REVISION = 6;
  __exports__.COMPILER_REVISION = COMPILER_REVISION;
  var REVISION_CHANGES = {
    1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
    2: '== 1.0.0-rc.3',
    3: '== 1.0.0-rc.4',
    4: '== 1.x.x',
    5: '== 2.0.0-alpha.x',
    6: '>= 2.0.0-beta.1'
  };
  __exports__.REVISION_CHANGES = REVISION_CHANGES;
  var isArray = Utils.isArray,
      isFunction = Utils.isFunction,
      toString = Utils.toString,
      objectType = '[object Object]';

  function HandlebarsEnvironment(helpers, partials) {
    this.helpers = helpers || {};
    this.partials = partials || {};

    registerDefaultHelpers(this);
  }

  __exports__.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
    constructor: HandlebarsEnvironment,

    logger: logger,
    log: log,

    registerHelper: function(name, fn) {
      if (toString.call(name) === objectType) {
        if (fn) { throw new Exception('Arg not supported with multiple helpers'); }
        Utils.extend(this.helpers, name);
      } else {
        this.helpers[name] = fn;
      }
    },
    unregisterHelper: function(name) {
      delete this.helpers[name];
    },

    registerPartial: function(name, partial) {
      if (toString.call(name) === objectType) {
        Utils.extend(this.partials,  name);
      } else {
        this.partials[name] = partial;
      }
    },
    unregisterPartial: function(name) {
      delete this.partials[name];
    }
  };

  function registerDefaultHelpers(instance) {
    instance.registerHelper('helperMissing', function(/* [args, ]options */) {
      if(arguments.length === 1) {
        // A missing field in a {{foo}} constuct.
        return undefined;
      } else {
        // Someone is actually trying to call something, blow up.
        throw new Exception("Missing helper: '" + arguments[arguments.length-1].name + "'");
      }
    });

    instance.registerHelper('blockHelperMissing', function(context, options) {
      var inverse = options.inverse,
          fn = options.fn;

      if(context === true) {
        return fn(this);
      } else if(context === false || context == null) {
        return inverse(this);
      } else if (isArray(context)) {
        if(context.length > 0) {
          if (options.ids) {
            options.ids = [options.name];
          }

          return instance.helpers.each(context, options);
        } else {
          return inverse(this);
        }
      } else {
        if (options.data && options.ids) {
          var data = createFrame(options.data);
          data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
          options = {data: data};
        }

        return fn(context, options);
      }
    });

    instance.registerHelper('each', function(context, options) {
      if (!options) {
        throw new Exception('Must pass iterator to #each');
      }

      var fn = options.fn, inverse = options.inverse;
      var i = 0, ret = "", data;

      var contextPath;
      if (options.data && options.ids) {
        contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
      }

      if (isFunction(context)) { context = context.call(this); }

      if (options.data) {
        data = createFrame(options.data);
      }

      if(context && typeof context === 'object') {
        if (isArray(context)) {
          for(var j = context.length; i<j; i++) {
            if (data) {
              data.index = i;
              data.first = (i === 0);
              data.last  = (i === (context.length-1));

              if (contextPath) {
                data.contextPath = contextPath + i;
              }
            }
            ret = ret + fn(context[i], { data: data });
          }
        } else {
          for(var key in context) {
            if(context.hasOwnProperty(key)) {
              if(data) {
                data.key = key;
                data.index = i;
                data.first = (i === 0);

                if (contextPath) {
                  data.contextPath = contextPath + key;
                }
              }
              ret = ret + fn(context[key], {data: data});
              i++;
            }
          }
        }
      }

      if(i === 0){
        ret = inverse(this);
      }

      return ret;
    });

    instance.registerHelper('if', function(conditional, options) {
      if (isFunction(conditional)) { conditional = conditional.call(this); }

      // Default behavior is to render the positive path if the value is truthy and not empty.
      // The `includeZero` option may be set to treat the condtional as purely not empty based on the
      // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
      if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
        return options.inverse(this);
      } else {
        return options.fn(this);
      }
    });

    instance.registerHelper('unless', function(conditional, options) {
      return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
    });

    instance.registerHelper('with', function(context, options) {
      if (isFunction(context)) { context = context.call(this); }

      var fn = options.fn;

      if (!Utils.isEmpty(context)) {
        if (options.data && options.ids) {
          var data = createFrame(options.data);
          data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
          options = {data:data};
        }

        return fn(context, options);
      } else {
        return options.inverse(this);
      }
    });

    instance.registerHelper('log', function(message, options) {
      var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
      instance.log(level, message);
    });

    instance.registerHelper('lookup', function(obj, field) {
      return obj && obj[field];
    });
  }

  var logger = {
    methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

    // State enum
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    level: 3,

    // can be overridden in the host environment
    log: function(level, message) {
      if (logger.level <= level) {
        var method = logger.methodMap[level];
        if (typeof console !== 'undefined' && console[method]) {
          console[method].call(console, message);
        }
      }
    }
  };
  __exports__.logger = logger;
  var log = logger.log;
  __exports__.log = log;
  var createFrame = function(object) {
    var frame = Utils.extend({}, object);
    frame._parent = object;
    return frame;
  };
  __exports__.createFrame = createFrame;
  return __exports__;
})(__module2__, __module4__);

// handlebars/runtime.js
var __module5__ = (function(__dependency1__, __dependency2__, __dependency3__) {
  "use strict";
  var __exports__ = {};
  var Utils = __dependency1__;
  var Exception = __dependency2__;
  var COMPILER_REVISION = __dependency3__.COMPILER_REVISION;
  var REVISION_CHANGES = __dependency3__.REVISION_CHANGES;
  var createFrame = __dependency3__.createFrame;

  function checkRevision(compilerInfo) {
    var compilerRevision = compilerInfo && compilerInfo[0] || 1,
        currentRevision = COMPILER_REVISION;

    if (compilerRevision !== currentRevision) {
      if (compilerRevision < currentRevision) {
        var runtimeVersions = REVISION_CHANGES[currentRevision],
            compilerVersions = REVISION_CHANGES[compilerRevision];
        throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
              "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
      } else {
        // Use the embedded version info since the runtime doesn't know about this revision yet
        throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
              "Please update your runtime to a newer version ("+compilerInfo[1]+").");
      }
    }
  }

  __exports__.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

  function template(templateSpec, env) {
    /* istanbul ignore next */
    if (!env) {
      throw new Exception("No environment passed to template");
    }
    if (!templateSpec || !templateSpec.main) {
      throw new Exception('Unknown template object: ' + typeof templateSpec);
    }

    // Note: Using env.VM references rather than local var references throughout this section to allow
    // for external users to override these as psuedo-supported APIs.
    env.VM.checkRevision(templateSpec.compiler);

    var invokePartialWrapper = function(partial, indent, name, context, hash, helpers, partials, data, depths) {
      if (hash) {
        context = Utils.extend({}, context, hash);
      }

      var result = env.VM.invokePartial.call(this, partial, name, context, helpers, partials, data, depths);

      if (result == null && env.compile) {
        var options = { helpers: helpers, partials: partials, data: data, depths: depths };
        partials[name] = env.compile(partial, { data: data !== undefined, compat: templateSpec.compat }, env);
        result = partials[name](context, options);
      }
      if (result != null) {
        if (indent) {
          var lines = result.split('\n');
          for (var i = 0, l = lines.length; i < l; i++) {
            if (!lines[i] && i + 1 === l) {
              break;
            }

            lines[i] = indent + lines[i];
          }
          result = lines.join('\n');
        }
        return result;
      } else {
        throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
      }
    };

    // Just add water
    var container = {
      lookup: function(depths, name) {
        var len = depths.length;
        for (var i = 0; i < len; i++) {
          if (depths[i] && depths[i][name] != null) {
            return depths[i][name];
          }
        }
      },
      lambda: function(current, context) {
        return typeof current === 'function' ? current.call(context) : current;
      },

      escapeExpression: Utils.escapeExpression,
      invokePartial: invokePartialWrapper,

      fn: function(i) {
        return templateSpec[i];
      },

      programs: [],
      program: function(i, data, depths) {
        var programWrapper = this.programs[i],
            fn = this.fn(i);
        if (data || depths) {
          programWrapper = program(this, i, fn, data, depths);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = program(this, i, fn);
        }
        return programWrapper;
      },

      data: function(data, depth) {
        while (data && depth--) {
          data = data._parent;
        }
        return data;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common && (param !== common)) {
          ret = Utils.extend({}, common, param);
        }

        return ret;
      },

      noop: env.VM.noop,
      compilerInfo: templateSpec.compiler
    };

    var ret = function(context, options) {
      options = options || {};
      var data = options.data;

      ret._setup(options);
      if (!options.partial && templateSpec.useData) {
        data = initData(context, data);
      }
      var depths;
      if (templateSpec.useDepths) {
        depths = options.depths ? [context].concat(options.depths) : [context];
      }

      return templateSpec.main.call(container, context, container.helpers, container.partials, data, depths);
    };
    ret.isTop = true;

    ret._setup = function(options) {
      if (!options.partial) {
        container.helpers = container.merge(options.helpers, env.helpers);

        if (templateSpec.usePartial) {
          container.partials = container.merge(options.partials, env.partials);
        }
      } else {
        container.helpers = options.helpers;
        container.partials = options.partials;
      }
    };

    ret._child = function(i, data, depths) {
      if (templateSpec.useDepths && !depths) {
        throw new Exception('must pass parent depths');
      }

      return program(container, i, templateSpec[i], data, depths);
    };
    return ret;
  }

  __exports__.template = template;function program(container, i, fn, data, depths) {
    var prog = function(context, options) {
      options = options || {};

      return fn.call(container, context, container.helpers, container.partials, options.data || data, depths && [context].concat(depths));
    };
    prog.program = i;
    prog.depth = depths ? depths.length : 0;
    return prog;
  }

  __exports__.program = program;function invokePartial(partial, name, context, helpers, partials, data, depths) {
    var options = { partial: true, helpers: helpers, partials: partials, data: data, depths: depths };

    if(partial === undefined) {
      throw new Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    }
  }

  __exports__.invokePartial = invokePartial;function noop() { return ""; }

  __exports__.noop = noop;function initData(context, data) {
    if (!data || !('root' in data)) {
      data = data ? createFrame(data) : {};
      data.root = context;
    }
    return data;
  }
  return __exports__;
})(__module2__, __module4__, __module1__);

// handlebars.runtime.js
var __module0__ = (function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__) {
  "use strict";
  var __exports__;
  /*globals Handlebars: true */
  var base = __dependency1__;

  // Each of these augment the Handlebars object. No need to setup here.
  // (This is done to easily share code between commonjs and browse envs)
  var SafeString = __dependency2__;
  var Exception = __dependency3__;
  var Utils = __dependency4__;
  var runtime = __dependency5__;

  // For compatibility and usage outside of module systems, make the Handlebars object a namespace
  var create = function() {
    var hb = new base.HandlebarsEnvironment();

    Utils.extend(hb, base);
    hb.SafeString = SafeString;
    hb.Exception = Exception;
    hb.Utils = Utils;
    hb.escapeExpression = Utils.escapeExpression;

    hb.VM = runtime;
    hb.template = function(spec) {
      return runtime.template(spec, hb);
    };

    return hb;
  };

  var Handlebars = create();
  Handlebars.create = create;

  Handlebars['default'] = Handlebars;

  __exports__ = Handlebars;
  return __exports__;
})(__module1__, __module3__, __module4__, __module2__, __module5__);

  return __module0__;
}));

},{}],26:[function(require,module,exports){
/*
 * catberry-handlebars
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-handlebars's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license applies to all parts of catberry-handlebars that are not externally
 * maintained libraries.
 */

'use strict';

var Handlebars = require('./lib/vendors/handlebars'),
	TemplateProvider = require('./lib/TemplateProvider');

module.exports = {
	register: function (locator, config) {
		config = config || {};
		locator.registerInstance('handlebars', Handlebars);
		locator.register('templateProvider', TemplateProvider, config, true);
	},
	Handlebars: Handlebars,
	TemplateProvider: TemplateProvider
};
},{"./lib/TemplateProvider":24,"./lib/vendors/handlebars":25}],27:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = Catberry;

var util = require('util'),
	CatberryBase = require('../lib/base/CatberryBase'),
	ServiceLocator = require('catberry-locator');

util.inherits(Catberry, CatberryBase);

/**
 * Creates new instance of the browser version of Catberry.
 * @constructor
 * @extends CatberryBase
 */
function Catberry() {
	CatberryBase.call(this);
}

/**
 * Current request router.
 * @type {RequestRouter}
 * @private
 */
Catberry.prototype._router = null;

/**
 * Wraps current HTML document with Catberry event handlers.
 */
Catberry.prototype.wrapDocument = function () {
	this._router = this.locator.resolve('requestRouter');
};

/**
 * Starts Catberry application when DOM is ready.
 * @returns {Promise} Promise for nothing.
 */
Catberry.prototype.startWhenReady = function () {
	if (window.catberry) {
		return Promise.resolve();
	}
	var self = this;

	return new Promise(function (fulfill) {
		window.document.addEventListener('DOMContentLoaded', function () {
			self.wrapDocument();
			window.catberry = self;
			fulfill();
		});
	});
};
},{"../lib/base/CatberryBase":40,"catberry-locator":50,"util":6}],28:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';
module.exports = CookieWrapper;

var util = require('util'),
	CookieWrapperBase = require('../lib/base/CookieWrapperBase');

util.inherits(CookieWrapper, CookieWrapperBase);

/**
 * Creates new instance of the browser cookie wrapper.
 * @constructor
 */
function CookieWrapper($window) {
	CookieWrapperBase.call(this);
	this._window = $window;
}

/**
 * Current browser window.
 * @type {Window}
 * @private
 */
CookieWrapper.prototype._window = null;

/**
 * Gets cookie value by name.
 * @param {string} name Cookie name.
 * @returns {string} Cookie value.
 */
CookieWrapper.prototype.get = function (name) {
	if (typeof(name) !== 'string') {
		return '';
	}
	if (!this._window.document.cookie) {
		return '';
	}
	var cookie = this._parseCookieString(
		this._window.document.cookie.toString());
	return cookie[name] || '';
};

/**
 * Sets cookie to this wrapper.
 * @param {Object} cookieSetup Cookie setup object.
 * @param {string} cookieSetup.key Cookie key.
 * @param {string} cookieSetup.value Cookie value.
 * @param {number?} cookieSetup.maxAge Max cookie age in seconds.
 * @param {Date?} cookieSetup.expires Expire date.
 * @param {string?} cookieSetup.path URI path for cookie.
 * @param {string?} cookieSetup.domain Cookie domain.
 * @param {boolean?} cookieSetup.secure Is cookie secured.
 * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
 * @returns {string} Cookie setup string.
 */
CookieWrapper.prototype.set = function (cookieSetup) {
	var cookie = this._convertToCookieSetup(cookieSetup);
	this._window.document.cookie = cookie;
	return cookie;
};
},{"../lib/base/CookieWrapperBase":41,"util":6}],29:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = DocumentRenderer;

var util = require('util'),
	errorHelper = require('../lib/helpers/errorHelper'),
	moduleHelper = require('../lib/helpers/moduleHelper'),
	DocumentRendererBase = require('../lib/base/DocumentRendererBase');

util.inherits(DocumentRenderer, DocumentRendererBase);

var HEAD_ID = '$$head',
	ERROR_CREATE_WRONG_ARGUMENTS = 'Tag name should be a string ' +
		'and attributes should be an object',
	ERROR_CREATE_WRONG_NAME = 'Component for tag "%s" not found',
	ERROR_CREATE_WRONG_ID = 'The ID is not specified or already used',
	TAG_NAMES = {
		TITLE: 'TITLE',
		HTML: 'HTML',
		HEAD: 'HEAD',
		BASE: 'BASE',
		STYLE: 'STYLE',
		SCRIPT: 'SCRIPT',
		NOSCRIPT: 'NOSCRIPT',
		META: 'META',
		LINK: 'LINK'
	},
	NODE_TYPES = {
		ELEMENT_NODE: 1,
		TEXT_NODE: 3,
		PROCESSING_INSTRUCTION_NODE: 7,
		COMMENT_NODE: 8
	};

/**
 * Creates new instance of the document renderer.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @constructor
 * @extends DocumentRendererBase
 */
function DocumentRenderer($serviceLocator) {
	DocumentRendererBase.call(this, $serviceLocator);
	this._componentInstances = {};
	this._componentElements = {};
	this._componentBindings = {};
	this._currentChangedStores = {};
	this._window = $serviceLocator.resolve('window');
	this._config = $serviceLocator.resolve('config');
	this._storeDispatcher = $serviceLocator.resolve('storeDispatcher');

	var self = this;
	this._eventBus.on('storeChanged', function (storeName) {
		self._currentChangedStores[storeName] = true;
		if (self._isStateChanging) {
			return;
		}
		self._updateStoreComponents();
	});
	// need to run all bind methods and events for components
	// have been rendered at server after all modules will be resolved from
	// Service Locator
	setTimeout(function () {
		self._initialWrap();
	}, 0);
}

/**
 * Current application config.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._config = null;

/**
 * Current store dispatcher.
 * @type {StoreDispatcher}
 * @private
 */
DocumentRenderer.prototype._storeDispatcher = null;

/**
 * Current set of component instances by unique keys.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._componentInstances = null;

/**
 * Current set of component elements by unique keys.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._componentElements = null;

/**
 * Current set of component bindings by unique keys.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._componentBindings = null;

/**
 * Current routing context.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._currentRoutingContext = null;

/**
 * Current set of changed stores.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._currentChangedStores = null;

/**
 * Current promise for rendered page.
 * @type {Promise}
 * @private
 */
DocumentRenderer.prototype._renderedPromise = null;

/**
 * Current state of updating components.
 * @type {boolean}
 * @private
 */
DocumentRenderer.prototype._isUpdating = false;

/**
 * Renders new state of application.
 * @param {Object} state New state of application.
 * @param {Object} routingContext Routing context.
 * @returns {Promise} Promise for nothing.
 */
DocumentRenderer.prototype.render = function (state, routingContext) {
	var self = this,
		components = this._componentLoader.getComponentsByNames();
	// we have to update all contexts of all components
	this._currentRoutingContext = routingContext;
	Object.keys(this._componentInstances)
		.forEach(function (id) {
			var instance = self._componentInstances[id];
			instance.$context = self._getComponentContext(
				components[instance.$context.name],
				instance.$context.element
			);
		});

	if (this._isStateChanging) {
		var changedAgain = this._storeDispatcher.setState(
			state, routingContext
		);
		changedAgain.forEach(function (name) {
			self._currentChangedStores[name] = true;
		});
		return this._renderedPromise;
	}

	// we should set this flag to avoid "storeChanged"
	// event handling for now
	this._isStateChanging = true;
	this._storeDispatcher.setState(state, routingContext);

	// and then we update all components of these stores in a batch.
	this._renderedPromise = self._updateStoreComponents()
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		})
		.then(function () {
			self._isStateChanging = false;
		});

	return this._renderedPromise;
};

/**
 * Renders component into HTML element.
 * @param {Element} element HTML element of component
 * @param {Object?} renderingContext Rendering context for group rendering.
 */
DocumentRenderer.prototype.renderComponent =
	function (element, renderingContext) {
		renderingContext = renderingContext || this._createRenderingContext([]);

		var self = this,
			componentName = moduleHelper.getOriginalComponentName(
					element.tagName
			),
			hadChildren = element.hasChildNodes(),
			component = renderingContext.components[componentName],
			id = getId(element),
			instance = this._componentInstances[id];

		if (!component) {
			return Promise.resolve();
		}

		if (!id || renderingContext.renderedIds.hasOwnProperty(id)) {
			return Promise.resolve();
		}

		renderingContext.renderedIds[id] = true;

		if (!instance) {
			component.constructor.prototype.$context =
				this._getComponentContext(component, element);
			instance = this._serviceLocator.resolveInstance(
				component.constructor, renderingContext.config
			);
			instance.$context = component.constructor.prototype.$context;
			this._componentInstances[id] = instance;
		}

		var eventArgs = {
			name: componentName,
			context: instance.$context
		};

		this._componentElements[id] = element;

		var startTime = Date.now();
		this._eventBus.emit('componentRender', eventArgs);

		return this._unbindAll(element, renderingContext)
			.catch(function (reason) {
				self._eventBus.emit('error', reason);
			})
			.then(function () {
				var renderMethod = moduleHelper.getMethodToInvoke(
					instance, 'render'
				);
				return moduleHelper.getSafePromise(renderMethod);
			})
			.then(function (dataContext) {
				return component.template.render(dataContext);
			})
			.then(function (html) {
				if (element.tagName === TAG_NAMES.HEAD) {
					self._mergeHead(element, html);
				} else {
					element.innerHTML = html;
				}
				var promises = self._findComponents(element, renderingContext)
					.map(function (innerComponent) {
						return self.renderComponent(
							innerComponent, renderingContext
						);
					});
				return Promise.all(promises);
			})
			.then(function () {
				eventArgs.time = Date.now() - startTime;
				self._eventBus.emit('componentRendered', eventArgs);
				return self._bindComponent(element);
			})
			.catch(function (reason) {
				return self._handleError(element, component, reason);
			})
			.then(function () {
				if (!hadChildren) {
					return;
				}
				self._collectRenderingGarbage(renderingContext);
			});
	};

/**
 * Gets component instance by ID.
 * @param {String} id Component ID.
 * @returns {Object} Component instance.
 */
DocumentRenderer.prototype.getComponentById = function (id) {
	return this._componentInstances[id] || null;
};

/**
 * Checks that every instance of component has element on the page and
 * removes all references to components removed from DOM.
 * @returns {Promise} Promise for nothing.
 */
DocumentRenderer.prototype.collectGarbage = function () {
	var self = this,
		promises = [];
	Object.keys(this._componentElements)
		.forEach(function (id) {
			if (id === HEAD_ID) {
				return;
			}
			var element = self._window.document.getElementById(id);
			if (element) {
				return;
			}

			var promise = self._unbindComponent(self._componentElements[id])
				.then(function () {
					delete self._componentElements[id];
					delete self._componentInstances[id];
					delete self._componentBindings[id];
				});
			promises.push(promise);
		});
	return Promise.all(promises);
};

/**
 * Creates and renders component element.
 * @param {String} tagName Name of HTML tag.
 * @param {Object} attributes Element attributes.
 * @returns {Promise<Element>} Promise for HTML element with rendered component.
 */
DocumentRenderer.prototype.createComponent = function (tagName, attributes) {
	if (typeof(tagName) !== 'string' || !attributes ||
		typeof(attributes) !== 'object') {
		return Promise.reject(
			new Error(ERROR_CREATE_WRONG_ARGUMENTS)
		);
	}

	var components = this._componentLoader.getComponentsByNames(),
		componentName = moduleHelper.getOriginalComponentName(tagName);
	if (moduleHelper.isHeadComponent(componentName) ||
		moduleHelper.isDocumentComponent(componentName) ||
		!components.hasOwnProperty(componentName)) {
		return Promise.reject(
			new Error(util.format(ERROR_CREATE_WRONG_NAME, tagName))
		);
	}

	var id = attributes[moduleHelper.ATTRIBUTE_ID];
	if (!id || this._componentInstances.hasOwnProperty(id)) {
		return Promise.reject(new Error(ERROR_CREATE_WRONG_ID));
	}

	var element = this._window.document.createElement(tagName);
	Object.keys(attributes)
		.forEach(function (attributeName) {
			element.setAttribute(attributeName, attributes[attributeName]);
		});

	return this.renderComponent(element)
		.then(function () {
			return element;
		});
};

/**
 * Clears all references to removed components during rendering process.
 * @param {Object} renderingContext Context of rendering.
 * @private
 */
DocumentRenderer.prototype._collectRenderingGarbage =
	function (renderingContext) {
		var self = this;
		Object.keys(renderingContext.unboundIds)
			.forEach(function (id) {
				// this component has been rendered again and we do not need to
				// remove it.
				if (renderingContext.renderedIds.hasOwnProperty(id)) {
					return;
				}

				delete self._componentElements[id];
				delete self._componentInstances[id];
				delete self._componentBindings[id];
			});
	};

/**
 * Unbinds all event handlers from specified component and all it's descendants.
 * @param {Element} element Component HTML element.
 * @param {Object} renderingContext Context of rendering.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._unbindAll = function (element, renderingContext) {
	var self = this,
		rootPromise = this._unbindComponent(element);

	if (!element.hasChildNodes()) {
		return rootPromise;
	}

	return rootPromise
		.then(function () {
			var promises = self._findComponents(element, renderingContext)
				.map(function (innerElement) {
					var id = getId(innerElement);
					renderingContext.unboundIds[id] = true;
					return self._unbindComponent(innerElement);
				});
			return Promise.all(promises);
		});
};

/**
 * Unbinds all event handlers from specified component.
 * @param {Element} element Component HTML element.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._unbindComponent = function (element) {
	var id = getId(element),
		self = this,
		instance = this._componentInstances[id];
	if (!instance) {
		return Promise.resolve();
	}
	if (this._componentBindings.hasOwnProperty(id)) {
		Object.keys(this._componentBindings[id])
			.forEach(function (eventName) {
				element.removeEventListener(
					eventName, self._componentBindings[id][eventName].handler
				);
			});
		delete this._componentBindings[id];
	}
	var unbindMethod = moduleHelper.getMethodToInvoke(instance, 'unbind');
	return moduleHelper.getSafePromise(unbindMethod)
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		});
};

/**
 * Binds all required event handlers to component.
 * @param {Element} element Component HTML element.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._bindComponent = function (element) {
	var id = getId(element),
		self = this,
		instance = this._componentInstances[id];
	if (!instance) {
		return Promise.resolve();
	}

	var bindMethod = moduleHelper.getMethodToInvoke(instance, 'bind');
	return moduleHelper.getSafePromise(bindMethod)
		.then(function (bindings) {
			if (!bindings || typeof(bindings) !== 'object') {
				return;
			}
			self._componentBindings[id] = {};
			Object.keys(bindings)
				.forEach(function (eventName) {
					var selectorHandlers = {};
					Object.keys(bindings[eventName])
						.forEach(function (selector) {
							var handler = bindings[eventName][selector];
							if (typeof(handler) !== 'function') {
								return;
							}
							selectorHandlers[selector] = handler.bind(instance);
						});
					self._componentBindings[id][eventName] = {
						handler: self._createBindingHandler(
							element, selectorHandlers
						),
						selectorHandlers: selectorHandlers
					};
					element.addEventListener(
						eventName,
						self._componentBindings[id][eventName].handler
					);
				});
			self._eventBus.emit('componentBound', {
				element: element,
				id: id
			});
		});
};

/**
 * Creates universal event handler for delegated events.
 * @param {Element} componentRoot Root element of component.
 * @param {Object} selectorHandlers Map of event handlers by CSS selectors.
 * @returns {Function} Universal event handler for delegated events.
 * @private
 */
DocumentRenderer.prototype._createBindingHandler =
	function (componentRoot, selectorHandlers) {
		var selectors = Object.keys(selectorHandlers);
		return function (event) {
			var dispatchedEvent = createCustomEvent(event, function () {
					return element;
				}),
				element = event.target,
				targetMatches = getMatchesMethod(element),
				isHandled = false;
			selectors.every(function (selector) {
				if (!targetMatches(selector)) {
					return true;
				}
				isHandled = true;
				selectorHandlers[selector](dispatchedEvent);
				return false;
			});
			if (isHandled) {
				//event.stopPropagation();
				return;
			}

			while(element !== componentRoot) {
				element = element.parentNode;
				targetMatches = getMatchesMethod(element);
				for (var i = 0; i < selectors.length; i++) {
					if (!targetMatches(selectors[i])) {
						continue;
					}
					isHandled = true;
					selectorHandlers[selectors[i]](dispatchedEvent);
					break;
				}

				if (isHandled) {
					//event.stopPropagation();
					break;
				}
			}
		};
	};

/**
 * Finds all descendant components of specified component element.
 * @param {Element} element Root component HTML element to begin search with.
 * @param {Object} renderingContext Context of rendering.
 * @private
 */
DocumentRenderer.prototype._findComponents =
	function (element, renderingContext) {
		var components = [];
		renderingContext.componentTags
			.forEach(function (tag) {
				var nodes = element.getElementsByTagName(tag);
				for(var i = 0; i < nodes.length; i++) {
					components.push(nodes[i]);
				}
			});
		return components;
	};

/**
 * Handles error while rendering.
 * @param {Element} element Component HTML element.
 * @param {Object} component Component instance.
 * @param {Error} error Error to handle.
 * @returns {Promise|null} Promise for nothing or null.
 * @private
 */
DocumentRenderer.prototype._handleError = function (element, component, error) {
	this._eventBus.emit('error', error);

	// do not corrupt existed HEAD when error occurs
	if (element.tagName === TAG_NAMES.HEAD) {
		return null;
	}

	if (!this._config.isRelease && error instanceof Error) {
		element.innerHTML = errorHelper.prettyPrint(
			error, this._window.navigator.userAgent
		);
	} else if (component.errorTemplate) {
		return component.errorTemplate.render(error)
			.then(function (html) {
				element.innerHTML = html;
			});
	} else {
		element.innerHTML = '';
	}

	return null;
};

/**
 * Updates all components that depend on current set of changed stores.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._updateStoreComponents = function () {
	if (this._isUpdating) {
		return Promise.resolve();
	}
	var changed = Object.keys(this._currentChangedStores);
	if (changed.length === 0) {
		return Promise.resolve();
	}
	this._currentChangedStores = {};
	var self = this,
		renderingContext = this._createRenderingContext(changed),
		promises = renderingContext.roots.map(function (root) {
			return self.renderComponent(root, renderingContext);
		});

	this._isUpdating = true;
	return Promise.all(promises)
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		})
		.then(function () {
			self._isUpdating = false;
			self._eventBus.emit('documentUpdated', changed);
			return self._updateStoreComponents();
		});
};

/**
 * Merges new and existed head elements and change only difference.
 * @param {Element} head HEAD DOM element.
 * @param {string} htmlText HTML of new HEAD element content.
 * @private
 */
/*jshint maxcomplexity:false */
DocumentRenderer.prototype._mergeHead = function (head, htmlText) {
	var self = this,
		newHead = this._window.document.createElement('head');
	newHead.innerHTML = htmlText;

	var map = this._getHeadMap(head.childNodes),
		current, i, key, oldKey, oldItem,
		sameMetaElements = {};

	for (i = 0; i < newHead.childNodes.length; i++) {
		current = newHead.childNodes[i];

		if (!map.hasOwnProperty(current.nodeName)) {
			map[current.nodeName] = {};
		}

		switch (current.nodeName) {
			// these elements can be only replaced
			case TAG_NAMES.TITLE:
			case TAG_NAMES.BASE:
			case TAG_NAMES.NOSCRIPT:
				key = this._getNodeKey(current);
				oldItem = head.getElementsByTagName(current.nodeName)[0];
				if (oldItem) {
					oldKey = this._getNodeKey(oldItem);
					head.replaceChild(current, oldItem);
				} else {
					head.appendChild(current);
				}
				// when we do replace or append current is removed from newHead
				// therefore we need to decrement index
				i--;
				break;

			// these elements can not be deleted from head
			// therefore we just add new elements that differs from existed
			case TAG_NAMES.STYLE:
			case TAG_NAMES.LINK:
			case TAG_NAMES.SCRIPT:
				key = self._getNodeKey(current);
				if (!map[current.nodeName].hasOwnProperty(key)) {
					head.appendChild(current);
					i--;
				}
				break;
			// meta and other elements can be deleted
			// but we should not delete and append same elements
			default:
				key = self._getNodeKey(current);
				if (map[current.nodeName].hasOwnProperty(key)) {
					sameMetaElements[key] = true;
				} else {
					head.appendChild(current);
					i--;
				}
				break;
		}
	}

	if (map.hasOwnProperty(TAG_NAMES.META)) {
		// remove meta tags which a not in a new head state
		Object.keys(map[TAG_NAMES.META])
			.forEach(function (metaKey) {
				if (sameMetaElements.hasOwnProperty(metaKey)) {
					return;
				}

				head.removeChild(map[TAG_NAMES.META][metaKey]);
			});
	}
};

/**
 * Gets map of all HEAD's elements.
 * @param {NodeList} headChildren Head children DOM nodes.
 * @returns {Object} Map of HEAD elements.
 * @private
 */
DocumentRenderer.prototype._getHeadMap = function (headChildren) {
	// Create map of <meta>, <link>, <style> and <script> tags
	// by unique keys that contain attributes and content
	var map = {},
		i, current,
		self = this;

	for (i = 0; i < headChildren.length; i++) {
		current = headChildren[i];
		if (!map.hasOwnProperty(current.nodeName)) {
			map[current.nodeName] = {};
		}
		map[current.nodeName][self._getNodeKey(current)] = current;
	}
	return map;
};

/**
 * Gets unique element key using element's attributes and its content.
 * @param {Node} node HTML element.
 * @returns {string} Unique key for element.
 * @private
 */
DocumentRenderer.prototype._getNodeKey = function (node) {
	var current, i,
		attributes = [];

	if (node.nodeType !== NODE_TYPES.ELEMENT_NODE) {
		return node.nodeValue || '';
	}

	if (node.hasAttributes()) {
		for (i = 0; i < node.attributes.length; i++) {
			current = node.attributes[i];
			attributes.push(current.name + '=' + current.value);
		}
	}

	return attributes
			.sort()
			.join('|') + '>' + node.textContent;
};

/**
 * Does initial wrapping for every component on the page.
 * @private
 */
DocumentRenderer.prototype._initialWrap = function () {
	var self = this,
		current, i, id, instance,
		components = this._componentLoader.getComponentsByNames(),
		bindPromises = [];

	Object.keys(components)
		.forEach(function (componentName) {
			var tagName = moduleHelper
					.getTagNameForComponentName(componentName),
				elements = self._window.document
					.getElementsByTagName(tagName),
				constructor = components[componentName].constructor;

			for (i = 0; i < elements.length; i++) {
				current = elements[i];
				id = current.getAttribute(moduleHelper.ATTRIBUTE_ID);
				if (!id) {
					continue;
				}

				constructor.prototype.$context = self._getComponentContext(
					components[componentName], current
				);
				instance = self._serviceLocator.resolveInstance(
					constructor, self._config
				);
				instance.$context = constructor.prototype.$context;

				self._componentInstances[id] = instance;
				self._eventBus.emit('componentRendered', {
					name: componentName,
					attributes: instance.$context.attributes,
					context: instance.$context
				});
				bindPromises.push(self._bindComponent(current));
			}
		});

	return Promise.all(bindPromises)
		.then(function () {
			self._eventBus.emit('documentRendered', self._currentRoutingContext);
		});
};

/**
 * Gets component context using basic context.
 * @param {Object} component Component details.
 * @param {Element} element DOM element of component.
 * @returns {Object} Component context.
 * @private
 */
DocumentRenderer.prototype._getComponentContext =
	function (component, element) {
		var self = this,
			storeName = element.getAttribute(moduleHelper.ATTRIBUTE_STORE),
			componentContext = Object.create(this._currentRoutingContext);

		componentContext.element = element;
		componentContext.name = component.name;
		componentContext.attributes = attributesToObject(element.attributes);
		componentContext.getComponentById = function (id) {
			return self.getComponentById(id);
		};
		componentContext.createComponent = function (tagName, attributes) {
			return self.createComponent(tagName, attributes);
		};
		componentContext.collectGarbage = function () {
			return self.collectGarbage();
		};
		componentContext.getStoreData = function () {
			return self._storeDispatcher
				.getStoreData(storeName);
		};
		componentContext.sendAction = function (name, args) {
			return self._storeDispatcher
				.sendAction(storeName, name, args);
		};
		componentContext.sendBroadcastAction = function (name, args) {
			return self._storeDispatcher
				.sendBroadcastAction(name, args);
		};

		return componentContext;
	};

/**
 * Finds all rendering roots on page for all changed stores.
 * @param {Array} changedStoreNames List of store names which has been changed.
 * @returns {Array<Element>} HTML elements that are rendering roots.
 * @private
 */
DocumentRenderer.prototype._findRenderingRoots = function (changedStoreNames) {
	var self = this,
		headStore = this._window.document.head.getAttribute(
			moduleHelper.ATTRIBUTE_STORE
		),
		components = this._componentLoader.getComponentsByNames(),
		componentsElements = {},
		storeNamesSet = {},
		rootsSet = {},
		roots = [];

	// we should find all components and then looking for roots
	changedStoreNames
		.forEach(function (storeName) {
			storeNamesSet[storeName] = true;
			componentsElements[storeName] = self._window.document
				.querySelectorAll(
					'[' +
					moduleHelper.ATTRIBUTE_ID +
					']' +
					'[' +
					moduleHelper.ATTRIBUTE_STORE +
					'="' +
					storeName +
					'"]'
				);
		});

	if (components.hasOwnProperty(moduleHelper.HEAD_COMPONENT_NAME) &&
		storeNamesSet.hasOwnProperty(headStore)) {
		rootsSet[getId(this._window.document.head)] = true;
		roots.push(this._window.document.head);
	}
	changedStoreNames
		.forEach(function (storeName) {
			var current, currentId,
				lastRoot, lastRootId,
				currentStore, currentComponentName;

			for (var i = 0; i < componentsElements[storeName].length; i++) {
				current = componentsElements[storeName][i];
				currentId = componentsElements[storeName][i]
					.getAttribute(moduleHelper.ATTRIBUTE_ID);
				lastRoot = current;
				lastRootId = currentId;
				currentComponentName = moduleHelper.getOriginalComponentName(
					current.tagName
				);

				while (current.tagName !== TAG_NAMES.HTML) {
					current = current.parentNode;
					currentId = getId(current);
					currentStore = current.getAttribute(
						moduleHelper.ATTRIBUTE_STORE
					);

					// store did not change state
					if (!currentStore ||
						!storeNamesSet.hasOwnProperty(currentStore)) {
						continue;
					}

					//// is not an active component
					if (!components.hasOwnProperty(currentComponentName)) {
						continue;
					}

					lastRoot = current;
					lastRootId = currentId;
				}
				if (rootsSet.hasOwnProperty(lastRootId)) {
					continue;
				}
				rootsSet[lastRootId] = true;
				roots.push(lastRoot);
			}
		});

	return roots;
};

/**
 * Creates rendering context.
 * @param {Array?} changedStores Names of changed stores.
 * @returns {{
 *   config: Object,
 *   renderedIds: {},
 *   unboundIds: {},
 *   isHeadRendered: Boolean,
 *   bindMethods: Array,
 *   routingContext: Object,
 *   components: Object,
 *   componentTags: Array,
 *   roots: Array.<Element>
 * }}
 * @private
 */
DocumentRenderer.prototype._createRenderingContext = function (changedStores) {
	var components = this._componentLoader.getComponentsByNames(),
		componentTags = Object.keys(components)
			.map(function (name) {
				return moduleHelper.getTagNameForComponentName(name);
			});
	return {
		config: this._config,
		renderedIds: {},
		unboundIds: {},
		isHeadRendered: false,
		bindMethods: [],
		routingContext: this._currentRoutingContext,
		components: components,
		componentTags: componentTags,
		roots: changedStores ? this._findRenderingRoots(changedStores) : []
	};
};

/**
 * Converts NamedNodeMap of Attr items to key-value object map.
 * @param {NamedNodeMap} attributes List of Element attributes.
 * @returns {Object} Map of attribute values by names.
 */
function attributesToObject(attributes) {
	var result = {};
	for (var i = 0; i < attributes.length; i++) {
		result[attributes[i].name] = attributes[i].value;
	}
	return result;
}

/**
 * Gets ID of the element.
 * @param {Element} element HTML element of component.
 * @returns {string} ID.
 */
function getId(element) {
	return element.tagName === TAG_NAMES.HEAD ?
		HEAD_ID :
		element.getAttribute(moduleHelper.ATTRIBUTE_ID);
}

/**
 * Gets cross-browser "matches" method for the element.
 * @param {Element} element HTML element.
 * @returns {Function} "matches" method.
 */
function getMatchesMethod(element) {
	var method =  (element.matches ||
		element.webkitMatchesSelector ||
		element.mozMatchesSelector ||
		element.oMatchesSelector ||
		element.msMatchesSelector);

	return method.bind(element);
}

/**
 * Creates imitation of original Event object but with specified currentTarget.
 * @param {Event} event Original event object.
 * @param {Function} currentTargetGetter Getter for currentTarget.
 * @returns {Event} Wrapped event.
 */
function createCustomEvent(event, currentTargetGetter) {
	var catEvent = Object.create(event),
		keys = [],
		properties = {};
	for(var key in event) {
		keys.push(key);
	}
	keys.forEach(function (key) {
		if (typeof(event[key]) === 'function') {
			properties[key] = {
				get: function () {
					return event[key].bind(event);
				}
			};
			return;
		}

		properties[key] = {
			get: function () {
				return event[key];
			},
			set: function (value) {
				event[key] = value;
			}
		};
	});

	properties.currentTarget = {
		get: currentTargetGetter
	};
	Object.defineProperties(catEvent, properties);
	Object.seal(catEvent);
	Object.freeze(catEvent);
	return catEvent;
}
},{"../lib/base/DocumentRendererBase":42,"../lib/helpers/errorHelper":44,"../lib/helpers/moduleHelper":45,"util":6}],30:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = Logger;

var LEVELS = {
	TRACE: 'trace',
	INFO: 'info',
	WARN: 'warn',
	ERROR: 'error',
	FATAL: 'fatal'
};

/**
 * Creates browser logger.
 * @param {Object|string} levels Levels to log.
 * @supported Chrome, Firefox>=2.0, Internet Explorer>=8, Opera, Safari.
 * @constructor
 */
function Logger(levels) {
	if (typeof (levels) === 'object') {
		this._levels = levels;
	}

	if (typeof(levels) === 'string') {
		this._levels = {};
		Object.keys(LEVELS)
			.forEach(function (level) {
				this._levels[LEVELS[level]] =
					(levels.search(LEVELS[level]) !== -1);
			}, this);
	}

	this.trace = this.trace.bind(this);
	this.info = this.info.bind(this);
	this.warn = this.warn.bind(this);
	this.error = this.error.bind(this);
	this.fatal = this.fatal.bind(this);
}

/**
 * Current levels of logging.
 * @type {Object}
 * @private
 */
Logger.prototype._levels = {
	trace: true,
	info: true,
	warn: true,
	error: true,
	fatal: true
};

/**
 * Logs trace message.
 * @param {string} message Trace message.
 */
Logger.prototype.trace = function (message) {
	if (!this._levels.trace) {
		return;
	}

	if (console.log) {
		console.log(message);
	}
};

/**
 * Logs info message.
 * @param {string} message Information message.
 */
Logger.prototype.info = function (message) {
	if (!this._levels.info) {
		return;
	}

	if (console.info) {
		console.info(message);
	}
};

/**
 * Logs warn message.
 * @param {string} message Warning message.
 */
Logger.prototype.warn = function (message) {
	if (!this._levels.warn) {
		return;
	}

	if (console.warn) {
		console.warn(message);
	}
};
/**
 * Logs error message.
 * @param {string|Error} error Error object or message.
 */
Logger.prototype.error = function (error) {
	if (!this._levels.error) {
		return;
	}

	writeError(error);
};

/**
 * Logs error message.
 * @param {string|Error} error Error object or message.
 */
Logger.prototype.fatal = function (error) {
	if (!this._levels.fatal) {
		return;
	}
	writeError(error);
};

/**
 * Writes error to console.
 * @param {Error|string} error Error to write.
 */
function writeError(error) {
	try {
		if (!(error instanceof Error)) {
			error = typeof(error) === 'string' ? new Error(error) : new Error();
		}
		if (console.error) {
			console.error(error);
		}
	} catch (e) {
		writeError(e);
	}
}
},{}],31:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = RequestRouter;

var util = require('util'),
	URI = require('catberry-uri').URI;

var MOUSE_KEYS = {
		LEFT: 0,
		MIDDLE: 1
	},

	HREF_ATTRIBUTE_NAME = 'href',
	TARGET_ATTRIBUTE_NAME = 'target',
	A_TAG_NAME = 'A',
	BODY_TAG_NAME = 'BODY';

/**
 * Creates new instance of the browser request router.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve services.
 * @constructor
 */
function RequestRouter($serviceLocator) {
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._window = $serviceLocator.resolve('window');
	this._documentRenderer = $serviceLocator.resolve('documentRenderer');
	this._stateProvider = $serviceLocator.resolve('stateProvider');
	this._contextFactory = $serviceLocator.resolve('contextFactory');

	this._isHistorySupported = this._window.history &&
		this._window.history.pushState instanceof Function;
	this._wrapDocument();
	var self = this;
	this._changeState(new URI(this._window.location.toString()))
		.then(function () {
			self._eventBus.emit('ready');
		});
}

/**
 * Current referrer.
 * @type {URI}
 * @private
 */
RequestRouter.prototype._referrer = '';

/**
 * Current location.
 * @type {URI}
 * @private
 */
RequestRouter.prototype._location = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
RequestRouter.prototype._eventBus = null;

/**
 * Current context factory.
 * @type {ContextFactory}
 * @private
 */
RequestRouter.prototype._contextFactory = null;

/**
 * Current state provider.
 * @type {StateProvider}
 * @private
 */
RequestRouter.prototype._stateProvider = null;

/**
 * Current document renderer.
 * @type {DocumentRenderer}
 * @private
 */
RequestRouter.prototype._documentRenderer = null;

/**
 * Current browser window.
 * @type {Window}
 * @private
 */
RequestRouter.prototype._window = null;

/**
 * True if current browser supports history API.
 * @type {boolean}
 * @private
 */
RequestRouter.prototype._isHistorySupported = false;

/**
 * Routes browser render request.
 * @returns {Promise} Promise for nothing.
 */
RequestRouter.prototype.route = function () {
	var self = this;
	// because now location was not change yet and
	// different browsers handle `popstate` differently
	// we need to do route in next iteration of event loop
	return new Promise(function (fulfill, reject) {
		var newLocation = new URI(self._window.location.toString()),
			newAuthority = newLocation.authority ?
				newLocation.authority.toString() : null,
			currentAuthority = self._location.authority ?
				self._location.authority.toString() : null;

		if (newLocation.scheme !== self._location.scheme ||
			newAuthority !== currentAuthority) {
			fulfill();
			return;
		}

		// if only URI fragment is changed
		var newQuery = newLocation.query ?
			newLocation.query.toString() : null,
			currentQuery = self._location.query ?
				self._location.query.toString() : null;
		if (newLocation.path === self._location.path &&
			newQuery === currentQuery) {
			self._location = newLocation;
			fulfill();
			return;
		}

		self._changeState(newLocation)
			.then(fulfill)
			.catch(reject);
	});
};

/**
 * Sets application state to specified URI.
 * @param {string} locationString URI to go.
 * @returns {Promise} Promise for nothing.
 */
RequestRouter.prototype.go = function (locationString) {
	var location = new URI(locationString);
	location = location.resolveRelative(this._location);
	locationString = location.toString();

	var currentAuthority = this._location.authority ?
			this._location.authority.toString() : null,
		newAuthority = location.authority ?
			location.authority.toString() : null;
	// we must check if this is an external link before map URI
	// to internal application state
	if (!this._isHistorySupported ||
		location.scheme !== this._location.scheme ||
		newAuthority !== currentAuthority) {
		this._window.location.assign(locationString);
		return Promise.resolve();
	}

	var state = this._stateProvider.getStateByUri(location);
	if (!state) {
		this._window.location.assign(locationString);
		return Promise.resolve();
	}

	this._window.history.pushState(state, '', locationString);
	return this.route();
};

/**
 * Changes current application state with new location.
 * @param {URI} newLocation New location.
 * @returns {Promise} Promise for nothing.
 * @private
 */
RequestRouter.prototype._changeState = function (newLocation) {
	this._location = newLocation;
	var state = this._stateProvider.getStateByUri(newLocation),
		routingContext = this._contextFactory.create({
			referrer: this._referrer || this._window.document.referrer,
			location: this._location,
			userAgent: this._window.navigator.userAgent
		});

	var self = this;
	return this._documentRenderer
		.render(state, routingContext)
		.then(function () {
			self._referrer = self._location;
		});
};

/**
 * Wraps document with required events to route requests.
 * @private
 */
RequestRouter.prototype._wrapDocument = function () {
	var self = this;

	if (!this._isHistorySupported) {
		return;
	}

	this._window.addEventListener('popstate', function () {
		self.route().catch(self._handleError.bind(self));
	});

	this._window.document.body.addEventListener('click', function (event) {
		if (event.target.tagName === A_TAG_NAME) {
			self._linkClickHandler(event, event.target)
				.catch(self._handleError.bind(self));
		} else {
			var link = closestLink(event.target);
			if (!link) {
				return;
			}
			self._linkClickHandler(event, link)
				.catch(self._handleError.bind(self));
		}
	});
};

/**
 * Handles link click on the page.
 * @param {Event} event Event-related object.
 * @param {Element} element Link element.
 * @returns {Promise} Promise for nothing.
 * @private
 */
RequestRouter.prototype._linkClickHandler = function (event, element) {
	var targetAttribute = element.getAttribute(TARGET_ATTRIBUTE_NAME);
	if (targetAttribute) {
		return Promise.resolve();
	}

	// if middle mouse button was clicked
	if (event.button === MOUSE_KEYS.MIDDLE) {
		return Promise.resolve();
	}

	var locationString = element.getAttribute(HREF_ATTRIBUTE_NAME);
	if (!locationString) {
		return Promise.resolve();
	}

	event.preventDefault();
	return this.go(locationString);
};

/**
 * Handles all errors.
 * @param {Error} error Error to handle.
 * @private
 */
RequestRouter.prototype._handleError = function (error) {
	this._eventBus.emit('error', error);
};

/**
 * Finds the closest ascending "A" element node.
 * @param {Node} element DOM element.
 * @returns {Node|null} The closest "A" element or null.
 */
function closestLink(element) {
	while(element.nodeName !== A_TAG_NAME &&
		element.nodeName !== BODY_TAG_NAME) {
		element = element.parentNode;
	}
	return element.nodeName === A_TAG_NAME ? element : null;
}
},{"catberry-uri":54,"util":6}],32:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = ComponentLoader;

var moduleHelper = require('../../lib/helpers/moduleHelper');

/**
 * Creates new instance of the component loader.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @constructor
 */
function ComponentLoader($serviceLocator) {
	this._serviceLocator = $serviceLocator;
	this._contextFactory = $serviceLocator.resolve('contextFactory');
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._templateProvider = $serviceLocator.resolve('templateProvider');
}

/**
 * Current context factory.
 * @type {ContextFactory}
 * @private
 */
ComponentLoader.prototype._contextFactory = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
ComponentLoader.prototype._eventBus = null;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
ComponentLoader.prototype._serviceLocator = null;

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
ComponentLoader.prototype._templateProvider = null;

/**
 * Current map of loaded components by names.
 * @type {Object} Map of components by names.
 * @private
 */
ComponentLoader.prototype._loadedComponents = null;

/**
 * Loads components when it is in a browser.
 * @returns {Promise} Promise for nothing.
 */
ComponentLoader.prototype.load = function () {
	var self = this,
		components = {};

	this._serviceLocator.resolveAll('component')
		.forEach(function (component) {
			var componentContext = Object.create(
				self._contextFactory.createStub()
			);
			componentContext.name = component.name;
			component.constructor.prototype.$context = componentContext;

			components[component.name] = Object.create(component);
			self._templateProvider.registerCompiled(
				component.name, component.templateSource
			);
			components[component.name].template = {
				render: function (dataContext) {
					return self._templateProvider.render(
						component.name, dataContext
					);
				}
			};
			if (typeof(component.errorTemplateSource) === 'string') {
				var errorTemplateName = moduleHelper.getNameForErrorTemplate(
					component.name
				);
				self._templateProvider.registerCompiled(
					errorTemplateName, component.errorTemplateSource
				);
				components[component.name].errorTemplate = {
					render: function (dataContext) {
						return self._templateProvider.render(
							errorTemplateName, dataContext
						);
					}
				};
			}
			self._eventBus.emit('componentLoaded', components[component.name]);
		});
	this._loadedComponents = components;
	this._eventBus.emit('allComponentsLoaded', components);
	return Promise.resolve(components);
};

/**
 * Gets map of components by names.
 * @returns {Object} Map of components by names.
 */
ComponentLoader.prototype.getComponentsByNames = function () {
	return this._loadedComponents || {};
};
},{"../../lib/helpers/moduleHelper":45}],33:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = StoreLoader;

/**
 * Creates instance of the store loader.
 * @param {ServiceLocator} $serviceLocator Locator to resolve stores.
 * @constructor
 */
function StoreLoader($serviceLocator) {
	this._serviceLocator = $serviceLocator;
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._contextFactory = $serviceLocator.resolve('contextFactory');
}

/**
 * Current context factory.
 * @type {ContextFactory}
 * @private
 */
StoreLoader.prototype._contextFactory = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
StoreLoader.prototype._eventBus = null;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
StoreLoader.prototype._serviceLocator = null;

/**
 * Current set of loaded stores.
 * @type {Object}
 * @private
 */
StoreLoader.prototype._loadedStores = null;

/**
 * Loads all stores when it is in a browser.
 * @returns {Promise} Promise for nothing.
 */
StoreLoader.prototype.load = function () {
	var self = this,
		stores = {};
	this._serviceLocator.resolveAll('store')
		.forEach(function (store) {
			var storeContext = Object.create(self._contextFactory.createStub());
			storeContext.name = store.name;
			store.constructor.prototype.$context = storeContext;
			stores[store.name] = store;
			self._eventBus.emit('storeLoaded', stores[store.name]);
		});
	this._loadedStores = stores;
	this._eventBus.emit('allStoresLoaded', stores);
	return Promise.resolve(stores);
};

/**
 * Gets stores map by names.
 * @returns {Object} Map of stores by names.
 */
StoreLoader.prototype.getStoresByNames = function () {
	return this._loadedStores || {};
};
},{}],34:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = ModuleApiProvider;

var util = require('util'),
	propertyHelper = require('../../lib/helpers/propertyHelper'),
	ModuleApiProviderBase = require('../../lib/base/ModuleApiProviderBase'),
	moduleHelper = require('../../lib/helpers/moduleHelper');

util.inherits(ModuleApiProvider, ModuleApiProviderBase);

/**
 * Creates new instance of the module API provider.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @constructor
 * @extends ModuleApiProviderBase
 */
function ModuleApiProvider($serviceLocator) {
	ModuleApiProviderBase.call(this, $serviceLocator);
	propertyHelper.defineReadOnly(this, 'isBrowser', true);
	propertyHelper.defineReadOnly(this, 'isServer', false);
}

/**
 * Redirects current page to specified URI.
 * @param {string} uriString URI to redirect.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.redirect = function (uriString) {
	var requestRouter = this._serviceLocator.resolve('requestRouter');
	return requestRouter.go(uriString);
};

/**
 * Clears current location URI's fragment.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.clearFragment = function () {
	var window = this._serviceLocator.resolve('window'),
		position = window.document.body.scrollTop;
	window.location.hash = '';
	window.document.body.scrollTop = position;
	return Promise.resolve();
};
},{"../../lib/base/ModuleApiProviderBase":43,"../../lib/helpers/moduleHelper":45,"../../lib/helpers/propertyHelper":46,"util":6}],35:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = require('./lib/Bootstrapper');

},{"./lib/Bootstrapper":67}],36:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = ContextFactory;

var URI = require('catberry-uri').URI,
	propertyHelper = require('./helpers/propertyHelper');

/**
 * Creates new instance of the context factory.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @constructor
 */
function ContextFactory($serviceLocator) {
	this._serviceLocator = $serviceLocator;
}

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
ContextFactory.prototype._serviceLocator = null;

/**
 * Creates new context for modules.
 * @param {Object} additional Additional parameters.
 * @param {URI} additional.referrer Current referrer.
 * @param {URI} additional.location Current location.
 * @param {String} additional.userAgent Current user agent.
 */
ContextFactory.prototype.create = function (additional) {
	var apiProvider = this._serviceLocator.resolve('moduleApiProvider'),
		context = Object.create(apiProvider);
	context.cookie = this._serviceLocator.resolve('cookieWrapper');
	Object.keys(additional)
		.forEach(function (key) {
			propertyHelper.defineReadOnly(context, key, additional[key]);
		});
	return context;
};

/**
 * Creates context stub.
 * @returns {Object} Stub context object.
 */
ContextFactory.prototype.createStub = function () {
	return this.create({
		referrer: new URI(),
		location: new URI(),
		userAgent: ''
	});
};
},{"./helpers/propertyHelper":46,"catberry-uri":54}],37:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = SerialWrapper;

var events = require('events');

var ERROR_NO_SUCH_METHOD = 'There is no such registered method';

/**
 * Creates new instance of the serial wrapper for promises.
 * @constructor
 */
function SerialWrapper() {
	this._emitter = new events.EventEmitter();
	this._emitter.setMaxListeners(0);
	this._toInvoke = {};
	this._inProgress = {};
}

/**
 * Current event emitter.
 * @type {EventEmitter}
 * @private
 */
SerialWrapper.prototype._emitter = null;

/**
 * Current set of named methods to invoke.
 * @type {Object}
 * @private
 */
SerialWrapper.prototype._toInvoke = null;

/**
 * Current set of flags if the method is in progress.
 * @type {Object}
 * @private
 */
SerialWrapper.prototype._inProgress = null;

/**
 * Adds method to the set.
 * @param {String} name Method name.
 * @param {Function} toInvoke Function that returns promise.
 */
SerialWrapper.prototype.add = function (name, toInvoke) {
	this._toInvoke[name] = toInvoke;
};

/**
 * Returns true if method with such name was registered to the set.
 * @param {String} name Name of method.
 * @returns {boolean} True if method name is registered.
 */
SerialWrapper.prototype.isRegistered = function (name) {
	return typeof(this._toInvoke[name]) === 'function';
};

/**
 * Invokes method without concurrency.
 * @param {String} name Method name.
 * @returns {Promise<Object>} Promise for result.
 */
SerialWrapper.prototype.invoke = function (name) {
	var self = this;

	if (!this.isRegistered(name)) {
		return Promise.reject(new Error(ERROR_NO_SUCH_METHOD));
	}

	if (this._inProgress[name]) {
		return new Promise (function (fulfill, reject) {
			self._emitter.once(name, fulfill);
			self._emitter.once(name + '--error', reject);
		});
	}

	this._inProgress[name] = true;
	this._toInvoke[name]()
		.then(function (result) {
			self._emitter.emit(name, result);
			self._inProgress[name] = null;
		})
		.catch(function (reason) {
			self._emitter.emit(name + '--error', reason);
			self._inProgress[name] = null;
		});

	return this.invoke(name);
};
},{"events":1}],38:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = StoreDispatcher;

var util = require('util'),
	SerialWrapper = require('./SerialWrapper'),
	moduleHelper = require('./helpers/moduleHelper');

var ERROR_STORE_NOT_FOUND = 'Store "%s" not found',
	ERROR_STATE = 'State should be set before any request',
	DEFAULT_LIFETIME = 60000;

/**
 * Creates new instance of store dispatcher.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @param {StoreLoader} $storeLoader Store loader to load stores.
 * @param {EventEmitter} $eventBus Event bus to emit events.
 * @constructor
 */
function StoreDispatcher($serviceLocator, $storeLoader, $eventBus) {
	this._serviceLocator = $serviceLocator;
	this._storeLoader = $storeLoader;
	this._eventBus = $eventBus;
	this._storeInstances = {};
	this._lastData = {};
	this._serialWrapper = new SerialWrapper();
}

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
StoreDispatcher.prototype._serviceLocator = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
StoreDispatcher.prototype._eventBus = null;

/**
 * Current store loader.
 * @type {StoreLoader}
 * @private
 */
StoreDispatcher.prototype._storeLoader = null;

/**
 * Current map of all store instances.
 * @type {null}
 * @private
 */
StoreDispatcher.prototype._storeInstances = null;

/**
 * Current map of last data for each store.
 * @type {Object}
 * @private
 */
StoreDispatcher.prototype._lastData = null;

/**
 * Current map of last state of store dispatcher.
 * @type {Object}
 * @private
 */
StoreDispatcher.prototype._lastState = null;

/**
 * Current serial wrapper.
 * @type {SerialWrapper}
 * @private
 */
StoreDispatcher.prototype._serialWrapper = null;

/**
 * Current basic context for all store contexts.
 * @type {Object}
 * @private
 */
StoreDispatcher.prototype._currentBasicContext = null;

/**
 * Gets store data and creates store instance if required.
 * @param {String} storeName Name of store.
 * @returns {Object} Store's data.
 */
StoreDispatcher.prototype.getStoreData = function (storeName) {
	if (typeof(storeName) !== 'string') {
		return Promise.resolve(null);
	}
	if (this._lastData.hasOwnProperty(storeName)) {
		var existTime = Date.now() - this._lastData[storeName].createdAt;
		if (existTime <= this._lastData[storeName].lifetime) {
			return Promise.resolve(this._lastData[storeName].data);
		}
		delete this._lastData[storeName];
	}
	var self = this,
		lifetime = DEFAULT_LIFETIME;
	self._eventBus.emit('storeDataLoad', {name: storeName});
	return this._getStoreInstance(storeName)
		.then(function (store) {
			if (typeof(store.$lifetime) === 'number') {
				lifetime = store.$lifetime;
			}
			return self._serialWrapper.invoke(storeName);
		})
		.then(function (data) {
			self._lastData[storeName] = {
				data: data,
				lifetime: lifetime,
				createdAt: Date.now()
			};
			self._eventBus.emit('storeDataLoaded', {
				name: storeName,
				data: data,
				lifetime: lifetime
			});
			return data;
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
			throw reason;
		});
};

/**
 * Sends action to specified store and resolves promises in serial mode.
 * @param {String} storeName Name of the store.
 * @param {String} actionName Name of the action.
 * @param {Object} args Action arguments.
 * @returns {Promise<*>} Promise for action handling result.
 */
StoreDispatcher.prototype.sendAction = function (storeName, actionName, args) {
	var self = this,
		actionDetails = {
			storeName: storeName,
			actionName: actionName,
			args: args
		};
	this._eventBus.emit('actionSend', actionDetails);
	return this._getStoreInstance(storeName)
		.then(function (store) {
			var handleMethod = moduleHelper.getMethodToInvoke(
					store, 'handle', actionName
				);
			return moduleHelper.getSafePromise(function () {
				return handleMethod(args);
			});
		})
		.then(function (result) {
			self._eventBus.emit('actionSent', actionDetails);
			return result;
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
			throw reason;
		});
};

/**
 * Sends action to every store that has handle method for such action.
 * @param {String} actionName Name of the action.
 * @param {Object} arg Action arguments.
 * @returns {Promise<Array<*>>} Promise for the action handling result.
 */
StoreDispatcher.prototype.sendBroadcastAction = function (actionName, arg) {
	var promises = [],
		self = this,
		storesByNames = this._storeLoader.getStoresByNames(),
		methodName = moduleHelper.getCamelCaseName('handle', actionName);
	Object.keys(storesByNames)
		.forEach(function (storeName) {
			var store = storesByNames[storeName],
				protoMethod = store.constructor.prototype[methodName];
			if (typeof(protoMethod) !== 'function') {
				return;
			}
			var sendActionPromise = self.sendAction(
				store.name, actionName,  arg
			);
			promises.push(sendActionPromise);
		});
	return Promise.all(promises);
};

/**
 * Sets new state to store dispatcher and invokes "changed" method for all
 * stores which state have been changed.
 * @param {Object} parameters Map of new parameters.
 * @param {Object} basicContext Basic context for all stores.
 * @returns {Array<String>} Names of stores that have been changed.
 */
StoreDispatcher.prototype.setState = function (parameters, basicContext) {
	if (!this._lastState) {
		this._currentBasicContext = basicContext;
		this._lastState = parameters;
		return [];
	}

	// some store's parameters can be removed since last time
	var self = this,
		changed = {};

	Object.keys(this._lastState)
		.filter(function (storeName) {
			return !(storeName in parameters);
		})
		.forEach(function (name) {
			changed[name] = true;
		});

	Object.keys(parameters)
		.forEach(function (storeName) {
			// new parameters were set for store
			if (!self._lastState.hasOwnProperty(storeName)) {
				changed[storeName] = true;
				return;
			}

			// new and last parameters has different values
			var lastParameterNames =
					Object.keys(self._lastState[storeName]),
				currentParameterNames =
					Object.keys(parameters[storeName]);

			if (currentParameterNames.length !==
				lastParameterNames.length) {
				changed[storeName] = true;
				return;
			}

			currentParameterNames.every(function (parameterName) {
				if (parameters[storeName][parameterName] !==
					self._lastState[storeName][parameterName]) {
					changed[storeName] = true;
					return false;
				}
				return true;
			});
		});

	this._lastState = parameters;
	if (this._currentBasicContext !== basicContext) {
		this._currentBasicContext = basicContext;
		Object.keys(this._storeInstances)
			.forEach(function (storeName) {
				self._storeInstances[storeName].$context =
					self._getStoreContext(storeName);
			});
	}

	var stores = this._storeLoader.getStoresByNames(),
		changedStoreNames = Object.keys(changed)
			.filter(function (changedStoreName) {
				return stores.hasOwnProperty(changedStoreName);
			});
	changedStoreNames.forEach(function (storeName) {
		delete self._lastData[storeName];
		self._eventBus.emit('storeChanged', storeName);
	});

	this._eventBus.emit('stateChanged', {
		oldState: this._lastState,
		newState: parameters
	});
	return changedStoreNames;
};

/**
 * Gets context for store using component's context as a prototype.
 * @param {String} storeName Name of store.
 * @returns {Object} Store context.
 * @private
 */
StoreDispatcher.prototype._getStoreContext = function (storeName) {
	var self = this,
		storeContext = Object.create(this._currentBasicContext);
	storeContext.name = storeName;
	storeContext.state = this._lastState[storeName] || {};
	storeContext.changed = function () {
		delete self._lastData[storeName];
		self._eventBus.emit('storeChanged', storeName);
	};

	return storeContext;
};

/**
 * Gets store instance and creates it if required.
 * @param {String} storeName Name of store.
 * @returns {Promise<Object>} Promise for store.
 * @private
 */
StoreDispatcher.prototype._getStoreInstance = function (storeName) {
	if (!this._lastState) {
		return Promise.reject(new Error(ERROR_STATE));
	}

	var store = this._storeInstances[storeName];
	if (store) {
		return Promise.resolve(store);
	}
	var self = this;

	var stores = self._storeLoader.getStoresByNames(),
		config = self._serviceLocator.resolve('config');
	if (!stores.hasOwnProperty(storeName)) {
		return Promise.reject(new Error(util.format(
			ERROR_STORE_NOT_FOUND, storeName
		)));
	}

	var constructor = stores[storeName].constructor;
	constructor.prototype.$context = self._getStoreContext(storeName);
	self._storeInstances[storeName] = self._serviceLocator
		.resolveInstance(constructor, config);
	self._storeInstances[storeName].$context = constructor.prototype.$context;

	self._serialWrapper.add(storeName, function () {
		var loadMethod = moduleHelper.getMethodToInvoke(
			self._storeInstances[storeName], 'load'
		);
		return moduleHelper.getSafePromise(loadMethod);
	});
	return Promise.resolve(self._storeInstances[storeName]);
};
},{"./SerialWrapper":37,"./helpers/moduleHelper":45,"util":6}],39:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = BootstrapperBase;

var util = require('util'),
	moduleHelper = require('../helpers/moduleHelper'),
	uhr = require('catberry-uhr'),
	Promise = require('promise'),
	StateProvider = require('./../providers/StateProvider'),
	StoreLoader = require('../loaders/StoreLoader'),
	ComponentLoader = require('../loaders/ComponentLoader'),
	DocumentRenderer = require('../DocumentRenderer'),
	RequestRouter = require('../RequestRouter'),
	StoreDispatcher = require('../StoreDispatcher'),
	ModuleApiProviderBase = require('../base/ModuleApiProviderBase'),
	ModuleApiProvider = require('../providers/ModuleApiProvider'),
	CookieWrapper = require('../CookieWrapper'),
	ContextFactory = require('./../ContextFactory'),
	EventEmitter = require('events').EventEmitter,
	ServiceLocator = require('catberry-locator');

var INFO_COMPONENT_LOADED = 'Component "%s" loaded',
	INFO_STORE_LOADED = 'Store "%s" loaded',
	INFO_ALL_STORES_LOADED = 'All stores loaded',
	INFO_ALL_COMPONENTS_LOADED = 'All components loaded',
	INFO_DOCUMENT_RENDERED = 'Document rendered for URI %s',
	TRACE_RENDER_COMPONENT = 'Rendering component "%s" with ID="%s"...',
	TIMESTAMP_FORMAT = ' (%d ms)',
	TRACE_COMPONENT_RENDERED = 'Component "%s" with ID="%s" rendered%s';

/**
 * Creates new instance of base Catberry bootstrapper.
 * @param {Function} catberryConstructor Constructor
 * of the Catberry's main module.
 * @constructor
 */
function BootstrapperBase(catberryConstructor) {
	this._catberryConstructor = catberryConstructor;
}

/**
 * Current constructor of the Catberry's main module.
 * @type {Function}
 * @private
 */
BootstrapperBase.prototype._catberryConstructor = null;

/**
 * Creates new full-configured instance of the Catberry application.
 * @param {Object?} configObject Configuration object.
 * @returns {Catberry} Catberry application instance.
 */
BootstrapperBase.prototype.create = function (configObject) {
	var currentConfig = configObject || {},
		catberry = new this._catberryConstructor();

	this.configure(currentConfig, catberry.locator);
	catberry.events = catberry.locator.resolveInstance(ModuleApiProviderBase);
	return catberry;
};

/**
 * Configures locator with all required type registrations.
 * @param {Object} configObject Configuration object.
 * @param {ServiceLocator} locator Service locator to configure.
 */
BootstrapperBase.prototype.configure = function (configObject, locator) {
	var eventBus = new EventEmitter();
	eventBus.setMaxListeners(0);
	locator.registerInstance('promise', Promise);
	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('config', configObject);
	locator.register('stateProvider', StateProvider, configObject, true);
	locator.register('contextFactory', ContextFactory, configObject, true);
	locator.register('storeLoader', StoreLoader, configObject, true);
	locator.register('componentLoader', ComponentLoader, configObject, true);
	locator.register('documentRenderer', DocumentRenderer, configObject, true);
	locator.register('requestRouter', RequestRouter, configObject, true);
	locator.register('storeDispatcher', StoreDispatcher, configObject);
	locator.register(
		'moduleApiProvider', ModuleApiProvider, configObject, true
	);
	locator.register(
		'cookieWrapper', CookieWrapper, configObject, true
	);

	uhr.register(locator);
};

/**
 * Wraps event bus with log messages.
 * @param {EventEmitter} eventBus Event emitter that implements event bus.
 * @param {Logger} logger Logger to write messages.
 * @protected
 */
BootstrapperBase.prototype._wrapEventsWithLogger = function (eventBus, logger) {
	eventBus
		.on('componentLoaded', function (args) {
			logger.info(util.format(INFO_COMPONENT_LOADED, args.name));
		})
		.on('storeLoaded', function (args) {
			logger.info(util.format(INFO_STORE_LOADED, args.name));
		})
		.on('allStoresLoaded', function () {
			logger.info(INFO_ALL_STORES_LOADED);
		})
		.on('allComponentsLoaded', function () {
			logger.info(INFO_ALL_COMPONENTS_LOADED);
		})
		.on('componentRender', function (args) {
			var id = args.context.
					attributes[moduleHelper.ATTRIBUTE_ID] || 'null';
			logger.trace(util.format(TRACE_RENDER_COMPONENT,
				args.name, id
			));
		})
		.on('componentRendered', function (args) {
			var id = args.context.
					attributes[moduleHelper.ATTRIBUTE_ID] || 'null';
			logger.trace(util.format(
				TRACE_COMPONENT_RENDERED,
				args.name, id, typeof(args.time) === 'number' ?
					util.format(TIMESTAMP_FORMAT, args.time) : ''
			));
		})
		.on('documentRendered', function (args) {
			logger.info(util.format(
				INFO_DOCUMENT_RENDERED, args.location.toString()
			));
		})
		.on('error', function (error) {
			logger.error(error);
		});
};
},{"../CookieWrapper":28,"../DocumentRenderer":29,"../RequestRouter":31,"../StoreDispatcher":38,"../base/ModuleApiProviderBase":43,"../helpers/moduleHelper":45,"../loaders/ComponentLoader":32,"../loaders/StoreLoader":33,"../providers/ModuleApiProvider":34,"./../ContextFactory":36,"./../providers/StateProvider":48,"catberry-locator":50,"catberry-uhr":52,"events":1,"promise":60,"util":6}],40:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = CatberryBase;

var ServiceLocator = require('catberry-locator');

/**
 * Creates new instance of the basic Catberry application module.
 * @constructor
 */
function CatberryBase() {
	this.locator = new ServiceLocator();
	this.locator.registerInstance('serviceLocator', this.locator);
	this.locator.registerInstance('catberry', this);
}

/**
 * Current object with events.
 * @type {ModuleApiProvider}
 */
CatberryBase.prototype.events = null;

/**
 * Current service locator.
 * @type {ServiceLocator}
 */
CatberryBase.prototype.locator = null;
},{"catberry-locator":50}],41:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = CookieWrapperBase;

var util = require('util');

/**
 * Creates new instance of the basic cookie wrapper.
 * @constructor
 */
function CookieWrapperBase() {
}

/**
 * Parses cookie string into map of cookie key/value pairs.
 * @param {string} string Cookie string.
 * @returns {Object} Object with cookie values by keys.
 * @protected
 */
CookieWrapperBase.prototype._parseCookieString = function (string) {
	var cookie = {};

	if (typeof (string) !== 'string') {
		return cookie;
	}
	string
		.split(';')
		.forEach(function (cookieString) {
			var pair = cookieString
				.trim()
				.split('=');

			if (pair.length !== 2) {
				return;
			}
			cookie[pair[0]] = decodeURIComponent(pair[1]);
		}, this);

	return cookie;
};

/**
 * Converts cookie setup object to cookie string.
 * @param {Object} cookieSetup Cookie setup object.
 * @param {string} cookieSetup.key Cookie key.
 * @param {string} cookieSetup.value Cookie value.
 * @param {number?} cookieSetup.maxAge Max cookie age in seconds.
 * @param {Date?} cookieSetup.expires Expire date.
 * @param {string?} cookieSetup.path URI path for cookie.
 * @param {string?} cookieSetup.domain Cookie domain.
 * @param {boolean?} cookieSetup.secure Is cookie secured.
 * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
 * @returns {string} Cookie string.
 * @protected
 */
CookieWrapperBase.prototype._convertToCookieSetup = function (cookieSetup) {
	if (typeof(cookieSetup.key) !== 'string' ||
		typeof(cookieSetup.value) !== 'string') {
		throw new Error('Wrong key or value');
	}

	var cookie = cookieSetup.key + '=' + cookieSetup.value;

	// http://tools.ietf.org/html/rfc6265#section-4.1.1
	if (typeof(cookieSetup.maxAge) === 'number') {
		cookie += '; Max-Age=' + cookieSetup.maxAge.toFixed();
		if (!cookieSetup.expires) {
			// by default expire date = current date + max-age in seconds
			cookieSetup.expires = new Date(Date.now() +
				cookieSetup.maxAge * 1000);
		}
	}
	if (cookieSetup.expires instanceof Date) {
		cookie += '; Expires=' + cookieSetup.expires.toUTCString();
	}
	if (typeof(cookieSetup.path) === 'string') {
		cookie += '; Path=' + cookieSetup.path;
	}
	if (typeof(cookieSetup.domain) === 'string') {
		cookie += '; Domain=' + cookieSetup.domain;
	}
	if (typeof(cookieSetup.secure) === 'boolean' &&
		cookieSetup.secure) {
		cookie += '; Secure';
	}
	if (typeof(cookieSetup.httpOnly) === 'boolean' &&
		cookieSetup.httpOnly) {
		cookie += '; HttpOnly';
	}

	return cookie;
};
},{"util":6}],42:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = DocumentRendererBase;

/**
 * Creates new instance of the basic document renderer.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @constructor
 */
function DocumentRendererBase($serviceLocator) {
	var self = this;
	this._serviceLocator = $serviceLocator;
	this._contextFactory = $serviceLocator.resolve('contextFactory');
	this._componentLoader = $serviceLocator.resolve('componentLoader');
	this._eventBus = $serviceLocator.resolve('eventBus');

	var storeLoader = $serviceLocator.resolve('storeLoader');
	this._loading = Promise.all([
		this._componentLoader.load(),
		storeLoader.load()
	])
		.then(function () {
			self._loading = null;
			self._eventBus.emit('ready');
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		});
}

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @protected
 */
DocumentRendererBase.prototype._serviceLocator = null;

/**
 * Current component loader.
 * @type {ComponentLoader}
 * @protected
 */
DocumentRendererBase.prototype._componentLoader = null;

/**
 * Current module loading promise.
 * @type {Promise}
 * @protected
 */
DocumentRendererBase.prototype._loading = null;

/**
 * Current context factory.
 * @type {ContextFactory}
 * @protected
 */
DocumentRendererBase.prototype._contextFactory = null;

/**
 * Gets promise for ready state when it will be able handle requests.
 * @returns {Promise} Promise for nothing.
 * @protected
 */
DocumentRendererBase.prototype._getPromiseForReadyState = function () {
	return this._loading ?
		this._loading :
		Promise.resolve();
};
},{}],43:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = ModuleApiProviderBase;

var ERROR_EVENT_NAME = 'Event name should be a string',
	ERROR_EVENT_HANDLER = 'Event handler should be a function';

/**
 * Creates new instance of the basic API provider.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @constructor
 */
function ModuleApiProviderBase($serviceLocator) {
	this._serviceLocator = $serviceLocator;
	this._eventBus = $serviceLocator.resolve('eventBus');
}

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
ModuleApiProviderBase.prototype._eventBus = null;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @protected
 */
ModuleApiProviderBase.prototype._serviceLocator = null;

/**
 * Subscribes on the specified event in Catberry.
 * @param {string} eventName Name of the event.
 * @param {Function} handler Event handler.
 * @returns {ModuleApiProviderBase} This object for chaining.
 */
ModuleApiProviderBase.prototype.on = function (eventName, handler) {
	checkEventNameAndHandler(eventName, handler);
	this._eventBus.on(eventName, handler);
	return this;
};

/**
 * Subscribes on the specified event in Catberry to handle once.
 * @param {string} eventName Name of the event.
 * @param {Function} handler Event handler.
 * @returns {ModuleApiProviderBase} This object for chaining.
 */
ModuleApiProviderBase.prototype.once = function (eventName, handler) {
	checkEventNameAndHandler(eventName, handler);
	this._eventBus.once(eventName, handler);
	return this;
};

/**
 * Removes the specified handler from the specified event.
 * @param {string} eventName Name of the event.
 * @param {Function} handler Event handler.
 * @returns {ModuleApiProviderBase} This object for chaining.
 */
ModuleApiProviderBase.prototype.removeListener = function (eventName, handler) {
	checkEventNameAndHandler(eventName, handler);
	this._eventBus.removeListener(eventName, handler);
	return this;
};

/**
 * Removes all handlers from the specified event in Catberry.
 * @param {string} eventName Name of the event.
 * @returns {ModuleApiProviderBase} This object for chaining.
 */
ModuleApiProviderBase.prototype.removeAllListeners = function (eventName) {
	checkEventNameAndHandler(eventName, dummy);
	this._eventBus.removeAllListeners(eventName);
	return this;
};

/**
 * Checks if event name is a string and handler is a function.
 * @param {*} eventName Name of the event to check.
 * @param {*} handler The event handler to check.
 */
function checkEventNameAndHandler(eventName, handler) {
	if (typeof (eventName) !== 'string') {
		throw new Error(ERROR_EVENT_NAME);
	}

	if (typeof (handler) !== 'function') {
		throw new Error(ERROR_EVENT_HANDLER);
	}
}

/**
 * Does nothing. It is used as a default callback.
 */
function dummy() {}

},{}],44:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var util = require('util');

var TITLE = 'Catberry@4.0.0 (' +
		'<a href="https://github.com/catberry/catberry/issues" ' +
		'target="_blank">' +
		'report an issue' +
		'</a>' +
		')',
	AMP = /&/g,
	LT = /</g,
	GT = />/g,
	QUOT = /\"/g,
	SINGLE_QUOT = /\'/g,
	ERROR_MESSAGE_REGEXP = /^(?:[\w$]+): (?:.+)\r?\n/i,
	ERROR_MESSAGE_FORMAT = '<span ' +
		'style="color: red; font-size: 16pt; font-weight: bold;">' +
		'%s%s' +
		'</span>',
	NEW_LINE = /\r?\n/g;

module.exports = {
	/**
	 * Prints error with pretty formatting.
	 * @param {Error} error Error to print.
	 * @param {string} userAgent User agent information.
	 * @returns {string} HTML with all information about error.
	 */
	prettyPrint: function (error, userAgent) {
		if (!error || typeof(error) !== 'object') {
			return '';
		}
		var dateString = (new Date()).toUTCString() + ';<br/>',
			userAgentString = (userAgent ? (userAgent + ';<br/>') : ''),
			name = (typeof(error.name) === 'string' ? error.name + ': ' : ''),
			message = String(error.message || ''),
			stack = String(error.stack || '').replace(ERROR_MESSAGE_REGEXP, ''),
			fullMessage = util.format(
				ERROR_MESSAGE_FORMAT, escape(name), escape(message)
			);

		return '<div style="background-color: white; font-size: 12pt;">' +
			dateString +
			userAgentString +
			TITLE + '<br/><br/>' +
			fullMessage + '<br/><br/>' +
			escape(stack) +
			'</div>';
	}
};

/**
 * Escapes error text.
 * @param {string} value Error text.
 * @returns {string} escaped and formatted string.
 */
function escape(value) {
	return value
		.replace(AMP, '&amp;')
		.replace(LT, '&lt;')
		.replace(GT, '&gt;')
		.replace(QUOT, '&quot;')
		.replace(SINGLE_QUOT, '&#39;')
		.replace(NEW_LINE, '<br/>');
}
},{"util":6}],45:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var helper = {
	COMPONENT_PREFIX: 'cat-',
	COMPONENT_PREFIX_REGEXP: /^cat-/,
	COMPONENT_ERROR_TEMPLATE_POSTFIX: '--error',
	DOCUMENT_COMPONENT_NAME: 'document',
	HEAD_COMPONENT_NAME: 'head',
	ATTRIBUTE_ID: 'id',
	ATTRIBUTE_STORE: 'cat-store',
	DEFAULT_LOGIC_FILENAME: 'index.js',

	/**
	 * Creates name for error template of component.
	 * @param {String} componentName name of component.
	 * @returns {string} Name of error template of the component.
	 */
	getNameForErrorTemplate: function (componentName) {
		if (typeof(componentName) !== 'string') {
			return '';
		}
		return componentName + helper.COMPONENT_ERROR_TEMPLATE_POSTFIX;
	},

	/**
	 * Determines if specified component name is the "document" component name.
	 * @param {string} componentName Name of the component.
	 * @returns {boolean} True if specified component is the "document" component.
	 */
	isDocumentComponent: function (componentName) {
		return componentName.toLowerCase() === helper.DOCUMENT_COMPONENT_NAME;
	},
	/**
	 * Determines if specified component name is the "head" component name.
	 * @param {string} componentName Name of the component.
	 * @returns {boolean} True if specified component is the "head" component.
	 */
	isHeadComponent: function (componentName) {
		return componentName.toLowerCase() === helper.HEAD_COMPONENT_NAME;
	},

	/**
	 * Gets the original component name without prefix.
	 * @param {String} fullComponentName Full component name (tag name).
	 * @returns {String} The original component name without prefix.
	 */
	getOriginalComponentName: function (fullComponentName) {
		if (typeof (fullComponentName) !== 'string') {
			return '';
		}
		fullComponentName = fullComponentName.toLowerCase();
		if (fullComponentName === helper.HEAD_COMPONENT_NAME) {
			return fullComponentName;
		}
		if (fullComponentName === helper.DOCUMENT_COMPONENT_NAME) {
			return fullComponentName;
		}
		return fullComponentName.replace(helper.COMPONENT_PREFIX_REGEXP, '');
	},

	/**
	 * Gets valid tag name for component.
	 * @param {String} componentName Name of the component.
	 * @returns {string} Name of the tag.
	 */
	getTagNameForComponentName: function (componentName) {
		if (typeof(componentName) !== 'string') {
			return '';
		}
		var upperComponentName = componentName.toUpperCase();
		if (componentName === helper.HEAD_COMPONENT_NAME) {
			return upperComponentName;
		}
		if (componentName === helper.DOCUMENT_COMPONENT_NAME) {
			return upperComponentName;
		}
		return helper.COMPONENT_PREFIX.toUpperCase() + upperComponentName;
	},

	/**
	 * Gets method of the module that can be invoked.
	 * @param {Object} module Module implementation.
	 * @param {string} prefix Method prefix (i.e. handle).
	 * @param {string?} name Name of the entity to invoke method for
	 * (will be converted to camel casing).
	 * @returns {Function} Method to invoke.
	 */
	getMethodToInvoke: function (module, prefix, name) {
		if (!module || typeof(module) !== 'object') {
			return defaultPromiseMethod;
		}
		var methodName = helper.getCamelCaseName(prefix, name);
		if (typeof(module[methodName]) === 'function') {
			return module[methodName].bind(module);
		}
		if (typeof(module[prefix]) === 'function') {
			return module[prefix].bind(module, name);
		}

		return defaultPromiseMethod;
	},

	/**
	 * Gets name in camel casing for everything.
	 * @param {string} prefix Prefix for the name.
	 * @param {string} name Name to convert.
	 */
	getCamelCaseName: function (prefix, name) {
		if (!name) {
			return '';
		}
		var parts = name.split(/[^a-z0-9]/i),
			camelCaseName = String(prefix || '');

		parts.forEach(function (part) {
			if (!part) {
				return;
			}

			// first character in method name must be in lowercase
			camelCaseName += camelCaseName ?
				part[0].toUpperCase() :
				part[0].toLowerCase();
			camelCaseName += part.substring(1);
		});

		return camelCaseName;
	},

	/**
	 * Gets safe promise resolved from action.
	 * @param {Function} action Action to wrap with safe promise.
	 * @returns {Promise}
	 */
	getSafePromise: function (action) {
		var promise;
		try {
			promise = Promise.resolve(action());
		} catch (e) {
			promise = Promise.reject(e);
		}

		return promise;
	}
};

module.exports = helper;

/**
 * Just returns resolved promise.
 * @returns {Promise} Promise for nothing.
 */
function defaultPromiseMethod() {
	return Promise.resolve();
}
},{}],46:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = {
	/**
	 * Defines read-only property.
	 * @param {Object} object Object to define property in.
	 * @param {string} name Name of the property.
	 * @param {*} value Property value.
	 */
	defineReadOnly: function (object, name, value) {
		Object.defineProperty(object, name, {
			enumerable: false,
			configurable: false,
			writable: false,
			value: value
		});
	}
};
},{}],47:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var PATH_END_SLASH_REG_EXP = /(.+)\/($|\?|#)/,
	EXPRESSION_ESCAPE_REG_EXP = /[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g,
	IDENTIFIER_REG_EXP_SOURCE = '[$A-Z_][\\dA-Z_$]*',
	STORE_LIST_REG_EXP_SOURCE = '(?:(?:\\\\[[ ]*' +
		'[^\\[\\],]+' +
		'([ ]*,[ ]*' +
		'[^\\[\\],]+' +
		')*[ ]*\\\\])|(?:\\\\[[ ]*\\\\]))?',
	PARAMETER_REG_EXP = new RegExp(
			':' +
			IDENTIFIER_REG_EXP_SOURCE +
			STORE_LIST_REG_EXP_SOURCE, 'gi'),
	URI_REPLACEMENT_REG_EXP_SOURCE = '([^\\/\\\\&\\?=]*)',
	SLASHED_BRACKETS_REG_EXP = /\\\[|\\\]/,
	STORE_LIST_SEPARATOR = ',';

module.exports = {
	/**
	 * Removes slash from the end of URI path.
	 * @param {string} uriPath URI path to process.
	 * @returns {string}
	 */
	removeEndSlash: function (uriPath) {
		if (!uriPath || typeof(uriPath) !== 'string') {
			return '';
		}
		if (uriPath === '/') {
			return uriPath;
		}
		return uriPath.replace(PATH_END_SLASH_REG_EXP, '$1$2');
	},
	/**
	 * Gets URI mapper from the route expression like
	 * /some/:id[store1, store2, store3]/details?filter=:filter[store3]
	 * @param {string} routeExpression Expression that defines route.
	 * @returns {{expression: RegExp, map: Function}} URI mapper object.
	 */
	getUriMapperByRoute: function (routeExpression) {
		if (!routeExpression || typeof(routeExpression) !== 'string') {
			return null;
		}

		routeExpression = module.exports.removeEndSlash(routeExpression);

		// escape regular expression characters
		routeExpression = routeExpression.replace(
			EXPRESSION_ESCAPE_REG_EXP, '\\$&');

		// get all occurrences of routing parameters
		var regExpSource = '^' + routeExpression.replace(
				PARAMETER_REG_EXP,
				URI_REPLACEMENT_REG_EXP_SOURCE) + '$',
			parameterMatches = routeExpression.match(PARAMETER_REG_EXP),
			parameters = !parameterMatches || parameterMatches.length === 0 ?
				[] : parameterMatches.map(getParameterDescription);

		var expression = new RegExp(regExpSource, 'i');
		return createUriMapperFromExpression(expression, parameters);
	}
};

/**
 * Gets description of parameters from its expression.
 * @param {string} parameter Parameter expression.
 * @returns {{name: string, storeNames: Array}} Parameter descriptor.
 */
function getParameterDescription(parameter) {
	var parts = parameter.split(SLASHED_BRACKETS_REG_EXP);

	return {
		name: parts[0]
			.trim()
			.substring(1),
		storeNames: (parts[1] ? parts[1] : '')
			.split(STORE_LIST_SEPARATOR)
			.map(function (storeName) {
				return storeName.trim();
			})
			.filter(function (storeName) {
				return storeName.length > 0;
			})
	};
}

/**
 * Creates new URI-to-state object mapper.
 * @param {RegExp} expression Regular expression to check URIs.
 * @param {Array} parameters List of parameter descriptors.
 * @returns {{expression: RegExp, map: Function}} URI mapper object.
 */
function createUriMapperFromExpression(expression, parameters) {
	return {
		expression: expression,
		map: function (uri) {
			var matches = uri.match(expression),
				state = {};

			if (!matches || matches.length < 2) {
				return state;
			}

			// start with second match because first match is always
			// the whole URI
			matches = matches.splice(1);

			parameters.forEach(function (parameter, index) {
				parameter.storeNames.forEach(function (storeName) {
					if (!state[storeName]) {
						state[storeName] = {};
					}
					state[storeName][parameter.name] =
						matches[index];
				});
			});

			return state;
		}
	};
}
},{}],48:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = StateProvider;

var routeHelper = require('./../helpers/routeHelper');

/**
 * Create new instance of the state provider.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve URI mappers.
 * @constructor
 */
function StateProvider($serviceLocator) {
	this._uriMappers = getUriMappers($serviceLocator);
}

/**
 * Current list of URI mappers.
 * @type {Array}
 * @private
 */
StateProvider.prototype._uriMappers = null;

/**
 * Gets state by specified location URI.
 * @param {URI} location URI location.
 * @returns {Object} State object.
 */
StateProvider.prototype.getStateByUri = function (location) {
	if (this._uriMappers.length === 0) {
		return {};
	}

	var shortLocation = routeHelper.removeEndSlash(location.path),
		state = null;
	if (location.query) {
		shortLocation += '?' + location.query.toString();
	}

	this._uriMappers.some(function (mapper) {
		if (mapper.expression.test(shortLocation)) {
			state = mapper.map(shortLocation) || {};
			return true;
		}
		return false;
	});

	if (!state) {
		return null;
	}

	// make state object immutable
	Object.keys(state)
		.forEach(function (storeName) {
			Object.freeze(state[storeName]);
		});
	Object.freeze(state);

	return state;
};

/**
 * Gets list of URI mappers.
 * @param {ServiceLocator} serviceLocator Service locator to get route
 * definitions.
 * @returns {Array} List of URI mappers.
 */
function getUriMappers(serviceLocator) {
	var uriMappers = [];

	serviceLocator
		.resolveAll('routeDefinition')
		.forEach(function (route) {
			// just colon-parametrized string
			if (typeof(route) === 'string') {
				uriMappers.push(routeHelper.getUriMapperByRoute(route));
				return;
			}

			// extended colon-parametrized mapper
			if (typeof(route) === 'object' &&
				(typeof(route.expression) === 'string') &&
				(route.map instanceof Function)) {
				var mapper = routeHelper.getUriMapperByRoute(route.expression);
				uriMappers.push({
					expression: mapper.expression,
					map: function (uriPath) {
						var state = mapper.map(uriPath);
						return route.map(state);
					}
				});
				return;
			}

			// regular expression mapper
			if (typeof(route) === 'object' &&
				(route.expression instanceof RegExp) &&
				(route.map instanceof Function)) {
				uriMappers.push(route);
			}
		});
	return uriMappers;
}
},{"./../helpers/routeHelper":47}],49:[function(require,module,exports){
/*
 * catberry-locator
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-locator's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license applies to all parts of catberry-locator that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = ConstructorTokenizer;

var STATES = {
	ILLEGAL: -1,
	NO: 0,
	IDENTIFIER: 1,
	FUNCTION: 2,
	PARENTHESES_OPEN: 3,
	PARENTHESES_CLOSE: 4,
	COMMA: 5,
	END: 6
};
ConstructorTokenizer.STATES = STATES;

var KEYWORDS = {
	FUNCTION: 'function'
};

var WHITESPACE_TEST = /^\s$/,
	IDENTIFIER_TEST = /^[\$\w]$/;

function ConstructorTokenizer(constructorSource) {
	this._source = String(constructorSource || '');
}

/**
 * Current source code of constructor.
 * @type {string}
 * @private
 */
ConstructorTokenizer.prototype._source = '';

/**
 * Current index in source code.
 * @type {number}
 * @private
 */
ConstructorTokenizer.prototype._currentIndex = 0;

/**
 * Current index in source code.
 * @type {number}
 * @private
 */
ConstructorTokenizer.prototype._currentEnd = 0;

/**
 * Current state.
 * @type {number}
 * @private
 */
ConstructorTokenizer.prototype._currentState = STATES.NO;

/**
 * Gets next token in source.
 * @returns {{state: (number), start: number, end: number}}
 */
ConstructorTokenizer.prototype.next = function () {
	if (this._currentState === STATES.ILLEGAL ||
		this._currentState === STATES.END) {
		return {
			state: this._currentState,
			start: this._currentIndex,
			end: this._currentIndex + 1
		};
	}

	var start = this._currentIndex,
		state = this._currentState;

	switch (this._currentState) {
		case STATES.PARENTHESES_OPEN:
			this.parenthesesOpenState();
			break;
		case STATES.PARENTHESES_CLOSE:
			this.parenthesesCloseState();
			break;
		case STATES.IDENTIFIER:
			this.identifierState();
			break;
		case STATES.COMMA:
			this.commaState();
			break;
		case STATES.FUNCTION:
			this.functionState();
			break;
		default:
			this.skipWhitespace();
			var expected = this._source.substr(
				this._currentIndex, KEYWORDS.FUNCTION.length
			);
			if (expected === KEYWORDS.FUNCTION) {
				this._currentState = STATES.FUNCTION;
				return this.next();
			}

			state = STATES.ILLEGAL;
	}

	return {
		state: state,
		start: start,
		end: this._currentEnd
	};
};

/**
 * Skips all whitespace characters.
 */
ConstructorTokenizer.prototype.skipWhitespace = function () {
	while (
		this._currentIndex < this._source.length &&
		WHITESPACE_TEST.test(this._source[this._currentIndex])) {
		this._currentIndex++;
	}
};

/**
 * Describes PARENTHESES_OPEN state of machine.
 */
ConstructorTokenizer.prototype.parenthesesOpenState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;

	this.skipWhitespace();
	if (IDENTIFIER_TEST.test(this._source[this._currentIndex])) {
		this._currentState = STATES.IDENTIFIER;
	} else if (this._source[this._currentIndex] === ')') {
		this._currentState = STATES.PARENTHESES_CLOSE;
	} else {
		this._currentState = STATES.ILLEGAL;
	}
};

/**
 * Describes PARENTHESES_CLOSE state of machine.
 */
ConstructorTokenizer.prototype.parenthesesCloseState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	this._currentState = STATES.END;
};

/**
 * Describes FUNCTION state of machine.
 */
ConstructorTokenizer.prototype.functionState = function () {
	this._currentIndex += KEYWORDS.FUNCTION.length;
	this._currentEnd = this._currentIndex;

	this.skipWhitespace();

	if (this._source[this._currentIndex] === '(') {
		this._currentState = STATES.PARENTHESES_OPEN;
	} else if (IDENTIFIER_TEST.test(this._source[this._currentIndex])) {
		this._currentState = STATES.IDENTIFIER;
	} else {
		this._currentState = STATES.ILLEGAL;
	}
};

/**
 * Describes IDENTIFIER state of machine.
 */
ConstructorTokenizer.prototype.identifierState = function () {
	while (
		this._currentIndex < this._source.length &&
		IDENTIFIER_TEST.test(this._source[this._currentIndex])) {
		this._currentIndex++;
	}

	this._currentEnd = this._currentIndex;

	this.skipWhitespace();
	if (this._source[this._currentIndex] === '(') {
		this._currentState = STATES.PARENTHESES_OPEN;
	} else if (this._source[this._currentIndex] === ')') {
		this._currentState = STATES.PARENTHESES_CLOSE;
	} else if (this._source[this._currentIndex] === ',') {
		this._currentState = STATES.COMMA;
	} else {
		this._currentState = STATES.ILLEGAL;
	}
};

/**
 * Describes COMMA state of machine.
 */
ConstructorTokenizer.prototype.commaState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;

	this.skipWhitespace();
	if (IDENTIFIER_TEST.test(this._source[this._currentIndex])) {
		this._currentState = STATES.IDENTIFIER;
		return;
	}
	this._currentState = STATES.ILLEGAL;
};
},{}],50:[function(require,module,exports){
/*
 * catberry-locator
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-locator's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license applies to all parts of catberry-locator that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = ServiceLocator;

var util = require('util'),
	ConstructorTokenizer = require('./ConstructorTokenizer');

var DEPENDENCY_REGEXP = /^\$\w+/,
	ERROR_CONSTRUCTOR_SHOULD_BE_FUNCTION = 'Constructor should be a function',
	ERROR_TYPE_NOT_REGISTERED = 'Type "%s" not registered',
	ERROR_TYPE_SHOULD_BE_STRING = 'Type name "%s" should be a string';

/**
 * Creates new instance of service locator.
 * @constructor
 */
function ServiceLocator() {
	this._registrations = {};
}

/**
 * Current type registrations.
 * @type {Object}
 * @protected
 */
ServiceLocator.prototype._registrations = null;

/**
 * Registers new type in service locator.
 * @param {string} type Type name, which will be alias in other constructors.
 * @param {Function} constructor Constructor which
 * initializes instance of specified type.
 * @param {Object?} parameters Set of named parameters
 * which will be also injected.
 * @param {boolean?} isSingleton If true every resolve will return
 * the same instance.
 */
ServiceLocator.prototype.register =
	function (type, constructor, parameters, isSingleton) {
		throwIfNotFunction(constructor);
		throwIfNotString(type);

		initializeRegistration(type, this);
		var parameterNames = getParameterNames(constructor);

		this._registrations[type].unshift({
			constructor: constructor,
			parameters: parameters || {},
			parameterNames: parameterNames,
			isSingleton: Boolean(isSingleton),
			singleInstance: null
		});
	};

/**
 * Registers single instance for specified type.
 * @param {string} type Type name.
 * @param {Object} instance Instance to register.
 */
ServiceLocator.prototype.registerInstance = function (type, instance) {
	throwIfNotString(type);
	initializeRegistration(type, this);

	this._registrations[type].unshift({
		constructor: instance.constructor,
		parameters: {},
		parameterNames: [],
		isSingleton: true,
		singleInstance: instance
	});
};

/**
 * Resolves last registered implementation by type name
 * including all its dependencies recursively.
 * @param {string} type Type name.
 * @returns {Object} Instance of specified type.
 */
ServiceLocator.prototype.resolve = function (type) {
	throwIfNotString(type);
	throwIfNoType(this._registrations, type);
	var firstRegistration = this._registrations[type][0];
	return createInstance(firstRegistration, this);
};

/**
 * Resolves all registered implementations by type name
 * including all dependencies recursively.
 * @param {string} type Type name.
 * @returns {Array} Array of instances specified type.
 */
ServiceLocator.prototype.resolveAll = function (type) {
	throwIfNotString(type);
	try {
		throwIfNoType(this._registrations, type);
	} catch (e) {
		return [];
	}
	return this._registrations[type].map(function (registration) {
		return createInstance(registration, this);
	}, this);
};

/**
 * Resolves instance of specified constructor including dependencies.
 * @param {Function} constructor Constructor for instance creation.
 * @param {Object?} parameters Set of its parameters values.
 * @returns {Object} Instance of specified constructor.
 */
ServiceLocator.prototype.resolveInstance = function (constructor, parameters) {
	return createInstance({
		constructor: constructor,
		parameters: parameters || {},
		parameterNames: getParameterNames(constructor),
		isSingleton: false,
		singleInstance: null
	}, this);
};

/**
 * Unregisters all registrations of specified type.
 * @param {string} type Type name.
 */
ServiceLocator.prototype.unregister = function (type) {
	throwIfNotString(type);
	delete this._registrations[type];
};

/**
 * Initializes registration array for specified type.
 * @param {string} type Type name.
 * @param {ServiceLocator} context Context of execution.
 */
function initializeRegistration(type, context) {
	if (!context._registrations.hasOwnProperty(type)) {
		context._registrations[type] = [];
	}
}

/**
 * Throws error if specified registration is not found.
 * @param {Object} registrations Current registrations set.
 * @param {string} type Type to check.
 */
function throwIfNoType(registrations, type) {
	if (!registrations.hasOwnProperty(type) ||
		registrations[type].length === 0) {
		throw new Error(util.format(ERROR_TYPE_NOT_REGISTERED, type));
	}
}

/**
 * Throws error if specified constructor is not a function.
 * @param {Function} constructor Constructor to check.
 */
function throwIfNotFunction(constructor) {
	if (constructor instanceof Function) {
		return;
	}

	throw new Error(ERROR_CONSTRUCTOR_SHOULD_BE_FUNCTION);
}

/**
 * Throws error if specified type name is not a string.
 * @param {String} type Type name to check.
 */
function throwIfNotString(type) {
	if (typeof(type) === 'string') {
		return;
	}

	throw new Error(util.format(ERROR_TYPE_SHOULD_BE_STRING, type));
}

/**
 * Creates instance of type specified and parameters in registration.
 * @param {Object} registration Specified registration of type.
 * @param {ServiceLocator} context Context of execution.
 * @returns {Object} Instance of type specified in registration.
 */
function createInstance(registration, context) {
	if (registration.isSingleton && registration.singleInstance !== null) {
		return registration.singleInstance;
	}

	var instanceParameters = getParameters(registration, context),
		instance = Object.create(registration.constructor.prototype);
	registration.constructor.apply(instance, instanceParameters);

	if (registration.isSingleton) {
		registration.singleInstance = instance;
	}

	return instance;
}

/**
 * Gets constructor parameters specified in type constructor.
 * @param {Object} registration Type registration.
 * @param {ServiceLocator} context Context of execution.
 * @returns {Array} Array of resolved dependencies to inject.
 */
function getParameters(registration, context) {
	return registration.parameterNames.map(function (parameterName) {
		var dependencyName = getDependencyName(parameterName);
		return dependencyName === null ?
			registration.parameters[parameterName] :
			this.resolve(dependencyName);
	}, context);
}

/**
 * Gets name of dependency type.
 * @param {string} parameterName Name of constructor parameter.
 * @returns {string|null} Name of dependency type.
 */
function getDependencyName(parameterName) {
	if (!DEPENDENCY_REGEXP.test(parameterName)) {
		return null;
	}

	return parameterName.substr(1, parameterName.length - 1);
}

/**
 * Gets all parameter names used in constructor function.
 * @param {Function} constructor Constructor function.
 * @returns {Array<string>} Array of parameter names.
 */
function getParameterNames(constructor) {
	var source = constructor.toString(),
		tokenizer = new ConstructorTokenizer(source),
		result = [],
		token = {
			state: ConstructorTokenizer.STATES.NO,
			start: 0,
			end: 0
		},
		areParametersStarted = false;

	while (
		token.state !== ConstructorTokenizer.STATES.END &&
		token.state !== ConstructorTokenizer.STATES.ILLEGAL) {
		token = tokenizer.next();
		if (token.state === ConstructorTokenizer.STATES.PARENTHESES_OPEN) {
			areParametersStarted = true;
		}

		if (areParametersStarted &&
			token.state === ConstructorTokenizer.STATES.IDENTIFIER) {
			result.push(source.substring(token.start, token.end));
		}
	}
	return result;

}
},{"./ConstructorTokenizer":49,"util":6}],51:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = UHR;

var UHRBase = require('../lib/UHRBase'),
	Promise = require('promise'),
	URI = require('catberry-uri').URI,
	util = require('util');

// if browser still does not have promises then add it.
if (!('Promise' in window)) {
	window.Promise = Promise;
}

util.inherits(UHR, UHRBase);

var NON_SAFE_HEADERS = {
	cookie: true,
	'accept-charset': true
};

var ERROR_CONNECTION = 'Connection error',
	ERROR_TIMEOUT = 'Request timeout',
	ERROR_ABORTED = 'Request aborted';

/**
 * Creates new instance of client-side HTTP(S) request implementation.
 * @param {Window} $window Current window object.
 * @constructor
 */
function UHR($window) {
	UHRBase.call(this);
	this.window = $window;
}

/**
 * Current instance of window.
 * @type {Window}
 */
UHR.prototype.window = null;

/**
 * Does request with specified parameters using protocol implementation.
 * @param {Object} parameters Request parameters.
 * @param {String} parameters.method HTTP method.
 * @param {String} parameters.url URL for request.
 * @param {URI} parameters.uri URI object.
 * @param {Object} parameters.headers HTTP headers to send.
 * @param {String|Object} parameters.data Data to send.
 * @param {Number} parameters.timeout Request timeout.
 * @param {Boolean} parameters.unsafeHTTPS If true then requests to servers with
 * invalid HTTPS certificates are allowed.
 * @returns {Promise<Object>} Promise for result with status object and content.
 * @protected
 */
UHR.prototype._doRequest = function (parameters) {
	var self = this;

	Object.keys(parameters.headers)
		.forEach(function (name) {
			if (NON_SAFE_HEADERS.hasOwnProperty(name.toLowerCase())) {
				delete parameters.headers[name];
			}
		});

	return new Promise(function (fulfill, reject) {
		var requestError = null,
			xhr = new self.window.XMLHttpRequest();

		xhr.onabort = function () {
			requestError = new Error(ERROR_ABORTED);
			reject(requestError);
		};
		xhr.ontimeout = function () {
			requestError = new Error(ERROR_TIMEOUT);
			reject(requestError);
		};
		xhr.onerror = function () {
			requestError = new Error(xhr.statusText || ERROR_CONNECTION);
			reject(requestError);
		};
		xhr.onloadend = function () {
			if (requestError) {
				return;
			}
			var statusObject = getStatusObject(xhr),
				content = self.convertResponse(
					statusObject.headers,
					xhr.responseText
				);
			fulfill({status: statusObject, content: content});
		};

		var user = parameters.uri.authority.userInfo ?
				parameters.uri.authority.userInfo.user : null,
			password = parameters.uri.authority.userInfo ?
				parameters.uri.authority.userInfo.password : null;
		xhr.open(
			parameters.method, parameters.uri.toString(), true,
			user || undefined, password || undefined
		);
		xhr.timeout = parameters.timeout;

		Object.keys(parameters.headers)
			.forEach(function (headerName) {
				xhr.setRequestHeader(
					headerName, parameters.headers[headerName]
				);
			});

		xhr.send(parameters.data);
	});
};

/**
 * Gets state object for specified jQuery XHR object.
 * @param {Object?} xhr XHR object.
 * @returns {{code: number, text: string, headers: Object}} Status object.
 */
function getStatusObject(xhr) {
	var headers = {};

	if (!xhr) {
		return {
			code: 0,
			text: '',
			headers: headers
		};
	}

	xhr
		.getAllResponseHeaders()
		.split('\n')
		.forEach(function (header) {
			var delimiterIndex = header.indexOf(':');
			if (delimiterIndex <= 0) {
				return;
			}
			var headerName = header
				.substring(0, delimiterIndex)
				.trim()
				.toLowerCase();
			headers[headerName] = header
				.substring(delimiterIndex + 1)
				.trim();
		});

	return {
		code: xhr.status,
		text: xhr.statusText,
		headers: headers
	};
}
},{"../lib/UHRBase":53,"catberry-uri":54,"promise":60,"util":6}],52:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var UHR = require('./lib/UHR');

module.exports = {
	/**
	 * Registers UHR in server-side service locator.
	 * @param {ServiceLocator} locator Catberry's service locator.
	 */
	register: function (locator) {
		var config = locator.resolve('config');
		locator.register('uhr', UHR, config, true);
	},
	UHR: UHR
};
},{"./lib/UHR":51}],53:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = UHRBase;

var catberryUri = require('catberry-uri'),
	Query = catberryUri.Query,
	URI = catberryUri.URI;

var ERROR_UNSUPPORTED_PROTOCOL = 'Protocol is unsupported',
	ERROR_PARAMETERS_SHOULD_BE_OBJECT = 'Request parameters should be object',
	ERROR_URL_IS_REQUIRED = 'URL is required parameter',
	ERROR_METHOD_IS_REQUIRED = 'Request method is required parameter',
	ERROR_HOST_IS_REQUIRED = 'Host in URL is required',
	ERROR_SCHEME_IS_REQUIRED = 'Scheme in URL is required',
	ERROR_TIMEOUT_SHOULD_BE_NUMBER = 'Timeout should be a number',
	DEFAULT_TIMEOUT = 30000,
	HTTP_PROTOCOL_REGEXP = /^(http)s?$/i;

var METHODS = {
	GET: 'GET',
	HEAD: 'HEAD',
	POST: 'POST',
	PUT: 'PUT',
	PATCH: 'PATCH',
	DELETE: 'DELETE',
	OPTIONS: 'OPTIONS',
	TRACE: 'TRACE',
	CONNECT: 'CONNECT'
};

UHRBase.TYPES = {
	URL_ENCODED: 'application/x-www-form-urlencoded',
	JSON: 'application/json',
	PLAIN_TEXT: 'text/plain',
	HTML: 'text/html'
};

UHRBase.CHARSET = 'UTF-8';

UHRBase.DEFAULT_GENERAL_HEADERS = {
	Accept: UHRBase.TYPES.JSON + '; q=0.7, ' +
		UHRBase.TYPES.HTML + '; q=0.2, ' +
		UHRBase.TYPES.PLAIN_TEXT + '; q=0.1',
	'Accept-Charset': UHRBase.CHARSET + '; q=1'
};

UHRBase.CHARSET_PARAMETER = '; charset=' + UHRBase.CHARSET;
UHRBase.URL_ENCODED_ENTITY_CONTENT_TYPE = UHRBase.TYPES.URL_ENCODED +
	UHRBase.CHARSET_PARAMETER;

UHRBase.JSON_ENTITY_CONTENT_TYPE = UHRBase.TYPES.JSON +
	UHRBase.CHARSET_PARAMETER;

UHRBase.PLAIN_TEXT_ENTITY_CONTENT_TYPE = UHRBase.TYPES.PLAIN_TEXT +
	UHRBase.CHARSET_PARAMETER;

// This module were developed using HTTP/1.1v2 RFC 2616
// (http://www.w3.org/Protocols/rfc2616/)
/**
 * Creates new instance of Basic Universal HTTP(S) Request implementation.
 * @constructor
 */
function UHRBase() {

}

/**
 * Does GET request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object?} options Request parameters.
 * @param {Object?} options.headers HTTP headers to send.
 * @param {String|Object?} options.data Data to send.
 * @param {Number?} options.timeout Request timeout.
 * @param {Boolean?} options.unsafeHTTPS If true then requests to servers with
 * invalid HTTPS certificates are allowed.
 * @returns {Promise<Object>} Promise for result with status object and content.
 */
UHRBase.prototype.get = function (url, options) {
	options = options || {};
	var parameters = Object.create(options);
	parameters.method = METHODS.GET;
	parameters.url = url;
	return this.request(parameters);
};

/**
 * Does POST request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object?} options Request parameters.
 * @param {Object?} options.headers HTTP headers to send.
 * @param {String|Object?} options.data Data to send.
 * @param {Number?} options.timeout Request timeout.
 * @param {Boolean?} options.unsafeHTTPS If true then requests to servers with
 * invalid HTTPS certificates are allowed.
 * @returns {Promise<Object>} Promise for result with status object and content.
 */
UHRBase.prototype.post = function (url, options) {
	options = options || {};
	var parameters = Object.create(options);
	parameters.method = METHODS.POST;
	parameters.url = url;
	return this.request(parameters);
};

/**
 * Does PUT request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object?} options Request parameters.
 * @param {Object?} options.headers HTTP headers to send.
 * @param {String|Object?} options.data Data to send.
 * @param {Number?} options.timeout Request timeout.
 * @param {Boolean?} options.unsafeHTTPS If true then requests to servers with
 * invalid HTTPS certificates are allowed.
 * @returns {Promise<Object>} Promise for result with status object and content.
 */
UHRBase.prototype.put = function (url, options) {
	options = options || {};
	var parameters = Object.create(options);
	parameters.method = METHODS.PUT;
	parameters.url = url;
	return this.request(parameters);
};

/**
 * Does PATCH request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object?} options Request parameters.
 * @param {Object?} options.headers HTTP headers to send.
 * @param {String|Object?} options.data Data to send.
 * @param {Number?} options.timeout Request timeout.
 * @param {Boolean?} options.unsafeHTTPS If true then requests to servers with
 * invalid HTTPS certificates are allowed.
 * @returns {Promise<Object>} Promise for result with status object and content.
 */
UHRBase.prototype.patch = function (url, options) {
	options = options || {};
	var parameters = Object.create(options);
	parameters.method = METHODS.PATCH;
	parameters.url = url;
	return this.request(parameters);
};

/**
 * Does DELETE request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object?} options Request parameters.
 * @param {Object?} options.headers HTTP headers to send.
 * @param {String|Object?} options.data Data to send.
 * @param {Number?} options.timeout Request timeout.
 * @param {Boolean?} options.unsafeHTTPS If true then requests to servers with
 * invalid HTTPS certificates are allowed.
 * @returns {Promise<Object>} Promise for result with status object and content.
 */
UHRBase.prototype.delete = function (url, options) {
	var parameters = Object.create(options);
	parameters.method = METHODS.DELETE;
	parameters.url = url;
	return this.request(parameters);
};

/**
 * Does request with specified parameters.
 * @param {Object} parameters Request parameters.
 * @param {String} parameters.method HTTP method.
 * @param {String} parameters.url URL for request.
 * @param {Object?} parameters.headers HTTP headers to send.
 * @param {String|Object?} parameters.data Data to send.
 * @param {Number?} parameters.timeout Request timeout.
 * @param {Boolean?} parameters.unsafeHTTPS If true then requests
 * to servers with invalid HTTPS certificates are allowed.
 * @returns {Promise<Object>} Promise for result with status object and content.
 */
UHRBase.prototype.request = function (parameters) {
	var self = this;
	return this._validateRequest(parameters)
		.then(function (validated) {
			return self._doRequest(validated);
		});
};

/**
 * Validates UHR parameters.
 * @param {Object} parameters Request parameters.
 * @param {String} parameters.method HTTP method.
 * @param {String} parameters.url URL for request.
 * @param {Object?} parameters.headers HTTP headers to send.
 * @param {String|Object?} parameters.data Data to send.
 * @param {Number?} parameters.timeout Request timeout.
 * @param {Boolean?} parameters.unsafeHTTPS If true then requests
 * to servers with invalid HTTPS certificates are allowed.
 * @returns {Promise} Promise for nothing.
 * @private
 */
/*jshint maxcomplexity:false */
UHRBase.prototype._validateRequest = function (parameters) {
	if (!parameters || typeof(parameters) !== 'object') {
		return Promise.reject(new Error(ERROR_PARAMETERS_SHOULD_BE_OBJECT));
	}

	var validated = Object.create(parameters);

	if (typeof(parameters.url) !== 'string') {
		return Promise.reject(new Error(ERROR_URL_IS_REQUIRED));
	}
	validated.uri = new URI(validated.url);
	if (!validated.uri.scheme) {
		return Promise.reject(new Error(ERROR_SCHEME_IS_REQUIRED));
	}
	if (!HTTP_PROTOCOL_REGEXP.test(validated.uri.scheme)) {
		return Promise.reject(new Error(ERROR_UNSUPPORTED_PROTOCOL));
	}
	if (!validated.uri.authority || !validated.uri.authority.host) {
		return Promise.reject(new Error(ERROR_HOST_IS_REQUIRED));
	}
	if (typeof(validated.method) !== 'string' ||
		!(validated.method in METHODS)) {
		return Promise.reject(new Error(ERROR_METHOD_IS_REQUIRED));
	}

	validated.timeout = validated.timeout || DEFAULT_TIMEOUT;
	if (typeof(validated.timeout) !== 'number') {
		return Promise.reject(new Error(ERROR_TIMEOUT_SHOULD_BE_NUMBER));
	}

	validated.headers = this._createHeaders(validated.headers);

	if (!this._isUpstreamRequest(parameters.method) &&
		validated.data && typeof(validated.data) === 'object') {

		var dataKeys = Object.keys(validated.data);

		if (dataKeys.length > 0 && !validated.uri.query) {
			validated.uri.query = new Query('');
		}

		dataKeys.forEach(function (key) {
			validated.uri.query.values[key] = validated.data[key];
		});
		validated.data = null;
	} else {
		var dataAndHeaders = this._getDataToSend(
			validated.headers, validated.data
		);
		validated.headers = dataAndHeaders.headers;
		validated.data = dataAndHeaders.data;
	}

	return Promise.resolve(validated);
};

/**
 * Gets data for sending via HTTP request using Content Type HTTP header.
 * @param {Object} headers HTTP headers.
 * @param {Object|string} data Data to send.
 * @returns {{headers: Object, data: Object|String}} Data and headers to send.
 * @private
 */
UHRBase.prototype._getDataToSend = function (headers, data) {
	var found = findContentType(headers),
		contentTypeHeader = found.name,
		contentType = found.type;

	if (!data || typeof(data) !== 'object') {
		data = data ? String(data) : '';
		if (!contentType) {
			headers[contentTypeHeader] = UHRBase.PLAIN_TEXT_ENTITY_CONTENT_TYPE;
		}
		return {
			headers: headers,
			data: data
		};
	}

	if (contentType === UHRBase.TYPES.JSON) {
		return {
			headers: headers,
			data: JSON.stringify(data)
		};
	}

	// otherwise object will be sent with
	// application/x-www-form-urlencoded
	headers[contentTypeHeader] = UHRBase.URL_ENCODED_ENTITY_CONTENT_TYPE;

	var query = new Query();
	query.values = data;
	return {
		headers: headers,
		data: query.toString().replace('%20', '+')
	};
};

/**
 * Creates HTTP headers for request using defaults and current parameters.
 * @param {Object} parameterHeaders HTTP headers of UHR.
 * @protected
 */
UHRBase.prototype._createHeaders = function (parameterHeaders) {
	if (!parameterHeaders || typeof(parameterHeaders) !== 'object') {
		parameterHeaders = {};
	}
	var headers = {};

	Object.keys(UHRBase.DEFAULT_GENERAL_HEADERS)
		.forEach(function (headerName) {
			headers[headerName] = UHRBase.DEFAULT_GENERAL_HEADERS[headerName];
		});

	Object.keys(parameterHeaders)
		.forEach(function (headerName) {
			if (parameterHeaders[headerName] === null ||
				parameterHeaders[headerName] === undefined) {
				delete headers[headerName];
				return;
			}
			headers[headerName] = parameterHeaders[headerName];
		});

	return headers;
};

/**
 * Does request with specified parameters using protocol implementation.
 * @param {Object} parameters Request parameters.
 * @param {String} parameters.method HTTP method.
 * @param {String} parameters.url URL for request.
 * @param {URI} parameters.uri URI object.
 * @param {Object} parameters.headers HTTP headers to send.
 * @param {String|Object} parameters.data Data to send.
 * @param {Number} parameters.timeout Request timeout.
 * @param {Boolean} parameters.unsafeHTTPS If true then requests to servers with
 * invalid HTTPS certificates are allowed.
 * @returns {Promise<Object>} Promise for result with status object and content.
 * @protected
 * @abstract
 */
UHRBase.prototype._doRequest = function (parameters) {
};

/**
 * Converts response data according content type.
 * @param {Object} headers HTTP headers.
 * @param {string} responseData Data from response.
 * @returns {string|Object} Converted data.
 */
UHRBase.prototype.convertResponse = function (headers, responseData) {
	if (typeof(responseData) !== 'string') {
		responseData = '';
	}
	var found = findContentType(headers),
		contentType = found.type || UHRBase.TYPES.PLAIN_TEXT;

	switch (contentType) {
		case UHRBase.TYPES.JSON:
			var json;
			try {
				json = JSON.parse(responseData);
			} catch (e) {
				// nothing to do
			}
			return json || {};
		case UHRBase.TYPES.URL_ENCODED:
			var object;
			try {
				var query = new Query(responseData.replace('+', '%20'));
				object = query.values;
			} catch (e) {
				// nothing to do
			}
			return object || {};
		default:
			return responseData;
	}
};

/**
 * Determines is current query needs to use upstream.
 * @param {String} method HTTP method.
 * @returns {Boolean} Is current HTTP method means upstream usage.
 * @protected
 */
UHRBase.prototype._isUpstreamRequest = function (method) {
	return (
		method === METHODS.POST ||
		method === METHODS.PUT ||
		method === METHODS.PATCH
		);
};

/**
 * Finds content type header in headers object.
 * @param {Object} headers HTTP headers.
 * @returns {{name: String, type: String}} Name of header and content type.
 */
function findContentType(headers) {
	var contentTypeString = '',
		contentTypeHeader = 'Content-Type';

	Object.keys(headers)
		.forEach(function (key) {
			if (key.toLowerCase() !== 'content-type') {
				return;
			}
			contentTypeHeader = key;
			contentTypeString = headers[key];
		});

	var typeAndParameters = contentTypeString.split(';'),
		contentType = typeAndParameters[0].toLowerCase();
	return {
		name: contentTypeHeader,
		type: contentType
	};
}
},{"catberry-uri":54}],54:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = {
	URI: require('./lib/URI'),
	Authority: require('./lib/Authority'),
	UserInfo: require('./lib/UserInfo'),
	Query: require('./lib/Query')
};
},{"./lib/Authority":55,"./lib/Query":56,"./lib/URI":57,"./lib/UserInfo":58}],55:[function(require,module,exports){
/*
 * catberry-uri
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-uri's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry-uri that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = Authority;

var UserInfo = require('./UserInfo'),
	percentEncodingHelper = require('./percentEncodingHelper'),
	punycode = require('punycode');

var PORT_REGEXP = /^\d+$/,
	ERROR_PORT = 'URI authority port must satisfy expression ' +
		PORT_REGEXP.toString();

/**
 * Creates new instance of URI authority component parser.
 * https://tools.ietf.org/html/rfc3986#section-3.2
 * @param {String?} authorityString URI authority component string.
 * @constructor
 */
function Authority(authorityString) {
	if (typeof(authorityString) === 'string' && authorityString.length > 0) {
		var firstAtIndex = authorityString.indexOf('@');
		if (firstAtIndex !== -1) {
			var userInfoString = authorityString.substring(0, firstAtIndex);
			this.userInfo = new UserInfo(userInfoString);
			authorityString = authorityString.substring(firstAtIndex + 1);
		}

		var lastColonIndex = authorityString.lastIndexOf(':');
		if (lastColonIndex !== -1) {
			var portString = authorityString.substring(lastColonIndex + 1);
			if (lastColonIndex === authorityString.length - 1) {
				this.port = '';
				authorityString = authorityString.substring(0, lastColonIndex);
			}else if (PORT_REGEXP.test(portString)) {
				this.port = portString;
				authorityString = authorityString.substring(0, lastColonIndex);
			}
		}

		this.host = punycode.toUnicode(
			percentEncodingHelper.decode(authorityString)
		);
	}
}

/**
 * Current user information.
 * https://tools.ietf.org/html/rfc3986#section-3.2.1
 * @type {UserInfo}
 */
Authority.prototype.userInfo = null;

/**
 * Current host.
 * https://tools.ietf.org/html/rfc3986#section-3.2.2
 * @type {String}
 */
Authority.prototype.host = null;

/**
 * Current port.
 * https://tools.ietf.org/html/rfc3986#section-3.2.3
 * @type {String}
 */
Authority.prototype.port = null;

/**
 * Clones current authority.
 * @returns {Authority} New clone of current object.
 */
Authority.prototype.clone = function () {
	var authority = new Authority();
	if (this.userInfo instanceof UserInfo) {
		authority.userInfo = this.userInfo.clone();
	}
	if (typeof(this.host) === 'string') {
		authority.host = this.host;
	}
	if (typeof(this.port) === 'string') {
		authority.port = this.port;
	}
	return authority;
};

/**
 * Recombine all authority components into authority string.
 * @returns {string} Authority component string.
 */
Authority.prototype.toString = function () {
	var result = '';
	if (this.userInfo instanceof UserInfo) {
		result += this.userInfo.toString() + '@';
	}
	if (this.host !== undefined && this.host !== null) {
		var host = String(this.host);
		result += percentEncodingHelper.encodeHost(
			punycode.toASCII(host)
		);
	}
	if (this.port !== undefined && this.port !== null) {
		var port = String(this.port);
		if (port.length > 0 && !PORT_REGEXP.test(port)) {
			throw new Error(ERROR_PORT);
		}
		result += ':' + port;
	}
	return result;
};
},{"./UserInfo":58,"./percentEncodingHelper":59,"punycode":4}],56:[function(require,module,exports){
/*
 * catberry-uri
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-uri's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry-uri that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = Query;

var percentEncodingHelper = require('./percentEncodingHelper');

/**
 * Creates new instance of URI query component parser.
 * https://tools.ietf.org/html/rfc3986#section-3.4
 * @param {String?} queryString URI query component string.
 * @constructor
 */
function Query(queryString) {
	if (typeof(queryString) === 'string') {
		this.values = {};

		queryString
			.split('&')
			.forEach(function (pair) {
				var parts = pair.split('='),
					key = percentEncodingHelper.decode(parts[0]);
				if (!key) {
					return;
				}
				if (key in this.values &&
					!(this.values[key] instanceof Array)) {
					this.values[key] = [this.values[key]];
				}

				var value = typeof(parts[1]) === 'string' ?
					percentEncodingHelper.decode(parts[1]) : null;

				if (this.values[key] instanceof Array) {
					this.values[key].push(value);
				}else{
					this.values[key] = value;
				}
			}, this);
	}
}

/**
 * Current set of values of query.
 * @type {Object}
 */
Query.prototype.values = null;

/**
 * Clones current query to a new object.
 * @returns {Query} New clone of current object.
 */
Query.prototype.clone = function () {
	var query = new Query();
	if (this.values) {
		query.values = {};
		Object.keys(this.values)
			.forEach(function (key) {
				query.values[key] = this.values[key];
			}, this);
	}
	return query;
};

/**
 * Converts current set of query values to string.
 * @returns {string} Query component string.
 */
Query.prototype.toString = function () {
	if (!this.values) {
		return '';
	}

	var queryString = '';
	Object.keys(this.values)
		.forEach(function (key) {
			var values = this.values[key] instanceof Array ?
				this.values[key] : [this.values[key]];

			values.forEach(function (value) {
				queryString += '&' + percentEncodingHelper
					.encodeQuerySubComponent(key);
				if (value === undefined || value === null) {
					return;
				}
				value = String(value);
				queryString += '=' +
					percentEncodingHelper.encodeQuerySubComponent(value);
			});
		}, this);

	return queryString.replace(/^&/, '');
};
},{"./percentEncodingHelper":59}],57:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = URI;

var Authority = require('./Authority'),
	percentEncodingHelper = require('./percentEncodingHelper'),
	Query = require('./Query');

	// https://tools.ietf.org/html/rfc3986#appendix-B
var URI_PARSE_REGEXP = new RegExp(
		'^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?'
	),
	// https://tools.ietf.org/html/rfc3986#section-3.1
	SCHEME_REGEXP = /^[a-z]+[a-z\d\+\.-]*$/i,
	ERROR_SCHEME = 'URI scheme must satisfy expression ' +
		SCHEME_REGEXP.toString(),
	ERROR_BASE_SCHEME = 'Scheme component is required to be present ' +
		'in a base URI';

/**
 * Creates new instance of URI according to RFC 3986.
 * @param {String?} uriString URI string to parse components.
 * @constructor
 */
function URI(uriString) {
	if (typeof(uriString) !== 'string') {
		uriString = '';
	}

	// https://tools.ietf.org/html/rfc3986#appendix-B
	var matches = uriString.match(URI_PARSE_REGEXP);

	if (matches) {
		if (typeof(matches[2]) === 'string') {
			this.scheme = percentEncodingHelper.decode(matches[2]);
		}
		if (typeof(matches[4]) === 'string') {
			this.authority = new Authority(matches[4]);
		}
		if (typeof(matches[5]) === 'string') {
			this.path = percentEncodingHelper.decode(matches[5]);
		}
		if (typeof(matches[7]) === 'string') {
			this.query = new Query(matches[7]);
		}
		if (typeof(matches[9]) === 'string') {
			this.fragment = percentEncodingHelper.decode(matches[9]);
		}
	}
}

/**
 * Current URI scheme.
 * https://tools.ietf.org/html/rfc3986#section-3.1
 * @type {String}
 */
URI.prototype.scheme = null;

/**
 * Current URI authority.
 * https://tools.ietf.org/html/rfc3986#section-3.2
 * @type {Authority}
 */
URI.prototype.authority = null;

/**
 * Current URI path.
 * https://tools.ietf.org/html/rfc3986#section-3.3
 * @type {String}
 */
URI.prototype.path = null;

/**
 * Current URI query.
 * https://tools.ietf.org/html/rfc3986#section-3.4
 * @type {Query}
 */
URI.prototype.query = null;

/**
 * Current URI fragment.
 * https://tools.ietf.org/html/rfc3986#section-3.5
 * @type {String}
 */
URI.prototype.fragment = null;

/**
 * Converts a URI reference that might be relative to a given base URI
 * into the reference's target URI.
 * https://tools.ietf.org/html/rfc3986#section-5.2
 * @param {URI} baseUri Base URI.
 * @returns {URI} Resolved URI.
 */
URI.prototype.resolveRelative = function (baseUri) {
	if (!baseUri.scheme) {
		throw new Error(ERROR_BASE_SCHEME);
	}

	return transformReference(baseUri, this);
};

/**
 * Clones current URI to a new object.
 * @returns {URI} New clone of current object.
 */
URI.prototype.clone = function () {
	var uri = new URI();

	if (typeof(this.scheme) === 'string') {
		uri.scheme = this.scheme;
	}

	if (this.authority) {
		uri.authority = this.authority.clone();
	}

	if (typeof(this.path) === 'string') {
		uri.path = this.path;
	}

	if (this.query) {
		uri.query = this.query.clone();
	}

	if (typeof(this.fragment) === 'string') {
		uri.fragment = this.fragment;
	}

	return uri;
};

/**
 * Recomposes URI components to URI string,
 * https://tools.ietf.org/html/rfc3986#section-5.3
 * @returns {string} URI string.
 */
URI.prototype.toString = function () {
	var result = '';

	if (this.scheme !== undefined && this.scheme !== null) {
		var scheme = String(this.scheme);
		if (!SCHEME_REGEXP.test(scheme)) {
			throw new Error(ERROR_SCHEME);
		}
		result += scheme + ':';
	}

	if (this.authority instanceof Authority) {
		result += '//' + this.authority.toString();
	}

	var path = this.path === undefined || this.path === null ?
		'' : String(this.path);
	result += percentEncodingHelper.encodePath(path);

	if (this.query instanceof Query) {
		result += '?' + this.query.toString();
	}

	if (this.fragment !== undefined && this.fragment !== null) {
		var fragment = String(this.fragment);
		result += '#' + percentEncodingHelper.encodeFragment(fragment);
	}

	return result;
};

/**
 * Transforms reference for relative resolution.
 * Whole algorithm has been taken from
 * https://tools.ietf.org/html/rfc3986#section-5.2.2
 * @param {URI} baseUri Base URI for resolution.
 * @param {URI} referenceUri Reference URI to resolve.
 * @returns {URI} Components of target URI.
 */
/*jshint maxdepth:false */
/*jshint maxcomplexity:false */
function transformReference(baseUri, referenceUri) {
	var targetUri = new URI('');

	if (referenceUri.scheme) {
		targetUri.scheme = referenceUri.scheme;
		targetUri.authority = referenceUri.authority instanceof Authority ?
			referenceUri.authority.clone() : referenceUri.authority;
		targetUri.path = removeDotSegments(referenceUri.path);
		targetUri.query = referenceUri.query instanceof Query ?
			referenceUri.query.clone() : referenceUri.query;
	} else {
		if (referenceUri.authority) {
			targetUri.authority = referenceUri.authority instanceof Authority ?
				referenceUri.authority.clone() : referenceUri.authority;
			targetUri.path = removeDotSegments(referenceUri.path);
			targetUri.query = referenceUri.query instanceof Query ?
				referenceUri.query.clone() : referenceUri.query;
		} else {
			if (referenceUri.path === '') {
				targetUri.path = baseUri.path;
				if (referenceUri.query instanceof Query) {
					targetUri.query = referenceUri.query.clone();
				} else {
					targetUri.query = baseUri.query instanceof Query ?
						baseUri.query.clone() : baseUri.query;
				}
			} else {
				if (referenceUri.path[0] === '/') {
					targetUri.path =
						removeDotSegments(referenceUri.path);
				} else {
					targetUri.path =
						merge(baseUri, referenceUri);
					targetUri.path =
						removeDotSegments(targetUri.path);
				}
				targetUri.query = referenceUri.query instanceof Query ?
					referenceUri.query.clone() : referenceUri.query;
			}
			targetUri.authority = baseUri.authority instanceof Authority ?
				baseUri.authority.clone() : baseUri.authority;
		}
		targetUri.scheme = baseUri.scheme;
	}

	targetUri.fragment = referenceUri.fragment;
	return targetUri;
}

/**
 * Merges a relative-path reference with the path of the base URI.
 * https://tools.ietf.org/html/rfc3986#section-5.2.3
 * @param {URI} baseUri Components of base URI.
 * @param {URI} referenceUri Components of reference URI.
 * @returns {String} Merged path.
 */
function merge(baseUri, referenceUri) {
	if (baseUri.authority instanceof Authority && baseUri.path === '') {
		return '/' + referenceUri.path;
	}

	var segmentsString = baseUri.path.indexOf('/') !== -1 ?
		baseUri.path.replace(/\/[^\/]+$/, '/') : '';

	return segmentsString + referenceUri.path;
}

/**
 * Removes dots segments from URI path.
 * https://tools.ietf.org/html/rfc3986#section-5.2.4
 * @param {String} uriPath URI path with possible dot segments.
 * @returns {String} URI path without dot segments.
 */
function removeDotSegments(uriPath) {
	if (!uriPath) {
		return '';
	}

	var inputBuffer = uriPath,
		newBuffer = '',
		nextSegment = '',
		outputBuffer = '';

	while (inputBuffer.length !== 0) {

		// If the input buffer begins with a prefix of "../" or "./",
		// then remove that prefix from the input buffer
		newBuffer = inputBuffer.replace(/^\.?\.\//, '');
		if (newBuffer !== inputBuffer) {
			inputBuffer = newBuffer;
			continue;
		}

		// if the input buffer begins with a prefix of "/./" or "/.",
		// where "." is a complete path segment, then replace that
		// prefix with "/" in the input buffer
		newBuffer = inputBuffer.replace(/^((\/\.\/)|(\/\.$))/, '/');
		if (newBuffer !== inputBuffer) {
			inputBuffer = newBuffer;
			continue;
		}

		// if the input buffer begins with a prefix of "/../" or "/..",
		// where ".." is a complete path segment, then replace that
		// prefix with "/" in the input buffer and remove the last
		// segment and its preceding "/" (if any) from the output
		// buffer
		newBuffer = inputBuffer.replace(/^((\/\.\.\/)|(\/\.\.$))/, '/');
		if (newBuffer !== inputBuffer) {
			outputBuffer = outputBuffer.replace(/\/[^\/]+$/, '');
			inputBuffer = newBuffer;
			continue;
		}

		// if the input buffer consists only of "." or "..", then remove
		// that from the input buffer
		if (inputBuffer === '.' || inputBuffer === '..') {
			break;
		}

		// move the first path segment in the input buffer to the end of
		// the output buffer, including the initial "/" character (if
		// any) and any subsequent characters up to, but not including,
		// the next "/" character or the end of the input buffer
		nextSegment = /^\/?[^\/]*(\/|$)/.exec(inputBuffer)[0];
		nextSegment = nextSegment.replace(/([^\/])(\/$)/, '$1');
		inputBuffer = inputBuffer.substring(nextSegment.length);
		outputBuffer += nextSegment;
	}

	return outputBuffer;
}
},{"./Authority":55,"./Query":56,"./percentEncodingHelper":59}],58:[function(require,module,exports){
/*
 * catberry-uri
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-uri's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry-uri that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = UserInfo;

var percentEncodingHelper = require('./percentEncodingHelper');

/**
 * Creates new instance of user information component parser.
 * https://tools.ietf.org/html/rfc3986#section-3.2.1
 * @param {String?} userInfoString User information component string.
 * @constructor
 */
function UserInfo(userInfoString) {
	if (typeof(userInfoString) === 'string' && userInfoString.length > 0) {
		var parts = userInfoString.split(':');
		if (typeof(parts[0]) === 'string') {
			this.user = percentEncodingHelper.decode(parts[0]);
		}
		if (typeof(parts[1]) === 'string') {
			this.password = percentEncodingHelper.decode(parts[1]);
		}
	}
}

/**
 * Current user component.
 * @type {String}
 */
UserInfo.prototype.user = null;

/**
 * Current password.
 * @type {String}
 */
UserInfo.prototype.password = null;

/**
 * Clones current user information.
 * @returns {UserInfo} New clone of current object.
 */
UserInfo.prototype.clone = function () {
	var userInfo = new UserInfo();
	if (typeof(this.user) === 'string') {
		userInfo.user = this.user;
	}
	if (typeof(this.password) === 'string') {
		userInfo.password = this.password;
	}
	return userInfo;
};

/**
 * Recombines user information components to userInfo string.
 * @returns {String} User information component string.
 */
UserInfo.prototype.toString = function () {
	var result = '';
	if (this.user !== undefined && this.user !== null) {
		var user = String(this.user);
		result += percentEncodingHelper
			.encodeUserInfoSubComponent(user);
	}
	if (this.password !== undefined && this.password !== null) {
		var password = String(this.password);
		result += ':' + percentEncodingHelper
			.encodeUserInfoSubComponent(password);
	}

	return result;
};
},{"./percentEncodingHelper":59}],59:[function(require,module,exports){
/*
 * catberry-uri
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-uri's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry-uri that are not externally
 * maintained libraries.
 */

'use strict';

// https://tools.ietf.org/html/rfc3986#section-2.1

module.exports = {
	/**
	 * Encodes authority user information sub-component according to RFC 3986.
	 * @param {String} string Component to encode.
	 * @returns {String} Encoded component.
	 */
	encodeUserInfoSubComponent: function (string) {
		return string.replace(
			// https://tools.ietf.org/html/rfc3986#section-3.2.1
			/[^\w\.~\-!\$&'\(\)\*\+,;=]/g, encodeURIComponent
		);
	},
	/**
	 * Encodes authority host component according to RFC 3986.
	 * @param {String} string Component to encode.
	 * @returns {String} Encoded component.
	 */
	encodeHost: function (string) {
		return string.replace(
			// https://tools.ietf.org/html/rfc3986#section-3.2.2
			/[^\w\.~\-!\$&'\(\)\*\+,;=:\[\]]/g, encodeURIComponent
		);

	},
	/**
	 * Encodes URI path component according to RFC 3986.
	 * @param {String} string Component to encode.
	 * @returns {String} Encoded component.
	 */
	encodePath: function (string) {
		return string.replace(
			// https://tools.ietf.org/html/rfc3986#section-3.3
			/[^\w\.~\-!\$&'\(\)\*\+,;=:@\/]/g, encodeURIComponent
		);
	},
	/**
	 * Encodes query sub-component according to RFC 3986.
	 * @param {String} string Component to encode.
	 * @returns {String} Encoded component.
	 */
	encodeQuerySubComponent: function (string) {
		return string.replace(
			// https://tools.ietf.org/html/rfc3986#section-3.4
			/[^\w\.~\-!\$'\(\)\*\+,;:@\/\?]/g, encodeURIComponent
		);
	},

	/**
	 * Encodes URI fragment component according to RFC 3986.
	 * @param {String} string Component to encode.
	 * @returns {String} Encoded component.
	 */
	encodeFragment: function (string) {
		return string.replace(
			// https://tools.ietf.org/html/rfc3986#section-3.5
			/[^\w\.~\-!\$&'\(\)\*\+,;=:@\/\?]/g, encodeURIComponent
		);
	},

	/**
	 * Decodes percent encoded component.
	 * @param {String} string Component to decode.
	 * @returns {String} Decoded component.
	 */
	decode: function (string) {
		return decodeURIComponent(string);
	}
};
},{}],60:[function(require,module,exports){
'use strict';

module.exports = require('./lib/core.js')
require('./lib/done.js')
require('./lib/es6-extensions.js')
require('./lib/node-extensions.js')
},{"./lib/core.js":61,"./lib/done.js":62,"./lib/es6-extensions.js":63,"./lib/node-extensions.js":64}],61:[function(require,module,exports){
'use strict';

var asap = require('asap')

module.exports = Promise;
function Promise(fn) {
  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
  if (typeof fn !== 'function') throw new TypeError('not a function')
  var state = null
  var value = null
  var deferreds = []
  var self = this

  this.then = function(onFulfilled, onRejected) {
    return new self.constructor(function(resolve, reject) {
      handle(new Handler(onFulfilled, onRejected, resolve, reject))
    })
  }

  function handle(deferred) {
    if (state === null) {
      deferreds.push(deferred)
      return
    }
    asap(function() {
      var cb = state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (state ? deferred.resolve : deferred.reject)(value)
        return
      }
      var ret
      try {
        ret = cb(value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    })
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(then.bind(newValue), resolve, reject)
          return
        }
      }
      state = true
      value = newValue
      finale()
    } catch (e) { reject(e) }
  }

  function reject(newValue) {
    state = false
    value = newValue
    finale()
  }

  function finale() {
    for (var i = 0, len = deferreds.length; i < len; i++)
      handle(deferreds[i])
    deferreds = null
  }

  doResolve(fn, resolve, reject)
}


function Handler(onFulfilled, onRejected, resolve, reject){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.resolve = resolve
  this.reject = reject
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false;
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (ex) {
    if (done) return
    done = true
    onRejected(ex)
  }
}

},{"asap":65}],62:[function(require,module,exports){
'use strict';

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise
Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this
  self.then(null, function (err) {
    asap(function () {
      throw err
    })
  })
}
},{"./core.js":61,"asap":65}],63:[function(require,module,exports){
'use strict';

//This file contains the ES6 extensions to the core Promises/A+ API

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

function ValuePromise(value) {
  this.then = function (onFulfilled) {
    if (typeof onFulfilled !== 'function') return this
    return new Promise(function (resolve, reject) {
      asap(function () {
        try {
          resolve(onFulfilled(value))
        } catch (ex) {
          reject(ex);
        }
      })
    })
  }
}
ValuePromise.prototype = Promise.prototype

var TRUE = new ValuePromise(true)
var FALSE = new ValuePromise(false)
var NULL = new ValuePromise(null)
var UNDEFINED = new ValuePromise(undefined)
var ZERO = new ValuePromise(0)
var EMPTYSTRING = new ValuePromise('')

Promise.resolve = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex)
      })
    }
  }

  return new ValuePromise(value)
}

Promise.all = function (arr) {
  var args = Array.prototype.slice.call(arr)

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([])
    var remaining = args.length
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject)
            return
          }
        }
        args[i] = val
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex)
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) { 
    reject(value);
  });
}

Promise.race = function (values) {
  return new Promise(function (resolve, reject) { 
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    })
  });
}

/* Prototype Methods */

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
}

},{"./core.js":61,"asap":65}],64:[function(require,module,exports){
'use strict';

//This file contains then/promise specific extensions that are only useful for node.js interop

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

Promise.denodeify = function (fn, argumentCount) {
  argumentCount = argumentCount || Infinity
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      while (args.length && args.length > argumentCount) {
        args.pop()
      }
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      var res = fn.apply(self, args)
      if (res && (typeof res === 'object' || typeof res === 'function') && typeof res.then === 'function') {
        resolve(res)
      }
    })
  }
}
Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
    var ctx = this
    try {
      return fn.apply(this, arguments).nodeify(callback, ctx)
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) { reject(ex) })
      } else {
        asap(function () {
          callback.call(ctx, ex)
        })
      }
    }
  }
}

Promise.prototype.nodeify = function (callback, ctx) {
  if (typeof callback != 'function') return this

  this.then(function (value) {
    asap(function () {
      callback.call(ctx, null, value)
    })
  }, function (err) {
    asap(function () {
      callback.call(ctx, err)
    })
  })
}

},{"./core.js":61,"asap":65}],65:[function(require,module,exports){
(function (process){

// Use the fastest possible means to execute a task in a future turn
// of the event loop.

// linked list of tasks (single, with head node)
var head = {task: void 0, next: null};
var tail = head;
var flushing = false;
var requestFlush = void 0;
var isNodeJS = false;

function flush() {
    /* jshint loopfunc: true */

    while (head.next) {
        head = head.next;
        var task = head.task;
        head.task = void 0;
        var domain = head.domain;

        if (domain) {
            head.domain = void 0;
            domain.enter();
        }

        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function() {
                   throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    flushing = false;
}

if (typeof process !== "undefined" && process.nextTick) {
    // Node.js before 0.9. Note that some fake-Node environments, like the
    // Mocha test runner, introduce a `process` global without a `nextTick`.
    isNodeJS = true;

    requestFlush = function () {
        process.nextTick(flush);
    };

} else if (typeof setImmediate === "function") {
    // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
    if (typeof window !== "undefined") {
        requestFlush = setImmediate.bind(window, flush);
    } else {
        requestFlush = function () {
            setImmediate(flush);
        };
    }

} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    requestFlush = function () {
        channel.port2.postMessage(0);
    };

} else {
    // old browsers
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

function asap(task) {
    tail = tail.next = {
        task: task,
        domain: isNodeJS && process.domain,
        next: null
    };

    if (!flushing) {
        flushing = true;
        requestFlush();
    }
};

module.exports = asap;


}).call(this,require('_process'))

},{"_process":3}],66:[function(require,module,exports){
'use strict';
// jscs:disable maximumLineLength
// This file contains definitions of rules how location URLs are translated
// to "render" methods of catberry's modules.
//
// Format:
// /some/:parameter[module1,module2,module3]
//
// More details here:
// https://github.com/catberry/catberry/blob/master/docs/index.md#url-route-definition

module.exports = [
	'/:page[Pages]',
	'/:page[Pages]?query=:query[commits/Search]'
];
},{}],67:[function(require,module,exports){
/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

/**
 * This module is a template and it is used only with some string replaces
 * by BrowserBundleBuilder module. It does not work by itself.
 */

'use strict';

var stores = [

{name: 'About', constructor: require('./catberry_stores/About.js')},
{name: 'Pages', constructor: require('./catberry_stores/Pages.js')},
{name: 'commits/Feed', constructor: require('./catberry_stores/commits/Feed.js')},
{name: 'commits/List', constructor: require('./catberry_stores/commits/List.js')},
{name: 'commits/Search', constructor: require('./catberry_stores/commits/Search.js')}
];

var components = [

{name: 'about', constructor: require('./catberry_components/about/index.js'), properties: {"name":"about","template":"./template.hbs","errorTemplate":"./error.hbs"}, templateSource: '{"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, buffer = "<div class=\\"container\\">\\n\t";\n  stack1 = ((helper = (helper = helpers.readmeHTML || (depth0 != null ? depth0.readmeHTML : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"readmeHTML","hash":{},"data":data}) : helper));\n  if (stack1 != null) { buffer += stack1; }\n  return buffer + "\\n</div>";\n},"useData":true}', errorTemplateSource: '{"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  return "<div class=\\"alert alert-danger\\" role=\\"alert\\">\\n\tLooks like about page is unavailable right now.\\n</div>\\n";\n  },"useData":true}'},
{name: 'document', constructor: require('./catberry_components/document/index.js'), properties: {"name":"document","template":"./template.hbs"}, templateSource: '{"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  return "<!DOCTYPE html>\\n<html lang=\\"en\\">\\n<head cat-store=\\"Pages\\"></head>\\n<body>\\n\t<cat-pages-navigation id=\\"pages-navigation\\" cat-store=\\"Pages\\"></cat-pages-navigation>\\n\t<cat-pages-content id=\\"pages-content\\" cat-store=\\"Pages\\"></cat-pages-content>\\n</body>\\n</html>\\n";\n  },"useData":true}', errorTemplateSource: null},
{name: 'head', constructor: require('./catberry_components/head/index.js'), properties: {"name":"head","template":"./template.hbs"}, templateSource: '{"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;\n  return "<meta charset=\\"UTF-8\\">\\n<meta http-equiv=\\"X-UA-Compatible\\" content=\\"IE=edge\\">\\n<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\">\\n<title>"\n    + escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"title","hash":{},"data":data}) : helper)))\n    + " - "\n    + escapeExpression(((helper = (helper = helpers.subtitle || (depth0 != null ? depth0.subtitle : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"subtitle","hash":{},"data":data}) : helper)))\n    + "</title>\\n<link href=\\"/css/bootstrap.min.css\\" rel=\\"stylesheet\\">\\n<link href=\\"/css/loader.css\\" rel=\\"stylesheet\\">\\n<script src=\\"/bundle.js\\"></script>\\n\\n";\n},"useData":true}', errorTemplateSource: null},
{name: 'loader', constructor: require('./catberry_components/loader/index.js'), properties: {"name":"loader","template":"./template.hbs"}, templateSource: '{"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  return "<div class=\\"loading\\"></div>\\n";\n  },"useData":true}', errorTemplateSource: null},
{name: 'commits-details', constructor: require('./catberry_components/commits/commits-details/index.js'), properties: {"name":"commits-details","template":"./template.hbs","errorTemplate":"./error.hbs"}, templateSource: '{"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  var stack1, helper, lambda=this.lambda, escapeExpression=this.escapeExpression, functionType="function", helperMissing=helpers.helperMissing;\n  return "<div class=\\"panel panel-default\\">\\n\t<div class=\\"panel-body\\">\\n\t\t<ul class=\\"list-inline\\">\\n\t\t\t<li>\\n\t\t\t\t<span class=\\"glyphicon glyphicon-plus\\"></span>\\n\t\t\t</li>\\n\t\t\t<li class=\\"additions\\">"\n    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.additions : stack1), depth0))\n    + "</li>\\n\t\t\t<li>\\n\t\t\t\t<span class=\\"glyphicon glyphicon-minus\\"></span>\\n\t\t\t</li>\\n\t\t\t<li class=\\"deletions\\">"\n    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.deletions : stack1), depth0))\n    + "</li>\\n\t\t\t<li>\\n\t\t\t\t<span class=\\"glyphicon glyphicon-asterisk\\"></span>\\n\t\t\t</li>\\n\t\t\t<li class=\\"total\\">"\n    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.total : stack1), depth0))\n    + "</li>\\n\t\t\t<li>\\n\t\t\t\t<span class=\\"glyphicon glyphicon-comment\\"></span>\\n\t\t\t</li>\\n\t\t\t<li class=\\"comment-count\\">"\n    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.commit : depth0)) != null ? stack1.comment_count : stack1), depth0))\n    + "</li>\\n\t\t\t<li>\\n\t\t\t\t<a target=\\"_blank\\" class=\\"comments-link\\" href=\\""\n    + escapeExpression(((helper = (helper = helpers.html_url || (depth0 != null ? depth0.html_url : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"html_url","hash":{},"data":data}) : helper)))\n    + "\\">\\n\t\t\t\t\tShow comments\\n\t\t\t\t</a>\\n\t\t\t</li>\\n\t\t</ul>\\n\t</div>\\n</div>\\n";\n},"useData":true}', errorTemplateSource: '{"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  return "<div class=\\"alert alert-danger\\" role=\\"alert\\">\\n\tLooks like details of this commit are unavailable right now.\\n</div>\\n";\n  },"useData":true}'},
{name: 'commits-list', constructor: require('./catberry_components/commits/commits-list/index.js'), properties: {"name":"commits-list","template":"./template.hbs","errorTemplate":"./error.hbs"}, templateSource: '{"1":function(depth0,helpers,partials,data) {\n  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, lambda=this.lambda;\n  return "\t<a id=\\""\n    + escapeExpression(((helper = (helper = helpers.sha || (depth0 != null ? depth0.sha : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"sha","hash":{},"data":data}) : helper)))\n    + "\\" href=\\"#\\" class=\\"list-group-item js-commit\\">\\n\t\t"\n    + escapeExpression(lambda(((stack1 = (depth0 != null ? depth0.commit : depth0)) != null ? stack1.message : stack1), depth0))\n    + " ("\n    + escapeExpression(lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.commit : depth0)) != null ? stack1.author : stack1)) != null ? stack1.name : stack1), depth0))\n    + ")\\n\t</a>\\n";\n},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  var stack1;\n  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.commits : depth0), {"name":"each","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});\n  if (stack1 != null) { return stack1; }\n  else { return \'\'; }\n  },"useData":true}', errorTemplateSource: '{"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  return "<div class=\\"alert alert-danger\\" role=\\"alert\\">\\n\tLooks like list of commits is unavailable right now.\\n</div>";\n  },"useData":true}'},
{name: 'pages-content', constructor: require('./catberry_components/pages/pages-content/index.js'), properties: {"name":"pages-content","template":"./template.hbs"}, templateSource: '{"1":function(depth0,helpers,partials,data) {\n  return "\t<cat-about id=\\"pages-content-about\\" cat-store=\\"About\\" ></cat-about>\\n";\n  },"3":function(depth0,helpers,partials,data) {\n  return "\t<cat-commits-list id=\\"pages-content-commits\\" cat-store=\\"commits/List\\" ></cat-commits-list>\\n";\n  },"5":function(depth0,helpers,partials,data) {\n  return "\t<cat-search-form id=\\"pages-content-search\\" cat-store=\\"commits/Search\\" ></cat-search-form>\\n\t<cat-search-results id=\\"pages-content-search-results\\" cat-store=\\"commits/Search\\" ></cat-search-results>\\n";\n  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  var stack1, buffer = "<cat-loader id=\\"pages-content-loader\\"></cat-loader>\\n";\n  stack1 = helpers[\'if\'].call(depth0, ((stack1 = (depth0 != null ? depth0.isActive : depth0)) != null ? stack1.about : stack1), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});\n  if (stack1 != null) { buffer += stack1; }\n  stack1 = helpers[\'if\'].call(depth0, ((stack1 = (depth0 != null ? depth0.isActive : depth0)) != null ? stack1.commits : stack1), {"name":"if","hash":{},"fn":this.program(3, data),"inverse":this.noop,"data":data});\n  if (stack1 != null) { buffer += stack1; }\n  stack1 = helpers[\'if\'].call(depth0, ((stack1 = (depth0 != null ? depth0.isActive : depth0)) != null ? stack1.search : stack1), {"name":"if","hash":{},"fn":this.program(5, data),"inverse":this.noop,"data":data});\n  if (stack1 != null) { buffer += stack1; }\n  return buffer;\n},"useData":true}', errorTemplateSource: null},
{name: 'pages-navigation', constructor: require('./catberry_components/pages/pages-navigation/index.js'), properties: {"name":"pages-navigation","template":"./template.hbs"}, templateSource: '{"1":function(depth0,helpers,partials,data) {\n  return "class=\\"active\\"";\n  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  var stack1, buffer = "<ul class=\\"nav nav-tabs\\" role=\\"tablist\\">\\n\t<li ";\n  stack1 = helpers[\'if\'].call(depth0, ((stack1 = (depth0 != null ? depth0.isActive : depth0)) != null ? stack1.about : stack1), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});\n  if (stack1 != null) { buffer += stack1; }\n  buffer += ">\\n\t\t<a href=\\"/about\\">About</a>\\n\t</li>\\n\t<li ";\n  stack1 = helpers[\'if\'].call(depth0, ((stack1 = (depth0 != null ? depth0.isActive : depth0)) != null ? stack1.commits : stack1), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});\n  if (stack1 != null) { buffer += stack1; }\n  buffer += ">\\n\t\t<a href=\\"/commits\\">Commits</a>\\n\t</li>\\n\t<li ";\n  stack1 = helpers[\'if\'].call(depth0, ((stack1 = (depth0 != null ? depth0.isActive : depth0)) != null ? stack1.search : stack1), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});\n  if (stack1 != null) { buffer += stack1; }\n  return buffer + ">\\n\t\t<a href=\\"/search\\">Search</a>\\n\t</li>\\n</ul>";\n},"useData":true}', errorTemplateSource: null},
{name: 'search-form', constructor: require('./catberry_components/search/search-form/index.js'), properties: {"name":"search-form","template":"./template.hbs"}, templateSource: '{"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;\n  return "<form class=\\"navbar-form\\" role=\\"search\\"\\n\t  name=\\"search-in-code\\" data-module=\\"search\\">\\n\t<div class=\\"form-group\\">\\n\t\t<input type=\\"text\\" class=\\"form-control\\" placeholder=\\"Search in code\\"\\n\t\t\t   name=\\"query\\" value=\\""\n    + escapeExpression(((helper = (helper = helpers.query || (depth0 != null ? depth0.query : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"query","hash":{},"data":data}) : helper)))\n    + "\\"/>\\n\t</div>\\n\t<input type=\\"submit\\" class=\\"btn btn-default\\" value=\\"Search\\"/>\\n</form>\\n<cat-loader id=\\"search-progress\\"></cat-loader>";\n},"useData":true}', errorTemplateSource: null},
{name: 'search-results', constructor: require('./catberry_components/search/search-results/index.js'), properties: {"name":"search-results","template":"./template.hbs"}, templateSource: '{"1":function(depth0,helpers,partials,data) {\n  var stack1, helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, buffer = "\t<div class=\\"well\\"><h3>Found "\n    + escapeExpression(((helper = (helper = helpers.total_count || (depth0 != null ? depth0.total_count : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"total_count","hash":{},"data":data}) : helper)))\n    + " file(s)</h3></div>\\n\t<div class=\\"list-group\\">\\n";\n  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.items : depth0), {"name":"each","hash":{},"fn":this.program(2, data),"inverse":this.noop,"data":data});\n  if (stack1 != null) { buffer += stack1; }\n  return buffer + "\t</div>\\n";\n},"2":function(depth0,helpers,partials,data) {\n  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;\n  return "\t\t\t<a class=\\"list-group-item\\" href=\\""\n    + escapeExpression(((helper = (helper = helpers.html_url || (depth0 != null ? depth0.html_url : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"html_url","hash":{},"data":data}) : helper)))\n    + "\\" target=\\"_blank\\">\\n\t\t\t\t"\n    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))\n    + " - "\n    + escapeExpression(((helper = (helper = helpers.path || (depth0 != null ? depth0.path : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"path","hash":{},"data":data}) : helper)))\n    + "\\n\t\t\t</a>\\n";\n},"4":function(depth0,helpers,partials,data) {\n  return "\t<div class=\\"well\\"><h3>No results found</h3></div>\\n";\n  },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {\n  var stack1, buffer = "";\n  stack1 = helpers[\'if\'].call(depth0, (depth0 != null ? depth0.hasResults : depth0), {"name":"if","hash":{},"fn":this.program(1, data),"inverse":this.program(4, data),"data":data});\n  if (stack1 != null) { buffer += stack1; }\n  return buffer + "\\n\\n";\n},"useData":true}', errorTemplateSource: null}
];

var util = require('util'),
	routeDefinitions = require('./routes.js') || [],
	moduleHelper = require('./node_modules/catberry/lib/helpers/moduleHelper.js'),
	Catberry = require('./node_modules/catberry/browser/Catberry.js'),
	Logger = require('./node_modules/catberry/browser/Logger.js'),
	BootstrapperBase =
		require('./node_modules/catberry/lib/base/BootstrapperBase.js');

var INFO_DOCUMENT_UPDATED = 'Document updated (%d store(s) changed)',
	INFO_COMPONENT_BOUND = 'Component "%s" is bound';

util.inherits(Bootstrapper, BootstrapperBase);

/**
 * Creates new instance of the browser Catberry's bootstrapper.
 * @constructor
 * @extends BootstrapperBase
 */
function Bootstrapper() {
	BootstrapperBase.call(this, Catberry);
}

/**
 * Configures Catberry's service locator.
 * @param {Object} configObject Application config object.
 * @param {ServiceLocator} locator Service locator to configure.
 */
Bootstrapper.prototype.configure = function (configObject, locator) {
	BootstrapperBase.prototype.configure.call(this, configObject, locator);

	// if browser still does not have promises then add it.
	if (!('Promise' in window)) {
		window.Promise = locator.resolve('promise');
	}

	locator.registerInstance('window', window);

	var loggerConfig = configObject.logger || {},
		logger = new Logger(loggerConfig.levels);
	locator.registerInstance('logger', logger);
	window.onerror = function errorHandler(msg, uri, line) {
		logger.fatal(uri + ':' + line + ' ' + msg);
		return true;
	};
	var eventBus = locator.resolve('eventBus');
	this._wrapEventsWithLogger(eventBus, logger);

	routeDefinitions.forEach(function (routeDefinition) {
		locator.registerInstance('routeDefinition', routeDefinition);
	});

	stores.forEach(function (store) {
		locator.registerInstance('store', store);
	});
};

/**
 * Wraps event bus with log messages.
 * @param {EventEmitter} eventBus Event emitter that implements event bus.
 * @param {Logger} logger Logger to write messages.
 * @protected
 */
Bootstrapper.prototype._wrapEventsWithLogger = function (eventBus, logger) {
	BootstrapperBase.prototype._wrapEventsWithLogger
		.call(this, eventBus, logger);
	eventBus
		.on('documentUpdated', function (args) {
			logger.info(util.format(INFO_DOCUMENT_UPDATED, args.length));
		})
		.on('componentBound', function (args) {
			logger.info(util.format(
				INFO_COMPONENT_BOUND, args.element.tagName + '#' + args.id
			));
		});
};

module.exports = new Bootstrapper();
},{"./catberry_components/about/index.js":8,"./catberry_components/commits/commits-details/index.js":9,"./catberry_components/commits/commits-list/index.js":10,"./catberry_components/document/index.js":11,"./catberry_components/head/index.js":12,"./catberry_components/loader/index.js":13,"./catberry_components/pages/pages-content/index.js":14,"./catberry_components/pages/pages-navigation/index.js":15,"./catberry_components/search/search-form/index.js":16,"./catberry_components/search/search-results/index.js":17,"./catberry_stores/About.js":18,"./catberry_stores/Pages.js":19,"./catberry_stores/commits/Feed.js":20,"./catberry_stores/commits/List.js":21,"./catberry_stores/commits/Search.js":22,"./node_modules/catberry/browser/Catberry.js":27,"./node_modules/catberry/browser/Logger.js":30,"./node_modules/catberry/lib/base/BootstrapperBase.js":39,"./node_modules/catberry/lib/helpers/moduleHelper.js":45,"./routes.js":66,"util":6}]},{},[7])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL1Byb2plY3RzL2NhdGJlcnJ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9Qcm9qZWN0cy9jYXRiZXJyeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi4uL1Byb2plY3RzL2NhdGJlcnJ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiLi4vUHJvamVjdHMvY2F0YmVycnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi4uL1Byb2plY3RzL2NhdGJlcnJ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wdW55Y29kZS9wdW55Y29kZS5qcyIsIi4uL1Byb2plY3RzL2NhdGJlcnJ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwiLi4vUHJvamVjdHMvY2F0YmVycnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyIsImJyb3dzZXIuanMiLCJjYXRiZXJyeV9jb21wb25lbnRzL2Fib3V0L2luZGV4LmpzIiwiY2F0YmVycnlfY29tcG9uZW50cy9jb21taXRzL2NvbW1pdHMtZGV0YWlscy9pbmRleC5qcyIsImNhdGJlcnJ5X2NvbXBvbmVudHMvY29tbWl0cy9jb21taXRzLWxpc3QvaW5kZXguanMiLCJjYXRiZXJyeV9jb21wb25lbnRzL2RvY3VtZW50L2luZGV4LmpzIiwiY2F0YmVycnlfY29tcG9uZW50cy9oZWFkL2luZGV4LmpzIiwiY2F0YmVycnlfY29tcG9uZW50cy9sb2FkZXIvaW5kZXguanMiLCJjYXRiZXJyeV9jb21wb25lbnRzL3BhZ2VzL3BhZ2VzLWNvbnRlbnQvaW5kZXguanMiLCJjYXRiZXJyeV9jb21wb25lbnRzL3BhZ2VzL3BhZ2VzLW5hdmlnYXRpb24vaW5kZXguanMiLCJjYXRiZXJyeV9jb21wb25lbnRzL3NlYXJjaC9zZWFyY2gtZm9ybS9pbmRleC5qcyIsImNhdGJlcnJ5X2NvbXBvbmVudHMvc2VhcmNoL3NlYXJjaC1yZXN1bHRzL2luZGV4LmpzIiwiY2F0YmVycnlfc3RvcmVzL0Fib3V0LmpzIiwiY2F0YmVycnlfc3RvcmVzL1BhZ2VzLmpzIiwiY2F0YmVycnlfc3RvcmVzL2NvbW1pdHMvRmVlZC5qcyIsImNhdGJlcnJ5X3N0b3Jlcy9jb21taXRzL0xpc3QuanMiLCJjYXRiZXJyeV9zdG9yZXMvY29tbWl0cy9TZWFyY2guanMiLCJjb25maWcvZW52aXJvbm1lbnQuanNvbiIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS1oYW5kbGViYXJzL2Jyb3dzZXIvVGVtcGxhdGVQcm92aWRlci5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS1oYW5kbGViYXJzL2Jyb3dzZXIvdmVuZG9ycy9oYW5kbGViYXJzLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5LWhhbmRsZWJhcnMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvYnJvd3Nlci9DYXRiZXJyeS5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9icm93c2VyL0Nvb2tpZVdyYXBwZXIuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvYnJvd3Nlci9Eb2N1bWVudFJlbmRlcmVyLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L2Jyb3dzZXIvTG9nZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L2Jyb3dzZXIvUmVxdWVzdFJvdXRlci5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9icm93c2VyL2xvYWRlcnMvQ29tcG9uZW50TG9hZGVyLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L2Jyb3dzZXIvbG9hZGVycy9TdG9yZUxvYWRlci5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9icm93c2VyL3Byb3ZpZGVycy9Nb2R1bGVBcGlQcm92aWRlci5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9saWIvQ29udGV4dEZhY3RvcnkuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbGliL1NlcmlhbFdyYXBwZXIuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbGliL1N0b3JlRGlzcGF0Y2hlci5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9saWIvYmFzZS9Cb290c3RyYXBwZXJCYXNlLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L2xpYi9iYXNlL0NhdGJlcnJ5QmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9saWIvYmFzZS9Db29raWVXcmFwcGVyQmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9saWIvYmFzZS9Eb2N1bWVudFJlbmRlcmVyQmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9saWIvYmFzZS9Nb2R1bGVBcGlQcm92aWRlckJhc2UuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbGliL2hlbHBlcnMvZXJyb3JIZWxwZXIuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbGliL2hlbHBlcnMvbW9kdWxlSGVscGVyLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L2xpYi9oZWxwZXJzL3Byb3BlcnR5SGVscGVyLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L2xpYi9oZWxwZXJzL3JvdXRlSGVscGVyLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L2xpYi9wcm92aWRlcnMvU3RhdGVQcm92aWRlci5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9ub2RlX21vZHVsZXMvY2F0YmVycnktbG9jYXRvci9saWIvQ29uc3RydWN0b3JUb2tlbml6ZXIuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbm9kZV9tb2R1bGVzL2NhdGJlcnJ5LWxvY2F0b3IvbGliL1NlcnZpY2VMb2NhdG9yLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L25vZGVfbW9kdWxlcy9jYXRiZXJyeS11aHIvYnJvd3Nlci9VSFIuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbm9kZV9tb2R1bGVzL2NhdGJlcnJ5LXVoci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9ub2RlX21vZHVsZXMvY2F0YmVycnktdWhyL2xpYi9VSFJCYXNlLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L25vZGVfbW9kdWxlcy9jYXRiZXJyeS11cmkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbm9kZV9tb2R1bGVzL2NhdGJlcnJ5LXVyaS9saWIvQXV0aG9yaXR5LmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L25vZGVfbW9kdWxlcy9jYXRiZXJyeS11cmkvbGliL1F1ZXJ5LmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L25vZGVfbW9kdWxlcy9jYXRiZXJyeS11cmkvbGliL1VSSS5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9ub2RlX21vZHVsZXMvY2F0YmVycnktdXJpL2xpYi9Vc2VySW5mby5qcyIsIm5vZGVfbW9kdWxlcy9jYXRiZXJyeS9ub2RlX21vZHVsZXMvY2F0YmVycnktdXJpL2xpYi9wZXJjZW50RW5jb2RpbmdIZWxwZXIuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbm9kZV9tb2R1bGVzL3Byb21pc2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL2NvcmUuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL2RvbmUuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzIiwibm9kZV9tb2R1bGVzL2NhdGJlcnJ5L25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9ub2RlLWV4dGVuc2lvbnMuanMiLCJub2RlX21vZHVsZXMvY2F0YmVycnkvbm9kZV9tb2R1bGVzL3Byb21pc2Uvbm9kZV9tb2R1bGVzL2FzYXAvYXNhcC5qcyIsInJvdXRlcy5qcyIsIl9fQnJvd3NlckJ1bmRsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaGlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gdHJ1ZTtcbiAgICB2YXIgY3VycmVudFF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbaV0oKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG59XG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHF1ZXVlLnB1c2goZnVuKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKiEgaHR0cDovL210aHMuYmUvcHVueWNvZGUgdjEuMi40IGJ5IEBtYXRoaWFzICovXG47KGZ1bmN0aW9uKHJvb3QpIHtcblxuXHQvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGVzICovXG5cdHZhciBmcmVlRXhwb3J0cyA9IHR5cGVvZiBleHBvcnRzID09ICdvYmplY3QnICYmIGV4cG9ydHM7XG5cdHZhciBmcmVlTW9kdWxlID0gdHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiZcblx0XHRtb2R1bGUuZXhwb3J0cyA9PSBmcmVlRXhwb3J0cyAmJiBtb2R1bGU7XG5cdHZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWw7XG5cdGlmIChmcmVlR2xvYmFsLmdsb2JhbCA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsLndpbmRvdyA9PT0gZnJlZUdsb2JhbCkge1xuXHRcdHJvb3QgPSBmcmVlR2xvYmFsO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRoZSBgcHVueWNvZGVgIG9iamVjdC5cblx0ICogQG5hbWUgcHVueWNvZGVcblx0ICogQHR5cGUgT2JqZWN0XG5cdCAqL1xuXHR2YXIgcHVueWNvZGUsXG5cblx0LyoqIEhpZ2hlc3QgcG9zaXRpdmUgc2lnbmVkIDMyLWJpdCBmbG9hdCB2YWx1ZSAqL1xuXHRtYXhJbnQgPSAyMTQ3NDgzNjQ3LCAvLyBha2EuIDB4N0ZGRkZGRkYgb3IgMl4zMS0xXG5cblx0LyoqIEJvb3RzdHJpbmcgcGFyYW1ldGVycyAqL1xuXHRiYXNlID0gMzYsXG5cdHRNaW4gPSAxLFxuXHR0TWF4ID0gMjYsXG5cdHNrZXcgPSAzOCxcblx0ZGFtcCA9IDcwMCxcblx0aW5pdGlhbEJpYXMgPSA3Mixcblx0aW5pdGlhbE4gPSAxMjgsIC8vIDB4ODBcblx0ZGVsaW1pdGVyID0gJy0nLCAvLyAnXFx4MkQnXG5cblx0LyoqIFJlZ3VsYXIgZXhwcmVzc2lvbnMgKi9cblx0cmVnZXhQdW55Y29kZSA9IC9eeG4tLS8sXG5cdHJlZ2V4Tm9uQVNDSUkgPSAvW14gLX5dLywgLy8gdW5wcmludGFibGUgQVNDSUkgY2hhcnMgKyBub24tQVNDSUkgY2hhcnNcblx0cmVnZXhTZXBhcmF0b3JzID0gL1xceDJFfFxcdTMwMDJ8XFx1RkYwRXxcXHVGRjYxL2csIC8vIFJGQyAzNDkwIHNlcGFyYXRvcnNcblxuXHQvKiogRXJyb3IgbWVzc2FnZXMgKi9cblx0ZXJyb3JzID0ge1xuXHRcdCdvdmVyZmxvdyc6ICdPdmVyZmxvdzogaW5wdXQgbmVlZHMgd2lkZXIgaW50ZWdlcnMgdG8gcHJvY2VzcycsXG5cdFx0J25vdC1iYXNpYyc6ICdJbGxlZ2FsIGlucHV0ID49IDB4ODAgKG5vdCBhIGJhc2ljIGNvZGUgcG9pbnQpJyxcblx0XHQnaW52YWxpZC1pbnB1dCc6ICdJbnZhbGlkIGlucHV0J1xuXHR9LFxuXG5cdC8qKiBDb252ZW5pZW5jZSBzaG9ydGN1dHMgKi9cblx0YmFzZU1pbnVzVE1pbiA9IGJhc2UgLSB0TWluLFxuXHRmbG9vciA9IE1hdGguZmxvb3IsXG5cdHN0cmluZ0Zyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUsXG5cblx0LyoqIFRlbXBvcmFyeSB2YXJpYWJsZSAqL1xuXHRrZXk7XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBlcnJvciB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgZXJyb3IgdHlwZS5cblx0ICogQHJldHVybnMge0Vycm9yfSBUaHJvd3MgYSBgUmFuZ2VFcnJvcmAgd2l0aCB0aGUgYXBwbGljYWJsZSBlcnJvciBtZXNzYWdlLlxuXHQgKi9cblx0ZnVuY3Rpb24gZXJyb3IodHlwZSkge1xuXHRcdHRocm93IFJhbmdlRXJyb3IoZXJyb3JzW3R5cGVdKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgYEFycmF5I21hcGAgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5IGFycmF5XG5cdCAqIGl0ZW0uXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgb2YgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcChhcnJheSwgZm4pIHtcblx0XHR2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHRcdHdoaWxlIChsZW5ndGgtLSkge1xuXHRcdFx0YXJyYXlbbGVuZ3RoXSA9IGZuKGFycmF5W2xlbmd0aF0pO1xuXHRcdH1cblx0XHRyZXR1cm4gYXJyYXk7XG5cdH1cblxuXHQvKipcblx0ICogQSBzaW1wbGUgYEFycmF5I21hcGAtbGlrZSB3cmFwcGVyIHRvIHdvcmsgd2l0aCBkb21haW4gbmFtZSBzdHJpbmdzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZS5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5XG5cdCAqIGNoYXJhY3Rlci5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBzdHJpbmcgb2YgY2hhcmFjdGVycyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2tcblx0ICogZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXBEb21haW4oc3RyaW5nLCBmbikge1xuXHRcdHJldHVybiBtYXAoc3RyaW5nLnNwbGl0KHJlZ2V4U2VwYXJhdG9ycyksIGZuKS5qb2luKCcuJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1lcmljIGNvZGUgcG9pbnRzIG9mIGVhY2ggVW5pY29kZVxuXHQgKiBjaGFyYWN0ZXIgaW4gdGhlIHN0cmluZy4gV2hpbGUgSmF2YVNjcmlwdCB1c2VzIFVDUy0yIGludGVybmFsbHksXG5cdCAqIHRoaXMgZnVuY3Rpb24gd2lsbCBjb252ZXJ0IGEgcGFpciBvZiBzdXJyb2dhdGUgaGFsdmVzIChlYWNoIG9mIHdoaWNoXG5cdCAqIFVDUy0yIGV4cG9zZXMgYXMgc2VwYXJhdGUgY2hhcmFjdGVycykgaW50byBhIHNpbmdsZSBjb2RlIHBvaW50LFxuXHQgKiBtYXRjaGluZyBVVEYtMTYuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZW5jb2RlYFxuXHQgKiBAc2VlIDxodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBkZWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBUaGUgVW5pY29kZSBpbnB1dCBzdHJpbmcgKFVDUy0yKS5cblx0ICogQHJldHVybnMge0FycmF5fSBUaGUgbmV3IGFycmF5IG9mIGNvZGUgcG9pbnRzLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmRlY29kZShzdHJpbmcpIHtcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGNvdW50ZXIgPSAwLFxuXHRcdCAgICBsZW5ndGggPSBzdHJpbmcubGVuZ3RoLFxuXHRcdCAgICB2YWx1ZSxcblx0XHQgICAgZXh0cmE7XG5cdFx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdHZhbHVlID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdGlmICh2YWx1ZSA+PSAweEQ4MDAgJiYgdmFsdWUgPD0gMHhEQkZGICYmIGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdFx0Ly8gaGlnaCBzdXJyb2dhdGUsIGFuZCB0aGVyZSBpcyBhIG5leHQgY2hhcmFjdGVyXG5cdFx0XHRcdGV4dHJhID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7IC8vIGxvdyBzdXJyb2dhdGVcblx0XHRcdFx0XHRvdXRwdXQucHVzaCgoKHZhbHVlICYgMHgzRkYpIDw8IDEwKSArIChleHRyYSAmIDB4M0ZGKSArIDB4MTAwMDApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHVubWF0Y2hlZCBzdXJyb2dhdGU7IG9ubHkgYXBwZW5kIHRoaXMgY29kZSB1bml0LCBpbiBjYXNlIHRoZSBuZXh0XG5cdFx0XHRcdFx0Ly8gY29kZSB1bml0IGlzIHRoZSBoaWdoIHN1cnJvZ2F0ZSBvZiBhIHN1cnJvZ2F0ZSBwYWlyXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0XHRcdGNvdW50ZXItLTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBzdHJpbmcgYmFzZWQgb24gYW4gYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5kZWNvZGVgXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGVuY29kZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBjb2RlUG9pbnRzIFRoZSBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgbmV3IFVuaWNvZGUgc3RyaW5nIChVQ1MtMikuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZW5jb2RlKGFycmF5KSB7XG5cdFx0cmV0dXJuIG1hcChhcnJheSwgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHZhciBvdXRwdXQgPSAnJztcblx0XHRcdGlmICh2YWx1ZSA+IDB4RkZGRikge1xuXHRcdFx0XHR2YWx1ZSAtPSAweDEwMDAwO1xuXHRcdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcblx0XHRcdFx0dmFsdWUgPSAweERDMDAgfCB2YWx1ZSAmIDB4M0ZGO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSk7XG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdH0pLmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgYmFzaWMgY29kZSBwb2ludCBpbnRvIGEgZGlnaXQvaW50ZWdlci5cblx0ICogQHNlZSBgZGlnaXRUb0Jhc2ljKClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBjb2RlUG9pbnQgVGhlIGJhc2ljIG51bWVyaWMgY29kZSBwb2ludCB2YWx1ZS5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50IChmb3IgdXNlIGluXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaW4gdGhlIHJhbmdlIGAwYCB0byBgYmFzZSAtIDFgLCBvciBgYmFzZWAgaWZcblx0ICogdGhlIGNvZGUgcG9pbnQgZG9lcyBub3QgcmVwcmVzZW50IGEgdmFsdWUuXG5cdCAqL1xuXHRmdW5jdGlvbiBiYXNpY1RvRGlnaXQoY29kZVBvaW50KSB7XG5cdFx0aWYgKGNvZGVQb2ludCAtIDQ4IDwgMTApIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSAyMjtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDY1IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA2NTtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDk3IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA5Nztcblx0XHR9XG5cdFx0cmV0dXJuIGJhc2U7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBkaWdpdC9pbnRlZ2VyIGludG8gYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAc2VlIGBiYXNpY1RvRGlnaXQoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGRpZ2l0IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIGJhc2ljIGNvZGUgcG9pbnQgd2hvc2UgdmFsdWUgKHdoZW4gdXNlZCBmb3Jcblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpcyBgZGlnaXRgLCB3aGljaCBuZWVkcyB0byBiZSBpbiB0aGUgcmFuZ2Vcblx0ICogYDBgIHRvIGBiYXNlIC0gMWAuIElmIGBmbGFnYCBpcyBub24temVybywgdGhlIHVwcGVyY2FzZSBmb3JtIGlzXG5cdCAqIHVzZWQ7IGVsc2UsIHRoZSBsb3dlcmNhc2UgZm9ybSBpcyB1c2VkLiBUaGUgYmVoYXZpb3IgaXMgdW5kZWZpbmVkXG5cdCAqIGlmIGBmbGFnYCBpcyBub24temVybyBhbmQgYGRpZ2l0YCBoYXMgbm8gdXBwZXJjYXNlIGZvcm0uXG5cdCAqL1xuXHRmdW5jdGlvbiBkaWdpdFRvQmFzaWMoZGlnaXQsIGZsYWcpIHtcblx0XHQvLyAgMC4uMjUgbWFwIHRvIEFTQ0lJIGEuLnogb3IgQS4uWlxuXHRcdC8vIDI2Li4zNSBtYXAgdG8gQVNDSUkgMC4uOVxuXHRcdHJldHVybiBkaWdpdCArIDIyICsgNzUgKiAoZGlnaXQgPCAyNikgLSAoKGZsYWcgIT0gMCkgPDwgNSk7XG5cdH1cblxuXHQvKipcblx0ICogQmlhcyBhZGFwdGF0aW9uIGZ1bmN0aW9uIGFzIHBlciBzZWN0aW9uIDMuNCBvZiBSRkMgMzQ5Mi5cblx0ICogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzQ5MiNzZWN0aW9uLTMuNFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gYWRhcHQoZGVsdGEsIG51bVBvaW50cywgZmlyc3RUaW1lKSB7XG5cdFx0dmFyIGsgPSAwO1xuXHRcdGRlbHRhID0gZmlyc3RUaW1lID8gZmxvb3IoZGVsdGEgLyBkYW1wKSA6IGRlbHRhID4+IDE7XG5cdFx0ZGVsdGEgKz0gZmxvb3IoZGVsdGEgLyBudW1Qb2ludHMpO1xuXHRcdGZvciAoLyogbm8gaW5pdGlhbGl6YXRpb24gKi87IGRlbHRhID4gYmFzZU1pbnVzVE1pbiAqIHRNYXggPj4gMTsgayArPSBiYXNlKSB7XG5cdFx0XHRkZWx0YSA9IGZsb29yKGRlbHRhIC8gYmFzZU1pbnVzVE1pbik7XG5cdFx0fVxuXHRcdHJldHVybiBmbG9vcihrICsgKGJhc2VNaW51c1RNaW4gKyAxKSAqIGRlbHRhIC8gKGRlbHRhICsgc2tldykpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scyB0byBhIHN0cmluZyBvZiBVbmljb2RlXG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGRlY29kZShpbnB1dCkge1xuXHRcdC8vIERvbid0IHVzZSBVQ1MtMlxuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgaW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdFx0ICAgIG91dCxcblx0XHQgICAgaSA9IDAsXG5cdFx0ICAgIG4gPSBpbml0aWFsTixcblx0XHQgICAgYmlhcyA9IGluaXRpYWxCaWFzLFxuXHRcdCAgICBiYXNpYyxcblx0XHQgICAgaixcblx0XHQgICAgaW5kZXgsXG5cdFx0ICAgIG9sZGksXG5cdFx0ICAgIHcsXG5cdFx0ICAgIGssXG5cdFx0ICAgIGRpZ2l0LFxuXHRcdCAgICB0LFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgYmFzZU1pbnVzVDtcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHM6IGxldCBgYmFzaWNgIGJlIHRoZSBudW1iZXIgb2YgaW5wdXQgY29kZVxuXHRcdC8vIHBvaW50cyBiZWZvcmUgdGhlIGxhc3QgZGVsaW1pdGVyLCBvciBgMGAgaWYgdGhlcmUgaXMgbm9uZSwgdGhlbiBjb3B5XG5cdFx0Ly8gdGhlIGZpcnN0IGJhc2ljIGNvZGUgcG9pbnRzIHRvIHRoZSBvdXRwdXQuXG5cblx0XHRiYXNpYyA9IGlucHV0Lmxhc3RJbmRleE9mKGRlbGltaXRlcik7XG5cdFx0aWYgKGJhc2ljIDwgMCkge1xuXHRcdFx0YmFzaWMgPSAwO1xuXHRcdH1cblxuXHRcdGZvciAoaiA9IDA7IGogPCBiYXNpYzsgKytqKSB7XG5cdFx0XHQvLyBpZiBpdCdzIG5vdCBhIGJhc2ljIGNvZGUgcG9pbnRcblx0XHRcdGlmIChpbnB1dC5jaGFyQ29kZUF0KGopID49IDB4ODApIHtcblx0XHRcdFx0ZXJyb3IoJ25vdC1iYXNpYycpO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0LnB1c2goaW5wdXQuY2hhckNvZGVBdChqKSk7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBkZWNvZGluZyBsb29wOiBzdGFydCBqdXN0IGFmdGVyIHRoZSBsYXN0IGRlbGltaXRlciBpZiBhbnkgYmFzaWMgY29kZVxuXHRcdC8vIHBvaW50cyB3ZXJlIGNvcGllZDsgc3RhcnQgYXQgdGhlIGJlZ2lubmluZyBvdGhlcndpc2UuXG5cblx0XHRmb3IgKGluZGV4ID0gYmFzaWMgPiAwID8gYmFzaWMgKyAxIDogMDsgaW5kZXggPCBpbnB1dExlbmd0aDsgLyogbm8gZmluYWwgZXhwcmVzc2lvbiAqLykge1xuXG5cdFx0XHQvLyBgaW5kZXhgIGlzIHRoZSBpbmRleCBvZiB0aGUgbmV4dCBjaGFyYWN0ZXIgdG8gYmUgY29uc3VtZWQuXG5cdFx0XHQvLyBEZWNvZGUgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlciBpbnRvIGBkZWx0YWAsXG5cdFx0XHQvLyB3aGljaCBnZXRzIGFkZGVkIHRvIGBpYC4gVGhlIG92ZXJmbG93IGNoZWNraW5nIGlzIGVhc2llclxuXHRcdFx0Ly8gaWYgd2UgaW5jcmVhc2UgYGlgIGFzIHdlIGdvLCB0aGVuIHN1YnRyYWN0IG9mZiBpdHMgc3RhcnRpbmdcblx0XHRcdC8vIHZhbHVlIGF0IHRoZSBlbmQgdG8gb2J0YWluIGBkZWx0YWAuXG5cdFx0XHRmb3IgKG9sZGkgPSBpLCB3ID0gMSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cblx0XHRcdFx0aWYgKGluZGV4ID49IGlucHV0TGVuZ3RoKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ2ludmFsaWQtaW5wdXQnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRpZ2l0ID0gYmFzaWNUb0RpZ2l0KGlucHV0LmNoYXJDb2RlQXQoaW5kZXgrKykpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA+PSBiYXNlIHx8IGRpZ2l0ID4gZmxvb3IoKG1heEludCAtIGkpIC8gdykpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGkgKz0gZGlnaXQgKiB3O1xuXHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPCB0KSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdGlmICh3ID4gZmxvb3IobWF4SW50IC8gYmFzZU1pbnVzVCkpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHcgKj0gYmFzZU1pbnVzVDtcblxuXHRcdFx0fVxuXG5cdFx0XHRvdXQgPSBvdXRwdXQubGVuZ3RoICsgMTtcblx0XHRcdGJpYXMgPSBhZGFwdChpIC0gb2xkaSwgb3V0LCBvbGRpID09IDApO1xuXG5cdFx0XHQvLyBgaWAgd2FzIHN1cHBvc2VkIHRvIHdyYXAgYXJvdW5kIGZyb20gYG91dGAgdG8gYDBgLFxuXHRcdFx0Ly8gaW5jcmVtZW50aW5nIGBuYCBlYWNoIHRpbWUsIHNvIHdlJ2xsIGZpeCB0aGF0IG5vdzpcblx0XHRcdGlmIChmbG9vcihpIC8gb3V0KSA+IG1heEludCAtIG4pIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdG4gKz0gZmxvb3IoaSAvIG91dCk7XG5cdFx0XHRpICU9IG91dDtcblxuXHRcdFx0Ly8gSW5zZXJ0IGBuYCBhdCBwb3NpdGlvbiBgaWAgb2YgdGhlIG91dHB1dFxuXHRcdFx0b3V0cHV0LnNwbGljZShpKyssIDAsIG4pO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVjczJlbmNvZGUob3V0cHV0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMgdG8gYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBlbmNvZGUoaW5wdXQpIHtcblx0XHR2YXIgbixcblx0XHQgICAgZGVsdGEsXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50LFxuXHRcdCAgICBiYXNpY0xlbmd0aCxcblx0XHQgICAgYmlhcyxcblx0XHQgICAgaixcblx0XHQgICAgbSxcblx0XHQgICAgcSxcblx0XHQgICAgayxcblx0XHQgICAgdCxcblx0XHQgICAgY3VycmVudFZhbHVlLFxuXHRcdCAgICBvdXRwdXQgPSBbXSxcblx0XHQgICAgLyoqIGBpbnB1dExlbmd0aGAgd2lsbCBob2xkIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgaW4gYGlucHV0YC4gKi9cblx0XHQgICAgaW5wdXRMZW5ndGgsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsXG5cdFx0ICAgIGJhc2VNaW51c1QsXG5cdFx0ICAgIHFNaW51c1Q7XG5cblx0XHQvLyBDb252ZXJ0IHRoZSBpbnB1dCBpbiBVQ1MtMiB0byBVbmljb2RlXG5cdFx0aW5wdXQgPSB1Y3MyZGVjb2RlKGlucHV0KTtcblxuXHRcdC8vIENhY2hlIHRoZSBsZW5ndGhcblx0XHRpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIHN0YXRlXG5cdFx0biA9IGluaXRpYWxOO1xuXHRcdGRlbHRhID0gMDtcblx0XHRiaWFzID0gaW5pdGlhbEJpYXM7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzXG5cdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IDB4ODApIHtcblx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGN1cnJlbnRWYWx1ZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGhhbmRsZWRDUENvdW50ID0gYmFzaWNMZW5ndGggPSBvdXRwdXQubGVuZ3RoO1xuXG5cdFx0Ly8gYGhhbmRsZWRDUENvdW50YCBpcyB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGhhbmRsZWQ7XG5cdFx0Ly8gYGJhc2ljTGVuZ3RoYCBpcyB0aGUgbnVtYmVyIG9mIGJhc2ljIGNvZGUgcG9pbnRzLlxuXG5cdFx0Ly8gRmluaXNoIHRoZSBiYXNpYyBzdHJpbmcgLSBpZiBpdCBpcyBub3QgZW1wdHkgLSB3aXRoIGEgZGVsaW1pdGVyXG5cdFx0aWYgKGJhc2ljTGVuZ3RoKSB7XG5cdFx0XHRvdXRwdXQucHVzaChkZWxpbWl0ZXIpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZW5jb2RpbmcgbG9vcDpcblx0XHR3aGlsZSAoaGFuZGxlZENQQ291bnQgPCBpbnB1dExlbmd0aCkge1xuXG5cdFx0XHQvLyBBbGwgbm9uLWJhc2ljIGNvZGUgcG9pbnRzIDwgbiBoYXZlIGJlZW4gaGFuZGxlZCBhbHJlYWR5LiBGaW5kIHRoZSBuZXh0XG5cdFx0XHQvLyBsYXJnZXIgb25lOlxuXHRcdFx0Zm9yIChtID0gbWF4SW50LCBqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPj0gbiAmJiBjdXJyZW50VmFsdWUgPCBtKSB7XG5cdFx0XHRcdFx0bSA9IGN1cnJlbnRWYWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbmNyZWFzZSBgZGVsdGFgIGVub3VnaCB0byBhZHZhbmNlIHRoZSBkZWNvZGVyJ3MgPG4saT4gc3RhdGUgdG8gPG0sMD4sXG5cdFx0XHQvLyBidXQgZ3VhcmQgYWdhaW5zdCBvdmVyZmxvd1xuXHRcdFx0aGFuZGxlZENQQ291bnRQbHVzT25lID0gaGFuZGxlZENQQ291bnQgKyAxO1xuXHRcdFx0aWYgKG0gLSBuID4gZmxvb3IoKG1heEludCAtIGRlbHRhKSAvIGhhbmRsZWRDUENvdW50UGx1c09uZSkpIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdGRlbHRhICs9IChtIC0gbikgKiBoYW5kbGVkQ1BDb3VudFBsdXNPbmU7XG5cdFx0XHRuID0gbTtcblxuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IG4gJiYgKytkZWx0YSA+IG1heEludCkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PSBuKSB7XG5cdFx0XHRcdFx0Ly8gUmVwcmVzZW50IGRlbHRhIGFzIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXJcblx0XHRcdFx0XHRmb3IgKHEgPSBkZWx0YSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cdFx0XHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblx0XHRcdFx0XHRcdGlmIChxIDwgdCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHFNaW51c1QgPSBxIC0gdDtcblx0XHRcdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0XHRcdG91dHB1dC5wdXNoKFxuXHRcdFx0XHRcdFx0XHRzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHQgKyBxTWludXNUICUgYmFzZU1pbnVzVCwgMCkpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0cSA9IGZsb29yKHFNaW51c1QgLyBiYXNlTWludXNUKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHEsIDApKSk7XG5cdFx0XHRcdFx0YmlhcyA9IGFkYXB0KGRlbHRhLCBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsIGhhbmRsZWRDUENvdW50ID09IGJhc2ljTGVuZ3RoKTtcblx0XHRcdFx0XHRkZWx0YSA9IDA7XG5cdFx0XHRcdFx0KytoYW5kbGVkQ1BDb3VudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQrK2RlbHRhO1xuXHRcdFx0KytuO1xuXG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gVW5pY29kZS4gT25seSB0aGVcblx0ICogUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCBvbiBhIHN0cmluZyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29udmVydGVkIHRvXG5cdCAqIFVuaWNvZGUuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBQdW55Y29kZSBkb21haW4gbmFtZSB0byBjb252ZXJ0IHRvIFVuaWNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBVbmljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBQdW55Y29kZVxuXHQgKiBzdHJpbmcuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b1VuaWNvZGUoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4UHVueWNvZGUudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gZGVjb2RlKHN0cmluZy5zbGljZSg0KS50b0xvd2VyQ2FzZSgpKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFB1bnljb2RlLiBPbmx5IHRoZVxuXHQgKiBub24tQVNDSUkgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCdzIGFscmVhZHkgaW4gQVNDSUkuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZSB0byBjb252ZXJ0LCBhcyBhIFVuaWNvZGUgc3RyaW5nLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgUHVueWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGRvbWFpbiBuYW1lLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9BU0NJSShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKiBEZWZpbmUgdGhlIHB1YmxpYyBBUEkgKi9cblx0cHVueWNvZGUgPSB7XG5cdFx0LyoqXG5cdFx0ICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IFB1bnljb2RlLmpzIHZlcnNpb24gbnVtYmVyLlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIFN0cmluZ1xuXHRcdCAqL1xuXHRcdCd2ZXJzaW9uJzogJzEuMi40Jyxcblx0XHQvKipcblx0XHQgKiBBbiBvYmplY3Qgb2YgbWV0aG9kcyB0byBjb252ZXJ0IGZyb20gSmF2YVNjcmlwdCdzIGludGVybmFsIGNoYXJhY3RlclxuXHRcdCAqIHJlcHJlc2VudGF0aW9uIChVQ1MtMikgdG8gVW5pY29kZSBjb2RlIHBvaW50cywgYW5kIGJhY2suXG5cdFx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBPYmplY3Rcblx0XHQgKi9cblx0XHQndWNzMic6IHtcblx0XHRcdCdkZWNvZGUnOiB1Y3MyZGVjb2RlLFxuXHRcdFx0J2VuY29kZSc6IHVjczJlbmNvZGVcblx0XHR9LFxuXHRcdCdkZWNvZGUnOiBkZWNvZGUsXG5cdFx0J2VuY29kZSc6IGVuY29kZSxcblx0XHQndG9BU0NJSSc6IHRvQVNDSUksXG5cdFx0J3RvVW5pY29kZSc6IHRvVW5pY29kZVxuXHR9O1xuXG5cdC8qKiBFeHBvc2UgYHB1bnljb2RlYCAqL1xuXHQvLyBTb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnNcblx0Ly8gbGlrZSB0aGUgZm9sbG93aW5nOlxuXHRpZiAoXG5cdFx0dHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmXG5cdFx0dHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiZcblx0XHRkZWZpbmUuYW1kXG5cdCkge1xuXHRcdGRlZmluZSgncHVueWNvZGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwdW55Y29kZTtcblx0XHR9KTtcblx0fSBlbHNlIGlmIChmcmVlRXhwb3J0cyAmJiAhZnJlZUV4cG9ydHMubm9kZVR5cGUpIHtcblx0XHRpZiAoZnJlZU1vZHVsZSkgeyAvLyBpbiBOb2RlLmpzIG9yIFJpbmdvSlMgdjAuOC4wK1xuXHRcdFx0ZnJlZU1vZHVsZS5leHBvcnRzID0gcHVueWNvZGU7XG5cdFx0fSBlbHNlIHsgLy8gaW4gTmFyd2hhbCBvciBSaW5nb0pTIHYwLjcuMC1cblx0XHRcdGZvciAoa2V5IGluIHB1bnljb2RlKSB7XG5cdFx0XHRcdHB1bnljb2RlLmhhc093blByb3BlcnR5KGtleSkgJiYgKGZyZWVFeHBvcnRzW2tleV0gPSBwdW55Y29kZVtrZXldKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7IC8vIGluIFJoaW5vIG9yIGEgd2ViIGJyb3dzZXJcblx0XHRyb290LnB1bnljb2RlID0gcHVueWNvZGU7XG5cdH1cblxufSh0aGlzKSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2F0YmVycnkgPSByZXF1aXJlKCdjYXRiZXJyeScpLFxuXHQvLyB0aGlzIGNvbmZpZyB3aWxsIGJlIHJlcGxhY2VkIGJ5IGAuL2NvbmZpZy9icm93c2VyLmpzb25gIHdoZW4gYnVpbGRpbmdcblx0Ly8gYmVjYXVzZSBvZiBgYnJvd3NlcmAgZmllbGQgaW4gYHBhY2thZ2UuanNvbmBcblx0Y29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcvZW52aXJvbm1lbnQuanNvbicpLFxuXHR0ZW1wbGF0ZUVuZ2luZSA9IHJlcXVpcmUoJ2NhdGJlcnJ5LWhhbmRsZWJhcnMnKSxcblx0Y2F0ID0gY2F0YmVycnkuY3JlYXRlKGNvbmZpZyk7XG5cbi8vIHJlZ2lzdGVyIHRlbXBsYXRlIHByb3ZpZGVyIHRvIENhdGJlcnJ5IFNlcnZpY2UgTG9jYXRvclxudGVtcGxhdGVFbmdpbmUucmVnaXN0ZXIoY2F0LmxvY2F0b3IpO1xuXG5jYXQuc3RhcnRXaGVuUmVhZHkoKTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBBYm91dDtcblxuLypcbiAqIFRoaXMgaXMgYSBDYXRiZXJyeSBDYXQtY29tcG9uZW50IGZpbGUuXG4gKiBNb3JlIGRldGFpbHMgY2FuIGJlIGZvdW5kIGhlcmVcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9jYXRiZXJyeS9jYXRiZXJyeS9ibG9iL21hc3Rlci9kb2NzL2luZGV4Lm1kI2NhdC1jb21wb25lbnRzXG4gKi9cblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgXCJhYm91dFwiIGNvbXBvbmVudC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBBYm91dCgpIHtcblxufVxuXG4vKipcbiAqIEdldHMgZGF0YSBjb250ZXh0IGZvciB0ZW1wbGF0ZSBlbmdpbmUuXG4gKiBUaGlzIG1ldGhvZCBpcyBvcHRpb25hbC5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD58T2JqZWN0fG51bGx8dW5kZWZpbmVkfSBEYXRhIGNvbnRleHRcbiAqIGZvciB0ZW1wbGF0ZSBlbmdpbmUuXG4gKi9cbkFib3V0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLiRjb250ZXh0LmdldFN0b3JlRGF0YSgpO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tbWl0c0RldGFpbHM7XG5cbi8qXG4gKiBUaGlzIGlzIGEgQ2F0YmVycnkgQ2F0LWNvbXBvbmVudCBmaWxlLlxuICogTW9yZSBkZXRhaWxzIGNhbiBiZSBmb3VuZCBoZXJlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vY2F0YmVycnkvY2F0YmVycnkvYmxvYi9tYXN0ZXIvZG9jcy9pbmRleC5tZCNjYXQtY29tcG9uZW50c1xuICovXG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIFwiY29tbWl0cy1kZXRhaWxzXCIgY29tcG9uZW50LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENvbW1pdHNEZXRhaWxzKCkge1xuXG59XG5cbkNvbW1pdHNEZXRhaWxzLnByb3RvdHlwZS5zZXREZXRhaWxzID0gZnVuY3Rpb24gKGRldGFpbHMpIHtcblx0Ly8ganNjczpkaXNhYmxlIHJlcXVpcmVDYW1lbENhc2VPclVwcGVyQ2FzZUlkZW50aWZpZXJzXG5cdHRoaXMuc2V0QWRkaXRpb25zKGRldGFpbHMuc3RhdHMuYWRkaXRpb25zKTtcblx0dGhpcy5zZXREZWxldGlvbnMoZGV0YWlscy5zdGF0cy5kZWxldGlvbnMpO1xuXHR0aGlzLnNldFRvdGFsKGRldGFpbHMuc3RhdHMudG90YWwpO1xuXHR0aGlzLnNldENvbW1lbnRDb3VudChkZXRhaWxzLmNvbW1pdC5jb21tZW50X2NvdW50KTtcblx0dGhpcy5zZXRDb21tZW50TGluayhkZXRhaWxzLmh0bWxfdXJsKTtcbn07XG5cbkNvbW1pdHNEZXRhaWxzLnByb3RvdHlwZS5zZXRBZGRpdGlvbnMgPSBmdW5jdGlvbiAoY291bnQpIHtcblx0dGhpcy4kY29udGV4dC5lbGVtZW50XG5cdFx0LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2FkZGl0aW9ucycpWzBdLmlubmVySFRNTCA9IGNvdW50O1xufTtcblxuQ29tbWl0c0RldGFpbHMucHJvdG90eXBlLnNldERlbGV0aW9ucyA9IGZ1bmN0aW9uIChjb3VudCkge1xuXHR0aGlzLiRjb250ZXh0LmVsZW1lbnRcblx0XHQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnZGVsZXRpb25zJylbMF0uaW5uZXJIVE1MID0gY291bnQ7XG59O1xuXG5Db21taXRzRGV0YWlscy5wcm90b3R5cGUuc2V0VG90YWwgPSBmdW5jdGlvbiAoY291bnQpIHtcblx0dGhpcy4kY29udGV4dC5lbGVtZW50XG5cdFx0LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3RvdGFsJylbMF0uaW5uZXJIVE1MID0gY291bnQ7XG59O1xuXG5Db21taXRzRGV0YWlscy5wcm90b3R5cGUuc2V0Q29tbWVudENvdW50ID0gZnVuY3Rpb24gKGNvdW50KSB7XG5cdHRoaXMuJGNvbnRleHQuZWxlbWVudFxuXHRcdC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjb21tZW50LWNvdW50JylbMF0uaW5uZXJIVE1MID0gY291bnQ7XG59O1xuXG5Db21taXRzRGV0YWlscy5wcm90b3R5cGUuc2V0Q29tbWVudExpbmsgPSBmdW5jdGlvbiAobGluaykge1xuXHR0aGlzLiRjb250ZXh0LmVsZW1lbnRcblx0XHQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnY29tbWVudHMtbGluaycpWzBdXG5cdFx0LnNldEF0dHJpYnV0ZSgnaHJlZicsIGxpbmspO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tbWl0c0xpc3Q7XG5cbi8qXG4gKiBUaGlzIGlzIGEgQ2F0YmVycnkgQ2F0LWNvbXBvbmVudCBmaWxlLlxuICogTW9yZSBkZXRhaWxzIGNhbiBiZSBmb3VuZCBoZXJlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vY2F0YmVycnkvY2F0YmVycnkvYmxvYi9tYXN0ZXIvZG9jcy9pbmRleC5tZCNjYXQtY29tcG9uZW50c1xuICovXG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIFwiY29tbWl0cy1saXN0XCIgY29tcG9uZW50LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENvbW1pdHNMaXN0KCRzZXJ2aWNlTG9jYXRvcikge1xuXHQvLyB3ZSBjYW4gdXNlIHdpbmRvdyBmcm9tIHRoZSBsb2NhdG9yIGluIGEgYnJvd3NlciBvbmx5XG5cdGlmICh0aGlzLiRjb250ZXh0LmlzQnJvd3Nlcikge1xuXHRcdHRoaXMuX3dpbmRvdyA9ICRzZXJ2aWNlTG9jYXRvci5yZXNvbHZlKCd3aW5kb3cnKTtcblx0XHR0aGlzLl9oYW5kbGVTY3JvbGwgPSB0aGlzLl9oYW5kbGVTY3JvbGwuYmluZCh0aGlzKTtcblx0fVxufVxuXG5Db21taXRzTGlzdC5wcm90b3R5cGUuX3dpbmRvdyA9IG51bGw7XG4vKipcbiAqIEdldHMgZGF0YSBjb250ZXh0IGZvciB0ZW1wbGF0ZSBlbmdpbmUuXG4gKiBUaGlzIG1ldGhvZCBpcyBvcHRpb25hbC5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD58T2JqZWN0fG51bGx8dW5kZWZpbmVkfSBEYXRhIGNvbnRleHRcbiAqIGZvciB0ZW1wbGF0ZSBlbmdpbmUuXG4gKi9cbkNvbW1pdHNMaXN0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLiRjb250ZXh0LmdldFN0b3JlRGF0YSgpXG5cdFx0LnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuXHRcdFx0cmV0dXJuIHtjb21taXRzOiByZXN1bHR9O1xuXHRcdH0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGV2ZW50IGJpbmRpbmcgc2V0dGluZ3MgZm9yIHRoZSBjb21wb25lbnQuXG4gKiBUaGlzIG1ldGhvZCBpcyBvcHRpb25hbC5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD58T2JqZWN0fG51bGx8dW5kZWZpbmVkfSBCaW5kaW5nIHNldHRpbmdzLlxuICovXG5Db21taXRzTGlzdC5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMuX2hhbmRsZVNjcm9sbCk7XG5cdHJldHVybiB7XG5cdFx0Y2xpY2s6IHtcblx0XHRcdCdhLmpzLWNvbW1pdCc6IHRoaXMuX2hhbmRsZUNsaWNrRGV0YWlsc1xuXHRcdH1cblx0fTtcbn07XG5cbi8qKlxuICogVW5iaW5kcyBhbGwgdW5tYW5hZ2VkIGV2ZW50IGhhbmRsZXJzLlxuICovXG5Db21taXRzTGlzdC5wcm90b3R5cGUudW5iaW5kID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdGhpcy5faGFuZGxlU2Nyb2xsKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aW5kb3cgc2Nyb2xsIGZvciBpbmZpbml0ZSBzY3JvbGwgbG9hZGluZy5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbW1pdHNMaXN0LnByb3RvdHlwZS5faGFuZGxlU2Nyb2xsID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgd2luZG93SGVpZ2h0ID0gdGhpcy5fd2luZG93LmlubmVySGVpZ2h0LFxuXHRcdHNjcm9sbFRvcCA9IHRoaXMuX3dpbmRvdy5wYWdlWU9mZnNldCxcblx0XHRkb2MgPSB0aGlzLl93aW5kb3cuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXHR0cnkge1xuXHRcdGlmIChzY3JvbGxUb3AgPj0gKGRvYy5zY3JvbGxIZWlnaHQgLSB3aW5kb3dIZWlnaHQpIHx8XG5cdFx0XHRkb2Muc2Nyb2xsSGVpZ2h0IDw9IHdpbmRvd0hlaWdodCkge1xuXHRcdFx0dGhpcy5fbG9hZE1vcmVJdGVtcygpO1xuXHRcdH1cblx0fSBjYXRjaCAoZSkge1xuXHRcdC8vIGRvIG5vdGhpbmdcblx0fVxufTtcblxuLyoqXG4gKiBMb2FkcyBtb3JlIGl0ZW1zIHRvIGZlZWQuXG4gKiBAcHJpdmF0ZVxuICovXG5Db21taXRzTGlzdC5wcm90b3R5cGUuX2xvYWRNb3JlSXRlbXMgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuJGNvbnRleHQuc2VuZEFjdGlvbignbG9hZC1tb3JlJyk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgY2xpY2sgZXZlbnQgd2hlbiBjbGljayBvbiBjb21taXQgaXRlbS5cbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IERPTSBldmVudC5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbW1pdHNMaXN0LnByb3RvdHlwZS5faGFuZGxlQ2xpY2tEZXRhaWxzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG5cdHZhciBzZWxmID0gdGhpcyxcblx0XHRjb21taXRFbGVtZW50ID0gZXZlbnQuY3VycmVudFRhcmdldCxcblx0XHRjb21taXRTaGEgPSBjb21taXRFbGVtZW50LmdldEF0dHJpYnV0ZSgnaWQnKTtcblxuXHR0aGlzLl9jbGVhckFsbERldGFpbHMoKTtcblxuXHR2YXIgZGV0YWlsc0lkID0gJ2RldGFpbHMtJyArIGNvbW1pdFNoYTtcblxuXHR0aGlzLl9zaG93RGV0YWlsc0xvYWRlcihjb21taXRFbGVtZW50KVxuXHRcdC50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBzZWxmLiRjb250ZXh0LnNlbmRBY3Rpb24oJ2dldC1kZXRhaWxzJywge1xuXHRcdFx0XHRzaGE6IGNvbW1pdFNoYVxuXHRcdFx0fSk7XG5cdFx0fSlcblx0XHQudGhlbihmdW5jdGlvbiAoZGV0YWlscykge1xuXHRcdFx0cmV0dXJuIHNlbGYuJGNvbnRleHQuY3JlYXRlQ29tcG9uZW50KFxuXHRcdFx0XHQnY2F0LWNvbW1pdHMtZGV0YWlscycsIHtcblx0XHRcdFx0XHRpZDogZGV0YWlsc0lkXG5cdFx0XHRcdH1cblx0XHRcdClcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24gKGVsZW1lbnQpIHtcblx0XHRcdFx0XHRzZWxmLiRjb250ZXh0XG5cdFx0XHRcdFx0XHQuZ2V0Q29tcG9uZW50QnlJZChkZXRhaWxzSWQpXG5cdFx0XHRcdFx0XHQuc2V0RGV0YWlscyhkZXRhaWxzKTtcblx0XHRcdFx0XHRzZWxmLl9pbnNlcnRBZnRlckNvbW1pdChjb21taXRFbGVtZW50LCBlbGVtZW50KTtcblx0XHRcdFx0XHRzZWxmLl9oaWRlRGV0YWlsc0xvYWRlcihjb21taXRFbGVtZW50KTtcblx0XHRcdFx0fSk7XG5cdFx0fSk7XG59O1xuXG4vKipcbiAqIENsZWFycyBhbGwgZGV0YWlscyBpdGVtcyBmcm9tIGxpc3QuXG4gKiBAcHJpdmF0ZVxuICovXG5Db21taXRzTGlzdC5wcm90b3R5cGUuX2NsZWFyQWxsRGV0YWlscyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGRldGFpbHMgPSB0aGlzLiRjb250ZXh0LmVsZW1lbnRcblx0XHQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2NhdC1jb21taXRzLWRldGFpbHMnKTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZXRhaWxzLmxlbmd0aDsgaSsrKSB7XG5cdFx0ZGV0YWlsc1tpXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGRldGFpbHNbaV0pO1xuXHR9XG5cdHRoaXMuJGNvbnRleHQuY29sbGVjdEdhcmJhZ2UoKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbmQgc2hvdyBsb2FkZXIgY29tcG9uZW50IGFmdGVyIGNvbW1pdCBpdGVtLlxuICogQHBhcmFtIHtFbGVtZW50fSBjb21taXRFbGVtZW50IENvbW1pdCBET00gZWxlbWVudC5cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIGZvciBkb25lIG9wZXJhdGlvbi5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbW1pdHNMaXN0LnByb3RvdHlwZS5fc2hvd0RldGFpbHNMb2FkZXIgPSBmdW5jdGlvbiAoY29tbWl0RWxlbWVudCkge1xuXHR2YXIgY29tbWl0U2hhID0gY29tbWl0RWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2lkJyksXG5cdFx0bG9hZGVySWQgPSAnbG9hZGVyLScgKyBjb21taXRTaGEsXG5cdFx0c2VsZiA9IHRoaXM7XG5cdHJldHVybiB0aGlzLiRjb250ZXh0LmNyZWF0ZUNvbXBvbmVudCgnY2F0LWxvYWRlcicsIHtpZDogbG9hZGVySWR9KVxuXHRcdC50aGVuKGZ1bmN0aW9uIChlbGVtZW50KSB7XG5cdFx0XHRzZWxmLl9pbnNlcnRBZnRlckNvbW1pdChjb21taXRFbGVtZW50LCBlbGVtZW50KTtcblx0XHR9KTtcbn07XG5cbi8qKlxuICogSGlkZXMgbG9hZGVyIGZyb20gY29tbWl0IGRldGFpbHMuXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGNvbW1pdEVsZW1lbnQgQ29tbWl0IERPTSBlbGVtZW50LlxuICogQHByaXZhdGVcbiAqL1xuQ29tbWl0c0xpc3QucHJvdG90eXBlLl9oaWRlRGV0YWlsc0xvYWRlciA9IGZ1bmN0aW9uIChjb21taXRFbGVtZW50KSB7XG5cdHZhciBjb21taXRTaGEgPSBjb21taXRFbGVtZW50LmdldEF0dHJpYnV0ZSgnaWQnKSxcblx0XHRsb2FkZXJJZCA9ICdsb2FkZXItJyArIGNvbW1pdFNoYSxcblx0XHRlbGVtZW50ID0gdGhpcy4kY29udGV4dC5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnICsgbG9hZGVySWQpO1xuXG5cdGVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbGVtZW50KTtcbn07XG5cbi8qKlxuICogSW5zZXJ0cyBlbGVtZW50IGFmdGVyIGNvbW1pdCBpdGVtLlxuICogQHBhcmFtIHtFbGVtZW50fSBjb21taXRFbGVtZW50IENvbW1pdCBET00gZWxlbWVudC5cbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBFbGVtZW50IHRvIGluc2VydCBhZnRlciBjb21taXQgaXRlbS5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbW1pdHNMaXN0LnByb3RvdHlwZS5faW5zZXJ0QWZ0ZXJDb21taXQgPSBmdW5jdGlvbiAoY29tbWl0RWxlbWVudCwgZWxlbWVudCkge1xuXHRpZiAoY29tbWl0RWxlbWVudC5uZXh0U2libGluZykge1xuXHRcdGNvbW1pdEVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoXG5cdFx0XHRlbGVtZW50LCBjb21taXRFbGVtZW50Lm5leHRTaWJsaW5nXG5cdFx0KTtcblx0XHRyZXR1cm47XG5cdH1cblx0Y29tbWl0RWxlbWVudC5wYXJlbnROb2RlLmFwcGVuZENoaWxkKGVsZW1lbnQpO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnQ7XG5cbi8qXG4gKiBUaGlzIGlzIGEgQ2F0YmVycnkgQ2F0LWNvbXBvbmVudCBmaWxlLlxuICogTW9yZSBkZXRhaWxzIGNhbiBiZSBmb3VuZCBoZXJlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vY2F0YmVycnkvY2F0YmVycnkvYmxvYi9tYXN0ZXIvZG9jcy9pbmRleC5tZCNjYXQtY29tcG9uZW50c1xuICovXG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIFwiZG9jdW1lbnRcIiBjb21wb25lbnQuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnQoKSB7XG5cbn1cblxuLyoqXG4gKiBHZXRzIGRhdGEgY29udGV4dCBmb3IgdGVtcGxhdGUgZW5naW5lLlxuICogVGhpcyBtZXRob2QgaXMgb3B0aW9uYWwuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fE9iamVjdHxudWxsfHVuZGVmaW5lZH0gRGF0YSBjb250ZXh0XG4gKiBmb3IgdGVtcGxhdGUgZW5naW5lLlxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuXG59O1xuXG4vKipcbiAqIFJldHVybnMgZXZlbnQgYmluZGluZyBzZXR0aW5ncyBmb3IgdGhlIGNvbXBvbmVudC5cbiAqIFRoaXMgbWV0aG9kIGlzIG9wdGlvbmFsLlxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0PnxPYmplY3R8bnVsbHx1bmRlZmluZWR9IEJpbmRpbmcgc2V0dGluZ3MuXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24gKCkge1xuXG59O1xuXG4vKipcbiAqIERvZXMgY2xlYW5pbmcgZm9yIGV2ZXJ5dGhpbmcgdGhhdCBoYXZlIE5PVCBiZWVuIHNldCBieSAuYmluZCgpIG1ldGhvZC5cbiAqIFRoaXMgbWV0aG9kIGlzIG9wdGlvbmFsLlxuICogQHJldHVybnMge1Byb21pc2V8dW5kZWZpbmVkfSBQcm9taXNlIG9yIG5vdGhpbmcuXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS51bmJpbmQgPSBmdW5jdGlvbiAoKSB7XG5cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gSGVhZDtcblxuLypcbiAqIFRoaXMgaXMgYSBDYXRiZXJyeSBDYXQtY29tcG9uZW50IGZpbGUuXG4gKiBNb3JlIGRldGFpbHMgY2FuIGJlIGZvdW5kIGhlcmVcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9jYXRiZXJyeS9jYXRiZXJyeS9ibG9iL21hc3Rlci9kb2NzL2luZGV4Lm1kI2NhdC1jb21wb25lbnRzXG4gKi9cblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgXCJoZWFkXCIgY29tcG9uZW50LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEhlYWQoKSB7XG59XG5cbi8qKlxuICogR2V0cyBkYXRhIGNvbnRleHQgZm9yIHRlbXBsYXRlIGVuZ2luZS5cbiAqIFRoaXMgbWV0aG9kIGlzIG9wdGlvbmFsLlxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0PnxPYmplY3R8bnVsbHx1bmRlZmluZWR9IERhdGEgY29udGV4dFxuICogZm9yIHRlbXBsYXRlIGVuZ2luZS5cbiAqL1xuSGVhZC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy4kY29udGV4dC5nZXRTdG9yZURhdGEoKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gTG9hZGVyO1xuXG4vKlxuICogVGhpcyBpcyBhIENhdGJlcnJ5IENhdC1jb21wb25lbnQgZmlsZS5cbiAqIE1vcmUgZGV0YWlscyBjYW4gYmUgZm91bmQgaGVyZVxuICogaHR0cHM6Ly9naXRodWIuY29tL2NhdGJlcnJ5L2NhdGJlcnJ5L2Jsb2IvbWFzdGVyL2RvY3MvaW5kZXgubWQjY2F0LWNvbXBvbmVudHNcbiAqL1xuXG4vKipcbiAqIENyZWF0ZXMgbmV3IGluc3RhbmNlIG9mIHRoZSBcImxvYWRlclwiIGNvbXBvbmVudC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBMb2FkZXIoKSB7XG5cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBQYWdlc0NvbnRlbnQ7XG5cbi8qXG4gKiBUaGlzIGlzIGEgQ2F0YmVycnkgQ2F0LWNvbXBvbmVudCBmaWxlLlxuICogTW9yZSBkZXRhaWxzIGNhbiBiZSBmb3VuZCBoZXJlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vY2F0YmVycnkvY2F0YmVycnkvYmxvYi9tYXN0ZXIvZG9jcy9pbmRleC5tZCNjYXQtY29tcG9uZW50c1xuICovXG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIFwicGFnZXMtY29udGVudFwiIGNvbXBvbmVudC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBQYWdlc0NvbnRlbnQoKSB7XG5cbn1cblxuLyoqXG4gKiBHZXRzIGRhdGEgY29udGV4dCBmb3IgdGVtcGxhdGUgZW5naW5lLlxuICogVGhpcyBtZXRob2QgaXMgb3B0aW9uYWwuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fE9iamVjdHxudWxsfHVuZGVmaW5lZH0gRGF0YSBjb250ZXh0XG4gKiBmb3IgdGVtcGxhdGUgZW5naW5lLlxuICovXG5QYWdlc0NvbnRlbnQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuJGNvbnRleHQuZ2V0U3RvcmVEYXRhKCk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgZXZlbnQgYmluZGluZyBzZXR0aW5ncyBmb3IgdGhlIGNvbXBvbmVudC5cbiAqIFRoaXMgbWV0aG9kIGlzIG9wdGlvbmFsLlxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0PnxPYmplY3R8bnVsbHx1bmRlZmluZWR9IEJpbmRpbmcgc2V0dGluZ3MuXG4gKi9cblBhZ2VzQ29udGVudC5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5oaWRlTG9hZGVyKCk7XG59O1xuXG4vKipcbiAqIEhpZGVzIGxvYWRlciBpbiB0ZW1wbGF0ZS5cbiAqL1xuUGFnZXNDb250ZW50LnByb3RvdHlwZS5oaWRlTG9hZGVyID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgbG9hZGVycyA9IHRoaXMuJGNvbnRleHQuZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY2F0LWxvYWRlcicpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGxvYWRlcnMubGVuZ3RoOyBpKyspIHtcblx0XHRsb2FkZXJzW2ldLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cdH1cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhZ2VzTmF2aWdhdGlvbjtcblxuLypcbiAqIFRoaXMgaXMgYSBDYXRiZXJyeSBDYXQtY29tcG9uZW50IGZpbGUuXG4gKiBNb3JlIGRldGFpbHMgY2FuIGJlIGZvdW5kIGhlcmVcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9jYXRiZXJyeS9jYXRiZXJyeS9ibG9iL21hc3Rlci9kb2NzL2luZGV4Lm1kI2NhdC1jb21wb25lbnRzXG4gKi9cblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgXCJwYWdlcy1uYXZpZ2F0aW9uXCIgY29tcG9uZW50LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFBhZ2VzTmF2aWdhdGlvbigpIHtcblxufVxuXG4vKipcbiAqIEdldHMgZGF0YSBjb250ZXh0IGZvciB0ZW1wbGF0ZSBlbmdpbmUuXG4gKiBUaGlzIG1ldGhvZCBpcyBvcHRpb25hbC5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD58T2JqZWN0fG51bGx8dW5kZWZpbmVkfSBEYXRhIGNvbnRleHRcbiAqIGZvciB0ZW1wbGF0ZSBlbmdpbmUuXG4gKi9cblBhZ2VzTmF2aWdhdGlvbi5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy4kY29udGV4dC5nZXRTdG9yZURhdGEoKTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlYXJjaEZvcm07XG5cbi8qXG4gKiBUaGlzIGlzIGEgQ2F0YmVycnkgQ2F0LWNvbXBvbmVudCBmaWxlLlxuICogTW9yZSBkZXRhaWxzIGNhbiBiZSBmb3VuZCBoZXJlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vY2F0YmVycnkvY2F0YmVycnkvYmxvYi9tYXN0ZXIvZG9jcy9pbmRleC5tZCNjYXQtY29tcG9uZW50c1xuICovXG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIFwic2VhcmNoLWZvcm1cIiBjb21wb25lbnQuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gU2VhcmNoRm9ybSgpIHtcblxufVxuXG4vKipcbiAqIEdldHMgZGF0YSBjb250ZXh0IGZvciB0ZW1wbGF0ZSBlbmdpbmUuXG4gKiBUaGlzIG1ldGhvZCBpcyBvcHRpb25hbC5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD58T2JqZWN0fG51bGx8dW5kZWZpbmVkfSBEYXRhIGNvbnRleHRcbiAqIGZvciB0ZW1wbGF0ZSBlbmdpbmUuXG4gKi9cblNlYXJjaEZvcm0ucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuJGNvbnRleHQuZ2V0U3RvcmVEYXRhKCk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgZXZlbnQgYmluZGluZyBzZXR0aW5ncyBmb3IgdGhlIGNvbXBvbmVudC5cbiAqIFRoaXMgbWV0aG9kIGlzIG9wdGlvbmFsLlxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0PnxPYmplY3R8bnVsbHx1bmRlZmluZWR9IEJpbmRpbmcgc2V0dGluZ3MuXG4gKi9cblNlYXJjaEZvcm0ucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuaGlkZUxvYWRlcigpO1xuXHRyZXR1cm4ge1xuXHRcdHN1Ym1pdDoge1xuXHRcdFx0Zm9ybTogdGhpcy5faGFuZGxlRm9ybVN1Ym1pdFxuXHRcdH1cblx0fTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyBjbGljayBvbiBzdWJtaXQgYnV0dG9uLlxuICogQHByaXZhdGVcbiAqL1xuU2VhcmNoRm9ybS5wcm90b3R5cGUuX2hhbmRsZUZvcm1TdWJtaXQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdHRoaXMuc2hvd0xvYWRlcigpO1xuXHR0aGlzLiRjb250ZXh0LnJlZGlyZWN0KCcvc2VhcmNoP3F1ZXJ5PScgKyB0aGlzLmdldFF1ZXJ5KCkpO1xufTtcblxuLyoqXG4gKiBHZXRzIGN1cnJlbnQgc3BlY2lmaWVkIHF1ZXJ5LlxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuU2VhcmNoRm9ybS5wcm90b3R5cGUuZ2V0UXVlcnkgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLiRjb250ZXh0LmVsZW1lbnRcblx0XHQucXVlcnlTZWxlY3RvcignaW5wdXRbbmFtZT1xdWVyeV0nKVxuXHRcdC52YWx1ZTtcbn07XG5cbi8qKlxuICogSGlkZXMgbG9hZGVyIGluIHRlbXBsYXRlLlxuICovXG5TZWFyY2hGb3JtLnByb3RvdHlwZS5oaWRlTG9hZGVyID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgbG9hZGVycyA9IHRoaXMuJGNvbnRleHQuZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY2F0LWxvYWRlcicpO1xuXHRmb3IodmFyIGkgPSAwOyBpIDwgbG9hZGVycy5sZW5ndGg7IGkrKykge1xuXHRcdGxvYWRlcnNbaV0uc3R5bGUuZGlzcGxheSA9ICdub25lJztcblx0fVxufTtcblxuLyoqXG4gKiBTaG93cyBsb2FkZXIgaW4gdGVtcGxhdGUuXG4gKi9cblNlYXJjaEZvcm0ucHJvdG90eXBlLnNob3dMb2FkZXIgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBsb2FkZXJzID0gdGhpcy4kY29udGV4dC5lbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYXQtbG9hZGVyJyk7XG5cdGZvcih2YXIgaSA9IDA7IGkgPCBsb2FkZXJzLmxlbmd0aDsgaSsrKSB7XG5cdFx0bG9hZGVyc1tpXS5zdHlsZS5kaXNwbGF5ID0gJyc7XG5cdH1cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlYXJjaFJlc3VsdHM7XG5cbi8qXG4gKiBUaGlzIGlzIGEgQ2F0YmVycnkgQ2F0LWNvbXBvbmVudCBmaWxlLlxuICogTW9yZSBkZXRhaWxzIGNhbiBiZSBmb3VuZCBoZXJlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vY2F0YmVycnkvY2F0YmVycnkvYmxvYi9tYXN0ZXIvZG9jcy9pbmRleC5tZCNjYXQtY29tcG9uZW50c1xuICovXG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIFwic2VhcmNoLXJlc3VsdHNcIiBjb21wb25lbnQuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gU2VhcmNoUmVzdWx0cygpIHtcblxufVxuXG4vKipcbiAqIEdldHMgZGF0YSBjb250ZXh0IGZvciB0ZW1wbGF0ZSBlbmdpbmUuXG4gKiBUaGlzIG1ldGhvZCBpcyBvcHRpb25hbC5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD58T2JqZWN0fG51bGx8dW5kZWZpbmVkfSBEYXRhIGNvbnRleHRcbiAqIGZvciB0ZW1wbGF0ZSBlbmdpbmUuXG4gKi9cblNlYXJjaFJlc3VsdHMucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuJGNvbnRleHQuZ2V0U3RvcmVEYXRhKCk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgZXZlbnQgYmluZGluZyBzZXR0aW5ncyBmb3IgdGhlIGNvbXBvbmVudC5cbiAqIFRoaXMgbWV0aG9kIGlzIG9wdGlvbmFsLlxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0PnxPYmplY3R8bnVsbHx1bmRlZmluZWR9IEJpbmRpbmcgc2V0dGluZ3MuXG4gKi9cblNlYXJjaFJlc3VsdHMucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB7XG5cdFx0c3VibWl0OiB7XG5cdFx0XHRmb3JtOiB0aGlzLl9oYW5kbGVGb3JtU3VibWl0XG5cdFx0fVxuXHR9O1xufTsiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gQWJvdXQ7XG5cbi8qXG4gKiBUaGlzIGlzIGEgQ2F0YmVycnkgU3RvcmUgZmlsZS5cbiAqIE1vcmUgZGV0YWlscyBjYW4gYmUgZm91bmQgaGVyZVxuICogaHR0cHM6Ly9naXRodWIuY29tL2NhdGJlcnJ5L2NhdGJlcnJ5L2Jsb2IvbWFzdGVyL2RvY3MvaW5kZXgubWQjc3RvcmVzXG4gKi9cblxudmFyIFJFQURNRV9VUkwgPSAnaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy9jYXRiZXJyeS9jYXRiZXJyeS9yZWFkbWUnO1xuXG4vKipcbiAqIENyZWF0ZXMgbmV3IGluc3RhbmNlIG9mIHRoZSBcIkFib3V0XCIgc3RvcmUuXG4gKiBAcGFyYW0ge1VIUn0gJHVociBVbml2ZXJzYWwgSFRUUCByZXF1ZXN0LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEFib3V0KCR1aHIpIHtcblx0dGhpcy5fdWhyID0gJHVocjtcbn1cblxuLyoqXG4gKiBDdXJyZW50IHVuaXZlcnNhbCBIVFRQIHJlcXVlc3QgdG8gZG8gaXQgaW4gaXNvbW9ycGhpYyB3YXkuXG4gKiBAdHlwZSB7VUhSfVxuICogQHByaXZhdGVcbiAqL1xuQWJvdXQucHJvdG90eXBlLl91aHIgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgbGlmZXRpbWUgb2YgZGF0YSAoaW4gbWlsbGlzZWNvbmRzKSB0aGF0IGlzIHJldHVybmVkIGJ5IHRoaXMgc3RvcmUuXG4gKiBAdHlwZSB7bnVtYmVyfSBMaWZldGltZSBpbiBtaWxsaXNlY29uZHMuXG4gKi9cbkFib3V0LnByb3RvdHlwZS4kbGlmZXRpbWUgPSAzNjAwMDAwO1xuXG4vKipcbiAqIExvYWRzIGRhdGEgZnJvbSByZW1vdGUgc291cmNlLlxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0PnxPYmplY3R8bnVsbHx1bmRlZmluZWR9IExvYWRlZCBkYXRhLlxuICovXG5BYm91dC5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuX3Voci5nZXQoUkVBRE1FX1VSTCwge1xuXHRcdGhlYWRlcnM6IHtcblx0XHRcdEFjY2VwdDogJ2FwcGxpY2F0aW9uL3ZuZC5naXRodWIuVkVSU0lPTi5odG1sK2pzb24nXG5cdFx0fVxuXHR9KVxuXHRcdC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcblx0XHRcdGlmIChyZXN1bHQuc3RhdHVzLmNvZGUgPj0gNDAwICYmIHJlc3VsdC5zdGF0dXMuY29kZSA8IDYwMCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IocmVzdWx0LnN0YXR1cy50ZXh0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB7cmVhZG1lSFRNTDogcmVzdWx0LmNvbnRlbnR9O1xuXHRcdH0pO1xufTsiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gUGFnZXM7XG5cbi8qXG4gKiBUaGlzIGlzIGEgQ2F0YmVycnkgU3RvcmUgZmlsZS5cbiAqIE1vcmUgZGV0YWlscyBjYW4gYmUgZm91bmQgaGVyZVxuICogaHR0cHM6Ly9naXRodWIuY29tL2NhdGJlcnJ5L2NhdGJlcnJ5L2Jsb2IvbWFzdGVyL2RvY3MvaW5kZXgubWQjc3RvcmVzXG4gKi9cblxudmFyIFBBR0VTID0ge1xuXHRhYm91dDogJ0Fib3V0IENhdGJlcnJ5IEZyYW1ld29yaycsXG5cdGNvbW1pdHM6ICdDb21taXRzIHRvIENhdGJlcnJ5IEZyYW1ld29yayByZXBvc2l0b3J5Jyxcblx0c2VhcmNoOiAnU2VhcmNoIGluIENhdGJlcnJ5XFwncyBjb2RlJ1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgXCJQYWdlc1wiIHN0b3JlLlxuICogQHBhcmFtIHtPYmplY3R9ICRjb25maWcgQXBwbGljYXRpb24gY29uZmlnLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFBhZ2VzKCRjb25maWcpIHtcblx0dGhpcy5fY29uZmlnID0gJGNvbmZpZztcbn1cblxuLyoqXG4gKiBDdXJyZW50IGFwcGxpY2F0aW9uIGNvbmZpZy5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5QYWdlcy5wcm90b3R5cGUuX2NvbmZpZyA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBsaWZldGltZSBvZiBkYXRhIChpbiBtaWxsaXNlY29uZHMpIHRoYXQgaXMgcmV0dXJuZWQgYnkgdGhpcyBzdG9yZS5cbiAqIEB0eXBlIHtudW1iZXJ9IExpZmV0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAqL1xuUGFnZXMucHJvdG90eXBlLiRsaWZldGltZSA9IDM2MDAwMDA7XG5cbi8qKlxuICogTG9hZHMgZGF0YSBmcm9tIHJlbW90ZSBzb3VyY2UuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fE9iamVjdHxudWxsfHVuZGVmaW5lZH0gTG9hZGVkIGRhdGEuXG4gKi9cblBhZ2VzLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgY3VycmVudFBhZ2UgPSB0aGlzLiRjb250ZXh0LnN0YXRlLnBhZ2U7XG5cdGlmICghY3VycmVudFBhZ2UpIHtcblx0XHRyZXR1cm4gdGhpcy4kY29udGV4dC5yZWRpcmVjdCgnL2Fib3V0Jyk7XG5cdH1cblxuXHRpZiAoIVBBR0VTLmhhc093blByb3BlcnR5KGN1cnJlbnRQYWdlKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcihjdXJyZW50UGFnZSArICcgcGFnZSBub3QgZm91bmQnKTtcblx0fVxuXHR2YXIgcmVzdWx0ID0ge1xuXHRcdHRpdGxlOiB0aGlzLl9jb25maWcudGl0bGUsXG5cdFx0c3VidGl0bGU6IFBBR0VTW2N1cnJlbnRQYWdlXSxcblx0XHRjdXJyZW50OiBjdXJyZW50UGFnZSxcblx0XHRpc0FjdGl2ZToge31cblx0fTtcblx0T2JqZWN0LmtleXMoUEFHRVMpXG5cdFx0LmZvckVhY2goZnVuY3Rpb24gKHBhZ2UpIHtcblx0XHRcdHJlc3VsdC5pc0FjdGl2ZVtwYWdlXSA9IChjdXJyZW50UGFnZSA9PT0gcGFnZSk7XG5cdFx0fSk7XG5cblx0cmV0dXJuIHJlc3VsdDtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZlZWQ7XG5cbi8qXG4gKiBUaGlzIGlzIGEgQ2F0YmVycnkgU3RvcmUgZmlsZS5cbiAqIE1vcmUgZGV0YWlscyBjYW4gYmUgZm91bmQgaGVyZVxuICogaHR0cHM6Ly9naXRodWIuY29tL2NhdGJlcnJ5L2NhdGJlcnJ5L2Jsb2IvbWFzdGVyL2RvY3MvaW5kZXgubWQjc3RvcmVzXG4gKi9cblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgXCJjb21taXRzL0ZlZWRcIiBzdG9yZS5cbiAqIEBwYXJhbSB7VUhSfSAkdWhyIFVuaXZlcnNhbCBIVFRQIHJlcXVlc3QuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRmVlZCgkdWhyKSB7XG5cdHRoaXMuX3VociA9ICR1aHI7XG59XG5cbi8qKlxuICogQ3VycmVudCB1bml2ZXJzYWwgSFRUUCByZXF1ZXN0IHRvIGRvIGl0IGluIGlzb21vcnBoaWMgd2F5LlxuICogQHR5cGUge1VIUn1cbiAqIEBwcml2YXRlXG4gKi9cbkZlZWQucHJvdG90eXBlLl91aHIgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgbGlmZXRpbWUgb2YgZGF0YSAoaW4gbWlsbGlzZWNvbmRzKSB0aGF0IGlzIHJldHVybmVkIGJ5IHRoaXMgc3RvcmUuXG4gKiBAdHlwZSB7bnVtYmVyfSBMaWZldGltZSBpbiBtaWxsaXNlY29uZHMuXG4gKi9cbkZlZWQucHJvdG90eXBlLiRsaWZldGltZSA9IDYwMDAwO1xuXG4vKipcbiAqIExvYWRzIGRhdGEgZnJvbSByZW1vdGUgc291cmNlLlxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0PnxPYmplY3R8bnVsbHx1bmRlZmluZWR9IExvYWRlZCBkYXRhLlxuICovXG5GZWVkLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24gKCkge1xuXHQvLyBIZXJlIHlvdSBjYW4gZG8gYW55IEhUVFAgcmVxdWVzdHMgdXNpbmcgdGhpcy5fdWhyLlxuXHQvLyBQbGVhc2UgcmVhZCBkZXRhaWxzIGhlcmUgaHR0cHM6Ly9naXRodWIuY29tL2NhdGJlcnJ5L2NhdGJlcnJ5LXVoci5cbn07XG5cbi8qKlxuICogSGFuZGxlcyBhY3Rpb24gbmFtZWQgXCJzb21lLWFjdGlvblwiIGZyb20gYW55IGNvbXBvbmVudC5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD58T2JqZWN0fG51bGx8dW5kZWZpbmVkfSBSZXNwb25zZSB0byBjb21wb25lbnQuXG4gKi9cbkZlZWQucHJvdG90eXBlLmhhbmRsZVNvbWVBY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG5cdC8vIEhlcmUgeW91IGNhbiBjYWxsIHRoaXMuJGNvbnRleHQuY2hhbmdlZCgpIGlmIHlvdSBrbm93XG5cdC8vIHRoYXQgcmVtb3RlIGRhdGEgc291cmNlIGhhcyBiZWVuIGNoYW5nZWQuXG5cdC8vIEFsc28geW91IGNhbiBoYXZlIG1hbnkgaGFuZGxlIG1ldGhvZHMgZm9yIG90aGVyIGFjdGlvbnMuXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExpc3Q7XG5cbi8qXG4gKiBUaGlzIGlzIGEgQ2F0YmVycnkgU3RvcmUgZmlsZS5cbiAqIE1vcmUgZGV0YWlscyBjYW4gYmUgZm91bmQgaGVyZVxuICogaHR0cHM6Ly9naXRodWIuY29tL2NhdGJlcnJ5L2NhdGJlcnJ5L2Jsb2IvbWFzdGVyL2RvY3MvaW5kZXgubWQjc3RvcmVzXG4gKi9cblxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbnZhciBDT01NSVRTX1VSTCA9ICdodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zL2NhdGJlcnJ5L2NhdGJlcnJ5L2NvbW1pdHMnLFxuXHRDT01NSVRTX1BBR0VfVVJMX0ZPUk1BVCA9IENPTU1JVFNfVVJMICsgJz9wYWdlPSVkJnBlcl9wYWdlPSVkJyxcblx0UEVSX1BBR0UgPSA1MDtcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgXCJjb21taXRzL0xpc3RcIiBzdG9yZS5cbiAqIEBwYXJhbSB7VUhSfSAkdWhyIFVuaXZlcnNhbCBIVFRQIHJlcXVlc3QuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gTGlzdCgkdWhyKSB7XG5cdHRoaXMuX3VociA9ICR1aHI7XG5cdHRoaXMuX2N1cnJlbnRGZWVkID0gW107XG59XG5cbi8qKlxuICogQ3VycmVudCBmZWVkIGl0ZW1zLlxuICogQHR5cGUge0FycmF5fVxuICogQHByaXZhdGVcbiAqL1xuTGlzdC5wcm90b3R5cGUuX2N1cnJlbnRGZWVkID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHBhZ2VzIG9mIGZlZWQuXG4gKiBAdHlwZSB7bnVtYmVyfVxuICogQHByaXZhdGVcbiAqL1xuTGlzdC5wcm90b3R5cGUuX2N1cnJlbnRQYWdlID0gMTtcblxuLyoqXG4gKiBDdXJyZW50IHN0YXRlIG9mIGZlZWQgbG9hZGluZy5cbiAqIEB0eXBlIHtib29sZWFufVxuICogQHByaXZhdGVcbiAqL1xuTGlzdC5wcm90b3R5cGUuX2lzRmluaXNoZWQgPSBmYWxzZTtcblxuLyoqXG4gKiBDdXJyZW50IHVuaXZlcnNhbCBIVFRQIHJlcXVlc3QgdG8gZG8gaXQgaW4gaXNvbW9ycGhpYyB3YXkuXG4gKiBAdHlwZSB7VUhSfVxuICogQHByaXZhdGVcbiAqL1xuTGlzdC5wcm90b3R5cGUuX3VociA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBsaWZldGltZSBvZiBkYXRhIChpbiBtaWxsaXNlY29uZHMpIHRoYXQgaXMgcmV0dXJuZWQgYnkgdGhpcyBzdG9yZS5cbiAqIEB0eXBlIHtudW1iZXJ9IExpZmV0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAqL1xuTGlzdC5wcm90b3R5cGUuJGxpZmV0aW1lID0gNjAwMDA7XG5cbi8qKlxuICogTG9hZHMgZGF0YSBmcm9tIHJlbW90ZSBzb3VyY2UuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fE9iamVjdHxudWxsfHVuZGVmaW5lZH0gTG9hZGVkIGRhdGEuXG4gKi9cbkxpc3QucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0cmV0dXJuIHRoaXMuZ2V0SXRlbXModGhpcy5fY3VycmVudFBhZ2UsIFBFUl9QQUdFKVxuXHRcdC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcblx0XHRcdGlmICghcmVzdWx0IHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0c2VsZi5faXNGaW5pc2hlZCA9IHRydWU7XG5cdFx0XHRcdHJldHVybiBzZWxmLl9jdXJyZW50RmVlZDtcblx0XHRcdH1cblx0XHRcdHNlbGYuX2N1cnJlbnRGZWVkID0gc2VsZi5fY3VycmVudEZlZWQuY29uY2F0KHJlc3VsdCk7XG5cdFx0XHRyZXR1cm4gc2VsZi5fY3VycmVudEZlZWQ7XG5cdFx0fSk7XG59O1xuXG4vKipcbiAqIEdldHMgY29tbWl0cyBmcm9tIEdpdEh1YiBBUEkuXG4gKiBAcGFyYW0ge251bWJlcn0gcGFnZSBQYWdlIG51bWJlci5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW1pdCBMaW1pdCBmb3IgaXRlbXMuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fSBQcm9taXNlIGZvciByZXN1bHQuXG4gKi9cbkxpc3QucHJvdG90eXBlLmdldEl0ZW1zID0gZnVuY3Rpb24gKHBhZ2UsIGxpbWl0KSB7XG5cdHJldHVybiB0aGlzLl91aHIuZ2V0KFxuXHRcdHV0aWwuZm9ybWF0KENPTU1JVFNfUEFHRV9VUkxfRk9STUFULCBwYWdlLCBsaW1pdClcblx0KVxuXHRcdC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcblx0XHRcdGlmIChyZXN1bHQuc3RhdHVzLmNvZGUgPj0gNDAwICYmIHJlc3VsdC5zdGF0dXMuY29kZSA8IDYwMCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IocmVzdWx0LnN0YXR1cy50ZXh0KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHJlc3VsdC5jb250ZW50O1xuXHRcdH0pO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIGFjdGlvbiBuYW1lZCBcInNvbWUtYWN0aW9uXCIgZnJvbSBhbnkgY29tcG9uZW50LlxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0PnxPYmplY3R8bnVsbHx1bmRlZmluZWR9IFJlc3BvbnNlIHRvIGNvbXBvbmVudC5cbiAqL1xuTGlzdC5wcm90b3R5cGUuaGFuZGxlR2V0RGV0YWlscyA9IGZ1bmN0aW9uIChhcmdzKSB7XG5cdGlmICghYXJncy5zaGEpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvbW1pdCBub3QgZm91bmQnKTtcblx0fVxuXHRyZXR1cm4gdGhpcy5fdWhyLmdldChDT01NSVRTX1VSTCArICcvJyArIGFyZ3Muc2hhKVxuXHRcdC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcblx0XHRcdGlmIChyZXN1bHQuc3RhdHVzLmNvZGUgPj0gNDAwICYmIHJlc3VsdC5zdGF0dXMuY29kZSA8IDYwMCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IocmVzdWx0LnN0YXR1cy50ZXh0KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHJlc3VsdC5jb250ZW50O1xuXHRcdH0pO1xufTtcblxuTGlzdC5wcm90b3R5cGUuaGFuZGxlTG9hZE1vcmUgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9pc0ZpbmlzaGVkKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHRoaXMuX2N1cnJlbnRQYWdlKys7XG5cdHRoaXMuJGNvbnRleHQuY2hhbmdlZCgpO1xufTtcblxuTGlzdC5wcm90b3R5cGUucmVzZXRGZWVkID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9jdXJyZW50UGFnZSA9IDE7XG5cdHRoaXMuX2lzRmluaXNoZWQgPSB0cnVlO1xuXHR0aGlzLiRjb250ZXh0LmNoYW5nZWQoKTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlYXJjaDtcblxuLypcbiAqIFRoaXMgaXMgYSBDYXRiZXJyeSBTdG9yZSBmaWxlLlxuICogTW9yZSBkZXRhaWxzIGNhbiBiZSBmb3VuZCBoZXJlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vY2F0YmVycnkvY2F0YmVycnkvYmxvYi9tYXN0ZXIvZG9jcy9pbmRleC5tZCNzdG9yZXNcbiAqL1xuXG4vKipcbiAqIENyZWF0ZXMgbmV3IGluc3RhbmNlIG9mIHRoZSBcImNvbW1pdHMvU2VhcmNoXCIgc3RvcmUuXG4gKiBAcGFyYW0ge1VIUn0gJHVociBVbml2ZXJzYWwgSFRUUCByZXF1ZXN0LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFNlYXJjaCgkdWhyKSB7XG5cdHRoaXMuX3VociA9ICR1aHI7XG59XG5cbi8qKlxuICogQ3VycmVudCB1bml2ZXJzYWwgSFRUUCByZXF1ZXN0IHRvIGRvIGl0IGluIGlzb21vcnBoaWMgd2F5LlxuICogQHR5cGUge1VIUn1cbiAqIEBwcml2YXRlXG4gKi9cblNlYXJjaC5wcm90b3R5cGUuX3VociA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBsaWZldGltZSBvZiBkYXRhIChpbiBtaWxsaXNlY29uZHMpIHRoYXQgaXMgcmV0dXJuZWQgYnkgdGhpcyBzdG9yZS5cbiAqIEB0eXBlIHtudW1iZXJ9IExpZmV0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAqL1xuU2VhcmNoLnByb3RvdHlwZS4kbGlmZXRpbWUgPSA2MDAwMDtcblxuLyoqXG4gKiBMb2FkcyBkYXRhIGZyb20gcmVtb3RlIHNvdXJjZS5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD58T2JqZWN0fG51bGx8dW5kZWZpbmVkfSBMb2FkZWQgZGF0YS5cbiAqL1xuU2VhcmNoLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgcXVlcnkgPSB0aGlzLiRjb250ZXh0LnN0YXRlLnF1ZXJ5O1xuXHRpZiAoIXF1ZXJ5KSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHJldHVybiB0aGlzLl91aHIuZ2V0KFxuXHRcdCdodHRwczovL2FwaS5naXRodWIuY29tL3NlYXJjaC9jb2RlP3E9JyArXG5cdFx0cXVlcnkgK1xuXHRcdCcraW46ZmlsZStyZXBvOmNhdGJlcnJ5L2NhdGJlcnJ5J1xuXHQpXG5cdFx0LnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuXHRcdFx0aWYgKHJlc3VsdC5zdGF0dXMuY29kZSA+PSA0MDAgJiYgcmVzdWx0LnN0YXR1cy5jb2RlIDwgNjAwKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihyZXN1bHQuc3RhdHVzLnRleHQpO1xuXHRcdFx0fVxuXHRcdFx0cmVzdWx0LmNvbnRlbnQucXVlcnkgPSBxdWVyeTtcblx0XHRcdHJlc3VsdC5jb250ZW50Lmhhc1Jlc3VsdHMgPSAocmVzdWx0LmNvbnRlbnQudG90YWxfY291bnQgPiAwKTtcblx0XHRcdHJldHVybiByZXN1bHQuY29udGVudDtcblx0XHR9KTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cz17XG5cdFwidGl0bGVcIjogXCJDYXRiZXJyeSBBcHBsaWNhdGlvblwiLFxuXHRcInNlcnZlclwiOiB7XG5cdFx0XCJwb3J0XCI6IDMwMDBcblx0fVxufSIsIi8qXG4gKiBjYXRiZXJyeS1oYW5kbGViYXJzXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnktaGFuZGxlYmFycydzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnktaGFuZGxlYmFycyB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlUHJvdmlkZXI7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgSGFuZGxlYmFycyB0ZW1wbGF0ZSBwcm92aWRlci5cbiAqIEBwYXJhbSB7SGFuZGxlYmFyc30gJGhhbmRsZWJhcnMgSGFuZGxlYmFycyBmYWN0b3J5LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFRlbXBsYXRlUHJvdmlkZXIoJGhhbmRsZWJhcnMpIHtcblx0dGhpcy5faGFuZGxlYmFycyA9ICRoYW5kbGViYXJzO1xuXHR0aGlzLl90ZW1wbGF0ZXMgPSB7fTtcbn1cblxuLyoqXG4gKiBDdXJyZW50IEhhbmRsZWJhcnMgZmFjdG9yeS5cbiAqIEB0eXBlIHtIYW5kbGViYXJzfVxuICogQHByaXZhdGVcbiAqL1xuVGVtcGxhdGVQcm92aWRlci5wcm90b3R5cGUuX2hhbmRsZWJhcnMgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgc2V0IG9mIHJlZ2lzdGVyZWQgdGVtcGxhdGVzLlxuICogQHR5cGUge09iamVjdH1cbiAqIEBwcml2YXRlXG4gKi9cblRlbXBsYXRlUHJvdmlkZXIucHJvdG90eXBlLl90ZW1wbGF0ZXMgPSBudWxsO1xuXG4vKipcbiAqIFJlZ2lzdGVycyBjb21waWxlZCAocHJlY29tcGlsZWQpIEhhbmRsZWJhcnMgdGVtcGxhdGUuXG4gKiBodHRwOi8vaGFuZGxlYmFyc2pzLmNvbS9yZWZlcmVuY2UuaHRtbFxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGVtcGxhdGUgbmFtZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBjb21waWxlZCBDb21waWxlZCB0ZW1wbGF0ZSBzb3VyY2UuXG4gKi9cblRlbXBsYXRlUHJvdmlkZXIucHJvdG90eXBlLnJlZ2lzdGVyQ29tcGlsZWQgPSBmdW5jdGlvbiAobmFtZSwgY29tcGlsZWQpIHtcblx0Ly8ganNoaW50IGV2aWw6dHJ1ZVxuXHR2YXIgc3BlY3MgPSBuZXcgRnVuY3Rpb24oJ3JldHVybiAnICsgY29tcGlsZWQgKyAnOycpO1xuXHR0aGlzLl90ZW1wbGF0ZXNbbmFtZV0gPSB0aGlzLl9oYW5kbGViYXJzLnRlbXBsYXRlKHNwZWNzKCkpO1xufTtcblxuLyoqXG4gKiBSZW5kZXJzIHRlbXBsYXRlIHdpdGggc3BlY2lmaWVkIGRhdGEuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBOYW1lIG9mIHRlbXBsYXRlLlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgRGF0YSBjb250ZXh0IGZvciB0ZW1wbGF0ZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5UZW1wbGF0ZVByb3ZpZGVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAobmFtZSwgZGF0YSkge1xuXHRpZiAoIXRoaXMuX3RlbXBsYXRlcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuXHRcdHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ05vIHN1Y2ggdGVtcGxhdGUnKSk7XG5cdH1cblxuXHR2YXIgcHJvbWlzZTtcblx0dHJ5IHtcblx0XHRwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX3RlbXBsYXRlc1tuYW1lXShkYXRhKSk7XG5cdH0gY2F0Y2goZSkge1xuXHRcdHByb21pc2UgPSBQcm9taXNlLnJlamVjdChlKTtcblx0fVxuXHRyZXR1cm4gcHJvbWlzZTtcbn07IiwiLyohXG5cbiBoYW5kbGViYXJzIHYyLjAuMFxuXG5Db3B5cmlnaHQgKEMpIDIwMTEtMjAxNCBieSBZZWh1ZGEgS2F0elxuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG5pbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG5jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG5USEUgU09GVFdBUkUuXG5cbkBsaWNlbnNlXG4qL1xuLyogZXhwb3J0ZWQgSGFuZGxlYmFycyAqL1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoW10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuSGFuZGxlYmFycyA9IHJvb3QuSGFuZGxlYmFycyB8fCBmYWN0b3J5KCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuLy8gaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qc1xudmFyIF9fbW9kdWxlM19fID0gKGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fZXhwb3J0c19fO1xuICAvLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuICBmdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICAgIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xuICB9XG5cbiAgU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXCJcIiArIHRoaXMuc3RyaW5nO1xuICB9O1xuXG4gIF9fZXhwb3J0c19fID0gU2FmZVN0cmluZztcbiAgcmV0dXJuIF9fZXhwb3J0c19fO1xufSkoKTtcblxuLy8gaGFuZGxlYmFycy91dGlscy5qc1xudmFyIF9fbW9kdWxlMl9fID0gKGZ1bmN0aW9uKF9fZGVwZW5kZW5jeTFfXykge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fZXhwb3J0c19fID0ge307XG4gIC8qanNoaW50IC1XMDA0ICovXG4gIHZhciBTYWZlU3RyaW5nID0gX19kZXBlbmRlbmN5MV9fO1xuXG4gIHZhciBlc2NhcGUgPSB7XG4gICAgXCImXCI6IFwiJmFtcDtcIixcbiAgICBcIjxcIjogXCImbHQ7XCIsXG4gICAgXCI+XCI6IFwiJmd0O1wiLFxuICAgICdcIic6IFwiJnF1b3Q7XCIsXG4gICAgXCInXCI6IFwiJiN4Mjc7XCIsXG4gICAgXCJgXCI6IFwiJiN4NjA7XCJcbiAgfTtcblxuICB2YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG4gIHZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG4gIGZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gICAgcmV0dXJuIGVzY2FwZVtjaHJdO1xuICB9XG5cbiAgZnVuY3Rpb24gZXh0ZW5kKG9iaiAvKiAsIC4uLnNvdXJjZSAqLykge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgICAgb2JqW2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBfX2V4cG9ydHNfXy5leHRlbmQgPSBleHRlbmQ7dmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgX19leHBvcnRzX18udG9TdHJpbmcgPSB0b1N0cmluZztcbiAgLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG4gIHZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xuICB9O1xuICAvLyBmYWxsYmFjayBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmlcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKGlzRnVuY3Rpb24oL3gvKSkge1xuICAgIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgICB9O1xuICB9XG4gIHZhciBpc0Z1bmN0aW9uO1xuICBfX2V4cG9ydHNfXy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG4gIH07XG4gIF9fZXhwb3J0c19fLmlzQXJyYXkgPSBpc0FycmF5O1xuXG4gIGZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfSBlbHNlIGlmICghc3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nICsgJyc7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gXCJcIiArIHN0cmluZztcblxuICAgIGlmKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG4gIH1cblxuICBfX2V4cG9ydHNfXy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgX19leHBvcnRzX18uaXNFbXB0eSA9IGlzRW1wdHk7ZnVuY3Rpb24gYXBwZW5kQ29udGV4dFBhdGgoY29udGV4dFBhdGgsIGlkKSB7XG4gICAgcmV0dXJuIChjb250ZXh0UGF0aCA/IGNvbnRleHRQYXRoICsgJy4nIDogJycpICsgaWQ7XG4gIH1cblxuICBfX2V4cG9ydHNfXy5hcHBlbmRDb250ZXh0UGF0aCA9IGFwcGVuZENvbnRleHRQYXRoO1xuICByZXR1cm4gX19leHBvcnRzX187XG59KShfX21vZHVsZTNfXyk7XG5cbi8vIGhhbmRsZWJhcnMvZXhjZXB0aW9uLmpzXG52YXIgX19tb2R1bGU0X18gPSAoZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19leHBvcnRzX187XG5cbiAgdmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG4gIGZ1bmN0aW9uIEV4Y2VwdGlvbihtZXNzYWdlLCBub2RlKSB7XG4gICAgdmFyIGxpbmU7XG4gICAgaWYgKG5vZGUgJiYgbm9kZS5maXJzdExpbmUpIHtcbiAgICAgIGxpbmUgPSBub2RlLmZpcnN0TGluZTtcblxuICAgICAgbWVzc2FnZSArPSAnIC0gJyArIGxpbmUgKyAnOicgKyBub2RlLmZpcnN0Q29sdW1uO1xuICAgIH1cblxuICAgIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICAgIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gICAgfVxuXG4gICAgaWYgKGxpbmUpIHtcbiAgICAgIHRoaXMubGluZU51bWJlciA9IGxpbmU7XG4gICAgICB0aGlzLmNvbHVtbiA9IG5vZGUuZmlyc3RDb2x1bW47XG4gICAgfVxuICB9XG5cbiAgRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG4gIF9fZXhwb3J0c19fID0gRXhjZXB0aW9uO1xuICByZXR1cm4gX19leHBvcnRzX187XG59KSgpO1xuXG4vLyBoYW5kbGViYXJzL2Jhc2UuanNcbnZhciBfX21vZHVsZTFfXyA9IChmdW5jdGlvbihfX2RlcGVuZGVuY3kxX18sIF9fZGVwZW5kZW5jeTJfXykge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fZXhwb3J0c19fID0ge307XG4gIHZhciBVdGlscyA9IF9fZGVwZW5kZW5jeTFfXztcbiAgdmFyIEV4Y2VwdGlvbiA9IF9fZGVwZW5kZW5jeTJfXztcblxuICB2YXIgVkVSU0lPTiA9IFwiMi4wLjBcIjtcbiAgX19leHBvcnRzX18uVkVSU0lPTiA9IFZFUlNJT047dmFyIENPTVBJTEVSX1JFVklTSU9OID0gNjtcbiAgX19leHBvcnRzX18uQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcbiAgdmFyIFJFVklTSU9OX0NIQU5HRVMgPSB7XG4gICAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gICAgMzogJz09IDEuMC4wLXJjLjQnLFxuICAgIDQ6ICc9PSAxLngueCcsXG4gICAgNTogJz09IDIuMC4wLWFscGhhLngnLFxuICAgIDY6ICc+PSAyLjAuMC1iZXRhLjEnXG4gIH07XG4gIF9fZXhwb3J0c19fLlJFVklTSU9OX0NIQU5HRVMgPSBSRVZJU0lPTl9DSEFOR0VTO1xuICB2YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgICBpc0Z1bmN0aW9uID0gVXRpbHMuaXNGdW5jdGlvbixcbiAgICAgIHRvU3RyaW5nID0gVXRpbHMudG9TdHJpbmcsXG4gICAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbiAgZnVuY3Rpb24gSGFuZGxlYmFyc0Vudmlyb25tZW50KGhlbHBlcnMsIHBhcnRpYWxzKSB7XG4gICAgdGhpcy5oZWxwZXJzID0gaGVscGVycyB8fCB7fTtcbiAgICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xuICB9XG5cbiAgX19leHBvcnRzX18uSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gSGFuZGxlYmFyc0Vudmlyb25tZW50O0hhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG4gICAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICAgIGxvZ2dlcjogbG9nZ2VyLFxuICAgIGxvZzogbG9nLFxuXG4gICAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XG4gICAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgICBpZiAoZm4pIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgICAgIH1cbiAgICB9LFxuICAgIHVucmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmhlbHBlcnNbbmFtZV07XG4gICAgfSxcblxuICAgIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgcGFydGlhbCkge1xuICAgICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBwYXJ0aWFsO1xuICAgICAgfVxuICAgIH0sXG4gICAgdW5yZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLnBhcnRpYWxzW25hbWVdO1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gICAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbigvKiBbYXJncywgXW9wdGlvbnMgKi8pIHtcbiAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy8gQSBtaXNzaW5nIGZpZWxkIGluIGEge3tmb299fSBjb25zdHVjdC5cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFNvbWVvbmUgaXMgYWN0dWFsbHkgdHJ5aW5nIHRvIGNhbGwgc29tZXRoaW5nLCBibG93IHVwLlxuICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoLTFdLm5hbWUgKyBcIidcIik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UsXG4gICAgICAgICAgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICAgIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuaWRzKSB7XG4gICAgICAgICAgICBvcHRpb25zLmlkcyA9IFtvcHRpb25zLm5hbWVdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5uYW1lKTtcbiAgICAgICAgICBvcHRpb25zID0ge2RhdGE6IGRhdGF9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignTXVzdCBwYXNzIGl0ZXJhdG9yIHRvICNlYWNoJyk7XG4gICAgICB9XG5cbiAgICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgICAgIHZhciBjb250ZXh0UGF0aDtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKSArICcuJztcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgfVxuXG4gICAgICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICAgIGRhdGEubGFzdCAgPSAoaSA9PT0gKGNvbnRleHQubGVuZ3RoLTEpKTtcblxuICAgICAgICAgICAgICBpZiAoY29udGV4dFBhdGgpIHtcbiAgICAgICAgICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gY29udGV4dFBhdGggKyBpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICBpZihkYXRhKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5rZXkgPSBrZXk7XG4gICAgICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcblxuICAgICAgICAgICAgICAgIGlmIChjb250ZXh0UGF0aCkge1xuICAgICAgICAgICAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IGNvbnRleHRQYXRoICsga2V5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYoaSA9PT0gMCl7XG4gICAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSk7XG5cbiAgICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gICAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgICAvLyBUaGUgYGluY2x1ZGVaZXJvYCBvcHRpb24gbWF5IGJlIHNldCB0byB0cmVhdCB0aGUgY29uZHRpb25hbCBhcyBwdXJlbHkgbm90IGVtcHR5IGJhc2VkIG9uIHRoZVxuICAgICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm4sIGhhc2g6IG9wdGlvbnMuaGFzaH0pO1xuICAgIH0pO1xuXG4gICAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICAgIHZhciBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICAgIGlmICghVXRpbHMuaXNFbXB0eShjb250ZXh0KSkge1xuICAgICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKTtcbiAgICAgICAgICBvcHRpb25zID0ge2RhdGE6ZGF0YX07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgICAgIGluc3RhbmNlLmxvZyhsZXZlbCwgbWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9va3VwJywgZnVuY3Rpb24ob2JqLCBmaWVsZCkge1xuICAgICAgcmV0dXJuIG9iaiAmJiBvYmpbZmllbGRdO1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIGxvZ2dlciA9IHtcbiAgICBtZXRob2RNYXA6IHsgMDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcicgfSxcblxuICAgIC8vIFN0YXRlIGVudW1cbiAgICBERUJVRzogMCxcbiAgICBJTkZPOiAxLFxuICAgIFdBUk46IDIsXG4gICAgRVJST1I6IDMsXG4gICAgbGV2ZWw6IDMsXG5cbiAgICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICAgIGxvZzogZnVuY3Rpb24obGV2ZWwsIG1lc3NhZ2UpIHtcbiAgICAgIGlmIChsb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgICAgdmFyIG1ldGhvZCA9IGxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBfX2V4cG9ydHNfXy5sb2dnZXIgPSBsb2dnZXI7XG4gIHZhciBsb2cgPSBsb2dnZXIubG9nO1xuICBfX2V4cG9ydHNfXy5sb2cgPSBsb2c7XG4gIHZhciBjcmVhdGVGcmFtZSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHZhciBmcmFtZSA9IFV0aWxzLmV4dGVuZCh7fSwgb2JqZWN0KTtcbiAgICBmcmFtZS5fcGFyZW50ID0gb2JqZWN0O1xuICAgIHJldHVybiBmcmFtZTtcbiAgfTtcbiAgX19leHBvcnRzX18uY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTtcbiAgcmV0dXJuIF9fZXhwb3J0c19fO1xufSkoX19tb2R1bGUyX18sIF9fbW9kdWxlNF9fKTtcblxuLy8gaGFuZGxlYmFycy9ydW50aW1lLmpzXG52YXIgX19tb2R1bGU1X18gPSAoZnVuY3Rpb24oX19kZXBlbmRlbmN5MV9fLCBfX2RlcGVuZGVuY3kyX18sIF9fZGVwZW5kZW5jeTNfXykge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fZXhwb3J0c19fID0ge307XG4gIHZhciBVdGlscyA9IF9fZGVwZW5kZW5jeTFfXztcbiAgdmFyIEV4Y2VwdGlvbiA9IF9fZGVwZW5kZW5jeTJfXztcbiAgdmFyIENPTVBJTEVSX1JFVklTSU9OID0gX19kZXBlbmRlbmN5M19fLkNPTVBJTEVSX1JFVklTSU9OO1xuICB2YXIgUkVWSVNJT05fQ0hBTkdFUyA9IF9fZGVwZW5kZW5jeTNfXy5SRVZJU0lPTl9DSEFOR0VTO1xuICB2YXIgY3JlYXRlRnJhbWUgPSBfX2RlcGVuZGVuY3kzX18uY3JlYXRlRnJhbWU7XG5cbiAgZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgICB2YXIgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mbyAmJiBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgICAgY3VycmVudFJldmlzaW9uID0gQ09NUElMRVJfUkVWSVNJT047XG5cbiAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgX19leHBvcnRzX18uY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247Ly8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuICBmdW5jdGlvbiB0ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgaWYgKCFlbnYpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJObyBlbnZpcm9ubWVudCBwYXNzZWQgdG8gdGVtcGxhdGVcIik7XG4gICAgfVxuICAgIGlmICghdGVtcGxhdGVTcGVjIHx8ICF0ZW1wbGF0ZVNwZWMubWFpbikge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignVW5rbm93biB0ZW1wbGF0ZSBvYmplY3Q6ICcgKyB0eXBlb2YgdGVtcGxhdGVTcGVjKTtcbiAgICB9XG5cbiAgICAvLyBOb3RlOiBVc2luZyBlbnYuVk0gcmVmZXJlbmNlcyByYXRoZXIgdGhhbiBsb2NhbCB2YXIgcmVmZXJlbmNlcyB0aHJvdWdob3V0IHRoaXMgc2VjdGlvbiB0byBhbGxvd1xuICAgIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gICAgZW52LlZNLmNoZWNrUmV2aXNpb24odGVtcGxhdGVTcGVjLmNvbXBpbGVyKTtcblxuICAgIHZhciBpbnZva2VQYXJ0aWFsV3JhcHBlciA9IGZ1bmN0aW9uKHBhcnRpYWwsIGluZGVudCwgbmFtZSwgY29udGV4dCwgaGFzaCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEsIGRlcHRocykge1xuICAgICAgaWYgKGhhc2gpIHtcbiAgICAgICAgY29udGV4dCA9IFV0aWxzLmV4dGVuZCh7fSwgY29udGV4dCwgaGFzaCk7XG4gICAgICB9XG5cbiAgICAgIHZhciByZXN1bHQgPSBlbnYuVk0uaW52b2tlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhLCBkZXB0aHMpO1xuXG4gICAgICBpZiAocmVzdWx0ID09IG51bGwgJiYgZW52LmNvbXBpbGUpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSwgZGVwdGhzOiBkZXB0aHMgfTtcbiAgICAgICAgcGFydGlhbHNbbmFtZV0gPSBlbnYuY29tcGlsZShwYXJ0aWFsLCB7IGRhdGE6IGRhdGEgIT09IHVuZGVmaW5lZCwgY29tcGF0OiB0ZW1wbGF0ZVNwZWMuY29tcGF0IH0sIGVudik7XG4gICAgICAgIHJlc3VsdCA9IHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7XG4gICAgICAgIGlmIChpbmRlbnQpIHtcbiAgICAgICAgICB2YXIgbGluZXMgPSByZXN1bHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGluZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoIWxpbmVzW2ldICYmIGkgKyAxID09PSBsKSB7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsaW5lc1tpXSA9IGluZGVudCArIGxpbmVzW2ldO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQgPSBsaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGVcIik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIEp1c3QgYWRkIHdhdGVyXG4gICAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICAgIGxvb2t1cDogZnVuY3Rpb24oZGVwdGhzLCBuYW1lKSB7XG4gICAgICAgIHZhciBsZW4gPSBkZXB0aHMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgaWYgKGRlcHRoc1tpXSAmJiBkZXB0aHNbaV1bbmFtZV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlcHRoc1tpXVtuYW1lXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBsYW1iZGE6IGZ1bmN0aW9uKGN1cnJlbnQsIGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBjdXJyZW50ID09PSAnZnVuY3Rpb24nID8gY3VycmVudC5jYWxsKGNvbnRleHQpIDogY3VycmVudDtcbiAgICAgIH0sXG5cbiAgICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgICBpbnZva2VQYXJ0aWFsOiBpbnZva2VQYXJ0aWFsV3JhcHBlcixcblxuICAgICAgZm46IGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlU3BlY1tpXTtcbiAgICAgIH0sXG5cbiAgICAgIHByb2dyYW1zOiBbXSxcbiAgICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGRhdGEsIGRlcHRocykge1xuICAgICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldLFxuICAgICAgICAgICAgZm4gPSB0aGlzLmZuKGkpO1xuICAgICAgICBpZiAoZGF0YSB8fCBkZXB0aHMpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHByb2dyYW0odGhpcywgaSwgZm4sIGRhdGEsIGRlcHRocyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gcHJvZ3JhbSh0aGlzLCBpLCBmbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgICAgfSxcblxuICAgICAgZGF0YTogZnVuY3Rpb24oZGF0YSwgZGVwdGgpIHtcbiAgICAgICAgd2hpbGUgKGRhdGEgJiYgZGVwdGgtLSkge1xuICAgICAgICAgIGRhdGEgPSBkYXRhLl9wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICB9LFxuICAgICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIChwYXJhbSAhPT0gY29tbW9uKSkge1xuICAgICAgICAgIHJldCA9IFV0aWxzLmV4dGVuZCh7fSwgY29tbW9uLCBwYXJhbSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfSxcblxuICAgICAgbm9vcDogZW52LlZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86IHRlbXBsYXRlU3BlYy5jb21waWxlclxuICAgIH07XG5cbiAgICB2YXIgcmV0ID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICB2YXIgZGF0YSA9IG9wdGlvbnMuZGF0YTtcblxuICAgICAgcmV0Ll9zZXR1cChvcHRpb25zKTtcbiAgICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsICYmIHRlbXBsYXRlU3BlYy51c2VEYXRhKSB7XG4gICAgICAgIGRhdGEgPSBpbml0RGF0YShjb250ZXh0LCBkYXRhKTtcbiAgICAgIH1cbiAgICAgIHZhciBkZXB0aHM7XG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocykge1xuICAgICAgICBkZXB0aHMgPSBvcHRpb25zLmRlcHRocyA/IFtjb250ZXh0XS5jb25jYXQob3B0aW9ucy5kZXB0aHMpIDogW2NvbnRleHRdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGVtcGxhdGVTcGVjLm1haW4uY2FsbChjb250YWluZXIsIGNvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIGRhdGEsIGRlcHRocyk7XG4gICAgfTtcbiAgICByZXQuaXNUb3AgPSB0cnVlO1xuXG4gICAgcmV0Ll9zZXR1cCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMuaGVscGVycywgZW52LmhlbHBlcnMpO1xuXG4gICAgICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlUGFydGlhbCkge1xuICAgICAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLnBhcnRpYWxzLCBlbnYucGFydGlhbHMpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250YWluZXIuaGVscGVycyA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0Ll9jaGlsZCA9IGZ1bmN0aW9uKGksIGRhdGEsIGRlcHRocykge1xuICAgICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMgJiYgIWRlcHRocykge1xuICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdtdXN0IHBhc3MgcGFyZW50IGRlcHRocycpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvZ3JhbShjb250YWluZXIsIGksIHRlbXBsYXRlU3BlY1tpXSwgZGF0YSwgZGVwdGhzKTtcbiAgICB9O1xuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBfX2V4cG9ydHNfXy50ZW1wbGF0ZSA9IHRlbXBsYXRlO2Z1bmN0aW9uIHByb2dyYW0oY29udGFpbmVyLCBpLCBmbiwgZGF0YSwgZGVwdGhzKSB7XG4gICAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuLmNhbGwoY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEgfHwgZGF0YSwgZGVwdGhzICYmIFtjb250ZXh0XS5jb25jYXQoZGVwdGhzKSk7XG4gICAgfTtcbiAgICBwcm9nLnByb2dyYW0gPSBpO1xuICAgIHByb2cuZGVwdGggPSBkZXB0aHMgPyBkZXB0aHMubGVuZ3RoIDogMDtcbiAgICByZXR1cm4gcHJvZztcbiAgfVxuXG4gIF9fZXhwb3J0c19fLnByb2dyYW0gPSBwcm9ncmFtO2Z1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEsIGRlcHRocykge1xuICAgIHZhciBvcHRpb25zID0geyBwYXJ0aWFsOiB0cnVlLCBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEsIGRlcHRoczogZGVwdGhzIH07XG5cbiAgICBpZihwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gICAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgX19leHBvcnRzX18uaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7ZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuIFwiXCI7IH1cblxuICBfX2V4cG9ydHNfXy5ub29wID0gbm9vcDtmdW5jdGlvbiBpbml0RGF0YShjb250ZXh0LCBkYXRhKSB7XG4gICAgaWYgKCFkYXRhIHx8ICEoJ3Jvb3QnIGluIGRhdGEpKSB7XG4gICAgICBkYXRhID0gZGF0YSA/IGNyZWF0ZUZyYW1lKGRhdGEpIDoge307XG4gICAgICBkYXRhLnJvb3QgPSBjb250ZXh0O1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuICByZXR1cm4gX19leHBvcnRzX187XG59KShfX21vZHVsZTJfXywgX19tb2R1bGU0X18sIF9fbW9kdWxlMV9fKTtcblxuLy8gaGFuZGxlYmFycy5ydW50aW1lLmpzXG52YXIgX19tb2R1bGUwX18gPSAoZnVuY3Rpb24oX19kZXBlbmRlbmN5MV9fLCBfX2RlcGVuZGVuY3kyX18sIF9fZGVwZW5kZW5jeTNfXywgX19kZXBlbmRlbmN5NF9fLCBfX2RlcGVuZGVuY3k1X18pIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX2V4cG9ydHNfXztcbiAgLypnbG9iYWxzIEhhbmRsZWJhcnM6IHRydWUgKi9cbiAgdmFyIGJhc2UgPSBfX2RlcGVuZGVuY3kxX187XG5cbiAgLy8gRWFjaCBvZiB0aGVzZSBhdWdtZW50IHRoZSBIYW5kbGViYXJzIG9iamVjdC4gTm8gbmVlZCB0byBzZXR1cCBoZXJlLlxuICAvLyAoVGhpcyBpcyBkb25lIHRvIGVhc2lseSBzaGFyZSBjb2RlIGJldHdlZW4gY29tbW9uanMgYW5kIGJyb3dzZSBlbnZzKVxuICB2YXIgU2FmZVN0cmluZyA9IF9fZGVwZW5kZW5jeTJfXztcbiAgdmFyIEV4Y2VwdGlvbiA9IF9fZGVwZW5kZW5jeTNfXztcbiAgdmFyIFV0aWxzID0gX19kZXBlbmRlbmN5NF9fO1xuICB2YXIgcnVudGltZSA9IF9fZGVwZW5kZW5jeTVfXztcblxuICAvLyBGb3IgY29tcGF0aWJpbGl0eSBhbmQgdXNhZ2Ugb3V0c2lkZSBvZiBtb2R1bGUgc3lzdGVtcywgbWFrZSB0aGUgSGFuZGxlYmFycyBvYmplY3QgYSBuYW1lc3BhY2VcbiAgdmFyIGNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBoYiA9IG5ldyBiYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudCgpO1xuXG4gICAgVXRpbHMuZXh0ZW5kKGhiLCBiYXNlKTtcbiAgICBoYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcbiAgICBoYi5FeGNlcHRpb24gPSBFeGNlcHRpb247XG4gICAgaGIuVXRpbHMgPSBVdGlscztcbiAgICBoYi5lc2NhcGVFeHByZXNzaW9uID0gVXRpbHMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICAgIGhiLlZNID0gcnVudGltZTtcbiAgICBoYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGhiKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGhiO1xuICB9O1xuXG4gIHZhciBIYW5kbGViYXJzID0gY3JlYXRlKCk7XG4gIEhhbmRsZWJhcnMuY3JlYXRlID0gY3JlYXRlO1xuXG4gIEhhbmRsZWJhcnNbJ2RlZmF1bHQnXSA9IEhhbmRsZWJhcnM7XG5cbiAgX19leHBvcnRzX18gPSBIYW5kbGViYXJzO1xuICByZXR1cm4gX19leHBvcnRzX187XG59KShfX21vZHVsZTFfXywgX19tb2R1bGUzX18sIF9fbW9kdWxlNF9fLCBfX21vZHVsZTJfXywgX19tb2R1bGU1X18pO1xuXG4gIHJldHVybiBfX21vZHVsZTBfXztcbn0pKTtcbiIsIi8qXG4gKiBjYXRiZXJyeS1oYW5kbGViYXJzXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnktaGFuZGxlYmFycydzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnktaGFuZGxlYmFycyB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoJy4vbGliL3ZlbmRvcnMvaGFuZGxlYmFycycpLFxuXHRUZW1wbGF0ZVByb3ZpZGVyID0gcmVxdWlyZSgnLi9saWIvVGVtcGxhdGVQcm92aWRlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0cmVnaXN0ZXI6IGZ1bmN0aW9uIChsb2NhdG9yLCBjb25maWcpIHtcblx0XHRjb25maWcgPSBjb25maWcgfHwge307XG5cdFx0bG9jYXRvci5yZWdpc3Rlckluc3RhbmNlKCdoYW5kbGViYXJzJywgSGFuZGxlYmFycyk7XG5cdFx0bG9jYXRvci5yZWdpc3RlcigndGVtcGxhdGVQcm92aWRlcicsIFRlbXBsYXRlUHJvdmlkZXIsIGNvbmZpZywgdHJ1ZSk7XG5cdH0sXG5cdEhhbmRsZWJhcnM6IEhhbmRsZWJhcnMsXG5cdFRlbXBsYXRlUHJvdmlkZXI6IFRlbXBsYXRlUHJvdmlkZXJcbn07IiwiLypcbiAqIGNhdGJlcnJ5XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnkncyBsaWNlbnNlIGZvbGxvd3M6XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAqIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uXG4gKiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICogcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAqIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gKiBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuICogaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuICogT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKlxuICogVGhpcyBsaWNlbnNlIGFwcGxpZXMgdG8gYWxsIHBhcnRzIG9mIGNhdGJlcnJ5IHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2F0YmVycnk7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpLFxuXHRDYXRiZXJyeUJhc2UgPSByZXF1aXJlKCcuLi9saWIvYmFzZS9DYXRiZXJyeUJhc2UnKSxcblx0U2VydmljZUxvY2F0b3IgPSByZXF1aXJlKCdjYXRiZXJyeS1sb2NhdG9yJyk7XG5cbnV0aWwuaW5oZXJpdHMoQ2F0YmVycnksIENhdGJlcnJ5QmFzZSk7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIGJyb3dzZXIgdmVyc2lvbiBvZiBDYXRiZXJyeS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMgQ2F0YmVycnlCYXNlXG4gKi9cbmZ1bmN0aW9uIENhdGJlcnJ5KCkge1xuXHRDYXRiZXJyeUJhc2UuY2FsbCh0aGlzKTtcbn1cblxuLyoqXG4gKiBDdXJyZW50IHJlcXVlc3Qgcm91dGVyLlxuICogQHR5cGUge1JlcXVlc3RSb3V0ZXJ9XG4gKiBAcHJpdmF0ZVxuICovXG5DYXRiZXJyeS5wcm90b3R5cGUuX3JvdXRlciA9IG51bGw7XG5cbi8qKlxuICogV3JhcHMgY3VycmVudCBIVE1MIGRvY3VtZW50IHdpdGggQ2F0YmVycnkgZXZlbnQgaGFuZGxlcnMuXG4gKi9cbkNhdGJlcnJ5LnByb3RvdHlwZS53cmFwRG9jdW1lbnQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX3JvdXRlciA9IHRoaXMubG9jYXRvci5yZXNvbHZlKCdyZXF1ZXN0Um91dGVyJyk7XG59O1xuXG4vKipcbiAqIFN0YXJ0cyBDYXRiZXJyeSBhcHBsaWNhdGlvbiB3aGVuIERPTSBpcyByZWFkeS5cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIGZvciBub3RoaW5nLlxuICovXG5DYXRiZXJyeS5wcm90b3R5cGUuc3RhcnRXaGVuUmVhZHkgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh3aW5kb3cuY2F0YmVycnkpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoZnVsZmlsbCkge1xuXHRcdHdpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0c2VsZi53cmFwRG9jdW1lbnQoKTtcblx0XHRcdHdpbmRvdy5jYXRiZXJyeSA9IHNlbGY7XG5cdFx0XHRmdWxmaWxsKCk7XG5cdFx0fSk7XG5cdH0pO1xufTsiLCIvKlxuICogY2F0YmVycnlcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgRGVuaXMgUmVjaGt1bm92IGFuZCBwcm9qZWN0IGNvbnRyaWJ1dG9ycy5cbiAqXG4gKiBjYXRiZXJyeSdzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnkgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gQ29va2llV3JhcHBlcjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyksXG5cdENvb2tpZVdyYXBwZXJCYXNlID0gcmVxdWlyZSgnLi4vbGliL2Jhc2UvQ29va2llV3JhcHBlckJhc2UnKTtcblxudXRpbC5pbmhlcml0cyhDb29raWVXcmFwcGVyLCBDb29raWVXcmFwcGVyQmFzZSk7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIGJyb3dzZXIgY29va2llIHdyYXBwZXIuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gQ29va2llV3JhcHBlcigkd2luZG93KSB7XG5cdENvb2tpZVdyYXBwZXJCYXNlLmNhbGwodGhpcyk7XG5cdHRoaXMuX3dpbmRvdyA9ICR3aW5kb3c7XG59XG5cbi8qKlxuICogQ3VycmVudCBicm93c2VyIHdpbmRvdy5cbiAqIEB0eXBlIHtXaW5kb3d9XG4gKiBAcHJpdmF0ZVxuICovXG5Db29raWVXcmFwcGVyLnByb3RvdHlwZS5fd2luZG93ID0gbnVsbDtcblxuLyoqXG4gKiBHZXRzIGNvb2tpZSB2YWx1ZSBieSBuYW1lLlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgQ29va2llIG5hbWUuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBDb29raWUgdmFsdWUuXG4gKi9cbkNvb2tpZVdyYXBwZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdGlmICh0eXBlb2YobmFtZSkgIT09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuICcnO1xuXHR9XG5cdGlmICghdGhpcy5fd2luZG93LmRvY3VtZW50LmNvb2tpZSkge1xuXHRcdHJldHVybiAnJztcblx0fVxuXHR2YXIgY29va2llID0gdGhpcy5fcGFyc2VDb29raWVTdHJpbmcoXG5cdFx0dGhpcy5fd2luZG93LmRvY3VtZW50LmNvb2tpZS50b1N0cmluZygpKTtcblx0cmV0dXJuIGNvb2tpZVtuYW1lXSB8fCAnJztcbn07XG5cbi8qKlxuICogU2V0cyBjb29raWUgdG8gdGhpcyB3cmFwcGVyLlxuICogQHBhcmFtIHtPYmplY3R9IGNvb2tpZVNldHVwIENvb2tpZSBzZXR1cCBvYmplY3QuXG4gKiBAcGFyYW0ge3N0cmluZ30gY29va2llU2V0dXAua2V5IENvb2tpZSBrZXkuXG4gKiBAcGFyYW0ge3N0cmluZ30gY29va2llU2V0dXAudmFsdWUgQ29va2llIHZhbHVlLlxuICogQHBhcmFtIHtudW1iZXI/fSBjb29raWVTZXR1cC5tYXhBZ2UgTWF4IGNvb2tpZSBhZ2UgaW4gc2Vjb25kcy5cbiAqIEBwYXJhbSB7RGF0ZT99IGNvb2tpZVNldHVwLmV4cGlyZXMgRXhwaXJlIGRhdGUuXG4gKiBAcGFyYW0ge3N0cmluZz99IGNvb2tpZVNldHVwLnBhdGggVVJJIHBhdGggZm9yIGNvb2tpZS5cbiAqIEBwYXJhbSB7c3RyaW5nP30gY29va2llU2V0dXAuZG9tYWluIENvb2tpZSBkb21haW4uXG4gKiBAcGFyYW0ge2Jvb2xlYW4/fSBjb29raWVTZXR1cC5zZWN1cmUgSXMgY29va2llIHNlY3VyZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW4/fSBjb29raWVTZXR1cC5odHRwT25seSBJcyBjb29raWUgSFRUUCBvbmx5LlxuICogQHJldHVybnMge3N0cmluZ30gQ29va2llIHNldHVwIHN0cmluZy5cbiAqL1xuQ29va2llV3JhcHBlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGNvb2tpZVNldHVwKSB7XG5cdHZhciBjb29raWUgPSB0aGlzLl9jb252ZXJ0VG9Db29raWVTZXR1cChjb29raWVTZXR1cCk7XG5cdHRoaXMuX3dpbmRvdy5kb2N1bWVudC5jb29raWUgPSBjb29raWU7XG5cdHJldHVybiBjb29raWU7XG59OyIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50UmVuZGVyZXI7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpLFxuXHRlcnJvckhlbHBlciA9IHJlcXVpcmUoJy4uL2xpYi9oZWxwZXJzL2Vycm9ySGVscGVyJyksXG5cdG1vZHVsZUhlbHBlciA9IHJlcXVpcmUoJy4uL2xpYi9oZWxwZXJzL21vZHVsZUhlbHBlcicpLFxuXHREb2N1bWVudFJlbmRlcmVyQmFzZSA9IHJlcXVpcmUoJy4uL2xpYi9iYXNlL0RvY3VtZW50UmVuZGVyZXJCYXNlJyk7XG5cbnV0aWwuaW5oZXJpdHMoRG9jdW1lbnRSZW5kZXJlciwgRG9jdW1lbnRSZW5kZXJlckJhc2UpO1xuXG52YXIgSEVBRF9JRCA9ICckJGhlYWQnLFxuXHRFUlJPUl9DUkVBVEVfV1JPTkdfQVJHVU1FTlRTID0gJ1RhZyBuYW1lIHNob3VsZCBiZSBhIHN0cmluZyAnICtcblx0XHQnYW5kIGF0dHJpYnV0ZXMgc2hvdWxkIGJlIGFuIG9iamVjdCcsXG5cdEVSUk9SX0NSRUFURV9XUk9OR19OQU1FID0gJ0NvbXBvbmVudCBmb3IgdGFnIFwiJXNcIiBub3QgZm91bmQnLFxuXHRFUlJPUl9DUkVBVEVfV1JPTkdfSUQgPSAnVGhlIElEIGlzIG5vdCBzcGVjaWZpZWQgb3IgYWxyZWFkeSB1c2VkJyxcblx0VEFHX05BTUVTID0ge1xuXHRcdFRJVExFOiAnVElUTEUnLFxuXHRcdEhUTUw6ICdIVE1MJyxcblx0XHRIRUFEOiAnSEVBRCcsXG5cdFx0QkFTRTogJ0JBU0UnLFxuXHRcdFNUWUxFOiAnU1RZTEUnLFxuXHRcdFNDUklQVDogJ1NDUklQVCcsXG5cdFx0Tk9TQ1JJUFQ6ICdOT1NDUklQVCcsXG5cdFx0TUVUQTogJ01FVEEnLFxuXHRcdExJTks6ICdMSU5LJ1xuXHR9LFxuXHROT0RFX1RZUEVTID0ge1xuXHRcdEVMRU1FTlRfTk9ERTogMSxcblx0XHRURVhUX05PREU6IDMsXG5cdFx0UFJPQ0VTU0lOR19JTlNUUlVDVElPTl9OT0RFOiA3LFxuXHRcdENPTU1FTlRfTk9ERTogOFxuXHR9O1xuXG4vKipcbiAqIENyZWF0ZXMgbmV3IGluc3RhbmNlIG9mIHRoZSBkb2N1bWVudCByZW5kZXJlci5cbiAqIEBwYXJhbSB7U2VydmljZUxvY2F0b3J9ICRzZXJ2aWNlTG9jYXRvciBMb2NhdG9yIHRvIHJlc29sdmUgZGVwZW5kZW5jaWVzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBEb2N1bWVudFJlbmRlcmVyQmFzZVxuICovXG5mdW5jdGlvbiBEb2N1bWVudFJlbmRlcmVyKCRzZXJ2aWNlTG9jYXRvcikge1xuXHREb2N1bWVudFJlbmRlcmVyQmFzZS5jYWxsKHRoaXMsICRzZXJ2aWNlTG9jYXRvcik7XG5cdHRoaXMuX2NvbXBvbmVudEluc3RhbmNlcyA9IHt9O1xuXHR0aGlzLl9jb21wb25lbnRFbGVtZW50cyA9IHt9O1xuXHR0aGlzLl9jb21wb25lbnRCaW5kaW5ncyA9IHt9O1xuXHR0aGlzLl9jdXJyZW50Q2hhbmdlZFN0b3JlcyA9IHt9O1xuXHR0aGlzLl93aW5kb3cgPSAkc2VydmljZUxvY2F0b3IucmVzb2x2ZSgnd2luZG93Jyk7XG5cdHRoaXMuX2NvbmZpZyA9ICRzZXJ2aWNlTG9jYXRvci5yZXNvbHZlKCdjb25maWcnKTtcblx0dGhpcy5fc3RvcmVEaXNwYXRjaGVyID0gJHNlcnZpY2VMb2NhdG9yLnJlc29sdmUoJ3N0b3JlRGlzcGF0Y2hlcicpO1xuXG5cdHZhciBzZWxmID0gdGhpcztcblx0dGhpcy5fZXZlbnRCdXMub24oJ3N0b3JlQ2hhbmdlZCcsIGZ1bmN0aW9uIChzdG9yZU5hbWUpIHtcblx0XHRzZWxmLl9jdXJyZW50Q2hhbmdlZFN0b3Jlc1tzdG9yZU5hbWVdID0gdHJ1ZTtcblx0XHRpZiAoc2VsZi5faXNTdGF0ZUNoYW5naW5nKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHNlbGYuX3VwZGF0ZVN0b3JlQ29tcG9uZW50cygpO1xuXHR9KTtcblx0Ly8gbmVlZCB0byBydW4gYWxsIGJpbmQgbWV0aG9kcyBhbmQgZXZlbnRzIGZvciBjb21wb25lbnRzXG5cdC8vIGhhdmUgYmVlbiByZW5kZXJlZCBhdCBzZXJ2ZXIgYWZ0ZXIgYWxsIG1vZHVsZXMgd2lsbCBiZSByZXNvbHZlZCBmcm9tXG5cdC8vIFNlcnZpY2UgTG9jYXRvclxuXHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRzZWxmLl9pbml0aWFsV3JhcCgpO1xuXHR9LCAwKTtcbn1cblxuLyoqXG4gKiBDdXJyZW50IGFwcGxpY2F0aW9uIGNvbmZpZy5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5fY29uZmlnID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHN0b3JlIGRpc3BhdGNoZXIuXG4gKiBAdHlwZSB7U3RvcmVEaXNwYXRjaGVyfVxuICogQHByaXZhdGVcbiAqL1xuRG9jdW1lbnRSZW5kZXJlci5wcm90b3R5cGUuX3N0b3JlRGlzcGF0Y2hlciA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBzZXQgb2YgY29tcG9uZW50IGluc3RhbmNlcyBieSB1bmlxdWUga2V5cy5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5fY29tcG9uZW50SW5zdGFuY2VzID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHNldCBvZiBjb21wb25lbnQgZWxlbWVudHMgYnkgdW5pcXVlIGtleXMuXG4gKiBAdHlwZSB7T2JqZWN0fVxuICogQHByaXZhdGVcbiAqL1xuRG9jdW1lbnRSZW5kZXJlci5wcm90b3R5cGUuX2NvbXBvbmVudEVsZW1lbnRzID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHNldCBvZiBjb21wb25lbnQgYmluZGluZ3MgYnkgdW5pcXVlIGtleXMuXG4gKiBAdHlwZSB7T2JqZWN0fVxuICogQHByaXZhdGVcbiAqL1xuRG9jdW1lbnRSZW5kZXJlci5wcm90b3R5cGUuX2NvbXBvbmVudEJpbmRpbmdzID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHJvdXRpbmcgY29udGV4dC5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5fY3VycmVudFJvdXRpbmdDb250ZXh0ID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHNldCBvZiBjaGFuZ2VkIHN0b3Jlcy5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5fY3VycmVudENoYW5nZWRTdG9yZXMgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgcHJvbWlzZSBmb3IgcmVuZGVyZWQgcGFnZS5cbiAqIEB0eXBlIHtQcm9taXNlfVxuICogQHByaXZhdGVcbiAqL1xuRG9jdW1lbnRSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcmVkUHJvbWlzZSA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBzdGF0ZSBvZiB1cGRhdGluZyBjb21wb25lbnRzLlxuICogQHR5cGUge2Jvb2xlYW59XG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5faXNVcGRhdGluZyA9IGZhbHNlO1xuXG4vKipcbiAqIFJlbmRlcnMgbmV3IHN0YXRlIG9mIGFwcGxpY2F0aW9uLlxuICogQHBhcmFtIHtPYmplY3R9IHN0YXRlIE5ldyBzdGF0ZSBvZiBhcHBsaWNhdGlvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSByb3V0aW5nQ29udGV4dCBSb3V0aW5nIGNvbnRleHQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSBmb3Igbm90aGluZy5cbiAqL1xuRG9jdW1lbnRSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKHN0YXRlLCByb3V0aW5nQ29udGV4dCkge1xuXHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0Y29tcG9uZW50cyA9IHRoaXMuX2NvbXBvbmVudExvYWRlci5nZXRDb21wb25lbnRzQnlOYW1lcygpO1xuXHQvLyB3ZSBoYXZlIHRvIHVwZGF0ZSBhbGwgY29udGV4dHMgb2YgYWxsIGNvbXBvbmVudHNcblx0dGhpcy5fY3VycmVudFJvdXRpbmdDb250ZXh0ID0gcm91dGluZ0NvbnRleHQ7XG5cdE9iamVjdC5rZXlzKHRoaXMuX2NvbXBvbmVudEluc3RhbmNlcylcblx0XHQuZm9yRWFjaChmdW5jdGlvbiAoaWQpIHtcblx0XHRcdHZhciBpbnN0YW5jZSA9IHNlbGYuX2NvbXBvbmVudEluc3RhbmNlc1tpZF07XG5cdFx0XHRpbnN0YW5jZS4kY29udGV4dCA9IHNlbGYuX2dldENvbXBvbmVudENvbnRleHQoXG5cdFx0XHRcdGNvbXBvbmVudHNbaW5zdGFuY2UuJGNvbnRleHQubmFtZV0sXG5cdFx0XHRcdGluc3RhbmNlLiRjb250ZXh0LmVsZW1lbnRcblx0XHRcdCk7XG5cdFx0fSk7XG5cblx0aWYgKHRoaXMuX2lzU3RhdGVDaGFuZ2luZykge1xuXHRcdHZhciBjaGFuZ2VkQWdhaW4gPSB0aGlzLl9zdG9yZURpc3BhdGNoZXIuc2V0U3RhdGUoXG5cdFx0XHRzdGF0ZSwgcm91dGluZ0NvbnRleHRcblx0XHQpO1xuXHRcdGNoYW5nZWRBZ2Fpbi5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRzZWxmLl9jdXJyZW50Q2hhbmdlZFN0b3Jlc1tuYW1lXSA9IHRydWU7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHRoaXMuX3JlbmRlcmVkUHJvbWlzZTtcblx0fVxuXG5cdC8vIHdlIHNob3VsZCBzZXQgdGhpcyBmbGFnIHRvIGF2b2lkIFwic3RvcmVDaGFuZ2VkXCJcblx0Ly8gZXZlbnQgaGFuZGxpbmcgZm9yIG5vd1xuXHR0aGlzLl9pc1N0YXRlQ2hhbmdpbmcgPSB0cnVlO1xuXHR0aGlzLl9zdG9yZURpc3BhdGNoZXIuc2V0U3RhdGUoc3RhdGUsIHJvdXRpbmdDb250ZXh0KTtcblxuXHQvLyBhbmQgdGhlbiB3ZSB1cGRhdGUgYWxsIGNvbXBvbmVudHMgb2YgdGhlc2Ugc3RvcmVzIGluIGEgYmF0Y2guXG5cdHRoaXMuX3JlbmRlcmVkUHJvbWlzZSA9IHNlbGYuX3VwZGF0ZVN0b3JlQ29tcG9uZW50cygpXG5cdFx0LmNhdGNoKGZ1bmN0aW9uIChyZWFzb24pIHtcblx0XHRcdHNlbGYuX2V2ZW50QnVzLmVtaXQoJ2Vycm9yJywgcmVhc29uKTtcblx0XHR9KVxuXHRcdC50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcdHNlbGYuX2lzU3RhdGVDaGFuZ2luZyA9IGZhbHNlO1xuXHRcdH0pO1xuXG5cdHJldHVybiB0aGlzLl9yZW5kZXJlZFByb21pc2U7XG59O1xuXG4vKipcbiAqIFJlbmRlcnMgY29tcG9uZW50IGludG8gSFRNTCBlbGVtZW50LlxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IEhUTUwgZWxlbWVudCBvZiBjb21wb25lbnRcbiAqIEBwYXJhbSB7T2JqZWN0P30gcmVuZGVyaW5nQ29udGV4dCBSZW5kZXJpbmcgY29udGV4dCBmb3IgZ3JvdXAgcmVuZGVyaW5nLlxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXJDb21wb25lbnQgPVxuXHRmdW5jdGlvbiAoZWxlbWVudCwgcmVuZGVyaW5nQ29udGV4dCkge1xuXHRcdHJlbmRlcmluZ0NvbnRleHQgPSByZW5kZXJpbmdDb250ZXh0IHx8IHRoaXMuX2NyZWF0ZVJlbmRlcmluZ0NvbnRleHQoW10pO1xuXG5cdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0Y29tcG9uZW50TmFtZSA9IG1vZHVsZUhlbHBlci5nZXRPcmlnaW5hbENvbXBvbmVudE5hbWUoXG5cdFx0XHRcdFx0ZWxlbWVudC50YWdOYW1lXG5cdFx0XHQpLFxuXHRcdFx0aGFkQ2hpbGRyZW4gPSBlbGVtZW50Lmhhc0NoaWxkTm9kZXMoKSxcblx0XHRcdGNvbXBvbmVudCA9IHJlbmRlcmluZ0NvbnRleHQuY29tcG9uZW50c1tjb21wb25lbnROYW1lXSxcblx0XHRcdGlkID0gZ2V0SWQoZWxlbWVudCksXG5cdFx0XHRpbnN0YW5jZSA9IHRoaXMuX2NvbXBvbmVudEluc3RhbmNlc1tpZF07XG5cblx0XHRpZiAoIWNvbXBvbmVudCkge1xuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRcdH1cblxuXHRcdGlmICghaWQgfHwgcmVuZGVyaW5nQ29udGV4dC5yZW5kZXJlZElkcy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0XHR9XG5cblx0XHRyZW5kZXJpbmdDb250ZXh0LnJlbmRlcmVkSWRzW2lkXSA9IHRydWU7XG5cblx0XHRpZiAoIWluc3RhbmNlKSB7XG5cdFx0XHRjb21wb25lbnQuY29uc3RydWN0b3IucHJvdG90eXBlLiRjb250ZXh0ID1cblx0XHRcdFx0dGhpcy5fZ2V0Q29tcG9uZW50Q29udGV4dChjb21wb25lbnQsIGVsZW1lbnQpO1xuXHRcdFx0aW5zdGFuY2UgPSB0aGlzLl9zZXJ2aWNlTG9jYXRvci5yZXNvbHZlSW5zdGFuY2UoXG5cdFx0XHRcdGNvbXBvbmVudC5jb25zdHJ1Y3RvciwgcmVuZGVyaW5nQ29udGV4dC5jb25maWdcblx0XHRcdCk7XG5cdFx0XHRpbnN0YW5jZS4kY29udGV4dCA9IGNvbXBvbmVudC5jb25zdHJ1Y3Rvci5wcm90b3R5cGUuJGNvbnRleHQ7XG5cdFx0XHR0aGlzLl9jb21wb25lbnRJbnN0YW5jZXNbaWRdID0gaW5zdGFuY2U7XG5cdFx0fVxuXG5cdFx0dmFyIGV2ZW50QXJncyA9IHtcblx0XHRcdG5hbWU6IGNvbXBvbmVudE5hbWUsXG5cdFx0XHRjb250ZXh0OiBpbnN0YW5jZS4kY29udGV4dFxuXHRcdH07XG5cblx0XHR0aGlzLl9jb21wb25lbnRFbGVtZW50c1tpZF0gPSBlbGVtZW50O1xuXG5cdFx0dmFyIHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cdFx0dGhpcy5fZXZlbnRCdXMuZW1pdCgnY29tcG9uZW50UmVuZGVyJywgZXZlbnRBcmdzKTtcblxuXHRcdHJldHVybiB0aGlzLl91bmJpbmRBbGwoZWxlbWVudCwgcmVuZGVyaW5nQ29udGV4dClcblx0XHRcdC5jYXRjaChmdW5jdGlvbiAocmVhc29uKSB7XG5cdFx0XHRcdHNlbGYuX2V2ZW50QnVzLmVtaXQoJ2Vycm9yJywgcmVhc29uKTtcblx0XHRcdH0pXG5cdFx0XHQudGhlbihmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZhciByZW5kZXJNZXRob2QgPSBtb2R1bGVIZWxwZXIuZ2V0TWV0aG9kVG9JbnZva2UoXG5cdFx0XHRcdFx0aW5zdGFuY2UsICdyZW5kZXInXG5cdFx0XHRcdCk7XG5cdFx0XHRcdHJldHVybiBtb2R1bGVIZWxwZXIuZ2V0U2FmZVByb21pc2UocmVuZGVyTWV0aG9kKTtcblx0XHRcdH0pXG5cdFx0XHQudGhlbihmdW5jdGlvbiAoZGF0YUNvbnRleHQpIHtcblx0XHRcdFx0cmV0dXJuIGNvbXBvbmVudC50ZW1wbGF0ZS5yZW5kZXIoZGF0YUNvbnRleHQpO1xuXHRcdFx0fSlcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChodG1sKSB7XG5cdFx0XHRcdGlmIChlbGVtZW50LnRhZ05hbWUgPT09IFRBR19OQU1FUy5IRUFEKSB7XG5cdFx0XHRcdFx0c2VsZi5fbWVyZ2VIZWFkKGVsZW1lbnQsIGh0bWwpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGVsZW1lbnQuaW5uZXJIVE1MID0gaHRtbDtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgcHJvbWlzZXMgPSBzZWxmLl9maW5kQ29tcG9uZW50cyhlbGVtZW50LCByZW5kZXJpbmdDb250ZXh0KVxuXHRcdFx0XHRcdC5tYXAoZnVuY3Rpb24gKGlubmVyQ29tcG9uZW50KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2VsZi5yZW5kZXJDb21wb25lbnQoXG5cdFx0XHRcdFx0XHRcdGlubmVyQ29tcG9uZW50LCByZW5kZXJpbmdDb250ZXh0XG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXHRcdFx0fSlcblx0XHRcdC50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZXZlbnRBcmdzLnRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuXHRcdFx0XHRzZWxmLl9ldmVudEJ1cy5lbWl0KCdjb21wb25lbnRSZW5kZXJlZCcsIGV2ZW50QXJncyk7XG5cdFx0XHRcdHJldHVybiBzZWxmLl9iaW5kQ29tcG9uZW50KGVsZW1lbnQpO1xuXHRcdFx0fSlcblx0XHRcdC5jYXRjaChmdW5jdGlvbiAocmVhc29uKSB7XG5cdFx0XHRcdHJldHVybiBzZWxmLl9oYW5kbGVFcnJvcihlbGVtZW50LCBjb21wb25lbnQsIHJlYXNvbik7XG5cdFx0XHR9KVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoIWhhZENoaWxkcmVuKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYuX2NvbGxlY3RSZW5kZXJpbmdHYXJiYWdlKHJlbmRlcmluZ0NvbnRleHQpO1xuXHRcdFx0fSk7XG5cdH07XG5cbi8qKlxuICogR2V0cyBjb21wb25lbnQgaW5zdGFuY2UgYnkgSUQuXG4gKiBAcGFyYW0ge1N0cmluZ30gaWQgQ29tcG9uZW50IElELlxuICogQHJldHVybnMge09iamVjdH0gQ29tcG9uZW50IGluc3RhbmNlLlxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5nZXRDb21wb25lbnRCeUlkID0gZnVuY3Rpb24gKGlkKSB7XG5cdHJldHVybiB0aGlzLl9jb21wb25lbnRJbnN0YW5jZXNbaWRdIHx8IG51bGw7XG59O1xuXG4vKipcbiAqIENoZWNrcyB0aGF0IGV2ZXJ5IGluc3RhbmNlIG9mIGNvbXBvbmVudCBoYXMgZWxlbWVudCBvbiB0aGUgcGFnZSBhbmRcbiAqIHJlbW92ZXMgYWxsIHJlZmVyZW5jZXMgdG8gY29tcG9uZW50cyByZW1vdmVkIGZyb20gRE9NLlxuICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgZm9yIG5vdGhpbmcuXG4gKi9cbkRvY3VtZW50UmVuZGVyZXIucHJvdG90eXBlLmNvbGxlY3RHYXJiYWdlID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0cHJvbWlzZXMgPSBbXTtcblx0T2JqZWN0LmtleXModGhpcy5fY29tcG9uZW50RWxlbWVudHMpXG5cdFx0LmZvckVhY2goZnVuY3Rpb24gKGlkKSB7XG5cdFx0XHRpZiAoaWQgPT09IEhFQURfSUQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGVsZW1lbnQgPSBzZWxmLl93aW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuXHRcdFx0aWYgKGVsZW1lbnQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcHJvbWlzZSA9IHNlbGYuX3VuYmluZENvbXBvbmVudChzZWxmLl9jb21wb25lbnRFbGVtZW50c1tpZF0pXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRkZWxldGUgc2VsZi5fY29tcG9uZW50RWxlbWVudHNbaWRdO1xuXHRcdFx0XHRcdGRlbGV0ZSBzZWxmLl9jb21wb25lbnRJbnN0YW5jZXNbaWRdO1xuXHRcdFx0XHRcdGRlbGV0ZSBzZWxmLl9jb21wb25lbnRCaW5kaW5nc1tpZF07XG5cdFx0XHRcdH0pO1xuXHRcdFx0cHJvbWlzZXMucHVzaChwcm9taXNlKTtcblx0XHR9KTtcblx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbmQgcmVuZGVycyBjb21wb25lbnQgZWxlbWVudC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB0YWdOYW1lIE5hbWUgb2YgSFRNTCB0YWcuXG4gKiBAcGFyYW0ge09iamVjdH0gYXR0cmlidXRlcyBFbGVtZW50IGF0dHJpYnV0ZXMuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxFbGVtZW50Pn0gUHJvbWlzZSBmb3IgSFRNTCBlbGVtZW50IHdpdGggcmVuZGVyZWQgY29tcG9uZW50LlxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGVDb21wb25lbnQgPSBmdW5jdGlvbiAodGFnTmFtZSwgYXR0cmlidXRlcykge1xuXHRpZiAodHlwZW9mKHRhZ05hbWUpICE9PSAnc3RyaW5nJyB8fCAhYXR0cmlidXRlcyB8fFxuXHRcdHR5cGVvZihhdHRyaWJ1dGVzKSAhPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QoXG5cdFx0XHRuZXcgRXJyb3IoRVJST1JfQ1JFQVRFX1dST05HX0FSR1VNRU5UUylcblx0XHQpO1xuXHR9XG5cblx0dmFyIGNvbXBvbmVudHMgPSB0aGlzLl9jb21wb25lbnRMb2FkZXIuZ2V0Q29tcG9uZW50c0J5TmFtZXMoKSxcblx0XHRjb21wb25lbnROYW1lID0gbW9kdWxlSGVscGVyLmdldE9yaWdpbmFsQ29tcG9uZW50TmFtZSh0YWdOYW1lKTtcblx0aWYgKG1vZHVsZUhlbHBlci5pc0hlYWRDb21wb25lbnQoY29tcG9uZW50TmFtZSkgfHxcblx0XHRtb2R1bGVIZWxwZXIuaXNEb2N1bWVudENvbXBvbmVudChjb21wb25lbnROYW1lKSB8fFxuXHRcdCFjb21wb25lbnRzLmhhc093blByb3BlcnR5KGNvbXBvbmVudE5hbWUpKSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KFxuXHRcdFx0bmV3IEVycm9yKHV0aWwuZm9ybWF0KEVSUk9SX0NSRUFURV9XUk9OR19OQU1FLCB0YWdOYW1lKSlcblx0XHQpO1xuXHR9XG5cblx0dmFyIGlkID0gYXR0cmlidXRlc1ttb2R1bGVIZWxwZXIuQVRUUklCVVRFX0lEXTtcblx0aWYgKCFpZCB8fCB0aGlzLl9jb21wb25lbnRJbnN0YW5jZXMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihFUlJPUl9DUkVBVEVfV1JPTkdfSUQpKTtcblx0fVxuXG5cdHZhciBlbGVtZW50ID0gdGhpcy5fd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG5cdE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpXG5cdFx0LmZvckVhY2goZnVuY3Rpb24gKGF0dHJpYnV0ZU5hbWUpIHtcblx0XHRcdGVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZU5hbWUsIGF0dHJpYnV0ZXNbYXR0cmlidXRlTmFtZV0pO1xuXHRcdH0pO1xuXG5cdHJldHVybiB0aGlzLnJlbmRlckNvbXBvbmVudChlbGVtZW50KVxuXHRcdC50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBlbGVtZW50O1xuXHRcdH0pO1xufTtcblxuLyoqXG4gKiBDbGVhcnMgYWxsIHJlZmVyZW5jZXMgdG8gcmVtb3ZlZCBjb21wb25lbnRzIGR1cmluZyByZW5kZXJpbmcgcHJvY2Vzcy5cbiAqIEBwYXJhbSB7T2JqZWN0fSByZW5kZXJpbmdDb250ZXh0IENvbnRleHQgb2YgcmVuZGVyaW5nLlxuICogQHByaXZhdGVcbiAqL1xuRG9jdW1lbnRSZW5kZXJlci5wcm90b3R5cGUuX2NvbGxlY3RSZW5kZXJpbmdHYXJiYWdlID1cblx0ZnVuY3Rpb24gKHJlbmRlcmluZ0NvbnRleHQpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0T2JqZWN0LmtleXMocmVuZGVyaW5nQ29udGV4dC51bmJvdW5kSWRzKVxuXHRcdFx0LmZvckVhY2goZnVuY3Rpb24gKGlkKSB7XG5cdFx0XHRcdC8vIHRoaXMgY29tcG9uZW50IGhhcyBiZWVuIHJlbmRlcmVkIGFnYWluIGFuZCB3ZSBkbyBub3QgbmVlZCB0b1xuXHRcdFx0XHQvLyByZW1vdmUgaXQuXG5cdFx0XHRcdGlmIChyZW5kZXJpbmdDb250ZXh0LnJlbmRlcmVkSWRzLmhhc093blByb3BlcnR5KGlkKSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRlbGV0ZSBzZWxmLl9jb21wb25lbnRFbGVtZW50c1tpZF07XG5cdFx0XHRcdGRlbGV0ZSBzZWxmLl9jb21wb25lbnRJbnN0YW5jZXNbaWRdO1xuXHRcdFx0XHRkZWxldGUgc2VsZi5fY29tcG9uZW50QmluZGluZ3NbaWRdO1xuXHRcdFx0fSk7XG5cdH07XG5cbi8qKlxuICogVW5iaW5kcyBhbGwgZXZlbnQgaGFuZGxlcnMgZnJvbSBzcGVjaWZpZWQgY29tcG9uZW50IGFuZCBhbGwgaXQncyBkZXNjZW5kYW50cy5cbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBDb21wb25lbnQgSFRNTCBlbGVtZW50LlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlcmluZ0NvbnRleHQgQ29udGV4dCBvZiByZW5kZXJpbmcuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSBmb3Igbm90aGluZy5cbiAqIEBwcml2YXRlXG4gKi9cbkRvY3VtZW50UmVuZGVyZXIucHJvdG90eXBlLl91bmJpbmRBbGwgPSBmdW5jdGlvbiAoZWxlbWVudCwgcmVuZGVyaW5nQ29udGV4dCkge1xuXHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0cm9vdFByb21pc2UgPSB0aGlzLl91bmJpbmRDb21wb25lbnQoZWxlbWVudCk7XG5cblx0aWYgKCFlbGVtZW50Lmhhc0NoaWxkTm9kZXMoKSkge1xuXHRcdHJldHVybiByb290UHJvbWlzZTtcblx0fVxuXG5cdHJldHVybiByb290UHJvbWlzZVxuXHRcdC50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciBwcm9taXNlcyA9IHNlbGYuX2ZpbmRDb21wb25lbnRzKGVsZW1lbnQsIHJlbmRlcmluZ0NvbnRleHQpXG5cdFx0XHRcdC5tYXAoZnVuY3Rpb24gKGlubmVyRWxlbWVudCkge1xuXHRcdFx0XHRcdHZhciBpZCA9IGdldElkKGlubmVyRWxlbWVudCk7XG5cdFx0XHRcdFx0cmVuZGVyaW5nQ29udGV4dC51bmJvdW5kSWRzW2lkXSA9IHRydWU7XG5cdFx0XHRcdFx0cmV0dXJuIHNlbGYuX3VuYmluZENvbXBvbmVudChpbm5lckVsZW1lbnQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cdFx0fSk7XG59O1xuXG4vKipcbiAqIFVuYmluZHMgYWxsIGV2ZW50IGhhbmRsZXJzIGZyb20gc3BlY2lmaWVkIGNvbXBvbmVudC5cbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBDb21wb25lbnQgSFRNTCBlbGVtZW50LlxuICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgZm9yIG5vdGhpbmcuXG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5fdW5iaW5kQ29tcG9uZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcblx0dmFyIGlkID0gZ2V0SWQoZWxlbWVudCksXG5cdFx0c2VsZiA9IHRoaXMsXG5cdFx0aW5zdGFuY2UgPSB0aGlzLl9jb21wb25lbnRJbnN0YW5jZXNbaWRdO1xuXHRpZiAoIWluc3RhbmNlKSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHR9XG5cdGlmICh0aGlzLl9jb21wb25lbnRCaW5kaW5ncy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcblx0XHRPYmplY3Qua2V5cyh0aGlzLl9jb21wb25lbnRCaW5kaW5nc1tpZF0pXG5cdFx0XHQuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnROYW1lKSB7XG5cdFx0XHRcdGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcblx0XHRcdFx0XHRldmVudE5hbWUsIHNlbGYuX2NvbXBvbmVudEJpbmRpbmdzW2lkXVtldmVudE5hbWVdLmhhbmRsZXJcblx0XHRcdFx0KTtcblx0XHRcdH0pO1xuXHRcdGRlbGV0ZSB0aGlzLl9jb21wb25lbnRCaW5kaW5nc1tpZF07XG5cdH1cblx0dmFyIHVuYmluZE1ldGhvZCA9IG1vZHVsZUhlbHBlci5nZXRNZXRob2RUb0ludm9rZShpbnN0YW5jZSwgJ3VuYmluZCcpO1xuXHRyZXR1cm4gbW9kdWxlSGVscGVyLmdldFNhZmVQcm9taXNlKHVuYmluZE1ldGhvZClcblx0XHQuY2F0Y2goZnVuY3Rpb24gKHJlYXNvbikge1xuXHRcdFx0c2VsZi5fZXZlbnRCdXMuZW1pdCgnZXJyb3InLCByZWFzb24pO1xuXHRcdH0pO1xufTtcblxuLyoqXG4gKiBCaW5kcyBhbGwgcmVxdWlyZWQgZXZlbnQgaGFuZGxlcnMgdG8gY29tcG9uZW50LlxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IENvbXBvbmVudCBIVE1MIGVsZW1lbnQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSBmb3Igbm90aGluZy5cbiAqIEBwcml2YXRlXG4gKi9cbkRvY3VtZW50UmVuZGVyZXIucHJvdG90eXBlLl9iaW5kQ29tcG9uZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcblx0dmFyIGlkID0gZ2V0SWQoZWxlbWVudCksXG5cdFx0c2VsZiA9IHRoaXMsXG5cdFx0aW5zdGFuY2UgPSB0aGlzLl9jb21wb25lbnRJbnN0YW5jZXNbaWRdO1xuXHRpZiAoIWluc3RhbmNlKSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHR9XG5cblx0dmFyIGJpbmRNZXRob2QgPSBtb2R1bGVIZWxwZXIuZ2V0TWV0aG9kVG9JbnZva2UoaW5zdGFuY2UsICdiaW5kJyk7XG5cdHJldHVybiBtb2R1bGVIZWxwZXIuZ2V0U2FmZVByb21pc2UoYmluZE1ldGhvZClcblx0XHQudGhlbihmdW5jdGlvbiAoYmluZGluZ3MpIHtcblx0XHRcdGlmICghYmluZGluZ3MgfHwgdHlwZW9mKGJpbmRpbmdzKSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0c2VsZi5fY29tcG9uZW50QmluZGluZ3NbaWRdID0ge307XG5cdFx0XHRPYmplY3Qua2V5cyhiaW5kaW5ncylcblx0XHRcdFx0LmZvckVhY2goZnVuY3Rpb24gKGV2ZW50TmFtZSkge1xuXHRcdFx0XHRcdHZhciBzZWxlY3RvckhhbmRsZXJzID0ge307XG5cdFx0XHRcdFx0T2JqZWN0LmtleXMoYmluZGluZ3NbZXZlbnROYW1lXSlcblx0XHRcdFx0XHRcdC5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRcdFx0XHRcdFx0XHR2YXIgaGFuZGxlciA9IGJpbmRpbmdzW2V2ZW50TmFtZV1bc2VsZWN0b3JdO1xuXHRcdFx0XHRcdFx0XHRpZiAodHlwZW9mKGhhbmRsZXIpICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHNlbGVjdG9ySGFuZGxlcnNbc2VsZWN0b3JdID0gaGFuZGxlci5iaW5kKGluc3RhbmNlKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHNlbGYuX2NvbXBvbmVudEJpbmRpbmdzW2lkXVtldmVudE5hbWVdID0ge1xuXHRcdFx0XHRcdFx0aGFuZGxlcjogc2VsZi5fY3JlYXRlQmluZGluZ0hhbmRsZXIoXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQsIHNlbGVjdG9ySGFuZGxlcnNcblx0XHRcdFx0XHRcdCksXG5cdFx0XHRcdFx0XHRzZWxlY3RvckhhbmRsZXJzOiBzZWxlY3RvckhhbmRsZXJzXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG5cdFx0XHRcdFx0XHRldmVudE5hbWUsXG5cdFx0XHRcdFx0XHRzZWxmLl9jb21wb25lbnRCaW5kaW5nc1tpZF1bZXZlbnROYW1lXS5oYW5kbGVyXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHRzZWxmLl9ldmVudEJ1cy5lbWl0KCdjb21wb25lbnRCb3VuZCcsIHtcblx0XHRcdFx0ZWxlbWVudDogZWxlbWVudCxcblx0XHRcdFx0aWQ6IGlkXG5cdFx0XHR9KTtcblx0XHR9KTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyB1bml2ZXJzYWwgZXZlbnQgaGFuZGxlciBmb3IgZGVsZWdhdGVkIGV2ZW50cy5cbiAqIEBwYXJhbSB7RWxlbWVudH0gY29tcG9uZW50Um9vdCBSb290IGVsZW1lbnQgb2YgY29tcG9uZW50LlxuICogQHBhcmFtIHtPYmplY3R9IHNlbGVjdG9ySGFuZGxlcnMgTWFwIG9mIGV2ZW50IGhhbmRsZXJzIGJ5IENTUyBzZWxlY3RvcnMuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFVuaXZlcnNhbCBldmVudCBoYW5kbGVyIGZvciBkZWxlZ2F0ZWQgZXZlbnRzLlxuICogQHByaXZhdGVcbiAqL1xuRG9jdW1lbnRSZW5kZXJlci5wcm90b3R5cGUuX2NyZWF0ZUJpbmRpbmdIYW5kbGVyID1cblx0ZnVuY3Rpb24gKGNvbXBvbmVudFJvb3QsIHNlbGVjdG9ySGFuZGxlcnMpIHtcblx0XHR2YXIgc2VsZWN0b3JzID0gT2JqZWN0LmtleXMoc2VsZWN0b3JIYW5kbGVycyk7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0dmFyIGRpc3BhdGNoZWRFdmVudCA9IGNyZWF0ZUN1c3RvbUV2ZW50KGV2ZW50LCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGVsZW1lbnQ7XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRlbGVtZW50ID0gZXZlbnQudGFyZ2V0LFxuXHRcdFx0XHR0YXJnZXRNYXRjaGVzID0gZ2V0TWF0Y2hlc01ldGhvZChlbGVtZW50KSxcblx0XHRcdFx0aXNIYW5kbGVkID0gZmFsc2U7XG5cdFx0XHRzZWxlY3RvcnMuZXZlcnkoZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG5cdFx0XHRcdGlmICghdGFyZ2V0TWF0Y2hlcyhzZWxlY3RvcikpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpc0hhbmRsZWQgPSB0cnVlO1xuXHRcdFx0XHRzZWxlY3RvckhhbmRsZXJzW3NlbGVjdG9yXShkaXNwYXRjaGVkRXZlbnQpO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9KTtcblx0XHRcdGlmIChpc0hhbmRsZWQpIHtcblx0XHRcdFx0Ly9ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR3aGlsZShlbGVtZW50ICE9PSBjb21wb25lbnRSb290KSB7XG5cdFx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdFx0XHRcdHRhcmdldE1hdGNoZXMgPSBnZXRNYXRjaGVzTWV0aG9kKGVsZW1lbnQpO1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGlmICghdGFyZ2V0TWF0Y2hlcyhzZWxlY3RvcnNbaV0pKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aXNIYW5kbGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRzZWxlY3RvckhhbmRsZXJzW3NlbGVjdG9yc1tpXV0oZGlzcGF0Y2hlZEV2ZW50KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChpc0hhbmRsZWQpIHtcblx0XHRcdFx0XHQvL2V2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fTtcblxuLyoqXG4gKiBGaW5kcyBhbGwgZGVzY2VuZGFudCBjb21wb25lbnRzIG9mIHNwZWNpZmllZCBjb21wb25lbnQgZWxlbWVudC5cbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBSb290IGNvbXBvbmVudCBIVE1MIGVsZW1lbnQgdG8gYmVnaW4gc2VhcmNoIHdpdGguXG4gKiBAcGFyYW0ge09iamVjdH0gcmVuZGVyaW5nQ29udGV4dCBDb250ZXh0IG9mIHJlbmRlcmluZy5cbiAqIEBwcml2YXRlXG4gKi9cbkRvY3VtZW50UmVuZGVyZXIucHJvdG90eXBlLl9maW5kQ29tcG9uZW50cyA9XG5cdGZ1bmN0aW9uIChlbGVtZW50LCByZW5kZXJpbmdDb250ZXh0KSB7XG5cdFx0dmFyIGNvbXBvbmVudHMgPSBbXTtcblx0XHRyZW5kZXJpbmdDb250ZXh0LmNvbXBvbmVudFRhZ3Ncblx0XHRcdC5mb3JFYWNoKGZ1bmN0aW9uICh0YWcpIHtcblx0XHRcdFx0dmFyIG5vZGVzID0gZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSh0YWcpO1xuXHRcdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRjb21wb25lbnRzLnB1c2gobm9kZXNbaV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRyZXR1cm4gY29tcG9uZW50cztcblx0fTtcblxuLyoqXG4gKiBIYW5kbGVzIGVycm9yIHdoaWxlIHJlbmRlcmluZy5cbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBDb21wb25lbnQgSFRNTCBlbGVtZW50LlxuICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudCBDb21wb25lbnQgaW5zdGFuY2UuXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJvciBFcnJvciB0byBoYW5kbGUuXG4gKiBAcmV0dXJucyB7UHJvbWlzZXxudWxsfSBQcm9taXNlIGZvciBub3RoaW5nIG9yIG51bGwuXG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlRXJyb3IgPSBmdW5jdGlvbiAoZWxlbWVudCwgY29tcG9uZW50LCBlcnJvcikge1xuXHR0aGlzLl9ldmVudEJ1cy5lbWl0KCdlcnJvcicsIGVycm9yKTtcblxuXHQvLyBkbyBub3QgY29ycnVwdCBleGlzdGVkIEhFQUQgd2hlbiBlcnJvciBvY2N1cnNcblx0aWYgKGVsZW1lbnQudGFnTmFtZSA9PT0gVEFHX05BTUVTLkhFQUQpIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdGlmICghdGhpcy5fY29uZmlnLmlzUmVsZWFzZSAmJiBlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG5cdFx0ZWxlbWVudC5pbm5lckhUTUwgPSBlcnJvckhlbHBlci5wcmV0dHlQcmludChcblx0XHRcdGVycm9yLCB0aGlzLl93aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudFxuXHRcdCk7XG5cdH0gZWxzZSBpZiAoY29tcG9uZW50LmVycm9yVGVtcGxhdGUpIHtcblx0XHRyZXR1cm4gY29tcG9uZW50LmVycm9yVGVtcGxhdGUucmVuZGVyKGVycm9yKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKGh0bWwpIHtcblx0XHRcdFx0ZWxlbWVudC5pbm5lckhUTUwgPSBodG1sO1xuXHRcdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0ZWxlbWVudC5pbm5lckhUTUwgPSAnJztcblx0fVxuXG5cdHJldHVybiBudWxsO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIGFsbCBjb21wb25lbnRzIHRoYXQgZGVwZW5kIG9uIGN1cnJlbnQgc2V0IG9mIGNoYW5nZWQgc3RvcmVzLlxuICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgZm9yIG5vdGhpbmcuXG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5fdXBkYXRlU3RvcmVDb21wb25lbnRzID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodGhpcy5faXNVcGRhdGluZykge1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0fVxuXHR2YXIgY2hhbmdlZCA9IE9iamVjdC5rZXlzKHRoaXMuX2N1cnJlbnRDaGFuZ2VkU3RvcmVzKTtcblx0aWYgKGNoYW5nZWQubGVuZ3RoID09PSAwKSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHR9XG5cdHRoaXMuX2N1cnJlbnRDaGFuZ2VkU3RvcmVzID0ge307XG5cdHZhciBzZWxmID0gdGhpcyxcblx0XHRyZW5kZXJpbmdDb250ZXh0ID0gdGhpcy5fY3JlYXRlUmVuZGVyaW5nQ29udGV4dChjaGFuZ2VkKSxcblx0XHRwcm9taXNlcyA9IHJlbmRlcmluZ0NvbnRleHQucm9vdHMubWFwKGZ1bmN0aW9uIChyb290KSB7XG5cdFx0XHRyZXR1cm4gc2VsZi5yZW5kZXJDb21wb25lbnQocm9vdCwgcmVuZGVyaW5nQ29udGV4dCk7XG5cdFx0fSk7XG5cblx0dGhpcy5faXNVcGRhdGluZyA9IHRydWU7XG5cdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcylcblx0XHQuY2F0Y2goZnVuY3Rpb24gKHJlYXNvbikge1xuXHRcdFx0c2VsZi5fZXZlbnRCdXMuZW1pdCgnZXJyb3InLCByZWFzb24pO1xuXHRcdH0pXG5cdFx0LnRoZW4oZnVuY3Rpb24gKCkge1xuXHRcdFx0c2VsZi5faXNVcGRhdGluZyA9IGZhbHNlO1xuXHRcdFx0c2VsZi5fZXZlbnRCdXMuZW1pdCgnZG9jdW1lbnRVcGRhdGVkJywgY2hhbmdlZCk7XG5cdFx0XHRyZXR1cm4gc2VsZi5fdXBkYXRlU3RvcmVDb21wb25lbnRzKCk7XG5cdFx0fSk7XG59O1xuXG4vKipcbiAqIE1lcmdlcyBuZXcgYW5kIGV4aXN0ZWQgaGVhZCBlbGVtZW50cyBhbmQgY2hhbmdlIG9ubHkgZGlmZmVyZW5jZS5cbiAqIEBwYXJhbSB7RWxlbWVudH0gaGVhZCBIRUFEIERPTSBlbGVtZW50LlxuICogQHBhcmFtIHtzdHJpbmd9IGh0bWxUZXh0IEhUTUwgb2YgbmV3IEhFQUQgZWxlbWVudCBjb250ZW50LlxuICogQHByaXZhdGVcbiAqL1xuLypqc2hpbnQgbWF4Y29tcGxleGl0eTpmYWxzZSAqL1xuRG9jdW1lbnRSZW5kZXJlci5wcm90b3R5cGUuX21lcmdlSGVhZCA9IGZ1bmN0aW9uIChoZWFkLCBodG1sVGV4dCkge1xuXHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0bmV3SGVhZCA9IHRoaXMuX3dpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoZWFkJyk7XG5cdG5ld0hlYWQuaW5uZXJIVE1MID0gaHRtbFRleHQ7XG5cblx0dmFyIG1hcCA9IHRoaXMuX2dldEhlYWRNYXAoaGVhZC5jaGlsZE5vZGVzKSxcblx0XHRjdXJyZW50LCBpLCBrZXksIG9sZEtleSwgb2xkSXRlbSxcblx0XHRzYW1lTWV0YUVsZW1lbnRzID0ge307XG5cblx0Zm9yIChpID0gMDsgaSA8IG5ld0hlYWQuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuXHRcdGN1cnJlbnQgPSBuZXdIZWFkLmNoaWxkTm9kZXNbaV07XG5cblx0XHRpZiAoIW1hcC5oYXNPd25Qcm9wZXJ0eShjdXJyZW50Lm5vZGVOYW1lKSkge1xuXHRcdFx0bWFwW2N1cnJlbnQubm9kZU5hbWVdID0ge307XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChjdXJyZW50Lm5vZGVOYW1lKSB7XG5cdFx0XHQvLyB0aGVzZSBlbGVtZW50cyBjYW4gYmUgb25seSByZXBsYWNlZFxuXHRcdFx0Y2FzZSBUQUdfTkFNRVMuVElUTEU6XG5cdFx0XHRjYXNlIFRBR19OQU1FUy5CQVNFOlxuXHRcdFx0Y2FzZSBUQUdfTkFNRVMuTk9TQ1JJUFQ6XG5cdFx0XHRcdGtleSA9IHRoaXMuX2dldE5vZGVLZXkoY3VycmVudCk7XG5cdFx0XHRcdG9sZEl0ZW0gPSBoZWFkLmdldEVsZW1lbnRzQnlUYWdOYW1lKGN1cnJlbnQubm9kZU5hbWUpWzBdO1xuXHRcdFx0XHRpZiAob2xkSXRlbSkge1xuXHRcdFx0XHRcdG9sZEtleSA9IHRoaXMuX2dldE5vZGVLZXkob2xkSXRlbSk7XG5cdFx0XHRcdFx0aGVhZC5yZXBsYWNlQ2hpbGQoY3VycmVudCwgb2xkSXRlbSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aGVhZC5hcHBlbmRDaGlsZChjdXJyZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyB3aGVuIHdlIGRvIHJlcGxhY2Ugb3IgYXBwZW5kIGN1cnJlbnQgaXMgcmVtb3ZlZCBmcm9tIG5ld0hlYWRcblx0XHRcdFx0Ly8gdGhlcmVmb3JlIHdlIG5lZWQgdG8gZGVjcmVtZW50IGluZGV4XG5cdFx0XHRcdGktLTtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdC8vIHRoZXNlIGVsZW1lbnRzIGNhbiBub3QgYmUgZGVsZXRlZCBmcm9tIGhlYWRcblx0XHRcdC8vIHRoZXJlZm9yZSB3ZSBqdXN0IGFkZCBuZXcgZWxlbWVudHMgdGhhdCBkaWZmZXJzIGZyb20gZXhpc3RlZFxuXHRcdFx0Y2FzZSBUQUdfTkFNRVMuU1RZTEU6XG5cdFx0XHRjYXNlIFRBR19OQU1FUy5MSU5LOlxuXHRcdFx0Y2FzZSBUQUdfTkFNRVMuU0NSSVBUOlxuXHRcdFx0XHRrZXkgPSBzZWxmLl9nZXROb2RlS2V5KGN1cnJlbnQpO1xuXHRcdFx0XHRpZiAoIW1hcFtjdXJyZW50Lm5vZGVOYW1lXS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0aGVhZC5hcHBlbmRDaGlsZChjdXJyZW50KTtcblx0XHRcdFx0XHRpLS07XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHQvLyBtZXRhIGFuZCBvdGhlciBlbGVtZW50cyBjYW4gYmUgZGVsZXRlZFxuXHRcdFx0Ly8gYnV0IHdlIHNob3VsZCBub3QgZGVsZXRlIGFuZCBhcHBlbmQgc2FtZSBlbGVtZW50c1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0a2V5ID0gc2VsZi5fZ2V0Tm9kZUtleShjdXJyZW50KTtcblx0XHRcdFx0aWYgKG1hcFtjdXJyZW50Lm5vZGVOYW1lXS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0c2FtZU1ldGFFbGVtZW50c1trZXldID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRoZWFkLmFwcGVuZENoaWxkKGN1cnJlbnQpO1xuXHRcdFx0XHRcdGktLTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblxuXHRpZiAobWFwLmhhc093blByb3BlcnR5KFRBR19OQU1FUy5NRVRBKSkge1xuXHRcdC8vIHJlbW92ZSBtZXRhIHRhZ3Mgd2hpY2ggYSBub3QgaW4gYSBuZXcgaGVhZCBzdGF0ZVxuXHRcdE9iamVjdC5rZXlzKG1hcFtUQUdfTkFNRVMuTUVUQV0pXG5cdFx0XHQuZm9yRWFjaChmdW5jdGlvbiAobWV0YUtleSkge1xuXHRcdFx0XHRpZiAoc2FtZU1ldGFFbGVtZW50cy5oYXNPd25Qcm9wZXJ0eShtZXRhS2V5KSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGhlYWQucmVtb3ZlQ2hpbGQobWFwW1RBR19OQU1FUy5NRVRBXVttZXRhS2V5XSk7XG5cdFx0XHR9KTtcblx0fVxufTtcblxuLyoqXG4gKiBHZXRzIG1hcCBvZiBhbGwgSEVBRCdzIGVsZW1lbnRzLlxuICogQHBhcmFtIHtOb2RlTGlzdH0gaGVhZENoaWxkcmVuIEhlYWQgY2hpbGRyZW4gRE9NIG5vZGVzLlxuICogQHJldHVybnMge09iamVjdH0gTWFwIG9mIEhFQUQgZWxlbWVudHMuXG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5fZ2V0SGVhZE1hcCA9IGZ1bmN0aW9uIChoZWFkQ2hpbGRyZW4pIHtcblx0Ly8gQ3JlYXRlIG1hcCBvZiA8bWV0YT4sIDxsaW5rPiwgPHN0eWxlPiBhbmQgPHNjcmlwdD4gdGFnc1xuXHQvLyBieSB1bmlxdWUga2V5cyB0aGF0IGNvbnRhaW4gYXR0cmlidXRlcyBhbmQgY29udGVudFxuXHR2YXIgbWFwID0ge30sXG5cdFx0aSwgY3VycmVudCxcblx0XHRzZWxmID0gdGhpcztcblxuXHRmb3IgKGkgPSAwOyBpIDwgaGVhZENoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0Y3VycmVudCA9IGhlYWRDaGlsZHJlbltpXTtcblx0XHRpZiAoIW1hcC5oYXNPd25Qcm9wZXJ0eShjdXJyZW50Lm5vZGVOYW1lKSkge1xuXHRcdFx0bWFwW2N1cnJlbnQubm9kZU5hbWVdID0ge307XG5cdFx0fVxuXHRcdG1hcFtjdXJyZW50Lm5vZGVOYW1lXVtzZWxmLl9nZXROb2RlS2V5KGN1cnJlbnQpXSA9IGN1cnJlbnQ7XG5cdH1cblx0cmV0dXJuIG1hcDtcbn07XG5cbi8qKlxuICogR2V0cyB1bmlxdWUgZWxlbWVudCBrZXkgdXNpbmcgZWxlbWVudCdzIGF0dHJpYnV0ZXMgYW5kIGl0cyBjb250ZW50LlxuICogQHBhcmFtIHtOb2RlfSBub2RlIEhUTUwgZWxlbWVudC5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFVuaXF1ZSBrZXkgZm9yIGVsZW1lbnQuXG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5fZ2V0Tm9kZUtleSA9IGZ1bmN0aW9uIChub2RlKSB7XG5cdHZhciBjdXJyZW50LCBpLFxuXHRcdGF0dHJpYnV0ZXMgPSBbXTtcblxuXHRpZiAobm9kZS5ub2RlVHlwZSAhPT0gTk9ERV9UWVBFUy5FTEVNRU5UX05PREUpIHtcblx0XHRyZXR1cm4gbm9kZS5ub2RlVmFsdWUgfHwgJyc7XG5cdH1cblxuXHRpZiAobm9kZS5oYXNBdHRyaWJ1dGVzKCkpIHtcblx0XHRmb3IgKGkgPSAwOyBpIDwgbm9kZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRjdXJyZW50ID0gbm9kZS5hdHRyaWJ1dGVzW2ldO1xuXHRcdFx0YXR0cmlidXRlcy5wdXNoKGN1cnJlbnQubmFtZSArICc9JyArIGN1cnJlbnQudmFsdWUpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBhdHRyaWJ1dGVzXG5cdFx0XHQuc29ydCgpXG5cdFx0XHQuam9pbignfCcpICsgJz4nICsgbm9kZS50ZXh0Q29udGVudDtcbn07XG5cbi8qKlxuICogRG9lcyBpbml0aWFsIHdyYXBwaW5nIGZvciBldmVyeSBjb21wb25lbnQgb24gdGhlIHBhZ2UuXG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5faW5pdGlhbFdyYXAgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcyxcblx0XHRjdXJyZW50LCBpLCBpZCwgaW5zdGFuY2UsXG5cdFx0Y29tcG9uZW50cyA9IHRoaXMuX2NvbXBvbmVudExvYWRlci5nZXRDb21wb25lbnRzQnlOYW1lcygpLFxuXHRcdGJpbmRQcm9taXNlcyA9IFtdO1xuXG5cdE9iamVjdC5rZXlzKGNvbXBvbmVudHMpXG5cdFx0LmZvckVhY2goZnVuY3Rpb24gKGNvbXBvbmVudE5hbWUpIHtcblx0XHRcdHZhciB0YWdOYW1lID0gbW9kdWxlSGVscGVyXG5cdFx0XHRcdFx0LmdldFRhZ05hbWVGb3JDb21wb25lbnROYW1lKGNvbXBvbmVudE5hbWUpLFxuXHRcdFx0XHRlbGVtZW50cyA9IHNlbGYuX3dpbmRvdy5kb2N1bWVudFxuXHRcdFx0XHRcdC5nZXRFbGVtZW50c0J5VGFnTmFtZSh0YWdOYW1lKSxcblx0XHRcdFx0Y29uc3RydWN0b3IgPSBjb21wb25lbnRzW2NvbXBvbmVudE5hbWVdLmNvbnN0cnVjdG9yO1xuXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0Y3VycmVudCA9IGVsZW1lbnRzW2ldO1xuXHRcdFx0XHRpZCA9IGN1cnJlbnQuZ2V0QXR0cmlidXRlKG1vZHVsZUhlbHBlci5BVFRSSUJVVEVfSUQpO1xuXHRcdFx0XHRpZiAoIWlkKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdHJ1Y3Rvci5wcm90b3R5cGUuJGNvbnRleHQgPSBzZWxmLl9nZXRDb21wb25lbnRDb250ZXh0KFxuXHRcdFx0XHRcdGNvbXBvbmVudHNbY29tcG9uZW50TmFtZV0sIGN1cnJlbnRcblx0XHRcdFx0KTtcblx0XHRcdFx0aW5zdGFuY2UgPSBzZWxmLl9zZXJ2aWNlTG9jYXRvci5yZXNvbHZlSW5zdGFuY2UoXG5cdFx0XHRcdFx0Y29uc3RydWN0b3IsIHNlbGYuX2NvbmZpZ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRpbnN0YW5jZS4kY29udGV4dCA9IGNvbnN0cnVjdG9yLnByb3RvdHlwZS4kY29udGV4dDtcblxuXHRcdFx0XHRzZWxmLl9jb21wb25lbnRJbnN0YW5jZXNbaWRdID0gaW5zdGFuY2U7XG5cdFx0XHRcdHNlbGYuX2V2ZW50QnVzLmVtaXQoJ2NvbXBvbmVudFJlbmRlcmVkJywge1xuXHRcdFx0XHRcdG5hbWU6IGNvbXBvbmVudE5hbWUsXG5cdFx0XHRcdFx0YXR0cmlidXRlczogaW5zdGFuY2UuJGNvbnRleHQuYXR0cmlidXRlcyxcblx0XHRcdFx0XHRjb250ZXh0OiBpbnN0YW5jZS4kY29udGV4dFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0YmluZFByb21pc2VzLnB1c2goc2VsZi5fYmluZENvbXBvbmVudChjdXJyZW50KSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0cmV0dXJuIFByb21pc2UuYWxsKGJpbmRQcm9taXNlcylcblx0XHQudGhlbihmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxmLl9ldmVudEJ1cy5lbWl0KCdkb2N1bWVudFJlbmRlcmVkJywgc2VsZi5fY3VycmVudFJvdXRpbmdDb250ZXh0KTtcblx0XHR9KTtcbn07XG5cbi8qKlxuICogR2V0cyBjb21wb25lbnQgY29udGV4dCB1c2luZyBiYXNpYyBjb250ZXh0LlxuICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudCBDb21wb25lbnQgZGV0YWlscy5cbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBET00gZWxlbWVudCBvZiBjb21wb25lbnQuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBDb21wb25lbnQgY29udGV4dC5cbiAqIEBwcml2YXRlXG4gKi9cbkRvY3VtZW50UmVuZGVyZXIucHJvdG90eXBlLl9nZXRDb21wb25lbnRDb250ZXh0ID1cblx0ZnVuY3Rpb24gKGNvbXBvbmVudCwgZWxlbWVudCkge1xuXHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdHN0b3JlTmFtZSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKG1vZHVsZUhlbHBlci5BVFRSSUJVVEVfU1RPUkUpLFxuXHRcdFx0Y29tcG9uZW50Q29udGV4dCA9IE9iamVjdC5jcmVhdGUodGhpcy5fY3VycmVudFJvdXRpbmdDb250ZXh0KTtcblxuXHRcdGNvbXBvbmVudENvbnRleHQuZWxlbWVudCA9IGVsZW1lbnQ7XG5cdFx0Y29tcG9uZW50Q29udGV4dC5uYW1lID0gY29tcG9uZW50Lm5hbWU7XG5cdFx0Y29tcG9uZW50Q29udGV4dC5hdHRyaWJ1dGVzID0gYXR0cmlidXRlc1RvT2JqZWN0KGVsZW1lbnQuYXR0cmlidXRlcyk7XG5cdFx0Y29tcG9uZW50Q29udGV4dC5nZXRDb21wb25lbnRCeUlkID0gZnVuY3Rpb24gKGlkKSB7XG5cdFx0XHRyZXR1cm4gc2VsZi5nZXRDb21wb25lbnRCeUlkKGlkKTtcblx0XHR9O1xuXHRcdGNvbXBvbmVudENvbnRleHQuY3JlYXRlQ29tcG9uZW50ID0gZnVuY3Rpb24gKHRhZ05hbWUsIGF0dHJpYnV0ZXMpIHtcblx0XHRcdHJldHVybiBzZWxmLmNyZWF0ZUNvbXBvbmVudCh0YWdOYW1lLCBhdHRyaWJ1dGVzKTtcblx0XHR9O1xuXHRcdGNvbXBvbmVudENvbnRleHQuY29sbGVjdEdhcmJhZ2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gc2VsZi5jb2xsZWN0R2FyYmFnZSgpO1xuXHRcdH07XG5cdFx0Y29tcG9uZW50Q29udGV4dC5nZXRTdG9yZURhdGEgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gc2VsZi5fc3RvcmVEaXNwYXRjaGVyXG5cdFx0XHRcdC5nZXRTdG9yZURhdGEoc3RvcmVOYW1lKTtcblx0XHR9O1xuXHRcdGNvbXBvbmVudENvbnRleHQuc2VuZEFjdGlvbiA9IGZ1bmN0aW9uIChuYW1lLCBhcmdzKSB7XG5cdFx0XHRyZXR1cm4gc2VsZi5fc3RvcmVEaXNwYXRjaGVyXG5cdFx0XHRcdC5zZW5kQWN0aW9uKHN0b3JlTmFtZSwgbmFtZSwgYXJncyk7XG5cdFx0fTtcblx0XHRjb21wb25lbnRDb250ZXh0LnNlbmRCcm9hZGNhc3RBY3Rpb24gPSBmdW5jdGlvbiAobmFtZSwgYXJncykge1xuXHRcdFx0cmV0dXJuIHNlbGYuX3N0b3JlRGlzcGF0Y2hlclxuXHRcdFx0XHQuc2VuZEJyb2FkY2FzdEFjdGlvbihuYW1lLCBhcmdzKTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIGNvbXBvbmVudENvbnRleHQ7XG5cdH07XG5cbi8qKlxuICogRmluZHMgYWxsIHJlbmRlcmluZyByb290cyBvbiBwYWdlIGZvciBhbGwgY2hhbmdlZCBzdG9yZXMuXG4gKiBAcGFyYW0ge0FycmF5fSBjaGFuZ2VkU3RvcmVOYW1lcyBMaXN0IG9mIHN0b3JlIG5hbWVzIHdoaWNoIGhhcyBiZWVuIGNoYW5nZWQuXG4gKiBAcmV0dXJucyB7QXJyYXk8RWxlbWVudD59IEhUTUwgZWxlbWVudHMgdGhhdCBhcmUgcmVuZGVyaW5nIHJvb3RzLlxuICogQHByaXZhdGVcbiAqL1xuRG9jdW1lbnRSZW5kZXJlci5wcm90b3R5cGUuX2ZpbmRSZW5kZXJpbmdSb290cyA9IGZ1bmN0aW9uIChjaGFuZ2VkU3RvcmVOYW1lcykge1xuXHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0aGVhZFN0b3JlID0gdGhpcy5fd2luZG93LmRvY3VtZW50LmhlYWQuZ2V0QXR0cmlidXRlKFxuXHRcdFx0bW9kdWxlSGVscGVyLkFUVFJJQlVURV9TVE9SRVxuXHRcdCksXG5cdFx0Y29tcG9uZW50cyA9IHRoaXMuX2NvbXBvbmVudExvYWRlci5nZXRDb21wb25lbnRzQnlOYW1lcygpLFxuXHRcdGNvbXBvbmVudHNFbGVtZW50cyA9IHt9LFxuXHRcdHN0b3JlTmFtZXNTZXQgPSB7fSxcblx0XHRyb290c1NldCA9IHt9LFxuXHRcdHJvb3RzID0gW107XG5cblx0Ly8gd2Ugc2hvdWxkIGZpbmQgYWxsIGNvbXBvbmVudHMgYW5kIHRoZW4gbG9va2luZyBmb3Igcm9vdHNcblx0Y2hhbmdlZFN0b3JlTmFtZXNcblx0XHQuZm9yRWFjaChmdW5jdGlvbiAoc3RvcmVOYW1lKSB7XG5cdFx0XHRzdG9yZU5hbWVzU2V0W3N0b3JlTmFtZV0gPSB0cnVlO1xuXHRcdFx0Y29tcG9uZW50c0VsZW1lbnRzW3N0b3JlTmFtZV0gPSBzZWxmLl93aW5kb3cuZG9jdW1lbnRcblx0XHRcdFx0LnF1ZXJ5U2VsZWN0b3JBbGwoXG5cdFx0XHRcdFx0J1snICtcblx0XHRcdFx0XHRtb2R1bGVIZWxwZXIuQVRUUklCVVRFX0lEICtcblx0XHRcdFx0XHQnXScgK1xuXHRcdFx0XHRcdCdbJyArXG5cdFx0XHRcdFx0bW9kdWxlSGVscGVyLkFUVFJJQlVURV9TVE9SRSArXG5cdFx0XHRcdFx0Jz1cIicgK1xuXHRcdFx0XHRcdHN0b3JlTmFtZSArXG5cdFx0XHRcdFx0J1wiXSdcblx0XHRcdFx0KTtcblx0XHR9KTtcblxuXHRpZiAoY29tcG9uZW50cy5oYXNPd25Qcm9wZXJ0eShtb2R1bGVIZWxwZXIuSEVBRF9DT01QT05FTlRfTkFNRSkgJiZcblx0XHRzdG9yZU5hbWVzU2V0Lmhhc093blByb3BlcnR5KGhlYWRTdG9yZSkpIHtcblx0XHRyb290c1NldFtnZXRJZCh0aGlzLl93aW5kb3cuZG9jdW1lbnQuaGVhZCldID0gdHJ1ZTtcblx0XHRyb290cy5wdXNoKHRoaXMuX3dpbmRvdy5kb2N1bWVudC5oZWFkKTtcblx0fVxuXHRjaGFuZ2VkU3RvcmVOYW1lc1xuXHRcdC5mb3JFYWNoKGZ1bmN0aW9uIChzdG9yZU5hbWUpIHtcblx0XHRcdHZhciBjdXJyZW50LCBjdXJyZW50SWQsXG5cdFx0XHRcdGxhc3RSb290LCBsYXN0Um9vdElkLFxuXHRcdFx0XHRjdXJyZW50U3RvcmUsIGN1cnJlbnRDb21wb25lbnROYW1lO1xuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBvbmVudHNFbGVtZW50c1tzdG9yZU5hbWVdLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGN1cnJlbnQgPSBjb21wb25lbnRzRWxlbWVudHNbc3RvcmVOYW1lXVtpXTtcblx0XHRcdFx0Y3VycmVudElkID0gY29tcG9uZW50c0VsZW1lbnRzW3N0b3JlTmFtZV1baV1cblx0XHRcdFx0XHQuZ2V0QXR0cmlidXRlKG1vZHVsZUhlbHBlci5BVFRSSUJVVEVfSUQpO1xuXHRcdFx0XHRsYXN0Um9vdCA9IGN1cnJlbnQ7XG5cdFx0XHRcdGxhc3RSb290SWQgPSBjdXJyZW50SWQ7XG5cdFx0XHRcdGN1cnJlbnRDb21wb25lbnROYW1lID0gbW9kdWxlSGVscGVyLmdldE9yaWdpbmFsQ29tcG9uZW50TmFtZShcblx0XHRcdFx0XHRjdXJyZW50LnRhZ05hbWVcblx0XHRcdFx0KTtcblxuXHRcdFx0XHR3aGlsZSAoY3VycmVudC50YWdOYW1lICE9PSBUQUdfTkFNRVMuSFRNTCkge1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LnBhcmVudE5vZGU7XG5cdFx0XHRcdFx0Y3VycmVudElkID0gZ2V0SWQoY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudFN0b3JlID0gY3VycmVudC5nZXRBdHRyaWJ1dGUoXG5cdFx0XHRcdFx0XHRtb2R1bGVIZWxwZXIuQVRUUklCVVRFX1NUT1JFXG5cdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdC8vIHN0b3JlIGRpZCBub3QgY2hhbmdlIHN0YXRlXG5cdFx0XHRcdFx0aWYgKCFjdXJyZW50U3RvcmUgfHxcblx0XHRcdFx0XHRcdCFzdG9yZU5hbWVzU2V0Lmhhc093blByb3BlcnR5KGN1cnJlbnRTdG9yZSkpIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vLy8gaXMgbm90IGFuIGFjdGl2ZSBjb21wb25lbnRcblx0XHRcdFx0XHRpZiAoIWNvbXBvbmVudHMuaGFzT3duUHJvcGVydHkoY3VycmVudENvbXBvbmVudE5hbWUpKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRsYXN0Um9vdCA9IGN1cnJlbnQ7XG5cdFx0XHRcdFx0bGFzdFJvb3RJZCA9IGN1cnJlbnRJZDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocm9vdHNTZXQuaGFzT3duUHJvcGVydHkobGFzdFJvb3RJZCkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyb290c1NldFtsYXN0Um9vdElkXSA9IHRydWU7XG5cdFx0XHRcdHJvb3RzLnB1c2gobGFzdFJvb3QpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdHJldHVybiByb290cztcbn07XG5cbi8qKlxuICogQ3JlYXRlcyByZW5kZXJpbmcgY29udGV4dC5cbiAqIEBwYXJhbSB7QXJyYXk/fSBjaGFuZ2VkU3RvcmVzIE5hbWVzIG9mIGNoYW5nZWQgc3RvcmVzLlxuICogQHJldHVybnMge3tcbiAqICAgY29uZmlnOiBPYmplY3QsXG4gKiAgIHJlbmRlcmVkSWRzOiB7fSxcbiAqICAgdW5ib3VuZElkczoge30sXG4gKiAgIGlzSGVhZFJlbmRlcmVkOiBCb29sZWFuLFxuICogICBiaW5kTWV0aG9kczogQXJyYXksXG4gKiAgIHJvdXRpbmdDb250ZXh0OiBPYmplY3QsXG4gKiAgIGNvbXBvbmVudHM6IE9iamVjdCxcbiAqICAgY29tcG9uZW50VGFnczogQXJyYXksXG4gKiAgIHJvb3RzOiBBcnJheS48RWxlbWVudD5cbiAqIH19XG4gKiBAcHJpdmF0ZVxuICovXG5Eb2N1bWVudFJlbmRlcmVyLnByb3RvdHlwZS5fY3JlYXRlUmVuZGVyaW5nQ29udGV4dCA9IGZ1bmN0aW9uIChjaGFuZ2VkU3RvcmVzKSB7XG5cdHZhciBjb21wb25lbnRzID0gdGhpcy5fY29tcG9uZW50TG9hZGVyLmdldENvbXBvbmVudHNCeU5hbWVzKCksXG5cdFx0Y29tcG9uZW50VGFncyA9IE9iamVjdC5rZXlzKGNvbXBvbmVudHMpXG5cdFx0XHQubWFwKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRcdHJldHVybiBtb2R1bGVIZWxwZXIuZ2V0VGFnTmFtZUZvckNvbXBvbmVudE5hbWUobmFtZSk7XG5cdFx0XHR9KTtcblx0cmV0dXJuIHtcblx0XHRjb25maWc6IHRoaXMuX2NvbmZpZyxcblx0XHRyZW5kZXJlZElkczoge30sXG5cdFx0dW5ib3VuZElkczoge30sXG5cdFx0aXNIZWFkUmVuZGVyZWQ6IGZhbHNlLFxuXHRcdGJpbmRNZXRob2RzOiBbXSxcblx0XHRyb3V0aW5nQ29udGV4dDogdGhpcy5fY3VycmVudFJvdXRpbmdDb250ZXh0LFxuXHRcdGNvbXBvbmVudHM6IGNvbXBvbmVudHMsXG5cdFx0Y29tcG9uZW50VGFnczogY29tcG9uZW50VGFncyxcblx0XHRyb290czogY2hhbmdlZFN0b3JlcyA/IHRoaXMuX2ZpbmRSZW5kZXJpbmdSb290cyhjaGFuZ2VkU3RvcmVzKSA6IFtdXG5cdH07XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIE5hbWVkTm9kZU1hcCBvZiBBdHRyIGl0ZW1zIHRvIGtleS12YWx1ZSBvYmplY3QgbWFwLlxuICogQHBhcmFtIHtOYW1lZE5vZGVNYXB9IGF0dHJpYnV0ZXMgTGlzdCBvZiBFbGVtZW50IGF0dHJpYnV0ZXMuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBNYXAgb2YgYXR0cmlidXRlIHZhbHVlcyBieSBuYW1lcy5cbiAqL1xuZnVuY3Rpb24gYXR0cmlidXRlc1RvT2JqZWN0KGF0dHJpYnV0ZXMpIHtcblx0dmFyIHJlc3VsdCA9IHt9O1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcblx0XHRyZXN1bHRbYXR0cmlidXRlc1tpXS5uYW1lXSA9IGF0dHJpYnV0ZXNbaV0udmFsdWU7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBHZXRzIElEIG9mIHRoZSBlbGVtZW50LlxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IEhUTUwgZWxlbWVudCBvZiBjb21wb25lbnQuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBJRC5cbiAqL1xuZnVuY3Rpb24gZ2V0SWQoZWxlbWVudCkge1xuXHRyZXR1cm4gZWxlbWVudC50YWdOYW1lID09PSBUQUdfTkFNRVMuSEVBRCA/XG5cdFx0SEVBRF9JRCA6XG5cdFx0ZWxlbWVudC5nZXRBdHRyaWJ1dGUobW9kdWxlSGVscGVyLkFUVFJJQlVURV9JRCk7XG59XG5cbi8qKlxuICogR2V0cyBjcm9zcy1icm93c2VyIFwibWF0Y2hlc1wiIG1ldGhvZCBmb3IgdGhlIGVsZW1lbnQuXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgSFRNTCBlbGVtZW50LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBcIm1hdGNoZXNcIiBtZXRob2QuXG4gKi9cbmZ1bmN0aW9uIGdldE1hdGNoZXNNZXRob2QoZWxlbWVudCkge1xuXHR2YXIgbWV0aG9kID0gIChlbGVtZW50Lm1hdGNoZXMgfHxcblx0XHRlbGVtZW50LndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fFxuXHRcdGVsZW1lbnQubW96TWF0Y2hlc1NlbGVjdG9yIHx8XG5cdFx0ZWxlbWVudC5vTWF0Y2hlc1NlbGVjdG9yIHx8XG5cdFx0ZWxlbWVudC5tc01hdGNoZXNTZWxlY3Rvcik7XG5cblx0cmV0dXJuIG1ldGhvZC5iaW5kKGVsZW1lbnQpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgaW1pdGF0aW9uIG9mIG9yaWdpbmFsIEV2ZW50IG9iamVjdCBidXQgd2l0aCBzcGVjaWZpZWQgY3VycmVudFRhcmdldC5cbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IE9yaWdpbmFsIGV2ZW50IG9iamVjdC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGN1cnJlbnRUYXJnZXRHZXR0ZXIgR2V0dGVyIGZvciBjdXJyZW50VGFyZ2V0LlxuICogQHJldHVybnMge0V2ZW50fSBXcmFwcGVkIGV2ZW50LlxuICovXG5mdW5jdGlvbiBjcmVhdGVDdXN0b21FdmVudChldmVudCwgY3VycmVudFRhcmdldEdldHRlcikge1xuXHR2YXIgY2F0RXZlbnQgPSBPYmplY3QuY3JlYXRlKGV2ZW50KSxcblx0XHRrZXlzID0gW10sXG5cdFx0cHJvcGVydGllcyA9IHt9O1xuXHRmb3IodmFyIGtleSBpbiBldmVudCkge1xuXHRcdGtleXMucHVzaChrZXkpO1xuXHR9XG5cdGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0aWYgKHR5cGVvZihldmVudFtrZXldKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cHJvcGVydGllc1trZXldID0ge1xuXHRcdFx0XHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZXZlbnRba2V5XS5iaW5kKGV2ZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRwcm9wZXJ0aWVzW2tleV0gPSB7XG5cdFx0XHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGV2ZW50W2tleV07XG5cdFx0XHR9LFxuXHRcdFx0c2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdFx0ZXZlbnRba2V5XSA9IHZhbHVlO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xuXG5cdHByb3BlcnRpZXMuY3VycmVudFRhcmdldCA9IHtcblx0XHRnZXQ6IGN1cnJlbnRUYXJnZXRHZXR0ZXJcblx0fTtcblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoY2F0RXZlbnQsIHByb3BlcnRpZXMpO1xuXHRPYmplY3Quc2VhbChjYXRFdmVudCk7XG5cdE9iamVjdC5mcmVlemUoY2F0RXZlbnQpO1xuXHRyZXR1cm4gY2F0RXZlbnQ7XG59IiwiLypcbiAqIGNhdGJlcnJ5XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnkncyBsaWNlbnNlIGZvbGxvd3M6XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAqIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uXG4gKiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICogcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAqIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gKiBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuICogaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuICogT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKlxuICogVGhpcyBsaWNlbnNlIGFwcGxpZXMgdG8gYWxsIHBhcnRzIG9mIGNhdGJlcnJ5IHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gTG9nZ2VyO1xuXG52YXIgTEVWRUxTID0ge1xuXHRUUkFDRTogJ3RyYWNlJyxcblx0SU5GTzogJ2luZm8nLFxuXHRXQVJOOiAnd2FybicsXG5cdEVSUk9SOiAnZXJyb3InLFxuXHRGQVRBTDogJ2ZhdGFsJ1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGJyb3dzZXIgbG9nZ2VyLlxuICogQHBhcmFtIHtPYmplY3R8c3RyaW5nfSBsZXZlbHMgTGV2ZWxzIHRvIGxvZy5cbiAqIEBzdXBwb3J0ZWQgQ2hyb21lLCBGaXJlZm94Pj0yLjAsIEludGVybmV0IEV4cGxvcmVyPj04LCBPcGVyYSwgU2FmYXJpLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIExvZ2dlcihsZXZlbHMpIHtcblx0aWYgKHR5cGVvZiAobGV2ZWxzKSA9PT0gJ29iamVjdCcpIHtcblx0XHR0aGlzLl9sZXZlbHMgPSBsZXZlbHM7XG5cdH1cblxuXHRpZiAodHlwZW9mKGxldmVscykgPT09ICdzdHJpbmcnKSB7XG5cdFx0dGhpcy5fbGV2ZWxzID0ge307XG5cdFx0T2JqZWN0LmtleXMoTEVWRUxTKVxuXHRcdFx0LmZvckVhY2goZnVuY3Rpb24gKGxldmVsKSB7XG5cdFx0XHRcdHRoaXMuX2xldmVsc1tMRVZFTFNbbGV2ZWxdXSA9XG5cdFx0XHRcdFx0KGxldmVscy5zZWFyY2goTEVWRUxTW2xldmVsXSkgIT09IC0xKTtcblx0XHRcdH0sIHRoaXMpO1xuXHR9XG5cblx0dGhpcy50cmFjZSA9IHRoaXMudHJhY2UuYmluZCh0aGlzKTtcblx0dGhpcy5pbmZvID0gdGhpcy5pbmZvLmJpbmQodGhpcyk7XG5cdHRoaXMud2FybiA9IHRoaXMud2Fybi5iaW5kKHRoaXMpO1xuXHR0aGlzLmVycm9yID0gdGhpcy5lcnJvci5iaW5kKHRoaXMpO1xuXHR0aGlzLmZhdGFsID0gdGhpcy5mYXRhbC5iaW5kKHRoaXMpO1xufVxuXG4vKipcbiAqIEN1cnJlbnQgbGV2ZWxzIG9mIGxvZ2dpbmcuXG4gKiBAdHlwZSB7T2JqZWN0fVxuICogQHByaXZhdGVcbiAqL1xuTG9nZ2VyLnByb3RvdHlwZS5fbGV2ZWxzID0ge1xuXHR0cmFjZTogdHJ1ZSxcblx0aW5mbzogdHJ1ZSxcblx0d2FybjogdHJ1ZSxcblx0ZXJyb3I6IHRydWUsXG5cdGZhdGFsOiB0cnVlXG59O1xuXG4vKipcbiAqIExvZ3MgdHJhY2UgbWVzc2FnZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRyYWNlIG1lc3NhZ2UuXG4gKi9cbkxvZ2dlci5wcm90b3R5cGUudHJhY2UgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuXHRpZiAoIXRoaXMuX2xldmVscy50cmFjZSkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmIChjb25zb2xlLmxvZykge1xuXHRcdGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuXHR9XG59O1xuXG4vKipcbiAqIExvZ3MgaW5mbyBtZXNzYWdlLlxuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgSW5mb3JtYXRpb24gbWVzc2FnZS5cbiAqL1xuTG9nZ2VyLnByb3RvdHlwZS5pbmZvID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcblx0aWYgKCF0aGlzLl9sZXZlbHMuaW5mbykge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmIChjb25zb2xlLmluZm8pIHtcblx0XHRjb25zb2xlLmluZm8obWVzc2FnZSk7XG5cdH1cbn07XG5cbi8qKlxuICogTG9ncyB3YXJuIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBXYXJuaW5nIG1lc3NhZ2UuXG4gKi9cbkxvZ2dlci5wcm90b3R5cGUud2FybiA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG5cdGlmICghdGhpcy5fbGV2ZWxzLndhcm4pIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoY29uc29sZS53YXJuKSB7XG5cdFx0Y29uc29sZS53YXJuKG1lc3NhZ2UpO1xuXHR9XG59O1xuLyoqXG4gKiBMb2dzIGVycm9yIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge3N0cmluZ3xFcnJvcn0gZXJyb3IgRXJyb3Igb2JqZWN0IG9yIG1lc3NhZ2UuXG4gKi9cbkxvZ2dlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcblx0aWYgKCF0aGlzLl9sZXZlbHMuZXJyb3IpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR3cml0ZUVycm9yKGVycm9yKTtcbn07XG5cbi8qKlxuICogTG9ncyBlcnJvciBtZXNzYWdlLlxuICogQHBhcmFtIHtzdHJpbmd8RXJyb3J9IGVycm9yIEVycm9yIG9iamVjdCBvciBtZXNzYWdlLlxuICovXG5Mb2dnZXIucHJvdG90eXBlLmZhdGFsID0gZnVuY3Rpb24gKGVycm9yKSB7XG5cdGlmICghdGhpcy5fbGV2ZWxzLmZhdGFsKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHdyaXRlRXJyb3IoZXJyb3IpO1xufTtcblxuLyoqXG4gKiBXcml0ZXMgZXJyb3IgdG8gY29uc29sZS5cbiAqIEBwYXJhbSB7RXJyb3J8c3RyaW5nfSBlcnJvciBFcnJvciB0byB3cml0ZS5cbiAqL1xuZnVuY3Rpb24gd3JpdGVFcnJvcihlcnJvcikge1xuXHR0cnkge1xuXHRcdGlmICghKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpKSB7XG5cdFx0XHRlcnJvciA9IHR5cGVvZihlcnJvcikgPT09ICdzdHJpbmcnID8gbmV3IEVycm9yKGVycm9yKSA6IG5ldyBFcnJvcigpO1xuXHRcdH1cblx0XHRpZiAoY29uc29sZS5lcnJvcikge1xuXHRcdFx0Y29uc29sZS5lcnJvcihlcnJvcik7XG5cdFx0fVxuXHR9IGNhdGNoIChlKSB7XG5cdFx0d3JpdGVFcnJvcihlKTtcblx0fVxufSIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3RSb3V0ZXI7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpLFxuXHRVUkkgPSByZXF1aXJlKCdjYXRiZXJyeS11cmknKS5VUkk7XG5cbnZhciBNT1VTRV9LRVlTID0ge1xuXHRcdExFRlQ6IDAsXG5cdFx0TUlERExFOiAxXG5cdH0sXG5cblx0SFJFRl9BVFRSSUJVVEVfTkFNRSA9ICdocmVmJyxcblx0VEFSR0VUX0FUVFJJQlVURV9OQU1FID0gJ3RhcmdldCcsXG5cdEFfVEFHX05BTUUgPSAnQScsXG5cdEJPRFlfVEFHX05BTUUgPSAnQk9EWSc7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIGJyb3dzZXIgcmVxdWVzdCByb3V0ZXIuXG4gKiBAcGFyYW0ge1NlcnZpY2VMb2NhdG9yfSAkc2VydmljZUxvY2F0b3IgU2VydmljZSBsb2NhdG9yIHRvIHJlc29sdmUgc2VydmljZXMuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUmVxdWVzdFJvdXRlcigkc2VydmljZUxvY2F0b3IpIHtcblx0dGhpcy5fZXZlbnRCdXMgPSAkc2VydmljZUxvY2F0b3IucmVzb2x2ZSgnZXZlbnRCdXMnKTtcblx0dGhpcy5fd2luZG93ID0gJHNlcnZpY2VMb2NhdG9yLnJlc29sdmUoJ3dpbmRvdycpO1xuXHR0aGlzLl9kb2N1bWVudFJlbmRlcmVyID0gJHNlcnZpY2VMb2NhdG9yLnJlc29sdmUoJ2RvY3VtZW50UmVuZGVyZXInKTtcblx0dGhpcy5fc3RhdGVQcm92aWRlciA9ICRzZXJ2aWNlTG9jYXRvci5yZXNvbHZlKCdzdGF0ZVByb3ZpZGVyJyk7XG5cdHRoaXMuX2NvbnRleHRGYWN0b3J5ID0gJHNlcnZpY2VMb2NhdG9yLnJlc29sdmUoJ2NvbnRleHRGYWN0b3J5Jyk7XG5cblx0dGhpcy5faXNIaXN0b3J5U3VwcG9ydGVkID0gdGhpcy5fd2luZG93Lmhpc3RvcnkgJiZcblx0XHR0aGlzLl93aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUgaW5zdGFuY2VvZiBGdW5jdGlvbjtcblx0dGhpcy5fd3JhcERvY3VtZW50KCk7XG5cdHZhciBzZWxmID0gdGhpcztcblx0dGhpcy5fY2hhbmdlU3RhdGUobmV3IFVSSSh0aGlzLl93aW5kb3cubG9jYXRpb24udG9TdHJpbmcoKSkpXG5cdFx0LnRoZW4oZnVuY3Rpb24gKCkge1xuXHRcdFx0c2VsZi5fZXZlbnRCdXMuZW1pdCgncmVhZHknKTtcblx0XHR9KTtcbn1cblxuLyoqXG4gKiBDdXJyZW50IHJlZmVycmVyLlxuICogQHR5cGUge1VSSX1cbiAqIEBwcml2YXRlXG4gKi9cblJlcXVlc3RSb3V0ZXIucHJvdG90eXBlLl9yZWZlcnJlciA9ICcnO1xuXG4vKipcbiAqIEN1cnJlbnQgbG9jYXRpb24uXG4gKiBAdHlwZSB7VVJJfVxuICogQHByaXZhdGVcbiAqL1xuUmVxdWVzdFJvdXRlci5wcm90b3R5cGUuX2xvY2F0aW9uID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IGV2ZW50IGJ1cy5cbiAqIEB0eXBlIHtFdmVudEVtaXR0ZXJ9XG4gKiBAcHJpdmF0ZVxuICovXG5SZXF1ZXN0Um91dGVyLnByb3RvdHlwZS5fZXZlbnRCdXMgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgY29udGV4dCBmYWN0b3J5LlxuICogQHR5cGUge0NvbnRleHRGYWN0b3J5fVxuICogQHByaXZhdGVcbiAqL1xuUmVxdWVzdFJvdXRlci5wcm90b3R5cGUuX2NvbnRleHRGYWN0b3J5ID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHN0YXRlIHByb3ZpZGVyLlxuICogQHR5cGUge1N0YXRlUHJvdmlkZXJ9XG4gKiBAcHJpdmF0ZVxuICovXG5SZXF1ZXN0Um91dGVyLnByb3RvdHlwZS5fc3RhdGVQcm92aWRlciA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBkb2N1bWVudCByZW5kZXJlci5cbiAqIEB0eXBlIHtEb2N1bWVudFJlbmRlcmVyfVxuICogQHByaXZhdGVcbiAqL1xuUmVxdWVzdFJvdXRlci5wcm90b3R5cGUuX2RvY3VtZW50UmVuZGVyZXIgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgYnJvd3NlciB3aW5kb3cuXG4gKiBAdHlwZSB7V2luZG93fVxuICogQHByaXZhdGVcbiAqL1xuUmVxdWVzdFJvdXRlci5wcm90b3R5cGUuX3dpbmRvdyA9IG51bGw7XG5cbi8qKlxuICogVHJ1ZSBpZiBjdXJyZW50IGJyb3dzZXIgc3VwcG9ydHMgaGlzdG9yeSBBUEkuXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqIEBwcml2YXRlXG4gKi9cblJlcXVlc3RSb3V0ZXIucHJvdG90eXBlLl9pc0hpc3RvcnlTdXBwb3J0ZWQgPSBmYWxzZTtcblxuLyoqXG4gKiBSb3V0ZXMgYnJvd3NlciByZW5kZXIgcmVxdWVzdC5cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIGZvciBub3RoaW5nLlxuICovXG5SZXF1ZXN0Um91dGVyLnByb3RvdHlwZS5yb3V0ZSA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHQvLyBiZWNhdXNlIG5vdyBsb2NhdGlvbiB3YXMgbm90IGNoYW5nZSB5ZXQgYW5kXG5cdC8vIGRpZmZlcmVudCBicm93c2VycyBoYW5kbGUgYHBvcHN0YXRlYCBkaWZmZXJlbnRseVxuXHQvLyB3ZSBuZWVkIHRvIGRvIHJvdXRlIGluIG5leHQgaXRlcmF0aW9uIG9mIGV2ZW50IGxvb3Bcblx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChmdWxmaWxsLCByZWplY3QpIHtcblx0XHR2YXIgbmV3TG9jYXRpb24gPSBuZXcgVVJJKHNlbGYuX3dpbmRvdy5sb2NhdGlvbi50b1N0cmluZygpKSxcblx0XHRcdG5ld0F1dGhvcml0eSA9IG5ld0xvY2F0aW9uLmF1dGhvcml0eSA/XG5cdFx0XHRcdG5ld0xvY2F0aW9uLmF1dGhvcml0eS50b1N0cmluZygpIDogbnVsbCxcblx0XHRcdGN1cnJlbnRBdXRob3JpdHkgPSBzZWxmLl9sb2NhdGlvbi5hdXRob3JpdHkgP1xuXHRcdFx0XHRzZWxmLl9sb2NhdGlvbi5hdXRob3JpdHkudG9TdHJpbmcoKSA6IG51bGw7XG5cblx0XHRpZiAobmV3TG9jYXRpb24uc2NoZW1lICE9PSBzZWxmLl9sb2NhdGlvbi5zY2hlbWUgfHxcblx0XHRcdG5ld0F1dGhvcml0eSAhPT0gY3VycmVudEF1dGhvcml0eSkge1xuXHRcdFx0ZnVsZmlsbCgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIGlmIG9ubHkgVVJJIGZyYWdtZW50IGlzIGNoYW5nZWRcblx0XHR2YXIgbmV3UXVlcnkgPSBuZXdMb2NhdGlvbi5xdWVyeSA/XG5cdFx0XHRuZXdMb2NhdGlvbi5xdWVyeS50b1N0cmluZygpIDogbnVsbCxcblx0XHRcdGN1cnJlbnRRdWVyeSA9IHNlbGYuX2xvY2F0aW9uLnF1ZXJ5ID9cblx0XHRcdFx0c2VsZi5fbG9jYXRpb24ucXVlcnkudG9TdHJpbmcoKSA6IG51bGw7XG5cdFx0aWYgKG5ld0xvY2F0aW9uLnBhdGggPT09IHNlbGYuX2xvY2F0aW9uLnBhdGggJiZcblx0XHRcdG5ld1F1ZXJ5ID09PSBjdXJyZW50UXVlcnkpIHtcblx0XHRcdHNlbGYuX2xvY2F0aW9uID0gbmV3TG9jYXRpb247XG5cdFx0XHRmdWxmaWxsKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c2VsZi5fY2hhbmdlU3RhdGUobmV3TG9jYXRpb24pXG5cdFx0XHQudGhlbihmdWxmaWxsKVxuXHRcdFx0LmNhdGNoKHJlamVjdCk7XG5cdH0pO1xufTtcblxuLyoqXG4gKiBTZXRzIGFwcGxpY2F0aW9uIHN0YXRlIHRvIHNwZWNpZmllZCBVUkkuXG4gKiBAcGFyYW0ge3N0cmluZ30gbG9jYXRpb25TdHJpbmcgVVJJIHRvIGdvLlxuICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgZm9yIG5vdGhpbmcuXG4gKi9cblJlcXVlc3RSb3V0ZXIucHJvdG90eXBlLmdvID0gZnVuY3Rpb24gKGxvY2F0aW9uU3RyaW5nKSB7XG5cdHZhciBsb2NhdGlvbiA9IG5ldyBVUkkobG9jYXRpb25TdHJpbmcpO1xuXHRsb2NhdGlvbiA9IGxvY2F0aW9uLnJlc29sdmVSZWxhdGl2ZSh0aGlzLl9sb2NhdGlvbik7XG5cdGxvY2F0aW9uU3RyaW5nID0gbG9jYXRpb24udG9TdHJpbmcoKTtcblxuXHR2YXIgY3VycmVudEF1dGhvcml0eSA9IHRoaXMuX2xvY2F0aW9uLmF1dGhvcml0eSA/XG5cdFx0XHR0aGlzLl9sb2NhdGlvbi5hdXRob3JpdHkudG9TdHJpbmcoKSA6IG51bGwsXG5cdFx0bmV3QXV0aG9yaXR5ID0gbG9jYXRpb24uYXV0aG9yaXR5ID9cblx0XHRcdGxvY2F0aW9uLmF1dGhvcml0eS50b1N0cmluZygpIDogbnVsbDtcblx0Ly8gd2UgbXVzdCBjaGVjayBpZiB0aGlzIGlzIGFuIGV4dGVybmFsIGxpbmsgYmVmb3JlIG1hcCBVUklcblx0Ly8gdG8gaW50ZXJuYWwgYXBwbGljYXRpb24gc3RhdGVcblx0aWYgKCF0aGlzLl9pc0hpc3RvcnlTdXBwb3J0ZWQgfHxcblx0XHRsb2NhdGlvbi5zY2hlbWUgIT09IHRoaXMuX2xvY2F0aW9uLnNjaGVtZSB8fFxuXHRcdG5ld0F1dGhvcml0eSAhPT0gY3VycmVudEF1dGhvcml0eSkge1xuXHRcdHRoaXMuX3dpbmRvdy5sb2NhdGlvbi5hc3NpZ24obG9jYXRpb25TdHJpbmcpO1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0fVxuXG5cdHZhciBzdGF0ZSA9IHRoaXMuX3N0YXRlUHJvdmlkZXIuZ2V0U3RhdGVCeVVyaShsb2NhdGlvbik7XG5cdGlmICghc3RhdGUpIHtcblx0XHR0aGlzLl93aW5kb3cubG9jYXRpb24uYXNzaWduKGxvY2F0aW9uU3RyaW5nKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHR0aGlzLl93aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoc3RhdGUsICcnLCBsb2NhdGlvblN0cmluZyk7XG5cdHJldHVybiB0aGlzLnJvdXRlKCk7XG59O1xuXG4vKipcbiAqIENoYW5nZXMgY3VycmVudCBhcHBsaWNhdGlvbiBzdGF0ZSB3aXRoIG5ldyBsb2NhdGlvbi5cbiAqIEBwYXJhbSB7VVJJfSBuZXdMb2NhdGlvbiBOZXcgbG9jYXRpb24uXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSBmb3Igbm90aGluZy5cbiAqIEBwcml2YXRlXG4gKi9cblJlcXVlc3RSb3V0ZXIucHJvdG90eXBlLl9jaGFuZ2VTdGF0ZSA9IGZ1bmN0aW9uIChuZXdMb2NhdGlvbikge1xuXHR0aGlzLl9sb2NhdGlvbiA9IG5ld0xvY2F0aW9uO1xuXHR2YXIgc3RhdGUgPSB0aGlzLl9zdGF0ZVByb3ZpZGVyLmdldFN0YXRlQnlVcmkobmV3TG9jYXRpb24pLFxuXHRcdHJvdXRpbmdDb250ZXh0ID0gdGhpcy5fY29udGV4dEZhY3RvcnkuY3JlYXRlKHtcblx0XHRcdHJlZmVycmVyOiB0aGlzLl9yZWZlcnJlciB8fCB0aGlzLl93aW5kb3cuZG9jdW1lbnQucmVmZXJyZXIsXG5cdFx0XHRsb2NhdGlvbjogdGhpcy5fbG9jYXRpb24sXG5cdFx0XHR1c2VyQWdlbnQ6IHRoaXMuX3dpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50XG5cdFx0fSk7XG5cblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRyZXR1cm4gdGhpcy5fZG9jdW1lbnRSZW5kZXJlclxuXHRcdC5yZW5kZXIoc3RhdGUsIHJvdXRpbmdDb250ZXh0KVxuXHRcdC50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcdHNlbGYuX3JlZmVycmVyID0gc2VsZi5fbG9jYXRpb247XG5cdFx0fSk7XG59O1xuXG4vKipcbiAqIFdyYXBzIGRvY3VtZW50IHdpdGggcmVxdWlyZWQgZXZlbnRzIHRvIHJvdXRlIHJlcXVlc3RzLlxuICogQHByaXZhdGVcbiAqL1xuUmVxdWVzdFJvdXRlci5wcm90b3R5cGUuX3dyYXBEb2N1bWVudCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdGlmICghdGhpcy5faXNIaXN0b3J5U3VwcG9ydGVkKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYucm91dGUoKS5jYXRjaChzZWxmLl9oYW5kbGVFcnJvci5iaW5kKHNlbGYpKTtcblx0fSk7XG5cblx0dGhpcy5fd2luZG93LmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRpZiAoZXZlbnQudGFyZ2V0LnRhZ05hbWUgPT09IEFfVEFHX05BTUUpIHtcblx0XHRcdHNlbGYuX2xpbmtDbGlja0hhbmRsZXIoZXZlbnQsIGV2ZW50LnRhcmdldClcblx0XHRcdFx0LmNhdGNoKHNlbGYuX2hhbmRsZUVycm9yLmJpbmQoc2VsZikpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgbGluayA9IGNsb3Nlc3RMaW5rKGV2ZW50LnRhcmdldCk7XG5cdFx0XHRpZiAoIWxpbmspIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0c2VsZi5fbGlua0NsaWNrSGFuZGxlcihldmVudCwgbGluaylcblx0XHRcdFx0LmNhdGNoKHNlbGYuX2hhbmRsZUVycm9yLmJpbmQoc2VsZikpO1xuXHRcdH1cblx0fSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgbGluayBjbGljayBvbiB0aGUgcGFnZS5cbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IEV2ZW50LXJlbGF0ZWQgb2JqZWN0LlxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IExpbmsgZWxlbWVudC5cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIGZvciBub3RoaW5nLlxuICogQHByaXZhdGVcbiAqL1xuUmVxdWVzdFJvdXRlci5wcm90b3R5cGUuX2xpbmtDbGlja0hhbmRsZXIgPSBmdW5jdGlvbiAoZXZlbnQsIGVsZW1lbnQpIHtcblx0dmFyIHRhcmdldEF0dHJpYnV0ZSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFRBUkdFVF9BVFRSSUJVVEVfTkFNRSk7XG5cdGlmICh0YXJnZXRBdHRyaWJ1dGUpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHQvLyBpZiBtaWRkbGUgbW91c2UgYnV0dG9uIHdhcyBjbGlja2VkXG5cdGlmIChldmVudC5idXR0b24gPT09IE1PVVNFX0tFWVMuTUlERExFKSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHR9XG5cblx0dmFyIGxvY2F0aW9uU3RyaW5nID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoSFJFRl9BVFRSSUJVVEVfTkFNRSk7XG5cdGlmICghbG9jYXRpb25TdHJpbmcpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRyZXR1cm4gdGhpcy5nbyhsb2NhdGlvblN0cmluZyk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgYWxsIGVycm9ycy5cbiAqIEBwYXJhbSB7RXJyb3J9IGVycm9yIEVycm9yIHRvIGhhbmRsZS5cbiAqIEBwcml2YXRlXG4gKi9cblJlcXVlc3RSb3V0ZXIucHJvdG90eXBlLl9oYW5kbGVFcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuXHR0aGlzLl9ldmVudEJ1cy5lbWl0KCdlcnJvcicsIGVycm9yKTtcbn07XG5cbi8qKlxuICogRmluZHMgdGhlIGNsb3Nlc3QgYXNjZW5kaW5nIFwiQVwiIGVsZW1lbnQgbm9kZS5cbiAqIEBwYXJhbSB7Tm9kZX0gZWxlbWVudCBET00gZWxlbWVudC5cbiAqIEByZXR1cm5zIHtOb2RlfG51bGx9IFRoZSBjbG9zZXN0IFwiQVwiIGVsZW1lbnQgb3IgbnVsbC5cbiAqL1xuZnVuY3Rpb24gY2xvc2VzdExpbmsoZWxlbWVudCkge1xuXHR3aGlsZShlbGVtZW50Lm5vZGVOYW1lICE9PSBBX1RBR19OQU1FICYmXG5cdFx0ZWxlbWVudC5ub2RlTmFtZSAhPT0gQk9EWV9UQUdfTkFNRSkge1xuXHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cdH1cblx0cmV0dXJuIGVsZW1lbnQubm9kZU5hbWUgPT09IEFfVEFHX05BTUUgPyBlbGVtZW50IDogbnVsbDtcbn0iLCIvKlxuICogY2F0YmVycnlcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRGVuaXMgUmVjaGt1bm92IGFuZCBwcm9qZWN0IGNvbnRyaWJ1dG9ycy5cbiAqXG4gKiBjYXRiZXJyeSdzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnkgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnRMb2FkZXI7XG5cbnZhciBtb2R1bGVIZWxwZXIgPSByZXF1aXJlKCcuLi8uLi9saWIvaGVscGVycy9tb2R1bGVIZWxwZXInKTtcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgY29tcG9uZW50IGxvYWRlci5cbiAqIEBwYXJhbSB7U2VydmljZUxvY2F0b3J9ICRzZXJ2aWNlTG9jYXRvciBMb2NhdG9yIHRvIHJlc29sdmUgZGVwZW5kZW5jaWVzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENvbXBvbmVudExvYWRlcigkc2VydmljZUxvY2F0b3IpIHtcblx0dGhpcy5fc2VydmljZUxvY2F0b3IgPSAkc2VydmljZUxvY2F0b3I7XG5cdHRoaXMuX2NvbnRleHRGYWN0b3J5ID0gJHNlcnZpY2VMb2NhdG9yLnJlc29sdmUoJ2NvbnRleHRGYWN0b3J5Jyk7XG5cdHRoaXMuX2V2ZW50QnVzID0gJHNlcnZpY2VMb2NhdG9yLnJlc29sdmUoJ2V2ZW50QnVzJyk7XG5cdHRoaXMuX3RlbXBsYXRlUHJvdmlkZXIgPSAkc2VydmljZUxvY2F0b3IucmVzb2x2ZSgndGVtcGxhdGVQcm92aWRlcicpO1xufVxuXG4vKipcbiAqIEN1cnJlbnQgY29udGV4dCBmYWN0b3J5LlxuICogQHR5cGUge0NvbnRleHRGYWN0b3J5fVxuICogQHByaXZhdGVcbiAqL1xuQ29tcG9uZW50TG9hZGVyLnByb3RvdHlwZS5fY29udGV4dEZhY3RvcnkgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgZXZlbnQgYnVzLlxuICogQHR5cGUge0V2ZW50RW1pdHRlcn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbXBvbmVudExvYWRlci5wcm90b3R5cGUuX2V2ZW50QnVzID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHNlcnZpY2UgbG9jYXRvci5cbiAqIEB0eXBlIHtTZXJ2aWNlTG9jYXRvcn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbXBvbmVudExvYWRlci5wcm90b3R5cGUuX3NlcnZpY2VMb2NhdG9yID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHRlbXBsYXRlIHByb3ZpZGVyLlxuICogQHR5cGUge1RlbXBsYXRlUHJvdmlkZXJ9XG4gKiBAcHJpdmF0ZVxuICovXG5Db21wb25lbnRMb2FkZXIucHJvdG90eXBlLl90ZW1wbGF0ZVByb3ZpZGVyID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IG1hcCBvZiBsb2FkZWQgY29tcG9uZW50cyBieSBuYW1lcy5cbiAqIEB0eXBlIHtPYmplY3R9IE1hcCBvZiBjb21wb25lbnRzIGJ5IG5hbWVzLlxuICogQHByaXZhdGVcbiAqL1xuQ29tcG9uZW50TG9hZGVyLnByb3RvdHlwZS5fbG9hZGVkQ29tcG9uZW50cyA9IG51bGw7XG5cbi8qKlxuICogTG9hZHMgY29tcG9uZW50cyB3aGVuIGl0IGlzIGluIGEgYnJvd3Nlci5cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIGZvciBub3RoaW5nLlxuICovXG5Db21wb25lbnRMb2FkZXIucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcyxcblx0XHRjb21wb25lbnRzID0ge307XG5cblx0dGhpcy5fc2VydmljZUxvY2F0b3IucmVzb2x2ZUFsbCgnY29tcG9uZW50Jylcblx0XHQuZm9yRWFjaChmdW5jdGlvbiAoY29tcG9uZW50KSB7XG5cdFx0XHR2YXIgY29tcG9uZW50Q29udGV4dCA9IE9iamVjdC5jcmVhdGUoXG5cdFx0XHRcdHNlbGYuX2NvbnRleHRGYWN0b3J5LmNyZWF0ZVN0dWIoKVxuXHRcdFx0KTtcblx0XHRcdGNvbXBvbmVudENvbnRleHQubmFtZSA9IGNvbXBvbmVudC5uYW1lO1xuXHRcdFx0Y29tcG9uZW50LmNvbnN0cnVjdG9yLnByb3RvdHlwZS4kY29udGV4dCA9IGNvbXBvbmVudENvbnRleHQ7XG5cblx0XHRcdGNvbXBvbmVudHNbY29tcG9uZW50Lm5hbWVdID0gT2JqZWN0LmNyZWF0ZShjb21wb25lbnQpO1xuXHRcdFx0c2VsZi5fdGVtcGxhdGVQcm92aWRlci5yZWdpc3RlckNvbXBpbGVkKFxuXHRcdFx0XHRjb21wb25lbnQubmFtZSwgY29tcG9uZW50LnRlbXBsYXRlU291cmNlXG5cdFx0XHQpO1xuXHRcdFx0Y29tcG9uZW50c1tjb21wb25lbnQubmFtZV0udGVtcGxhdGUgPSB7XG5cdFx0XHRcdHJlbmRlcjogZnVuY3Rpb24gKGRhdGFDb250ZXh0KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNlbGYuX3RlbXBsYXRlUHJvdmlkZXIucmVuZGVyKFxuXHRcdFx0XHRcdFx0Y29tcG9uZW50Lm5hbWUsIGRhdGFDb250ZXh0XG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdGlmICh0eXBlb2YoY29tcG9uZW50LmVycm9yVGVtcGxhdGVTb3VyY2UpID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHR2YXIgZXJyb3JUZW1wbGF0ZU5hbWUgPSBtb2R1bGVIZWxwZXIuZ2V0TmFtZUZvckVycm9yVGVtcGxhdGUoXG5cdFx0XHRcdFx0Y29tcG9uZW50Lm5hbWVcblx0XHRcdFx0KTtcblx0XHRcdFx0c2VsZi5fdGVtcGxhdGVQcm92aWRlci5yZWdpc3RlckNvbXBpbGVkKFxuXHRcdFx0XHRcdGVycm9yVGVtcGxhdGVOYW1lLCBjb21wb25lbnQuZXJyb3JUZW1wbGF0ZVNvdXJjZVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb21wb25lbnRzW2NvbXBvbmVudC5uYW1lXS5lcnJvclRlbXBsYXRlID0ge1xuXHRcdFx0XHRcdHJlbmRlcjogZnVuY3Rpb24gKGRhdGFDb250ZXh0KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2VsZi5fdGVtcGxhdGVQcm92aWRlci5yZW5kZXIoXG5cdFx0XHRcdFx0XHRcdGVycm9yVGVtcGxhdGVOYW1lLCBkYXRhQ29udGV4dFxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0XHRzZWxmLl9ldmVudEJ1cy5lbWl0KCdjb21wb25lbnRMb2FkZWQnLCBjb21wb25lbnRzW2NvbXBvbmVudC5uYW1lXSk7XG5cdFx0fSk7XG5cdHRoaXMuX2xvYWRlZENvbXBvbmVudHMgPSBjb21wb25lbnRzO1xuXHR0aGlzLl9ldmVudEJ1cy5lbWl0KCdhbGxDb21wb25lbnRzTG9hZGVkJywgY29tcG9uZW50cyk7XG5cdHJldHVybiBQcm9taXNlLnJlc29sdmUoY29tcG9uZW50cyk7XG59O1xuXG4vKipcbiAqIEdldHMgbWFwIG9mIGNvbXBvbmVudHMgYnkgbmFtZXMuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBNYXAgb2YgY29tcG9uZW50cyBieSBuYW1lcy5cbiAqL1xuQ29tcG9uZW50TG9hZGVyLnByb3RvdHlwZS5nZXRDb21wb25lbnRzQnlOYW1lcyA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuX2xvYWRlZENvbXBvbmVudHMgfHwge307XG59OyIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JlTG9hZGVyO1xuXG4vKipcbiAqIENyZWF0ZXMgaW5zdGFuY2Ugb2YgdGhlIHN0b3JlIGxvYWRlci5cbiAqIEBwYXJhbSB7U2VydmljZUxvY2F0b3J9ICRzZXJ2aWNlTG9jYXRvciBMb2NhdG9yIHRvIHJlc29sdmUgc3RvcmVzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFN0b3JlTG9hZGVyKCRzZXJ2aWNlTG9jYXRvcikge1xuXHR0aGlzLl9zZXJ2aWNlTG9jYXRvciA9ICRzZXJ2aWNlTG9jYXRvcjtcblx0dGhpcy5fZXZlbnRCdXMgPSAkc2VydmljZUxvY2F0b3IucmVzb2x2ZSgnZXZlbnRCdXMnKTtcblx0dGhpcy5fY29udGV4dEZhY3RvcnkgPSAkc2VydmljZUxvY2F0b3IucmVzb2x2ZSgnY29udGV4dEZhY3RvcnknKTtcbn1cblxuLyoqXG4gKiBDdXJyZW50IGNvbnRleHQgZmFjdG9yeS5cbiAqIEB0eXBlIHtDb250ZXh0RmFjdG9yeX1cbiAqIEBwcml2YXRlXG4gKi9cblN0b3JlTG9hZGVyLnByb3RvdHlwZS5fY29udGV4dEZhY3RvcnkgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgZXZlbnQgYnVzLlxuICogQHR5cGUge0V2ZW50RW1pdHRlcn1cbiAqIEBwcml2YXRlXG4gKi9cblN0b3JlTG9hZGVyLnByb3RvdHlwZS5fZXZlbnRCdXMgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgc2VydmljZSBsb2NhdG9yLlxuICogQHR5cGUge1NlcnZpY2VMb2NhdG9yfVxuICogQHByaXZhdGVcbiAqL1xuU3RvcmVMb2FkZXIucHJvdG90eXBlLl9zZXJ2aWNlTG9jYXRvciA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBzZXQgb2YgbG9hZGVkIHN0b3Jlcy5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5TdG9yZUxvYWRlci5wcm90b3R5cGUuX2xvYWRlZFN0b3JlcyA9IG51bGw7XG5cbi8qKlxuICogTG9hZHMgYWxsIHN0b3JlcyB3aGVuIGl0IGlzIGluIGEgYnJvd3Nlci5cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIGZvciBub3RoaW5nLlxuICovXG5TdG9yZUxvYWRlci5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdHN0b3JlcyA9IHt9O1xuXHR0aGlzLl9zZXJ2aWNlTG9jYXRvci5yZXNvbHZlQWxsKCdzdG9yZScpXG5cdFx0LmZvckVhY2goZnVuY3Rpb24gKHN0b3JlKSB7XG5cdFx0XHR2YXIgc3RvcmVDb250ZXh0ID0gT2JqZWN0LmNyZWF0ZShzZWxmLl9jb250ZXh0RmFjdG9yeS5jcmVhdGVTdHViKCkpO1xuXHRcdFx0c3RvcmVDb250ZXh0Lm5hbWUgPSBzdG9yZS5uYW1lO1xuXHRcdFx0c3RvcmUuY29uc3RydWN0b3IucHJvdG90eXBlLiRjb250ZXh0ID0gc3RvcmVDb250ZXh0O1xuXHRcdFx0c3RvcmVzW3N0b3JlLm5hbWVdID0gc3RvcmU7XG5cdFx0XHRzZWxmLl9ldmVudEJ1cy5lbWl0KCdzdG9yZUxvYWRlZCcsIHN0b3Jlc1tzdG9yZS5uYW1lXSk7XG5cdFx0fSk7XG5cdHRoaXMuX2xvYWRlZFN0b3JlcyA9IHN0b3Jlcztcblx0dGhpcy5fZXZlbnRCdXMuZW1pdCgnYWxsU3RvcmVzTG9hZGVkJywgc3RvcmVzKTtcblx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShzdG9yZXMpO1xufTtcblxuLyoqXG4gKiBHZXRzIHN0b3JlcyBtYXAgYnkgbmFtZXMuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBNYXAgb2Ygc3RvcmVzIGJ5IG5hbWVzLlxuICovXG5TdG9yZUxvYWRlci5wcm90b3R5cGUuZ2V0U3RvcmVzQnlOYW1lcyA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuX2xvYWRlZFN0b3JlcyB8fCB7fTtcbn07IiwiLypcbiAqIGNhdGJlcnJ5XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnkncyBsaWNlbnNlIGZvbGxvd3M6XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAqIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uXG4gKiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICogcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAqIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gKiBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuICogaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuICogT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKlxuICogVGhpcyBsaWNlbnNlIGFwcGxpZXMgdG8gYWxsIHBhcnRzIG9mIGNhdGJlcnJ5IHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kdWxlQXBpUHJvdmlkZXI7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpLFxuXHRwcm9wZXJ0eUhlbHBlciA9IHJlcXVpcmUoJy4uLy4uL2xpYi9oZWxwZXJzL3Byb3BlcnR5SGVscGVyJyksXG5cdE1vZHVsZUFwaVByb3ZpZGVyQmFzZSA9IHJlcXVpcmUoJy4uLy4uL2xpYi9iYXNlL01vZHVsZUFwaVByb3ZpZGVyQmFzZScpLFxuXHRtb2R1bGVIZWxwZXIgPSByZXF1aXJlKCcuLi8uLi9saWIvaGVscGVycy9tb2R1bGVIZWxwZXInKTtcblxudXRpbC5pbmhlcml0cyhNb2R1bGVBcGlQcm92aWRlciwgTW9kdWxlQXBpUHJvdmlkZXJCYXNlKTtcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgbW9kdWxlIEFQSSBwcm92aWRlci5cbiAqIEBwYXJhbSB7U2VydmljZUxvY2F0b3J9ICRzZXJ2aWNlTG9jYXRvciBTZXJ2aWNlIGxvY2F0b3JcbiAqIHRvIHJlc29sdmUgZGVwZW5kZW5jaWVzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBNb2R1bGVBcGlQcm92aWRlckJhc2VcbiAqL1xuZnVuY3Rpb24gTW9kdWxlQXBpUHJvdmlkZXIoJHNlcnZpY2VMb2NhdG9yKSB7XG5cdE1vZHVsZUFwaVByb3ZpZGVyQmFzZS5jYWxsKHRoaXMsICRzZXJ2aWNlTG9jYXRvcik7XG5cdHByb3BlcnR5SGVscGVyLmRlZmluZVJlYWRPbmx5KHRoaXMsICdpc0Jyb3dzZXInLCB0cnVlKTtcblx0cHJvcGVydHlIZWxwZXIuZGVmaW5lUmVhZE9ubHkodGhpcywgJ2lzU2VydmVyJywgZmFsc2UpO1xufVxuXG4vKipcbiAqIFJlZGlyZWN0cyBjdXJyZW50IHBhZ2UgdG8gc3BlY2lmaWVkIFVSSS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmlTdHJpbmcgVVJJIHRvIHJlZGlyZWN0LlxuICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgZm9yIG5vdGhpbmcuXG4gKi9cbk1vZHVsZUFwaVByb3ZpZGVyLnByb3RvdHlwZS5yZWRpcmVjdCA9IGZ1bmN0aW9uICh1cmlTdHJpbmcpIHtcblx0dmFyIHJlcXVlc3RSb3V0ZXIgPSB0aGlzLl9zZXJ2aWNlTG9jYXRvci5yZXNvbHZlKCdyZXF1ZXN0Um91dGVyJyk7XG5cdHJldHVybiByZXF1ZXN0Um91dGVyLmdvKHVyaVN0cmluZyk7XG59O1xuXG4vKipcbiAqIENsZWFycyBjdXJyZW50IGxvY2F0aW9uIFVSSSdzIGZyYWdtZW50LlxuICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgZm9yIG5vdGhpbmcuXG4gKi9cbk1vZHVsZUFwaVByb3ZpZGVyLnByb3RvdHlwZS5jbGVhckZyYWdtZW50ID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgd2luZG93ID0gdGhpcy5fc2VydmljZUxvY2F0b3IucmVzb2x2ZSgnd2luZG93JyksXG5cdFx0cG9zaXRpb24gPSB3aW5kb3cuZG9jdW1lbnQuYm9keS5zY3JvbGxUb3A7XG5cdHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyc7XG5cdHdpbmRvdy5kb2N1bWVudC5ib2R5LnNjcm9sbFRvcCA9IHBvc2l0aW9uO1xuXHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG59OyIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL0Jvb3RzdHJhcHBlcicpO1xuIiwiLypcbiAqIGNhdGJlcnJ5XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnkncyBsaWNlbnNlIGZvbGxvd3M6XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAqIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uXG4gKiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICogcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAqIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gKiBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuICogaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuICogT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKlxuICogVGhpcyBsaWNlbnNlIGFwcGxpZXMgdG8gYWxsIHBhcnRzIG9mIGNhdGJlcnJ5IHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGV4dEZhY3Rvcnk7XG5cbnZhciBVUkkgPSByZXF1aXJlKCdjYXRiZXJyeS11cmknKS5VUkksXG5cdHByb3BlcnR5SGVscGVyID0gcmVxdWlyZSgnLi9oZWxwZXJzL3Byb3BlcnR5SGVscGVyJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIGNvbnRleHQgZmFjdG9yeS5cbiAqIEBwYXJhbSB7U2VydmljZUxvY2F0b3J9ICRzZXJ2aWNlTG9jYXRvciBMb2NhdG9yIHRvIHJlc29sdmUgZGVwZW5kZW5jaWVzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENvbnRleHRGYWN0b3J5KCRzZXJ2aWNlTG9jYXRvcikge1xuXHR0aGlzLl9zZXJ2aWNlTG9jYXRvciA9ICRzZXJ2aWNlTG9jYXRvcjtcbn1cblxuLyoqXG4gKiBDdXJyZW50IHNlcnZpY2UgbG9jYXRvci5cbiAqIEB0eXBlIHtTZXJ2aWNlTG9jYXRvcn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbnRleHRGYWN0b3J5LnByb3RvdHlwZS5fc2VydmljZUxvY2F0b3IgPSBudWxsO1xuXG4vKipcbiAqIENyZWF0ZXMgbmV3IGNvbnRleHQgZm9yIG1vZHVsZXMuXG4gKiBAcGFyYW0ge09iamVjdH0gYWRkaXRpb25hbCBBZGRpdGlvbmFsIHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge1VSSX0gYWRkaXRpb25hbC5yZWZlcnJlciBDdXJyZW50IHJlZmVycmVyLlxuICogQHBhcmFtIHtVUkl9IGFkZGl0aW9uYWwubG9jYXRpb24gQ3VycmVudCBsb2NhdGlvbi5cbiAqIEBwYXJhbSB7U3RyaW5nfSBhZGRpdGlvbmFsLnVzZXJBZ2VudCBDdXJyZW50IHVzZXIgYWdlbnQuXG4gKi9cbkNvbnRleHRGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAoYWRkaXRpb25hbCkge1xuXHR2YXIgYXBpUHJvdmlkZXIgPSB0aGlzLl9zZXJ2aWNlTG9jYXRvci5yZXNvbHZlKCdtb2R1bGVBcGlQcm92aWRlcicpLFxuXHRcdGNvbnRleHQgPSBPYmplY3QuY3JlYXRlKGFwaVByb3ZpZGVyKTtcblx0Y29udGV4dC5jb29raWUgPSB0aGlzLl9zZXJ2aWNlTG9jYXRvci5yZXNvbHZlKCdjb29raWVXcmFwcGVyJyk7XG5cdE9iamVjdC5rZXlzKGFkZGl0aW9uYWwpXG5cdFx0LmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuXHRcdFx0cHJvcGVydHlIZWxwZXIuZGVmaW5lUmVhZE9ubHkoY29udGV4dCwga2V5LCBhZGRpdGlvbmFsW2tleV0pO1xuXHRcdH0pO1xuXHRyZXR1cm4gY29udGV4dDtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBjb250ZXh0IHN0dWIuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBTdHViIGNvbnRleHQgb2JqZWN0LlxuICovXG5Db250ZXh0RmFjdG9yeS5wcm90b3R5cGUuY3JlYXRlU3R1YiA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuY3JlYXRlKHtcblx0XHRyZWZlcnJlcjogbmV3IFVSSSgpLFxuXHRcdGxvY2F0aW9uOiBuZXcgVVJJKCksXG5cdFx0dXNlckFnZW50OiAnJ1xuXHR9KTtcbn07IiwiLypcbiAqIGNhdGJlcnJ5XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnkncyBsaWNlbnNlIGZvbGxvd3M6XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAqIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uXG4gKiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICogcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAqIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gKiBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuICogaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuICogT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKlxuICogVGhpcyBsaWNlbnNlIGFwcGxpZXMgdG8gYWxsIHBhcnRzIG9mIGNhdGJlcnJ5IHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gU2VyaWFsV3JhcHBlcjtcblxudmFyIGV2ZW50cyA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuXG52YXIgRVJST1JfTk9fU1VDSF9NRVRIT0QgPSAnVGhlcmUgaXMgbm8gc3VjaCByZWdpc3RlcmVkIG1ldGhvZCc7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIHNlcmlhbCB3cmFwcGVyIGZvciBwcm9taXNlcy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBTZXJpYWxXcmFwcGVyKCkge1xuXHR0aGlzLl9lbWl0dGVyID0gbmV3IGV2ZW50cy5FdmVudEVtaXR0ZXIoKTtcblx0dGhpcy5fZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoMCk7XG5cdHRoaXMuX3RvSW52b2tlID0ge307XG5cdHRoaXMuX2luUHJvZ3Jlc3MgPSB7fTtcbn1cblxuLyoqXG4gKiBDdXJyZW50IGV2ZW50IGVtaXR0ZXIuXG4gKiBAdHlwZSB7RXZlbnRFbWl0dGVyfVxuICogQHByaXZhdGVcbiAqL1xuU2VyaWFsV3JhcHBlci5wcm90b3R5cGUuX2VtaXR0ZXIgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgc2V0IG9mIG5hbWVkIG1ldGhvZHMgdG8gaW52b2tlLlxuICogQHR5cGUge09iamVjdH1cbiAqIEBwcml2YXRlXG4gKi9cblNlcmlhbFdyYXBwZXIucHJvdG90eXBlLl90b0ludm9rZSA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBzZXQgb2YgZmxhZ3MgaWYgdGhlIG1ldGhvZCBpcyBpbiBwcm9ncmVzcy5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5TZXJpYWxXcmFwcGVyLnByb3RvdHlwZS5faW5Qcm9ncmVzcyA9IG51bGw7XG5cbi8qKlxuICogQWRkcyBtZXRob2QgdG8gdGhlIHNldC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIE1ldGhvZCBuYW1lLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gdG9JbnZva2UgRnVuY3Rpb24gdGhhdCByZXR1cm5zIHByb21pc2UuXG4gKi9cblNlcmlhbFdyYXBwZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChuYW1lLCB0b0ludm9rZSkge1xuXHR0aGlzLl90b0ludm9rZVtuYW1lXSA9IHRvSW52b2tlO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgbWV0aG9kIHdpdGggc3VjaCBuYW1lIHdhcyByZWdpc3RlcmVkIHRvIHRoZSBzZXQuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBOYW1lIG9mIG1ldGhvZC5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIG1ldGhvZCBuYW1lIGlzIHJlZ2lzdGVyZWQuXG4gKi9cblNlcmlhbFdyYXBwZXIucHJvdG90eXBlLmlzUmVnaXN0ZXJlZCA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdHJldHVybiB0eXBlb2YodGhpcy5fdG9JbnZva2VbbmFtZV0pID09PSAnZnVuY3Rpb24nO1xufTtcblxuLyoqXG4gKiBJbnZva2VzIG1ldGhvZCB3aXRob3V0IGNvbmN1cnJlbmN5LlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgTWV0aG9kIG5hbWUuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fSBQcm9taXNlIGZvciByZXN1bHQuXG4gKi9cblNlcmlhbFdyYXBwZXIucHJvdG90eXBlLmludm9rZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRpZiAoIXRoaXMuaXNSZWdpc3RlcmVkKG5hbWUpKSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihFUlJPUl9OT19TVUNIX01FVEhPRCkpO1xuXHR9XG5cblx0aWYgKHRoaXMuX2luUHJvZ3Jlc3NbbmFtZV0pIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uIChmdWxmaWxsLCByZWplY3QpIHtcblx0XHRcdHNlbGYuX2VtaXR0ZXIub25jZShuYW1lLCBmdWxmaWxsKTtcblx0XHRcdHNlbGYuX2VtaXR0ZXIub25jZShuYW1lICsgJy0tZXJyb3InLCByZWplY3QpO1xuXHRcdH0pO1xuXHR9XG5cblx0dGhpcy5faW5Qcm9ncmVzc1tuYW1lXSA9IHRydWU7XG5cdHRoaXMuX3RvSW52b2tlW25hbWVdKClcblx0XHQudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG5cdFx0XHRzZWxmLl9lbWl0dGVyLmVtaXQobmFtZSwgcmVzdWx0KTtcblx0XHRcdHNlbGYuX2luUHJvZ3Jlc3NbbmFtZV0gPSBudWxsO1xuXHRcdH0pXG5cdFx0LmNhdGNoKGZ1bmN0aW9uIChyZWFzb24pIHtcblx0XHRcdHNlbGYuX2VtaXR0ZXIuZW1pdChuYW1lICsgJy0tZXJyb3InLCByZWFzb24pO1xuXHRcdFx0c2VsZi5faW5Qcm9ncmVzc1tuYW1lXSA9IG51bGw7XG5cdFx0fSk7XG5cblx0cmV0dXJuIHRoaXMuaW52b2tlKG5hbWUpO1xufTsiLCIvKlxuICogY2F0YmVycnlcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRGVuaXMgUmVjaGt1bm92IGFuZCBwcm9qZWN0IGNvbnRyaWJ1dG9ycy5cbiAqXG4gKiBjYXRiZXJyeSdzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnkgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yZURpc3BhdGNoZXI7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpLFxuXHRTZXJpYWxXcmFwcGVyID0gcmVxdWlyZSgnLi9TZXJpYWxXcmFwcGVyJyksXG5cdG1vZHVsZUhlbHBlciA9IHJlcXVpcmUoJy4vaGVscGVycy9tb2R1bGVIZWxwZXInKTtcblxudmFyIEVSUk9SX1NUT1JFX05PVF9GT1VORCA9ICdTdG9yZSBcIiVzXCIgbm90IGZvdW5kJyxcblx0RVJST1JfU1RBVEUgPSAnU3RhdGUgc2hvdWxkIGJlIHNldCBiZWZvcmUgYW55IHJlcXVlc3QnLFxuXHRERUZBVUxUX0xJRkVUSU1FID0gNjAwMDA7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2Ygc3RvcmUgZGlzcGF0Y2hlci5cbiAqIEBwYXJhbSB7U2VydmljZUxvY2F0b3J9ICRzZXJ2aWNlTG9jYXRvciBMb2NhdG9yIHRvIHJlc29sdmUgZGVwZW5kZW5jaWVzLlxuICogQHBhcmFtIHtTdG9yZUxvYWRlcn0gJHN0b3JlTG9hZGVyIFN0b3JlIGxvYWRlciB0byBsb2FkIHN0b3Jlcy5cbiAqIEBwYXJhbSB7RXZlbnRFbWl0dGVyfSAkZXZlbnRCdXMgRXZlbnQgYnVzIHRvIGVtaXQgZXZlbnRzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFN0b3JlRGlzcGF0Y2hlcigkc2VydmljZUxvY2F0b3IsICRzdG9yZUxvYWRlciwgJGV2ZW50QnVzKSB7XG5cdHRoaXMuX3NlcnZpY2VMb2NhdG9yID0gJHNlcnZpY2VMb2NhdG9yO1xuXHR0aGlzLl9zdG9yZUxvYWRlciA9ICRzdG9yZUxvYWRlcjtcblx0dGhpcy5fZXZlbnRCdXMgPSAkZXZlbnRCdXM7XG5cdHRoaXMuX3N0b3JlSW5zdGFuY2VzID0ge307XG5cdHRoaXMuX2xhc3REYXRhID0ge307XG5cdHRoaXMuX3NlcmlhbFdyYXBwZXIgPSBuZXcgU2VyaWFsV3JhcHBlcigpO1xufVxuXG4vKipcbiAqIEN1cnJlbnQgc2VydmljZSBsb2NhdG9yLlxuICogQHR5cGUge1NlcnZpY2VMb2NhdG9yfVxuICogQHByaXZhdGVcbiAqL1xuU3RvcmVEaXNwYXRjaGVyLnByb3RvdHlwZS5fc2VydmljZUxvY2F0b3IgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgZXZlbnQgYnVzLlxuICogQHR5cGUge0V2ZW50RW1pdHRlcn1cbiAqIEBwcml2YXRlXG4gKi9cblN0b3JlRGlzcGF0Y2hlci5wcm90b3R5cGUuX2V2ZW50QnVzID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHN0b3JlIGxvYWRlci5cbiAqIEB0eXBlIHtTdG9yZUxvYWRlcn1cbiAqIEBwcml2YXRlXG4gKi9cblN0b3JlRGlzcGF0Y2hlci5wcm90b3R5cGUuX3N0b3JlTG9hZGVyID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IG1hcCBvZiBhbGwgc3RvcmUgaW5zdGFuY2VzLlxuICogQHR5cGUge251bGx9XG4gKiBAcHJpdmF0ZVxuICovXG5TdG9yZURpc3BhdGNoZXIucHJvdG90eXBlLl9zdG9yZUluc3RhbmNlcyA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBtYXAgb2YgbGFzdCBkYXRhIGZvciBlYWNoIHN0b3JlLlxuICogQHR5cGUge09iamVjdH1cbiAqIEBwcml2YXRlXG4gKi9cblN0b3JlRGlzcGF0Y2hlci5wcm90b3R5cGUuX2xhc3REYXRhID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IG1hcCBvZiBsYXN0IHN0YXRlIG9mIHN0b3JlIGRpc3BhdGNoZXIuXG4gKiBAdHlwZSB7T2JqZWN0fVxuICogQHByaXZhdGVcbiAqL1xuU3RvcmVEaXNwYXRjaGVyLnByb3RvdHlwZS5fbGFzdFN0YXRlID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHNlcmlhbCB3cmFwcGVyLlxuICogQHR5cGUge1NlcmlhbFdyYXBwZXJ9XG4gKiBAcHJpdmF0ZVxuICovXG5TdG9yZURpc3BhdGNoZXIucHJvdG90eXBlLl9zZXJpYWxXcmFwcGVyID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IGJhc2ljIGNvbnRleHQgZm9yIGFsbCBzdG9yZSBjb250ZXh0cy5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5TdG9yZURpc3BhdGNoZXIucHJvdG90eXBlLl9jdXJyZW50QmFzaWNDb250ZXh0ID0gbnVsbDtcblxuLyoqXG4gKiBHZXRzIHN0b3JlIGRhdGEgYW5kIGNyZWF0ZXMgc3RvcmUgaW5zdGFuY2UgaWYgcmVxdWlyZWQuXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RvcmVOYW1lIE5hbWUgb2Ygc3RvcmUuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBTdG9yZSdzIGRhdGEuXG4gKi9cblN0b3JlRGlzcGF0Y2hlci5wcm90b3R5cGUuZ2V0U3RvcmVEYXRhID0gZnVuY3Rpb24gKHN0b3JlTmFtZSkge1xuXHRpZiAodHlwZW9mKHN0b3JlTmFtZSkgIT09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcblx0fVxuXHRpZiAodGhpcy5fbGFzdERhdGEuaGFzT3duUHJvcGVydHkoc3RvcmVOYW1lKSkge1xuXHRcdHZhciBleGlzdFRpbWUgPSBEYXRlLm5vdygpIC0gdGhpcy5fbGFzdERhdGFbc3RvcmVOYW1lXS5jcmVhdGVkQXQ7XG5cdFx0aWYgKGV4aXN0VGltZSA8PSB0aGlzLl9sYXN0RGF0YVtzdG9yZU5hbWVdLmxpZmV0aW1lKSB7XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2xhc3REYXRhW3N0b3JlTmFtZV0uZGF0YSk7XG5cdFx0fVxuXHRcdGRlbGV0ZSB0aGlzLl9sYXN0RGF0YVtzdG9yZU5hbWVdO1xuXHR9XG5cdHZhciBzZWxmID0gdGhpcyxcblx0XHRsaWZldGltZSA9IERFRkFVTFRfTElGRVRJTUU7XG5cdHNlbGYuX2V2ZW50QnVzLmVtaXQoJ3N0b3JlRGF0YUxvYWQnLCB7bmFtZTogc3RvcmVOYW1lfSk7XG5cdHJldHVybiB0aGlzLl9nZXRTdG9yZUluc3RhbmNlKHN0b3JlTmFtZSlcblx0XHQudGhlbihmdW5jdGlvbiAoc3RvcmUpIHtcblx0XHRcdGlmICh0eXBlb2Yoc3RvcmUuJGxpZmV0aW1lKSA9PT0gJ251bWJlcicpIHtcblx0XHRcdFx0bGlmZXRpbWUgPSBzdG9yZS4kbGlmZXRpbWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gc2VsZi5fc2VyaWFsV3JhcHBlci5pbnZva2Uoc3RvcmVOYW1lKTtcblx0XHR9KVxuXHRcdC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRzZWxmLl9sYXN0RGF0YVtzdG9yZU5hbWVdID0ge1xuXHRcdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0XHRsaWZldGltZTogbGlmZXRpbWUsXG5cdFx0XHRcdGNyZWF0ZWRBdDogRGF0ZS5ub3coKVxuXHRcdFx0fTtcblx0XHRcdHNlbGYuX2V2ZW50QnVzLmVtaXQoJ3N0b3JlRGF0YUxvYWRlZCcsIHtcblx0XHRcdFx0bmFtZTogc3RvcmVOYW1lLFxuXHRcdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0XHRsaWZldGltZTogbGlmZXRpbWVcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSlcblx0XHQuY2F0Y2goZnVuY3Rpb24gKHJlYXNvbikge1xuXHRcdFx0c2VsZi5fZXZlbnRCdXMuZW1pdCgnZXJyb3InLCByZWFzb24pO1xuXHRcdFx0dGhyb3cgcmVhc29uO1xuXHRcdH0pO1xufTtcblxuLyoqXG4gKiBTZW5kcyBhY3Rpb24gdG8gc3BlY2lmaWVkIHN0b3JlIGFuZCByZXNvbHZlcyBwcm9taXNlcyBpbiBzZXJpYWwgbW9kZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdG9yZU5hbWUgTmFtZSBvZiB0aGUgc3RvcmUuXG4gKiBAcGFyYW0ge1N0cmluZ30gYWN0aW9uTmFtZSBOYW1lIG9mIHRoZSBhY3Rpb24uXG4gKiBAcGFyYW0ge09iamVjdH0gYXJncyBBY3Rpb24gYXJndW1lbnRzLlxuICogQHJldHVybnMge1Byb21pc2U8Kj59IFByb21pc2UgZm9yIGFjdGlvbiBoYW5kbGluZyByZXN1bHQuXG4gKi9cblN0b3JlRGlzcGF0Y2hlci5wcm90b3R5cGUuc2VuZEFjdGlvbiA9IGZ1bmN0aW9uIChzdG9yZU5hbWUsIGFjdGlvbk5hbWUsIGFyZ3MpIHtcblx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdGFjdGlvbkRldGFpbHMgPSB7XG5cdFx0XHRzdG9yZU5hbWU6IHN0b3JlTmFtZSxcblx0XHRcdGFjdGlvbk5hbWU6IGFjdGlvbk5hbWUsXG5cdFx0XHRhcmdzOiBhcmdzXG5cdFx0fTtcblx0dGhpcy5fZXZlbnRCdXMuZW1pdCgnYWN0aW9uU2VuZCcsIGFjdGlvbkRldGFpbHMpO1xuXHRyZXR1cm4gdGhpcy5fZ2V0U3RvcmVJbnN0YW5jZShzdG9yZU5hbWUpXG5cdFx0LnRoZW4oZnVuY3Rpb24gKHN0b3JlKSB7XG5cdFx0XHR2YXIgaGFuZGxlTWV0aG9kID0gbW9kdWxlSGVscGVyLmdldE1ldGhvZFRvSW52b2tlKFxuXHRcdFx0XHRcdHN0b3JlLCAnaGFuZGxlJywgYWN0aW9uTmFtZVxuXHRcdFx0XHQpO1xuXHRcdFx0cmV0dXJuIG1vZHVsZUhlbHBlci5nZXRTYWZlUHJvbWlzZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBoYW5kbGVNZXRob2QoYXJncyk7XG5cdFx0XHR9KTtcblx0XHR9KVxuXHRcdC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcblx0XHRcdHNlbGYuX2V2ZW50QnVzLmVtaXQoJ2FjdGlvblNlbnQnLCBhY3Rpb25EZXRhaWxzKTtcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fSlcblx0XHQuY2F0Y2goZnVuY3Rpb24gKHJlYXNvbikge1xuXHRcdFx0c2VsZi5fZXZlbnRCdXMuZW1pdCgnZXJyb3InLCByZWFzb24pO1xuXHRcdFx0dGhyb3cgcmVhc29uO1xuXHRcdH0pO1xufTtcblxuLyoqXG4gKiBTZW5kcyBhY3Rpb24gdG8gZXZlcnkgc3RvcmUgdGhhdCBoYXMgaGFuZGxlIG1ldGhvZCBmb3Igc3VjaCBhY3Rpb24uXG4gKiBAcGFyYW0ge1N0cmluZ30gYWN0aW9uTmFtZSBOYW1lIG9mIHRoZSBhY3Rpb24uXG4gKiBAcGFyYW0ge09iamVjdH0gYXJnIEFjdGlvbiBhcmd1bWVudHMuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxBcnJheTwqPj59IFByb21pc2UgZm9yIHRoZSBhY3Rpb24gaGFuZGxpbmcgcmVzdWx0LlxuICovXG5TdG9yZURpc3BhdGNoZXIucHJvdG90eXBlLnNlbmRCcm9hZGNhc3RBY3Rpb24gPSBmdW5jdGlvbiAoYWN0aW9uTmFtZSwgYXJnKSB7XG5cdHZhciBwcm9taXNlcyA9IFtdLFxuXHRcdHNlbGYgPSB0aGlzLFxuXHRcdHN0b3Jlc0J5TmFtZXMgPSB0aGlzLl9zdG9yZUxvYWRlci5nZXRTdG9yZXNCeU5hbWVzKCksXG5cdFx0bWV0aG9kTmFtZSA9IG1vZHVsZUhlbHBlci5nZXRDYW1lbENhc2VOYW1lKCdoYW5kbGUnLCBhY3Rpb25OYW1lKTtcblx0T2JqZWN0LmtleXMoc3RvcmVzQnlOYW1lcylcblx0XHQuZm9yRWFjaChmdW5jdGlvbiAoc3RvcmVOYW1lKSB7XG5cdFx0XHR2YXIgc3RvcmUgPSBzdG9yZXNCeU5hbWVzW3N0b3JlTmFtZV0sXG5cdFx0XHRcdHByb3RvTWV0aG9kID0gc3RvcmUuY29uc3RydWN0b3IucHJvdG90eXBlW21ldGhvZE5hbWVdO1xuXHRcdFx0aWYgKHR5cGVvZihwcm90b01ldGhvZCkgIT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHNlbmRBY3Rpb25Qcm9taXNlID0gc2VsZi5zZW5kQWN0aW9uKFxuXHRcdFx0XHRzdG9yZS5uYW1lLCBhY3Rpb25OYW1lLCAgYXJnXG5cdFx0XHQpO1xuXHRcdFx0cHJvbWlzZXMucHVzaChzZW5kQWN0aW9uUHJvbWlzZSk7XG5cdFx0fSk7XG5cdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XG59O1xuXG4vKipcbiAqIFNldHMgbmV3IHN0YXRlIHRvIHN0b3JlIGRpc3BhdGNoZXIgYW5kIGludm9rZXMgXCJjaGFuZ2VkXCIgbWV0aG9kIGZvciBhbGxcbiAqIHN0b3JlcyB3aGljaCBzdGF0ZSBoYXZlIGJlZW4gY2hhbmdlZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbWV0ZXJzIE1hcCBvZiBuZXcgcGFyYW1ldGVycy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBiYXNpY0NvbnRleHQgQmFzaWMgY29udGV4dCBmb3IgYWxsIHN0b3Jlcy5cbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fSBOYW1lcyBvZiBzdG9yZXMgdGhhdCBoYXZlIGJlZW4gY2hhbmdlZC5cbiAqL1xuU3RvcmVEaXNwYXRjaGVyLnByb3RvdHlwZS5zZXRTdGF0ZSA9IGZ1bmN0aW9uIChwYXJhbWV0ZXJzLCBiYXNpY0NvbnRleHQpIHtcblx0aWYgKCF0aGlzLl9sYXN0U3RhdGUpIHtcblx0XHR0aGlzLl9jdXJyZW50QmFzaWNDb250ZXh0ID0gYmFzaWNDb250ZXh0O1xuXHRcdHRoaXMuX2xhc3RTdGF0ZSA9IHBhcmFtZXRlcnM7XG5cdFx0cmV0dXJuIFtdO1xuXHR9XG5cblx0Ly8gc29tZSBzdG9yZSdzIHBhcmFtZXRlcnMgY2FuIGJlIHJlbW92ZWQgc2luY2UgbGFzdCB0aW1lXG5cdHZhciBzZWxmID0gdGhpcyxcblx0XHRjaGFuZ2VkID0ge307XG5cblx0T2JqZWN0LmtleXModGhpcy5fbGFzdFN0YXRlKVxuXHRcdC5maWx0ZXIoZnVuY3Rpb24gKHN0b3JlTmFtZSkge1xuXHRcdFx0cmV0dXJuICEoc3RvcmVOYW1lIGluIHBhcmFtZXRlcnMpO1xuXHRcdH0pXG5cdFx0LmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRcdGNoYW5nZWRbbmFtZV0gPSB0cnVlO1xuXHRcdH0pO1xuXG5cdE9iamVjdC5rZXlzKHBhcmFtZXRlcnMpXG5cdFx0LmZvckVhY2goZnVuY3Rpb24gKHN0b3JlTmFtZSkge1xuXHRcdFx0Ly8gbmV3IHBhcmFtZXRlcnMgd2VyZSBzZXQgZm9yIHN0b3JlXG5cdFx0XHRpZiAoIXNlbGYuX2xhc3RTdGF0ZS5oYXNPd25Qcm9wZXJ0eShzdG9yZU5hbWUpKSB7XG5cdFx0XHRcdGNoYW5nZWRbc3RvcmVOYW1lXSA9IHRydWU7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gbmV3IGFuZCBsYXN0IHBhcmFtZXRlcnMgaGFzIGRpZmZlcmVudCB2YWx1ZXNcblx0XHRcdHZhciBsYXN0UGFyYW1ldGVyTmFtZXMgPVxuXHRcdFx0XHRcdE9iamVjdC5rZXlzKHNlbGYuX2xhc3RTdGF0ZVtzdG9yZU5hbWVdKSxcblx0XHRcdFx0Y3VycmVudFBhcmFtZXRlck5hbWVzID1cblx0XHRcdFx0XHRPYmplY3Qua2V5cyhwYXJhbWV0ZXJzW3N0b3JlTmFtZV0pO1xuXG5cdFx0XHRpZiAoY3VycmVudFBhcmFtZXRlck5hbWVzLmxlbmd0aCAhPT1cblx0XHRcdFx0bGFzdFBhcmFtZXRlck5hbWVzLmxlbmd0aCkge1xuXHRcdFx0XHRjaGFuZ2VkW3N0b3JlTmFtZV0gPSB0cnVlO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGN1cnJlbnRQYXJhbWV0ZXJOYW1lcy5ldmVyeShmdW5jdGlvbiAocGFyYW1ldGVyTmFtZSkge1xuXHRcdFx0XHRpZiAocGFyYW1ldGVyc1tzdG9yZU5hbWVdW3BhcmFtZXRlck5hbWVdICE9PVxuXHRcdFx0XHRcdHNlbGYuX2xhc3RTdGF0ZVtzdG9yZU5hbWVdW3BhcmFtZXRlck5hbWVdKSB7XG5cdFx0XHRcdFx0Y2hhbmdlZFtzdG9yZU5hbWVdID0gdHJ1ZTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHR0aGlzLl9sYXN0U3RhdGUgPSBwYXJhbWV0ZXJzO1xuXHRpZiAodGhpcy5fY3VycmVudEJhc2ljQ29udGV4dCAhPT0gYmFzaWNDb250ZXh0KSB7XG5cdFx0dGhpcy5fY3VycmVudEJhc2ljQ29udGV4dCA9IGJhc2ljQ29udGV4dDtcblx0XHRPYmplY3Qua2V5cyh0aGlzLl9zdG9yZUluc3RhbmNlcylcblx0XHRcdC5mb3JFYWNoKGZ1bmN0aW9uIChzdG9yZU5hbWUpIHtcblx0XHRcdFx0c2VsZi5fc3RvcmVJbnN0YW5jZXNbc3RvcmVOYW1lXS4kY29udGV4dCA9XG5cdFx0XHRcdFx0c2VsZi5fZ2V0U3RvcmVDb250ZXh0KHN0b3JlTmFtZSk7XG5cdFx0XHR9KTtcblx0fVxuXG5cdHZhciBzdG9yZXMgPSB0aGlzLl9zdG9yZUxvYWRlci5nZXRTdG9yZXNCeU5hbWVzKCksXG5cdFx0Y2hhbmdlZFN0b3JlTmFtZXMgPSBPYmplY3Qua2V5cyhjaGFuZ2VkKVxuXHRcdFx0LmZpbHRlcihmdW5jdGlvbiAoY2hhbmdlZFN0b3JlTmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gc3RvcmVzLmhhc093blByb3BlcnR5KGNoYW5nZWRTdG9yZU5hbWUpO1xuXHRcdFx0fSk7XG5cdGNoYW5nZWRTdG9yZU5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHN0b3JlTmFtZSkge1xuXHRcdGRlbGV0ZSBzZWxmLl9sYXN0RGF0YVtzdG9yZU5hbWVdO1xuXHRcdHNlbGYuX2V2ZW50QnVzLmVtaXQoJ3N0b3JlQ2hhbmdlZCcsIHN0b3JlTmFtZSk7XG5cdH0pO1xuXG5cdHRoaXMuX2V2ZW50QnVzLmVtaXQoJ3N0YXRlQ2hhbmdlZCcsIHtcblx0XHRvbGRTdGF0ZTogdGhpcy5fbGFzdFN0YXRlLFxuXHRcdG5ld1N0YXRlOiBwYXJhbWV0ZXJzXG5cdH0pO1xuXHRyZXR1cm4gY2hhbmdlZFN0b3JlTmFtZXM7XG59O1xuXG4vKipcbiAqIEdldHMgY29udGV4dCBmb3Igc3RvcmUgdXNpbmcgY29tcG9uZW50J3MgY29udGV4dCBhcyBhIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdG9yZU5hbWUgTmFtZSBvZiBzdG9yZS5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFN0b3JlIGNvbnRleHQuXG4gKiBAcHJpdmF0ZVxuICovXG5TdG9yZURpc3BhdGNoZXIucHJvdG90eXBlLl9nZXRTdG9yZUNvbnRleHQgPSBmdW5jdGlvbiAoc3RvcmVOYW1lKSB7XG5cdHZhciBzZWxmID0gdGhpcyxcblx0XHRzdG9yZUNvbnRleHQgPSBPYmplY3QuY3JlYXRlKHRoaXMuX2N1cnJlbnRCYXNpY0NvbnRleHQpO1xuXHRzdG9yZUNvbnRleHQubmFtZSA9IHN0b3JlTmFtZTtcblx0c3RvcmVDb250ZXh0LnN0YXRlID0gdGhpcy5fbGFzdFN0YXRlW3N0b3JlTmFtZV0gfHwge307XG5cdHN0b3JlQ29udGV4dC5jaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuXHRcdGRlbGV0ZSBzZWxmLl9sYXN0RGF0YVtzdG9yZU5hbWVdO1xuXHRcdHNlbGYuX2V2ZW50QnVzLmVtaXQoJ3N0b3JlQ2hhbmdlZCcsIHN0b3JlTmFtZSk7XG5cdH07XG5cblx0cmV0dXJuIHN0b3JlQ29udGV4dDtcbn07XG5cbi8qKlxuICogR2V0cyBzdG9yZSBpbnN0YW5jZSBhbmQgY3JlYXRlcyBpdCBpZiByZXF1aXJlZC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdG9yZU5hbWUgTmFtZSBvZiBzdG9yZS5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD59IFByb21pc2UgZm9yIHN0b3JlLlxuICogQHByaXZhdGVcbiAqL1xuU3RvcmVEaXNwYXRjaGVyLnByb3RvdHlwZS5fZ2V0U3RvcmVJbnN0YW5jZSA9IGZ1bmN0aW9uIChzdG9yZU5hbWUpIHtcblx0aWYgKCF0aGlzLl9sYXN0U3RhdGUpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKEVSUk9SX1NUQVRFKSk7XG5cdH1cblxuXHR2YXIgc3RvcmUgPSB0aGlzLl9zdG9yZUluc3RhbmNlc1tzdG9yZU5hbWVdO1xuXHRpZiAoc3RvcmUpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHN0b3JlKTtcblx0fVxuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0dmFyIHN0b3JlcyA9IHNlbGYuX3N0b3JlTG9hZGVyLmdldFN0b3Jlc0J5TmFtZXMoKSxcblx0XHRjb25maWcgPSBzZWxmLl9zZXJ2aWNlTG9jYXRvci5yZXNvbHZlKCdjb25maWcnKTtcblx0aWYgKCFzdG9yZXMuaGFzT3duUHJvcGVydHkoc3RvcmVOYW1lKSkge1xuXHRcdHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IodXRpbC5mb3JtYXQoXG5cdFx0XHRFUlJPUl9TVE9SRV9OT1RfRk9VTkQsIHN0b3JlTmFtZVxuXHRcdCkpKTtcblx0fVxuXG5cdHZhciBjb25zdHJ1Y3RvciA9IHN0b3Jlc1tzdG9yZU5hbWVdLmNvbnN0cnVjdG9yO1xuXHRjb25zdHJ1Y3Rvci5wcm90b3R5cGUuJGNvbnRleHQgPSBzZWxmLl9nZXRTdG9yZUNvbnRleHQoc3RvcmVOYW1lKTtcblx0c2VsZi5fc3RvcmVJbnN0YW5jZXNbc3RvcmVOYW1lXSA9IHNlbGYuX3NlcnZpY2VMb2NhdG9yXG5cdFx0LnJlc29sdmVJbnN0YW5jZShjb25zdHJ1Y3RvciwgY29uZmlnKTtcblx0c2VsZi5fc3RvcmVJbnN0YW5jZXNbc3RvcmVOYW1lXS4kY29udGV4dCA9IGNvbnN0cnVjdG9yLnByb3RvdHlwZS4kY29udGV4dDtcblxuXHRzZWxmLl9zZXJpYWxXcmFwcGVyLmFkZChzdG9yZU5hbWUsIGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgbG9hZE1ldGhvZCA9IG1vZHVsZUhlbHBlci5nZXRNZXRob2RUb0ludm9rZShcblx0XHRcdHNlbGYuX3N0b3JlSW5zdGFuY2VzW3N0b3JlTmFtZV0sICdsb2FkJ1xuXHRcdCk7XG5cdFx0cmV0dXJuIG1vZHVsZUhlbHBlci5nZXRTYWZlUHJvbWlzZShsb2FkTWV0aG9kKTtcblx0fSk7XG5cdHJldHVybiBQcm9taXNlLnJlc29sdmUoc2VsZi5fc3RvcmVJbnN0YW5jZXNbc3RvcmVOYW1lXSk7XG59OyIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvb3RzdHJhcHBlckJhc2U7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpLFxuXHRtb2R1bGVIZWxwZXIgPSByZXF1aXJlKCcuLi9oZWxwZXJzL21vZHVsZUhlbHBlcicpLFxuXHR1aHIgPSByZXF1aXJlKCdjYXRiZXJyeS11aHInKSxcblx0UHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UnKSxcblx0U3RhdGVQcm92aWRlciA9IHJlcXVpcmUoJy4vLi4vcHJvdmlkZXJzL1N0YXRlUHJvdmlkZXInKSxcblx0U3RvcmVMb2FkZXIgPSByZXF1aXJlKCcuLi9sb2FkZXJzL1N0b3JlTG9hZGVyJyksXG5cdENvbXBvbmVudExvYWRlciA9IHJlcXVpcmUoJy4uL2xvYWRlcnMvQ29tcG9uZW50TG9hZGVyJyksXG5cdERvY3VtZW50UmVuZGVyZXIgPSByZXF1aXJlKCcuLi9Eb2N1bWVudFJlbmRlcmVyJyksXG5cdFJlcXVlc3RSb3V0ZXIgPSByZXF1aXJlKCcuLi9SZXF1ZXN0Um91dGVyJyksXG5cdFN0b3JlRGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL1N0b3JlRGlzcGF0Y2hlcicpLFxuXHRNb2R1bGVBcGlQcm92aWRlckJhc2UgPSByZXF1aXJlKCcuLi9iYXNlL01vZHVsZUFwaVByb3ZpZGVyQmFzZScpLFxuXHRNb2R1bGVBcGlQcm92aWRlciA9IHJlcXVpcmUoJy4uL3Byb3ZpZGVycy9Nb2R1bGVBcGlQcm92aWRlcicpLFxuXHRDb29raWVXcmFwcGVyID0gcmVxdWlyZSgnLi4vQ29va2llV3JhcHBlcicpLFxuXHRDb250ZXh0RmFjdG9yeSA9IHJlcXVpcmUoJy4vLi4vQ29udGV4dEZhY3RvcnknKSxcblx0RXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyLFxuXHRTZXJ2aWNlTG9jYXRvciA9IHJlcXVpcmUoJ2NhdGJlcnJ5LWxvY2F0b3InKTtcblxudmFyIElORk9fQ09NUE9ORU5UX0xPQURFRCA9ICdDb21wb25lbnQgXCIlc1wiIGxvYWRlZCcsXG5cdElORk9fU1RPUkVfTE9BREVEID0gJ1N0b3JlIFwiJXNcIiBsb2FkZWQnLFxuXHRJTkZPX0FMTF9TVE9SRVNfTE9BREVEID0gJ0FsbCBzdG9yZXMgbG9hZGVkJyxcblx0SU5GT19BTExfQ09NUE9ORU5UU19MT0FERUQgPSAnQWxsIGNvbXBvbmVudHMgbG9hZGVkJyxcblx0SU5GT19ET0NVTUVOVF9SRU5ERVJFRCA9ICdEb2N1bWVudCByZW5kZXJlZCBmb3IgVVJJICVzJyxcblx0VFJBQ0VfUkVOREVSX0NPTVBPTkVOVCA9ICdSZW5kZXJpbmcgY29tcG9uZW50IFwiJXNcIiB3aXRoIElEPVwiJXNcIi4uLicsXG5cdFRJTUVTVEFNUF9GT1JNQVQgPSAnICglZCBtcyknLFxuXHRUUkFDRV9DT01QT05FTlRfUkVOREVSRUQgPSAnQ29tcG9uZW50IFwiJXNcIiB3aXRoIElEPVwiJXNcIiByZW5kZXJlZCVzJztcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiBiYXNlIENhdGJlcnJ5IGJvb3RzdHJhcHBlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhdGJlcnJ5Q29uc3RydWN0b3IgQ29uc3RydWN0b3JcbiAqIG9mIHRoZSBDYXRiZXJyeSdzIG1haW4gbW9kdWxlLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEJvb3RzdHJhcHBlckJhc2UoY2F0YmVycnlDb25zdHJ1Y3Rvcikge1xuXHR0aGlzLl9jYXRiZXJyeUNvbnN0cnVjdG9yID0gY2F0YmVycnlDb25zdHJ1Y3Rvcjtcbn1cblxuLyoqXG4gKiBDdXJyZW50IGNvbnN0cnVjdG9yIG9mIHRoZSBDYXRiZXJyeSdzIG1haW4gbW9kdWxlLlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xuQm9vdHN0cmFwcGVyQmFzZS5wcm90b3R5cGUuX2NhdGJlcnJ5Q29uc3RydWN0b3IgPSBudWxsO1xuXG4vKipcbiAqIENyZWF0ZXMgbmV3IGZ1bGwtY29uZmlndXJlZCBpbnN0YW5jZSBvZiB0aGUgQ2F0YmVycnkgYXBwbGljYXRpb24uXG4gKiBAcGFyYW0ge09iamVjdD99IGNvbmZpZ09iamVjdCBDb25maWd1cmF0aW9uIG9iamVjdC5cbiAqIEByZXR1cm5zIHtDYXRiZXJyeX0gQ2F0YmVycnkgYXBwbGljYXRpb24gaW5zdGFuY2UuXG4gKi9cbkJvb3RzdHJhcHBlckJhc2UucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uIChjb25maWdPYmplY3QpIHtcblx0dmFyIGN1cnJlbnRDb25maWcgPSBjb25maWdPYmplY3QgfHwge30sXG5cdFx0Y2F0YmVycnkgPSBuZXcgdGhpcy5fY2F0YmVycnlDb25zdHJ1Y3RvcigpO1xuXG5cdHRoaXMuY29uZmlndXJlKGN1cnJlbnRDb25maWcsIGNhdGJlcnJ5LmxvY2F0b3IpO1xuXHRjYXRiZXJyeS5ldmVudHMgPSBjYXRiZXJyeS5sb2NhdG9yLnJlc29sdmVJbnN0YW5jZShNb2R1bGVBcGlQcm92aWRlckJhc2UpO1xuXHRyZXR1cm4gY2F0YmVycnk7XG59O1xuXG4vKipcbiAqIENvbmZpZ3VyZXMgbG9jYXRvciB3aXRoIGFsbCByZXF1aXJlZCB0eXBlIHJlZ2lzdHJhdGlvbnMuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnT2JqZWN0IENvbmZpZ3VyYXRpb24gb2JqZWN0LlxuICogQHBhcmFtIHtTZXJ2aWNlTG9jYXRvcn0gbG9jYXRvciBTZXJ2aWNlIGxvY2F0b3IgdG8gY29uZmlndXJlLlxuICovXG5Cb290c3RyYXBwZXJCYXNlLnByb3RvdHlwZS5jb25maWd1cmUgPSBmdW5jdGlvbiAoY29uZmlnT2JqZWN0LCBsb2NhdG9yKSB7XG5cdHZhciBldmVudEJ1cyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblx0ZXZlbnRCdXMuc2V0TWF4TGlzdGVuZXJzKDApO1xuXHRsb2NhdG9yLnJlZ2lzdGVySW5zdGFuY2UoJ3Byb21pc2UnLCBQcm9taXNlKTtcblx0bG9jYXRvci5yZWdpc3Rlckluc3RhbmNlKCdldmVudEJ1cycsIGV2ZW50QnVzKTtcblx0bG9jYXRvci5yZWdpc3Rlckluc3RhbmNlKCdjb25maWcnLCBjb25maWdPYmplY3QpO1xuXHRsb2NhdG9yLnJlZ2lzdGVyKCdzdGF0ZVByb3ZpZGVyJywgU3RhdGVQcm92aWRlciwgY29uZmlnT2JqZWN0LCB0cnVlKTtcblx0bG9jYXRvci5yZWdpc3RlcignY29udGV4dEZhY3RvcnknLCBDb250ZXh0RmFjdG9yeSwgY29uZmlnT2JqZWN0LCB0cnVlKTtcblx0bG9jYXRvci5yZWdpc3Rlcignc3RvcmVMb2FkZXInLCBTdG9yZUxvYWRlciwgY29uZmlnT2JqZWN0LCB0cnVlKTtcblx0bG9jYXRvci5yZWdpc3RlcignY29tcG9uZW50TG9hZGVyJywgQ29tcG9uZW50TG9hZGVyLCBjb25maWdPYmplY3QsIHRydWUpO1xuXHRsb2NhdG9yLnJlZ2lzdGVyKCdkb2N1bWVudFJlbmRlcmVyJywgRG9jdW1lbnRSZW5kZXJlciwgY29uZmlnT2JqZWN0LCB0cnVlKTtcblx0bG9jYXRvci5yZWdpc3RlcigncmVxdWVzdFJvdXRlcicsIFJlcXVlc3RSb3V0ZXIsIGNvbmZpZ09iamVjdCwgdHJ1ZSk7XG5cdGxvY2F0b3IucmVnaXN0ZXIoJ3N0b3JlRGlzcGF0Y2hlcicsIFN0b3JlRGlzcGF0Y2hlciwgY29uZmlnT2JqZWN0KTtcblx0bG9jYXRvci5yZWdpc3Rlcihcblx0XHQnbW9kdWxlQXBpUHJvdmlkZXInLCBNb2R1bGVBcGlQcm92aWRlciwgY29uZmlnT2JqZWN0LCB0cnVlXG5cdCk7XG5cdGxvY2F0b3IucmVnaXN0ZXIoXG5cdFx0J2Nvb2tpZVdyYXBwZXInLCBDb29raWVXcmFwcGVyLCBjb25maWdPYmplY3QsIHRydWVcblx0KTtcblxuXHR1aHIucmVnaXN0ZXIobG9jYXRvcik7XG59O1xuXG4vKipcbiAqIFdyYXBzIGV2ZW50IGJ1cyB3aXRoIGxvZyBtZXNzYWdlcy5cbiAqIEBwYXJhbSB7RXZlbnRFbWl0dGVyfSBldmVudEJ1cyBFdmVudCBlbWl0dGVyIHRoYXQgaW1wbGVtZW50cyBldmVudCBidXMuXG4gKiBAcGFyYW0ge0xvZ2dlcn0gbG9nZ2VyIExvZ2dlciB0byB3cml0ZSBtZXNzYWdlcy5cbiAqIEBwcm90ZWN0ZWRcbiAqL1xuQm9vdHN0cmFwcGVyQmFzZS5wcm90b3R5cGUuX3dyYXBFdmVudHNXaXRoTG9nZ2VyID0gZnVuY3Rpb24gKGV2ZW50QnVzLCBsb2dnZXIpIHtcblx0ZXZlbnRCdXNcblx0XHQub24oJ2NvbXBvbmVudExvYWRlZCcsIGZ1bmN0aW9uIChhcmdzKSB7XG5cdFx0XHRsb2dnZXIuaW5mbyh1dGlsLmZvcm1hdChJTkZPX0NPTVBPTkVOVF9MT0FERUQsIGFyZ3MubmFtZSkpO1xuXHRcdH0pXG5cdFx0Lm9uKCdzdG9yZUxvYWRlZCcsIGZ1bmN0aW9uIChhcmdzKSB7XG5cdFx0XHRsb2dnZXIuaW5mbyh1dGlsLmZvcm1hdChJTkZPX1NUT1JFX0xPQURFRCwgYXJncy5uYW1lKSk7XG5cdFx0fSlcblx0XHQub24oJ2FsbFN0b3Jlc0xvYWRlZCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdGxvZ2dlci5pbmZvKElORk9fQUxMX1NUT1JFU19MT0FERUQpO1xuXHRcdH0pXG5cdFx0Lm9uKCdhbGxDb21wb25lbnRzTG9hZGVkJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0bG9nZ2VyLmluZm8oSU5GT19BTExfQ09NUE9ORU5UU19MT0FERUQpO1xuXHRcdH0pXG5cdFx0Lm9uKCdjb21wb25lbnRSZW5kZXInLCBmdW5jdGlvbiAoYXJncykge1xuXHRcdFx0dmFyIGlkID0gYXJncy5jb250ZXh0LlxuXHRcdFx0XHRcdGF0dHJpYnV0ZXNbbW9kdWxlSGVscGVyLkFUVFJJQlVURV9JRF0gfHwgJ251bGwnO1xuXHRcdFx0bG9nZ2VyLnRyYWNlKHV0aWwuZm9ybWF0KFRSQUNFX1JFTkRFUl9DT01QT05FTlQsXG5cdFx0XHRcdGFyZ3MubmFtZSwgaWRcblx0XHRcdCkpO1xuXHRcdH0pXG5cdFx0Lm9uKCdjb21wb25lbnRSZW5kZXJlZCcsIGZ1bmN0aW9uIChhcmdzKSB7XG5cdFx0XHR2YXIgaWQgPSBhcmdzLmNvbnRleHQuXG5cdFx0XHRcdFx0YXR0cmlidXRlc1ttb2R1bGVIZWxwZXIuQVRUUklCVVRFX0lEXSB8fCAnbnVsbCc7XG5cdFx0XHRsb2dnZXIudHJhY2UodXRpbC5mb3JtYXQoXG5cdFx0XHRcdFRSQUNFX0NPTVBPTkVOVF9SRU5ERVJFRCxcblx0XHRcdFx0YXJncy5uYW1lLCBpZCwgdHlwZW9mKGFyZ3MudGltZSkgPT09ICdudW1iZXInID9cblx0XHRcdFx0XHR1dGlsLmZvcm1hdChUSU1FU1RBTVBfRk9STUFULCBhcmdzLnRpbWUpIDogJydcblx0XHRcdCkpO1xuXHRcdH0pXG5cdFx0Lm9uKCdkb2N1bWVudFJlbmRlcmVkJywgZnVuY3Rpb24gKGFyZ3MpIHtcblx0XHRcdGxvZ2dlci5pbmZvKHV0aWwuZm9ybWF0KFxuXHRcdFx0XHRJTkZPX0RPQ1VNRU5UX1JFTkRFUkVELCBhcmdzLmxvY2F0aW9uLnRvU3RyaW5nKClcblx0XHRcdCkpO1xuXHRcdH0pXG5cdFx0Lm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnJvcikge1xuXHRcdFx0bG9nZ2VyLmVycm9yKGVycm9yKTtcblx0XHR9KTtcbn07IiwiLypcbiAqIGNhdGJlcnJ5XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnkncyBsaWNlbnNlIGZvbGxvd3M6XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAqIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uXG4gKiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICogcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAqIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gKiBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuICogaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuICogT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKlxuICogVGhpcyBsaWNlbnNlIGFwcGxpZXMgdG8gYWxsIHBhcnRzIG9mIGNhdGJlcnJ5IHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2F0YmVycnlCYXNlO1xuXG52YXIgU2VydmljZUxvY2F0b3IgPSByZXF1aXJlKCdjYXRiZXJyeS1sb2NhdG9yJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIGJhc2ljIENhdGJlcnJ5IGFwcGxpY2F0aW9uIG1vZHVsZS5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDYXRiZXJyeUJhc2UoKSB7XG5cdHRoaXMubG9jYXRvciA9IG5ldyBTZXJ2aWNlTG9jYXRvcigpO1xuXHR0aGlzLmxvY2F0b3IucmVnaXN0ZXJJbnN0YW5jZSgnc2VydmljZUxvY2F0b3InLCB0aGlzLmxvY2F0b3IpO1xuXHR0aGlzLmxvY2F0b3IucmVnaXN0ZXJJbnN0YW5jZSgnY2F0YmVycnknLCB0aGlzKTtcbn1cblxuLyoqXG4gKiBDdXJyZW50IG9iamVjdCB3aXRoIGV2ZW50cy5cbiAqIEB0eXBlIHtNb2R1bGVBcGlQcm92aWRlcn1cbiAqL1xuQ2F0YmVycnlCYXNlLnByb3RvdHlwZS5ldmVudHMgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgc2VydmljZSBsb2NhdG9yLlxuICogQHR5cGUge1NlcnZpY2VMb2NhdG9yfVxuICovXG5DYXRiZXJyeUJhc2UucHJvdG90eXBlLmxvY2F0b3IgPSBudWxsOyIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvb2tpZVdyYXBwZXJCYXNlO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgYmFzaWMgY29va2llIHdyYXBwZXIuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gQ29va2llV3JhcHBlckJhc2UoKSB7XG59XG5cbi8qKlxuICogUGFyc2VzIGNvb2tpZSBzdHJpbmcgaW50byBtYXAgb2YgY29va2llIGtleS92YWx1ZSBwYWlycy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgQ29va2llIHN0cmluZy5cbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIGNvb2tpZSB2YWx1ZXMgYnkga2V5cy5cbiAqIEBwcm90ZWN0ZWRcbiAqL1xuQ29va2llV3JhcHBlckJhc2UucHJvdG90eXBlLl9wYXJzZUNvb2tpZVN0cmluZyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcblx0dmFyIGNvb2tpZSA9IHt9O1xuXG5cdGlmICh0eXBlb2YgKHN0cmluZykgIT09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuIGNvb2tpZTtcblx0fVxuXHRzdHJpbmdcblx0XHQuc3BsaXQoJzsnKVxuXHRcdC5mb3JFYWNoKGZ1bmN0aW9uIChjb29raWVTdHJpbmcpIHtcblx0XHRcdHZhciBwYWlyID0gY29va2llU3RyaW5nXG5cdFx0XHRcdC50cmltKClcblx0XHRcdFx0LnNwbGl0KCc9Jyk7XG5cblx0XHRcdGlmIChwYWlyLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRjb29raWVbcGFpclswXV0gPSBkZWNvZGVVUklDb21wb25lbnQocGFpclsxXSk7XG5cdFx0fSwgdGhpcyk7XG5cblx0cmV0dXJuIGNvb2tpZTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgY29va2llIHNldHVwIG9iamVjdCB0byBjb29raWUgc3RyaW5nLlxuICogQHBhcmFtIHtPYmplY3R9IGNvb2tpZVNldHVwIENvb2tpZSBzZXR1cCBvYmplY3QuXG4gKiBAcGFyYW0ge3N0cmluZ30gY29va2llU2V0dXAua2V5IENvb2tpZSBrZXkuXG4gKiBAcGFyYW0ge3N0cmluZ30gY29va2llU2V0dXAudmFsdWUgQ29va2llIHZhbHVlLlxuICogQHBhcmFtIHtudW1iZXI/fSBjb29raWVTZXR1cC5tYXhBZ2UgTWF4IGNvb2tpZSBhZ2UgaW4gc2Vjb25kcy5cbiAqIEBwYXJhbSB7RGF0ZT99IGNvb2tpZVNldHVwLmV4cGlyZXMgRXhwaXJlIGRhdGUuXG4gKiBAcGFyYW0ge3N0cmluZz99IGNvb2tpZVNldHVwLnBhdGggVVJJIHBhdGggZm9yIGNvb2tpZS5cbiAqIEBwYXJhbSB7c3RyaW5nP30gY29va2llU2V0dXAuZG9tYWluIENvb2tpZSBkb21haW4uXG4gKiBAcGFyYW0ge2Jvb2xlYW4/fSBjb29raWVTZXR1cC5zZWN1cmUgSXMgY29va2llIHNlY3VyZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW4/fSBjb29raWVTZXR1cC5odHRwT25seSBJcyBjb29raWUgSFRUUCBvbmx5LlxuICogQHJldHVybnMge3N0cmluZ30gQ29va2llIHN0cmluZy5cbiAqIEBwcm90ZWN0ZWRcbiAqL1xuQ29va2llV3JhcHBlckJhc2UucHJvdG90eXBlLl9jb252ZXJ0VG9Db29raWVTZXR1cCA9IGZ1bmN0aW9uIChjb29raWVTZXR1cCkge1xuXHRpZiAodHlwZW9mKGNvb2tpZVNldHVwLmtleSkgIT09ICdzdHJpbmcnIHx8XG5cdFx0dHlwZW9mKGNvb2tpZVNldHVwLnZhbHVlKSAhPT0gJ3N0cmluZycpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ1dyb25nIGtleSBvciB2YWx1ZScpO1xuXHR9XG5cblx0dmFyIGNvb2tpZSA9IGNvb2tpZVNldHVwLmtleSArICc9JyArIGNvb2tpZVNldHVwLnZhbHVlO1xuXG5cdC8vIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzYyNjUjc2VjdGlvbi00LjEuMVxuXHRpZiAodHlwZW9mKGNvb2tpZVNldHVwLm1heEFnZSkgPT09ICdudW1iZXInKSB7XG5cdFx0Y29va2llICs9ICc7IE1heC1BZ2U9JyArIGNvb2tpZVNldHVwLm1heEFnZS50b0ZpeGVkKCk7XG5cdFx0aWYgKCFjb29raWVTZXR1cC5leHBpcmVzKSB7XG5cdFx0XHQvLyBieSBkZWZhdWx0IGV4cGlyZSBkYXRlID0gY3VycmVudCBkYXRlICsgbWF4LWFnZSBpbiBzZWNvbmRzXG5cdFx0XHRjb29raWVTZXR1cC5leHBpcmVzID0gbmV3IERhdGUoRGF0ZS5ub3coKSArXG5cdFx0XHRcdGNvb2tpZVNldHVwLm1heEFnZSAqIDEwMDApO1xuXHRcdH1cblx0fVxuXHRpZiAoY29va2llU2V0dXAuZXhwaXJlcyBpbnN0YW5jZW9mIERhdGUpIHtcblx0XHRjb29raWUgKz0gJzsgRXhwaXJlcz0nICsgY29va2llU2V0dXAuZXhwaXJlcy50b1VUQ1N0cmluZygpO1xuXHR9XG5cdGlmICh0eXBlb2YoY29va2llU2V0dXAucGF0aCkgPT09ICdzdHJpbmcnKSB7XG5cdFx0Y29va2llICs9ICc7IFBhdGg9JyArIGNvb2tpZVNldHVwLnBhdGg7XG5cdH1cblx0aWYgKHR5cGVvZihjb29raWVTZXR1cC5kb21haW4pID09PSAnc3RyaW5nJykge1xuXHRcdGNvb2tpZSArPSAnOyBEb21haW49JyArIGNvb2tpZVNldHVwLmRvbWFpbjtcblx0fVxuXHRpZiAodHlwZW9mKGNvb2tpZVNldHVwLnNlY3VyZSkgPT09ICdib29sZWFuJyAmJlxuXHRcdGNvb2tpZVNldHVwLnNlY3VyZSkge1xuXHRcdGNvb2tpZSArPSAnOyBTZWN1cmUnO1xuXHR9XG5cdGlmICh0eXBlb2YoY29va2llU2V0dXAuaHR0cE9ubHkpID09PSAnYm9vbGVhbicgJiZcblx0XHRjb29raWVTZXR1cC5odHRwT25seSkge1xuXHRcdGNvb2tpZSArPSAnOyBIdHRwT25seSc7XG5cdH1cblxuXHRyZXR1cm4gY29va2llO1xufTsiLCIvKlxuICogY2F0YmVycnlcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRGVuaXMgUmVjaGt1bm92IGFuZCBwcm9qZWN0IGNvbnRyaWJ1dG9ycy5cbiAqXG4gKiBjYXRiZXJyeSdzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnkgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudFJlbmRlcmVyQmFzZTtcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgYmFzaWMgZG9jdW1lbnQgcmVuZGVyZXIuXG4gKiBAcGFyYW0ge1NlcnZpY2VMb2NhdG9yfSAkc2VydmljZUxvY2F0b3IgTG9jYXRvciB0byByZXNvbHZlIGRlcGVuZGVuY2llcy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBEb2N1bWVudFJlbmRlcmVyQmFzZSgkc2VydmljZUxvY2F0b3IpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHR0aGlzLl9zZXJ2aWNlTG9jYXRvciA9ICRzZXJ2aWNlTG9jYXRvcjtcblx0dGhpcy5fY29udGV4dEZhY3RvcnkgPSAkc2VydmljZUxvY2F0b3IucmVzb2x2ZSgnY29udGV4dEZhY3RvcnknKTtcblx0dGhpcy5fY29tcG9uZW50TG9hZGVyID0gJHNlcnZpY2VMb2NhdG9yLnJlc29sdmUoJ2NvbXBvbmVudExvYWRlcicpO1xuXHR0aGlzLl9ldmVudEJ1cyA9ICRzZXJ2aWNlTG9jYXRvci5yZXNvbHZlKCdldmVudEJ1cycpO1xuXG5cdHZhciBzdG9yZUxvYWRlciA9ICRzZXJ2aWNlTG9jYXRvci5yZXNvbHZlKCdzdG9yZUxvYWRlcicpO1xuXHR0aGlzLl9sb2FkaW5nID0gUHJvbWlzZS5hbGwoW1xuXHRcdHRoaXMuX2NvbXBvbmVudExvYWRlci5sb2FkKCksXG5cdFx0c3RvcmVMb2FkZXIubG9hZCgpXG5cdF0pXG5cdFx0LnRoZW4oZnVuY3Rpb24gKCkge1xuXHRcdFx0c2VsZi5fbG9hZGluZyA9IG51bGw7XG5cdFx0XHRzZWxmLl9ldmVudEJ1cy5lbWl0KCdyZWFkeScpO1xuXHRcdH0pXG5cdFx0LmNhdGNoKGZ1bmN0aW9uIChyZWFzb24pIHtcblx0XHRcdHNlbGYuX2V2ZW50QnVzLmVtaXQoJ2Vycm9yJywgcmVhc29uKTtcblx0XHR9KTtcbn1cblxuLyoqXG4gKiBDdXJyZW50IHNlcnZpY2UgbG9jYXRvci5cbiAqIEB0eXBlIHtTZXJ2aWNlTG9jYXRvcn1cbiAqIEBwcm90ZWN0ZWRcbiAqL1xuRG9jdW1lbnRSZW5kZXJlckJhc2UucHJvdG90eXBlLl9zZXJ2aWNlTG9jYXRvciA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBjb21wb25lbnQgbG9hZGVyLlxuICogQHR5cGUge0NvbXBvbmVudExvYWRlcn1cbiAqIEBwcm90ZWN0ZWRcbiAqL1xuRG9jdW1lbnRSZW5kZXJlckJhc2UucHJvdG90eXBlLl9jb21wb25lbnRMb2FkZXIgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgbW9kdWxlIGxvYWRpbmcgcHJvbWlzZS5cbiAqIEB0eXBlIHtQcm9taXNlfVxuICogQHByb3RlY3RlZFxuICovXG5Eb2N1bWVudFJlbmRlcmVyQmFzZS5wcm90b3R5cGUuX2xvYWRpbmcgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgY29udGV4dCBmYWN0b3J5LlxuICogQHR5cGUge0NvbnRleHRGYWN0b3J5fVxuICogQHByb3RlY3RlZFxuICovXG5Eb2N1bWVudFJlbmRlcmVyQmFzZS5wcm90b3R5cGUuX2NvbnRleHRGYWN0b3J5ID0gbnVsbDtcblxuLyoqXG4gKiBHZXRzIHByb21pc2UgZm9yIHJlYWR5IHN0YXRlIHdoZW4gaXQgd2lsbCBiZSBhYmxlIGhhbmRsZSByZXF1ZXN0cy5cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIGZvciBub3RoaW5nLlxuICogQHByb3RlY3RlZFxuICovXG5Eb2N1bWVudFJlbmRlcmVyQmFzZS5wcm90b3R5cGUuX2dldFByb21pc2VGb3JSZWFkeVN0YXRlID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5fbG9hZGluZyA/XG5cdFx0dGhpcy5fbG9hZGluZyA6XG5cdFx0UHJvbWlzZS5yZXNvbHZlKCk7XG59OyIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZHVsZUFwaVByb3ZpZGVyQmFzZTtcblxudmFyIEVSUk9SX0VWRU5UX05BTUUgPSAnRXZlbnQgbmFtZSBzaG91bGQgYmUgYSBzdHJpbmcnLFxuXHRFUlJPUl9FVkVOVF9IQU5ETEVSID0gJ0V2ZW50IGhhbmRsZXIgc2hvdWxkIGJlIGEgZnVuY3Rpb24nO1xuXG4vKipcbiAqIENyZWF0ZXMgbmV3IGluc3RhbmNlIG9mIHRoZSBiYXNpYyBBUEkgcHJvdmlkZXIuXG4gKiBAcGFyYW0ge1NlcnZpY2VMb2NhdG9yfSAkc2VydmljZUxvY2F0b3IgU2VydmljZSBsb2NhdG9yXG4gKiB0byByZXNvbHZlIGRlcGVuZGVuY2llcy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBNb2R1bGVBcGlQcm92aWRlckJhc2UoJHNlcnZpY2VMb2NhdG9yKSB7XG5cdHRoaXMuX3NlcnZpY2VMb2NhdG9yID0gJHNlcnZpY2VMb2NhdG9yO1xuXHR0aGlzLl9ldmVudEJ1cyA9ICRzZXJ2aWNlTG9jYXRvci5yZXNvbHZlKCdldmVudEJ1cycpO1xufVxuXG4vKipcbiAqIEN1cnJlbnQgZXZlbnQgYnVzLlxuICogQHR5cGUge0V2ZW50RW1pdHRlcn1cbiAqIEBwcml2YXRlXG4gKi9cbk1vZHVsZUFwaVByb3ZpZGVyQmFzZS5wcm90b3R5cGUuX2V2ZW50QnVzID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IHNlcnZpY2UgbG9jYXRvci5cbiAqIEB0eXBlIHtTZXJ2aWNlTG9jYXRvcn1cbiAqIEBwcm90ZWN0ZWRcbiAqL1xuTW9kdWxlQXBpUHJvdmlkZXJCYXNlLnByb3RvdHlwZS5fc2VydmljZUxvY2F0b3IgPSBudWxsO1xuXG4vKipcbiAqIFN1YnNjcmliZXMgb24gdGhlIHNwZWNpZmllZCBldmVudCBpbiBDYXRiZXJyeS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBldmVudE5hbWUgTmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBoYW5kbGVyIEV2ZW50IGhhbmRsZXIuXG4gKiBAcmV0dXJucyB7TW9kdWxlQXBpUHJvdmlkZXJCYXNlfSBUaGlzIG9iamVjdCBmb3IgY2hhaW5pbmcuXG4gKi9cbk1vZHVsZUFwaVByb3ZpZGVyQmFzZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBoYW5kbGVyKSB7XG5cdGNoZWNrRXZlbnROYW1lQW5kSGFuZGxlcihldmVudE5hbWUsIGhhbmRsZXIpO1xuXHR0aGlzLl9ldmVudEJ1cy5vbihldmVudE5hbWUsIGhhbmRsZXIpO1xuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3Vic2NyaWJlcyBvbiB0aGUgc3BlY2lmaWVkIGV2ZW50IGluIENhdGJlcnJ5IHRvIGhhbmRsZSBvbmNlLlxuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZSBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGhhbmRsZXIgRXZlbnQgaGFuZGxlci5cbiAqIEByZXR1cm5zIHtNb2R1bGVBcGlQcm92aWRlckJhc2V9IFRoaXMgb2JqZWN0IGZvciBjaGFpbmluZy5cbiAqL1xuTW9kdWxlQXBpUHJvdmlkZXJCYXNlLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgaGFuZGxlcikge1xuXHRjaGVja0V2ZW50TmFtZUFuZEhhbmRsZXIoZXZlbnROYW1lLCBoYW5kbGVyKTtcblx0dGhpcy5fZXZlbnRCdXMub25jZShldmVudE5hbWUsIGhhbmRsZXIpO1xuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgc3BlY2lmaWVkIGhhbmRsZXIgZnJvbSB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZSBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGhhbmRsZXIgRXZlbnQgaGFuZGxlci5cbiAqIEByZXR1cm5zIHtNb2R1bGVBcGlQcm92aWRlckJhc2V9IFRoaXMgb2JqZWN0IGZvciBjaGFpbmluZy5cbiAqL1xuTW9kdWxlQXBpUHJvdmlkZXJCYXNlLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGhhbmRsZXIpIHtcblx0Y2hlY2tFdmVudE5hbWVBbmRIYW5kbGVyKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdHRoaXMuX2V2ZW50QnVzLnJlbW92ZUxpc3RlbmVyKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFsbCBoYW5kbGVycyBmcm9tIHRoZSBzcGVjaWZpZWQgZXZlbnQgaW4gQ2F0YmVycnkuXG4gKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lIE5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHJldHVybnMge01vZHVsZUFwaVByb3ZpZGVyQmFzZX0gVGhpcyBvYmplY3QgZm9yIGNoYWluaW5nLlxuICovXG5Nb2R1bGVBcGlQcm92aWRlckJhc2UucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uIChldmVudE5hbWUpIHtcblx0Y2hlY2tFdmVudE5hbWVBbmRIYW5kbGVyKGV2ZW50TmFtZSwgZHVtbXkpO1xuXHR0aGlzLl9ldmVudEJ1cy5yZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnROYW1lKTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBldmVudCBuYW1lIGlzIGEgc3RyaW5nIGFuZCBoYW5kbGVyIGlzIGEgZnVuY3Rpb24uXG4gKiBAcGFyYW0geyp9IGV2ZW50TmFtZSBOYW1lIG9mIHRoZSBldmVudCB0byBjaGVjay5cbiAqIEBwYXJhbSB7Kn0gaGFuZGxlciBUaGUgZXZlbnQgaGFuZGxlciB0byBjaGVjay5cbiAqL1xuZnVuY3Rpb24gY2hlY2tFdmVudE5hbWVBbmRIYW5kbGVyKGV2ZW50TmFtZSwgaGFuZGxlcikge1xuXHRpZiAodHlwZW9mIChldmVudE5hbWUpICE9PSAnc3RyaW5nJykge1xuXHRcdHRocm93IG5ldyBFcnJvcihFUlJPUl9FVkVOVF9OQU1FKTtcblx0fVxuXG5cdGlmICh0eXBlb2YgKGhhbmRsZXIpICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKEVSUk9SX0VWRU5UX0hBTkRMRVIpO1xuXHR9XG59XG5cbi8qKlxuICogRG9lcyBub3RoaW5nLiBJdCBpcyB1c2VkIGFzIGEgZGVmYXVsdCBjYWxsYmFjay5cbiAqL1xuZnVuY3Rpb24gZHVtbXkoKSB7fVxuIiwiLypcbiAqIGNhdGJlcnJ5XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnkncyBsaWNlbnNlIGZvbGxvd3M6XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAqIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uXG4gKiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICogcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAqIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gKiBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuICogaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuICogT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKlxuICogVGhpcyBsaWNlbnNlIGFwcGxpZXMgdG8gYWxsIHBhcnRzIG9mIGNhdGJlcnJ5IHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXG52YXIgVElUTEUgPSAnQ2F0YmVycnlANC4wLjAgKCcgK1xuXHRcdCc8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL2NhdGJlcnJ5L2NhdGJlcnJ5L2lzc3Vlc1wiICcgK1xuXHRcdCd0YXJnZXQ9XCJfYmxhbmtcIj4nICtcblx0XHQncmVwb3J0IGFuIGlzc3VlJyArXG5cdFx0JzwvYT4nICtcblx0XHQnKScsXG5cdEFNUCA9IC8mL2csXG5cdExUID0gLzwvZyxcblx0R1QgPSAvPi9nLFxuXHRRVU9UID0gL1xcXCIvZyxcblx0U0lOR0xFX1FVT1QgPSAvXFwnL2csXG5cdEVSUk9SX01FU1NBR0VfUkVHRVhQID0gL14oPzpbXFx3JF0rKTogKD86LispXFxyP1xcbi9pLFxuXHRFUlJPUl9NRVNTQUdFX0ZPUk1BVCA9ICc8c3BhbiAnICtcblx0XHQnc3R5bGU9XCJjb2xvcjogcmVkOyBmb250LXNpemU6IDE2cHQ7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPicgK1xuXHRcdCclcyVzJyArXG5cdFx0Jzwvc3Bhbj4nLFxuXHRORVdfTElORSA9IC9cXHI/XFxuL2c7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHQvKipcblx0ICogUHJpbnRzIGVycm9yIHdpdGggcHJldHR5IGZvcm1hdHRpbmcuXG5cdCAqIEBwYXJhbSB7RXJyb3J9IGVycm9yIEVycm9yIHRvIHByaW50LlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdXNlckFnZW50IFVzZXIgYWdlbnQgaW5mb3JtYXRpb24uXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgd2l0aCBhbGwgaW5mb3JtYXRpb24gYWJvdXQgZXJyb3IuXG5cdCAqL1xuXHRwcmV0dHlQcmludDogZnVuY3Rpb24gKGVycm9yLCB1c2VyQWdlbnQpIHtcblx0XHRpZiAoIWVycm9yIHx8IHR5cGVvZihlcnJvcikgIT09ICdvYmplY3QnKSB7XG5cdFx0XHRyZXR1cm4gJyc7XG5cdFx0fVxuXHRcdHZhciBkYXRlU3RyaW5nID0gKG5ldyBEYXRlKCkpLnRvVVRDU3RyaW5nKCkgKyAnOzxici8+Jyxcblx0XHRcdHVzZXJBZ2VudFN0cmluZyA9ICh1c2VyQWdlbnQgPyAodXNlckFnZW50ICsgJzs8YnIvPicpIDogJycpLFxuXHRcdFx0bmFtZSA9ICh0eXBlb2YoZXJyb3IubmFtZSkgPT09ICdzdHJpbmcnID8gZXJyb3IubmFtZSArICc6ICcgOiAnJyksXG5cdFx0XHRtZXNzYWdlID0gU3RyaW5nKGVycm9yLm1lc3NhZ2UgfHwgJycpLFxuXHRcdFx0c3RhY2sgPSBTdHJpbmcoZXJyb3Iuc3RhY2sgfHwgJycpLnJlcGxhY2UoRVJST1JfTUVTU0FHRV9SRUdFWFAsICcnKSxcblx0XHRcdGZ1bGxNZXNzYWdlID0gdXRpbC5mb3JtYXQoXG5cdFx0XHRcdEVSUk9SX01FU1NBR0VfRk9STUFULCBlc2NhcGUobmFtZSksIGVzY2FwZShtZXNzYWdlKVxuXHRcdFx0KTtcblxuXHRcdHJldHVybiAnPGRpdiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6IHdoaXRlOyBmb250LXNpemU6IDEycHQ7XCI+JyArXG5cdFx0XHRkYXRlU3RyaW5nICtcblx0XHRcdHVzZXJBZ2VudFN0cmluZyArXG5cdFx0XHRUSVRMRSArICc8YnIvPjxici8+JyArXG5cdFx0XHRmdWxsTWVzc2FnZSArICc8YnIvPjxici8+JyArXG5cdFx0XHRlc2NhcGUoc3RhY2spICtcblx0XHRcdCc8L2Rpdj4nO1xuXHR9XG59O1xuXG4vKipcbiAqIEVzY2FwZXMgZXJyb3IgdGV4dC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSBFcnJvciB0ZXh0LlxuICogQHJldHVybnMge3N0cmluZ30gZXNjYXBlZCBhbmQgZm9ybWF0dGVkIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlKHZhbHVlKSB7XG5cdHJldHVybiB2YWx1ZVxuXHRcdC5yZXBsYWNlKEFNUCwgJyZhbXA7Jylcblx0XHQucmVwbGFjZShMVCwgJyZsdDsnKVxuXHRcdC5yZXBsYWNlKEdULCAnJmd0OycpXG5cdFx0LnJlcGxhY2UoUVVPVCwgJyZxdW90OycpXG5cdFx0LnJlcGxhY2UoU0lOR0xFX1FVT1QsICcmIzM5OycpXG5cdFx0LnJlcGxhY2UoTkVXX0xJTkUsICc8YnIvPicpO1xufSIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyID0ge1xuXHRDT01QT05FTlRfUFJFRklYOiAnY2F0LScsXG5cdENPTVBPTkVOVF9QUkVGSVhfUkVHRVhQOiAvXmNhdC0vLFxuXHRDT01QT05FTlRfRVJST1JfVEVNUExBVEVfUE9TVEZJWDogJy0tZXJyb3InLFxuXHRET0NVTUVOVF9DT01QT05FTlRfTkFNRTogJ2RvY3VtZW50Jyxcblx0SEVBRF9DT01QT05FTlRfTkFNRTogJ2hlYWQnLFxuXHRBVFRSSUJVVEVfSUQ6ICdpZCcsXG5cdEFUVFJJQlVURV9TVE9SRTogJ2NhdC1zdG9yZScsXG5cdERFRkFVTFRfTE9HSUNfRklMRU5BTUU6ICdpbmRleC5qcycsXG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgbmFtZSBmb3IgZXJyb3IgdGVtcGxhdGUgb2YgY29tcG9uZW50LlxuXHQgKiBAcGFyYW0ge1N0cmluZ30gY29tcG9uZW50TmFtZSBuYW1lIG9mIGNvbXBvbmVudC5cblx0ICogQHJldHVybnMge3N0cmluZ30gTmFtZSBvZiBlcnJvciB0ZW1wbGF0ZSBvZiB0aGUgY29tcG9uZW50LlxuXHQgKi9cblx0Z2V0TmFtZUZvckVycm9yVGVtcGxhdGU6IGZ1bmN0aW9uIChjb21wb25lbnROYW1lKSB7XG5cdFx0aWYgKHR5cGVvZihjb21wb25lbnROYW1lKSAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiAnJztcblx0XHR9XG5cdFx0cmV0dXJuIGNvbXBvbmVudE5hbWUgKyBoZWxwZXIuQ09NUE9ORU5UX0VSUk9SX1RFTVBMQVRFX1BPU1RGSVg7XG5cdH0sXG5cblx0LyoqXG5cdCAqIERldGVybWluZXMgaWYgc3BlY2lmaWVkIGNvbXBvbmVudCBuYW1lIGlzIHRoZSBcImRvY3VtZW50XCIgY29tcG9uZW50IG5hbWUuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBjb21wb25lbnROYW1lIE5hbWUgb2YgdGhlIGNvbXBvbmVudC5cblx0ICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgc3BlY2lmaWVkIGNvbXBvbmVudCBpcyB0aGUgXCJkb2N1bWVudFwiIGNvbXBvbmVudC5cblx0ICovXG5cdGlzRG9jdW1lbnRDb21wb25lbnQ6IGZ1bmN0aW9uIChjb21wb25lbnROYW1lKSB7XG5cdFx0cmV0dXJuIGNvbXBvbmVudE5hbWUudG9Mb3dlckNhc2UoKSA9PT0gaGVscGVyLkRPQ1VNRU5UX0NPTVBPTkVOVF9OQU1FO1xuXHR9LFxuXHQvKipcblx0ICogRGV0ZXJtaW5lcyBpZiBzcGVjaWZpZWQgY29tcG9uZW50IG5hbWUgaXMgdGhlIFwiaGVhZFwiIGNvbXBvbmVudCBuYW1lLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50TmFtZSBOYW1lIG9mIHRoZSBjb21wb25lbnQuXG5cdCAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHNwZWNpZmllZCBjb21wb25lbnQgaXMgdGhlIFwiaGVhZFwiIGNvbXBvbmVudC5cblx0ICovXG5cdGlzSGVhZENvbXBvbmVudDogZnVuY3Rpb24gKGNvbXBvbmVudE5hbWUpIHtcblx0XHRyZXR1cm4gY29tcG9uZW50TmFtZS50b0xvd2VyQ2FzZSgpID09PSBoZWxwZXIuSEVBRF9DT01QT05FTlRfTkFNRTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cyB0aGUgb3JpZ2luYWwgY29tcG9uZW50IG5hbWUgd2l0aG91dCBwcmVmaXguXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBmdWxsQ29tcG9uZW50TmFtZSBGdWxsIGNvbXBvbmVudCBuYW1lICh0YWcgbmFtZSkuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBvcmlnaW5hbCBjb21wb25lbnQgbmFtZSB3aXRob3V0IHByZWZpeC5cblx0ICovXG5cdGdldE9yaWdpbmFsQ29tcG9uZW50TmFtZTogZnVuY3Rpb24gKGZ1bGxDb21wb25lbnROYW1lKSB7XG5cdFx0aWYgKHR5cGVvZiAoZnVsbENvbXBvbmVudE5hbWUpICE9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuICcnO1xuXHRcdH1cblx0XHRmdWxsQ29tcG9uZW50TmFtZSA9IGZ1bGxDb21wb25lbnROYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0aWYgKGZ1bGxDb21wb25lbnROYW1lID09PSBoZWxwZXIuSEVBRF9DT01QT05FTlRfTkFNRSkge1xuXHRcdFx0cmV0dXJuIGZ1bGxDb21wb25lbnROYW1lO1xuXHRcdH1cblx0XHRpZiAoZnVsbENvbXBvbmVudE5hbWUgPT09IGhlbHBlci5ET0NVTUVOVF9DT01QT05FTlRfTkFNRSkge1xuXHRcdFx0cmV0dXJuIGZ1bGxDb21wb25lbnROYW1lO1xuXHRcdH1cblx0XHRyZXR1cm4gZnVsbENvbXBvbmVudE5hbWUucmVwbGFjZShoZWxwZXIuQ09NUE9ORU5UX1BSRUZJWF9SRUdFWFAsICcnKTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cyB2YWxpZCB0YWcgbmFtZSBmb3IgY29tcG9uZW50LlxuXHQgKiBAcGFyYW0ge1N0cmluZ30gY29tcG9uZW50TmFtZSBOYW1lIG9mIHRoZSBjb21wb25lbnQuXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IE5hbWUgb2YgdGhlIHRhZy5cblx0ICovXG5cdGdldFRhZ05hbWVGb3JDb21wb25lbnROYW1lOiBmdW5jdGlvbiAoY29tcG9uZW50TmFtZSkge1xuXHRcdGlmICh0eXBlb2YoY29tcG9uZW50TmFtZSkgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gJyc7XG5cdFx0fVxuXHRcdHZhciB1cHBlckNvbXBvbmVudE5hbWUgPSBjb21wb25lbnROYW1lLnRvVXBwZXJDYXNlKCk7XG5cdFx0aWYgKGNvbXBvbmVudE5hbWUgPT09IGhlbHBlci5IRUFEX0NPTVBPTkVOVF9OQU1FKSB7XG5cdFx0XHRyZXR1cm4gdXBwZXJDb21wb25lbnROYW1lO1xuXHRcdH1cblx0XHRpZiAoY29tcG9uZW50TmFtZSA9PT0gaGVscGVyLkRPQ1VNRU5UX0NPTVBPTkVOVF9OQU1FKSB7XG5cdFx0XHRyZXR1cm4gdXBwZXJDb21wb25lbnROYW1lO1xuXHRcdH1cblx0XHRyZXR1cm4gaGVscGVyLkNPTVBPTkVOVF9QUkVGSVgudG9VcHBlckNhc2UoKSArIHVwcGVyQ29tcG9uZW50TmFtZTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cyBtZXRob2Qgb2YgdGhlIG1vZHVsZSB0aGF0IGNhbiBiZSBpbnZva2VkLlxuXHQgKiBAcGFyYW0ge09iamVjdH0gbW9kdWxlIE1vZHVsZSBpbXBsZW1lbnRhdGlvbi5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHByZWZpeCBNZXRob2QgcHJlZml4IChpLmUuIGhhbmRsZSkuXG5cdCAqIEBwYXJhbSB7c3RyaW5nP30gbmFtZSBOYW1lIG9mIHRoZSBlbnRpdHkgdG8gaW52b2tlIG1ldGhvZCBmb3Jcblx0ICogKHdpbGwgYmUgY29udmVydGVkIHRvIGNhbWVsIGNhc2luZykuXG5cdCAqIEByZXR1cm5zIHtGdW5jdGlvbn0gTWV0aG9kIHRvIGludm9rZS5cblx0ICovXG5cdGdldE1ldGhvZFRvSW52b2tlOiBmdW5jdGlvbiAobW9kdWxlLCBwcmVmaXgsIG5hbWUpIHtcblx0XHRpZiAoIW1vZHVsZSB8fCB0eXBlb2YobW9kdWxlKSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdHJldHVybiBkZWZhdWx0UHJvbWlzZU1ldGhvZDtcblx0XHR9XG5cdFx0dmFyIG1ldGhvZE5hbWUgPSBoZWxwZXIuZ2V0Q2FtZWxDYXNlTmFtZShwcmVmaXgsIG5hbWUpO1xuXHRcdGlmICh0eXBlb2YobW9kdWxlW21ldGhvZE5hbWVdKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cmV0dXJuIG1vZHVsZVttZXRob2ROYW1lXS5iaW5kKG1vZHVsZSk7XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YobW9kdWxlW3ByZWZpeF0pID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRyZXR1cm4gbW9kdWxlW3ByZWZpeF0uYmluZChtb2R1bGUsIG5hbWUpO1xuXHRcdH1cblxuXHRcdHJldHVybiBkZWZhdWx0UHJvbWlzZU1ldGhvZDtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cyBuYW1lIGluIGNhbWVsIGNhc2luZyBmb3IgZXZlcnl0aGluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHByZWZpeCBQcmVmaXggZm9yIHRoZSBuYW1lLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIHRvIGNvbnZlcnQuXG5cdCAqL1xuXHRnZXRDYW1lbENhc2VOYW1lOiBmdW5jdGlvbiAocHJlZml4LCBuYW1lKSB7XG5cdFx0aWYgKCFuYW1lKSB7XG5cdFx0XHRyZXR1cm4gJyc7XG5cdFx0fVxuXHRcdHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoL1teYS16MC05XS9pKSxcblx0XHRcdGNhbWVsQ2FzZU5hbWUgPSBTdHJpbmcocHJlZml4IHx8ICcnKTtcblxuXHRcdHBhcnRzLmZvckVhY2goZnVuY3Rpb24gKHBhcnQpIHtcblx0XHRcdGlmICghcGFydCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGZpcnN0IGNoYXJhY3RlciBpbiBtZXRob2QgbmFtZSBtdXN0IGJlIGluIGxvd2VyY2FzZVxuXHRcdFx0Y2FtZWxDYXNlTmFtZSArPSBjYW1lbENhc2VOYW1lID9cblx0XHRcdFx0cGFydFswXS50b1VwcGVyQ2FzZSgpIDpcblx0XHRcdFx0cGFydFswXS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0Y2FtZWxDYXNlTmFtZSArPSBwYXJ0LnN1YnN0cmluZygxKTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBjYW1lbENhc2VOYW1lO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIHNhZmUgcHJvbWlzZSByZXNvbHZlZCBmcm9tIGFjdGlvbi5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gYWN0aW9uIEFjdGlvbiB0byB3cmFwIHdpdGggc2FmZSBwcm9taXNlLlxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZX1cblx0ICovXG5cdGdldFNhZmVQcm9taXNlOiBmdW5jdGlvbiAoYWN0aW9uKSB7XG5cdFx0dmFyIHByb21pc2U7XG5cdFx0dHJ5IHtcblx0XHRcdHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoYWN0aW9uKCkpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHByb21pc2UgPSBQcm9taXNlLnJlamVjdChlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcHJvbWlzZTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBoZWxwZXI7XG5cbi8qKlxuICogSnVzdCByZXR1cm5zIHJlc29sdmVkIHByb21pc2UuXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSBmb3Igbm90aGluZy5cbiAqL1xuZnVuY3Rpb24gZGVmYXVsdFByb21pc2VNZXRob2QoKSB7XG5cdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbn0iLCIvKlxuICogY2F0YmVycnlcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgRGVuaXMgUmVjaGt1bm92IGFuZCBwcm9qZWN0IGNvbnRyaWJ1dG9ycy5cbiAqXG4gKiBjYXRiZXJyeSdzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnkgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdC8qKlxuXHQgKiBEZWZpbmVzIHJlYWQtb25seSBwcm9wZXJ0eS5cblx0ICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBPYmplY3QgdG8gZGVmaW5lIHByb3BlcnR5IGluLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBwcm9wZXJ0eS5cblx0ICogQHBhcmFtIHsqfSB2YWx1ZSBQcm9wZXJ0eSB2YWx1ZS5cblx0ICovXG5cdGRlZmluZVJlYWRPbmx5OiBmdW5jdGlvbiAob2JqZWN0LCBuYW1lLCB2YWx1ZSkge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHtcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcblx0XHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRcdHZhbHVlOiB2YWx1ZVxuXHRcdH0pO1xuXHR9XG59OyIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgUEFUSF9FTkRfU0xBU0hfUkVHX0VYUCA9IC8oLispXFwvKCR8XFw/fCMpLyxcblx0RVhQUkVTU0lPTl9FU0NBUEVfUkVHX0VYUCA9IC9bXFwtXFxbXFxdXFx7XFx9XFwoXFwpXFwqXFwrXFw/XFwuXFxcXFxcXlxcJFxcfF0vZyxcblx0SURFTlRJRklFUl9SRUdfRVhQX1NPVVJDRSA9ICdbJEEtWl9dW1xcXFxkQS1aXyRdKicsXG5cdFNUT1JFX0xJU1RfUkVHX0VYUF9TT1VSQ0UgPSAnKD86KD86XFxcXFxcXFxbWyBdKicgK1xuXHRcdCdbXlxcXFxbXFxcXF0sXSsnICtcblx0XHQnKFsgXSosWyBdKicgK1xuXHRcdCdbXlxcXFxbXFxcXF0sXSsnICtcblx0XHQnKSpbIF0qXFxcXFxcXFxdKXwoPzpcXFxcXFxcXFtbIF0qXFxcXFxcXFxdKSk/Jyxcblx0UEFSQU1FVEVSX1JFR19FWFAgPSBuZXcgUmVnRXhwKFxuXHRcdFx0JzonICtcblx0XHRcdElERU5USUZJRVJfUkVHX0VYUF9TT1VSQ0UgK1xuXHRcdFx0U1RPUkVfTElTVF9SRUdfRVhQX1NPVVJDRSwgJ2dpJyksXG5cdFVSSV9SRVBMQUNFTUVOVF9SRUdfRVhQX1NPVVJDRSA9ICcoW15cXFxcL1xcXFxcXFxcJlxcXFw/PV0qKScsXG5cdFNMQVNIRURfQlJBQ0tFVFNfUkVHX0VYUCA9IC9cXFxcXFxbfFxcXFxcXF0vLFxuXHRTVE9SRV9MSVNUX1NFUEFSQVRPUiA9ICcsJztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdC8qKlxuXHQgKiBSZW1vdmVzIHNsYXNoIGZyb20gdGhlIGVuZCBvZiBVUkkgcGF0aC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHVyaVBhdGggVVJJIHBhdGggdG8gcHJvY2Vzcy5cblx0ICogQHJldHVybnMge3N0cmluZ31cblx0ICovXG5cdHJlbW92ZUVuZFNsYXNoOiBmdW5jdGlvbiAodXJpUGF0aCkge1xuXHRcdGlmICghdXJpUGF0aCB8fCB0eXBlb2YodXJpUGF0aCkgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gJyc7XG5cdFx0fVxuXHRcdGlmICh1cmlQYXRoID09PSAnLycpIHtcblx0XHRcdHJldHVybiB1cmlQYXRoO1xuXHRcdH1cblx0XHRyZXR1cm4gdXJpUGF0aC5yZXBsYWNlKFBBVEhfRU5EX1NMQVNIX1JFR19FWFAsICckMSQyJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXRzIFVSSSBtYXBwZXIgZnJvbSB0aGUgcm91dGUgZXhwcmVzc2lvbiBsaWtlXG5cdCAqIC9zb21lLzppZFtzdG9yZTEsIHN0b3JlMiwgc3RvcmUzXS9kZXRhaWxzP2ZpbHRlcj06ZmlsdGVyW3N0b3JlM11cblx0ICogQHBhcmFtIHtzdHJpbmd9IHJvdXRlRXhwcmVzc2lvbiBFeHByZXNzaW9uIHRoYXQgZGVmaW5lcyByb3V0ZS5cblx0ICogQHJldHVybnMge3tleHByZXNzaW9uOiBSZWdFeHAsIG1hcDogRnVuY3Rpb259fSBVUkkgbWFwcGVyIG9iamVjdC5cblx0ICovXG5cdGdldFVyaU1hcHBlckJ5Um91dGU6IGZ1bmN0aW9uIChyb3V0ZUV4cHJlc3Npb24pIHtcblx0XHRpZiAoIXJvdXRlRXhwcmVzc2lvbiB8fCB0eXBlb2Yocm91dGVFeHByZXNzaW9uKSAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblxuXHRcdHJvdXRlRXhwcmVzc2lvbiA9IG1vZHVsZS5leHBvcnRzLnJlbW92ZUVuZFNsYXNoKHJvdXRlRXhwcmVzc2lvbik7XG5cblx0XHQvLyBlc2NhcGUgcmVndWxhciBleHByZXNzaW9uIGNoYXJhY3RlcnNcblx0XHRyb3V0ZUV4cHJlc3Npb24gPSByb3V0ZUV4cHJlc3Npb24ucmVwbGFjZShcblx0XHRcdEVYUFJFU1NJT05fRVNDQVBFX1JFR19FWFAsICdcXFxcJCYnKTtcblxuXHRcdC8vIGdldCBhbGwgb2NjdXJyZW5jZXMgb2Ygcm91dGluZyBwYXJhbWV0ZXJzXG5cdFx0dmFyIHJlZ0V4cFNvdXJjZSA9ICdeJyArIHJvdXRlRXhwcmVzc2lvbi5yZXBsYWNlKFxuXHRcdFx0XHRQQVJBTUVURVJfUkVHX0VYUCxcblx0XHRcdFx0VVJJX1JFUExBQ0VNRU5UX1JFR19FWFBfU09VUkNFKSArICckJyxcblx0XHRcdHBhcmFtZXRlck1hdGNoZXMgPSByb3V0ZUV4cHJlc3Npb24ubWF0Y2goUEFSQU1FVEVSX1JFR19FWFApLFxuXHRcdFx0cGFyYW1ldGVycyA9ICFwYXJhbWV0ZXJNYXRjaGVzIHx8IHBhcmFtZXRlck1hdGNoZXMubGVuZ3RoID09PSAwID9cblx0XHRcdFx0W10gOiBwYXJhbWV0ZXJNYXRjaGVzLm1hcChnZXRQYXJhbWV0ZXJEZXNjcmlwdGlvbik7XG5cblx0XHR2YXIgZXhwcmVzc2lvbiA9IG5ldyBSZWdFeHAocmVnRXhwU291cmNlLCAnaScpO1xuXHRcdHJldHVybiBjcmVhdGVVcmlNYXBwZXJGcm9tRXhwcmVzc2lvbihleHByZXNzaW9uLCBwYXJhbWV0ZXJzKTtcblx0fVxufTtcblxuLyoqXG4gKiBHZXRzIGRlc2NyaXB0aW9uIG9mIHBhcmFtZXRlcnMgZnJvbSBpdHMgZXhwcmVzc2lvbi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbWV0ZXIgUGFyYW1ldGVyIGV4cHJlc3Npb24uXG4gKiBAcmV0dXJucyB7e25hbWU6IHN0cmluZywgc3RvcmVOYW1lczogQXJyYXl9fSBQYXJhbWV0ZXIgZGVzY3JpcHRvci5cbiAqL1xuZnVuY3Rpb24gZ2V0UGFyYW1ldGVyRGVzY3JpcHRpb24ocGFyYW1ldGVyKSB7XG5cdHZhciBwYXJ0cyA9IHBhcmFtZXRlci5zcGxpdChTTEFTSEVEX0JSQUNLRVRTX1JFR19FWFApO1xuXG5cdHJldHVybiB7XG5cdFx0bmFtZTogcGFydHNbMF1cblx0XHRcdC50cmltKClcblx0XHRcdC5zdWJzdHJpbmcoMSksXG5cdFx0c3RvcmVOYW1lczogKHBhcnRzWzFdID8gcGFydHNbMV0gOiAnJylcblx0XHRcdC5zcGxpdChTVE9SRV9MSVNUX1NFUEFSQVRPUilcblx0XHRcdC5tYXAoZnVuY3Rpb24gKHN0b3JlTmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gc3RvcmVOYW1lLnRyaW0oKTtcblx0XHRcdH0pXG5cdFx0XHQuZmlsdGVyKGZ1bmN0aW9uIChzdG9yZU5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIHN0b3JlTmFtZS5sZW5ndGggPiAwO1xuXHRcdFx0fSlcblx0fTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBVUkktdG8tc3RhdGUgb2JqZWN0IG1hcHBlci5cbiAqIEBwYXJhbSB7UmVnRXhwfSBleHByZXNzaW9uIFJlZ3VsYXIgZXhwcmVzc2lvbiB0byBjaGVjayBVUklzLlxuICogQHBhcmFtIHtBcnJheX0gcGFyYW1ldGVycyBMaXN0IG9mIHBhcmFtZXRlciBkZXNjcmlwdG9ycy5cbiAqIEByZXR1cm5zIHt7ZXhwcmVzc2lvbjogUmVnRXhwLCBtYXA6IEZ1bmN0aW9ufX0gVVJJIG1hcHBlciBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVVyaU1hcHBlckZyb21FeHByZXNzaW9uKGV4cHJlc3Npb24sIHBhcmFtZXRlcnMpIHtcblx0cmV0dXJuIHtcblx0XHRleHByZXNzaW9uOiBleHByZXNzaW9uLFxuXHRcdG1hcDogZnVuY3Rpb24gKHVyaSkge1xuXHRcdFx0dmFyIG1hdGNoZXMgPSB1cmkubWF0Y2goZXhwcmVzc2lvbiksXG5cdFx0XHRcdHN0YXRlID0ge307XG5cblx0XHRcdGlmICghbWF0Y2hlcyB8fCBtYXRjaGVzLmxlbmd0aCA8IDIpIHtcblx0XHRcdFx0cmV0dXJuIHN0YXRlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdGFydCB3aXRoIHNlY29uZCBtYXRjaCBiZWNhdXNlIGZpcnN0IG1hdGNoIGlzIGFsd2F5c1xuXHRcdFx0Ly8gdGhlIHdob2xlIFVSSVxuXHRcdFx0bWF0Y2hlcyA9IG1hdGNoZXMuc3BsaWNlKDEpO1xuXG5cdFx0XHRwYXJhbWV0ZXJzLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtZXRlciwgaW5kZXgpIHtcblx0XHRcdFx0cGFyYW1ldGVyLnN0b3JlTmFtZXMuZm9yRWFjaChmdW5jdGlvbiAoc3RvcmVOYW1lKSB7XG5cdFx0XHRcdFx0aWYgKCFzdGF0ZVtzdG9yZU5hbWVdKSB7XG5cdFx0XHRcdFx0XHRzdGF0ZVtzdG9yZU5hbWVdID0ge307XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN0YXRlW3N0b3JlTmFtZV1bcGFyYW1ldGVyLm5hbWVdID1cblx0XHRcdFx0XHRcdG1hdGNoZXNbaW5kZXhdO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gc3RhdGU7XG5cdFx0fVxuXHR9O1xufSIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0YXRlUHJvdmlkZXI7XG5cbnZhciByb3V0ZUhlbHBlciA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9yb3V0ZUhlbHBlcicpO1xuXG4vKipcbiAqIENyZWF0ZSBuZXcgaW5zdGFuY2Ugb2YgdGhlIHN0YXRlIHByb3ZpZGVyLlxuICogQHBhcmFtIHtTZXJ2aWNlTG9jYXRvcn0gJHNlcnZpY2VMb2NhdG9yIFNlcnZpY2UgbG9jYXRvclxuICogdG8gcmVzb2x2ZSBVUkkgbWFwcGVycy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBTdGF0ZVByb3ZpZGVyKCRzZXJ2aWNlTG9jYXRvcikge1xuXHR0aGlzLl91cmlNYXBwZXJzID0gZ2V0VXJpTWFwcGVycygkc2VydmljZUxvY2F0b3IpO1xufVxuXG4vKipcbiAqIEN1cnJlbnQgbGlzdCBvZiBVUkkgbWFwcGVycy5cbiAqIEB0eXBlIHtBcnJheX1cbiAqIEBwcml2YXRlXG4gKi9cblN0YXRlUHJvdmlkZXIucHJvdG90eXBlLl91cmlNYXBwZXJzID0gbnVsbDtcblxuLyoqXG4gKiBHZXRzIHN0YXRlIGJ5IHNwZWNpZmllZCBsb2NhdGlvbiBVUkkuXG4gKiBAcGFyYW0ge1VSSX0gbG9jYXRpb24gVVJJIGxvY2F0aW9uLlxuICogQHJldHVybnMge09iamVjdH0gU3RhdGUgb2JqZWN0LlxuICovXG5TdGF0ZVByb3ZpZGVyLnByb3RvdHlwZS5nZXRTdGF0ZUJ5VXJpID0gZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG5cdGlmICh0aGlzLl91cmlNYXBwZXJzLmxlbmd0aCA9PT0gMCkge1xuXHRcdHJldHVybiB7fTtcblx0fVxuXG5cdHZhciBzaG9ydExvY2F0aW9uID0gcm91dGVIZWxwZXIucmVtb3ZlRW5kU2xhc2gobG9jYXRpb24ucGF0aCksXG5cdFx0c3RhdGUgPSBudWxsO1xuXHRpZiAobG9jYXRpb24ucXVlcnkpIHtcblx0XHRzaG9ydExvY2F0aW9uICs9ICc/JyArIGxvY2F0aW9uLnF1ZXJ5LnRvU3RyaW5nKCk7XG5cdH1cblxuXHR0aGlzLl91cmlNYXBwZXJzLnNvbWUoZnVuY3Rpb24gKG1hcHBlcikge1xuXHRcdGlmIChtYXBwZXIuZXhwcmVzc2lvbi50ZXN0KHNob3J0TG9jYXRpb24pKSB7XG5cdFx0XHRzdGF0ZSA9IG1hcHBlci5tYXAoc2hvcnRMb2NhdGlvbikgfHwge307XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9KTtcblxuXHRpZiAoIXN0YXRlKSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHQvLyBtYWtlIHN0YXRlIG9iamVjdCBpbW11dGFibGVcblx0T2JqZWN0LmtleXMoc3RhdGUpXG5cdFx0LmZvckVhY2goZnVuY3Rpb24gKHN0b3JlTmFtZSkge1xuXHRcdFx0T2JqZWN0LmZyZWV6ZShzdGF0ZVtzdG9yZU5hbWVdKTtcblx0XHR9KTtcblx0T2JqZWN0LmZyZWV6ZShzdGF0ZSk7XG5cblx0cmV0dXJuIHN0YXRlO1xufTtcblxuLyoqXG4gKiBHZXRzIGxpc3Qgb2YgVVJJIG1hcHBlcnMuXG4gKiBAcGFyYW0ge1NlcnZpY2VMb2NhdG9yfSBzZXJ2aWNlTG9jYXRvciBTZXJ2aWNlIGxvY2F0b3IgdG8gZ2V0IHJvdXRlXG4gKiBkZWZpbml0aW9ucy5cbiAqIEByZXR1cm5zIHtBcnJheX0gTGlzdCBvZiBVUkkgbWFwcGVycy5cbiAqL1xuZnVuY3Rpb24gZ2V0VXJpTWFwcGVycyhzZXJ2aWNlTG9jYXRvcikge1xuXHR2YXIgdXJpTWFwcGVycyA9IFtdO1xuXG5cdHNlcnZpY2VMb2NhdG9yXG5cdFx0LnJlc29sdmVBbGwoJ3JvdXRlRGVmaW5pdGlvbicpXG5cdFx0LmZvckVhY2goZnVuY3Rpb24gKHJvdXRlKSB7XG5cdFx0XHQvLyBqdXN0IGNvbG9uLXBhcmFtZXRyaXplZCBzdHJpbmdcblx0XHRcdGlmICh0eXBlb2Yocm91dGUpID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHR1cmlNYXBwZXJzLnB1c2gocm91dGVIZWxwZXIuZ2V0VXJpTWFwcGVyQnlSb3V0ZShyb3V0ZSkpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGV4dGVuZGVkIGNvbG9uLXBhcmFtZXRyaXplZCBtYXBwZXJcblx0XHRcdGlmICh0eXBlb2Yocm91dGUpID09PSAnb2JqZWN0JyAmJlxuXHRcdFx0XHQodHlwZW9mKHJvdXRlLmV4cHJlc3Npb24pID09PSAnc3RyaW5nJykgJiZcblx0XHRcdFx0KHJvdXRlLm1hcCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuXHRcdFx0XHR2YXIgbWFwcGVyID0gcm91dGVIZWxwZXIuZ2V0VXJpTWFwcGVyQnlSb3V0ZShyb3V0ZS5leHByZXNzaW9uKTtcblx0XHRcdFx0dXJpTWFwcGVycy5wdXNoKHtcblx0XHRcdFx0XHRleHByZXNzaW9uOiBtYXBwZXIuZXhwcmVzc2lvbixcblx0XHRcdFx0XHRtYXA6IGZ1bmN0aW9uICh1cmlQYXRoKSB7XG5cdFx0XHRcdFx0XHR2YXIgc3RhdGUgPSBtYXBwZXIubWFwKHVyaVBhdGgpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJvdXRlLm1hcChzdGF0ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyByZWd1bGFyIGV4cHJlc3Npb24gbWFwcGVyXG5cdFx0XHRpZiAodHlwZW9mKHJvdXRlKSA9PT0gJ29iamVjdCcgJiZcblx0XHRcdFx0KHJvdXRlLmV4cHJlc3Npb24gaW5zdGFuY2VvZiBSZWdFeHApICYmXG5cdFx0XHRcdChyb3V0ZS5tYXAgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcblx0XHRcdFx0dXJpTWFwcGVycy5wdXNoKHJvdXRlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0cmV0dXJuIHVyaU1hcHBlcnM7XG59IiwiLypcbiAqIGNhdGJlcnJ5LWxvY2F0b3JcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgRGVuaXMgUmVjaGt1bm92IGFuZCBwcm9qZWN0IGNvbnRyaWJ1dG9ycy5cbiAqXG4gKiBjYXRiZXJyeS1sb2NhdG9yJ3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeS1sb2NhdG9yIHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29uc3RydWN0b3JUb2tlbml6ZXI7XG5cbnZhciBTVEFURVMgPSB7XG5cdElMTEVHQUw6IC0xLFxuXHROTzogMCxcblx0SURFTlRJRklFUjogMSxcblx0RlVOQ1RJT046IDIsXG5cdFBBUkVOVEhFU0VTX09QRU46IDMsXG5cdFBBUkVOVEhFU0VTX0NMT1NFOiA0LFxuXHRDT01NQTogNSxcblx0RU5EOiA2XG59O1xuQ29uc3RydWN0b3JUb2tlbml6ZXIuU1RBVEVTID0gU1RBVEVTO1xuXG52YXIgS0VZV09SRFMgPSB7XG5cdEZVTkNUSU9OOiAnZnVuY3Rpb24nXG59O1xuXG52YXIgV0hJVEVTUEFDRV9URVNUID0gL15cXHMkLyxcblx0SURFTlRJRklFUl9URVNUID0gL15bXFwkXFx3XSQvO1xuXG5mdW5jdGlvbiBDb25zdHJ1Y3RvclRva2VuaXplcihjb25zdHJ1Y3RvclNvdXJjZSkge1xuXHR0aGlzLl9zb3VyY2UgPSBTdHJpbmcoY29uc3RydWN0b3JTb3VyY2UgfHwgJycpO1xufVxuXG4vKipcbiAqIEN1cnJlbnQgc291cmNlIGNvZGUgb2YgY29uc3RydWN0b3IuXG4gKiBAdHlwZSB7c3RyaW5nfVxuICogQHByaXZhdGVcbiAqL1xuQ29uc3RydWN0b3JUb2tlbml6ZXIucHJvdG90eXBlLl9zb3VyY2UgPSAnJztcblxuLyoqXG4gKiBDdXJyZW50IGluZGV4IGluIHNvdXJjZSBjb2RlLlxuICogQHR5cGUge251bWJlcn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbnN0cnVjdG9yVG9rZW5pemVyLnByb3RvdHlwZS5fY3VycmVudEluZGV4ID0gMDtcblxuLyoqXG4gKiBDdXJyZW50IGluZGV4IGluIHNvdXJjZSBjb2RlLlxuICogQHR5cGUge251bWJlcn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbnN0cnVjdG9yVG9rZW5pemVyLnByb3RvdHlwZS5fY3VycmVudEVuZCA9IDA7XG5cbi8qKlxuICogQ3VycmVudCBzdGF0ZS5cbiAqIEB0eXBlIHtudW1iZXJ9XG4gKiBAcHJpdmF0ZVxuICovXG5Db25zdHJ1Y3RvclRva2VuaXplci5wcm90b3R5cGUuX2N1cnJlbnRTdGF0ZSA9IFNUQVRFUy5OTztcblxuLyoqXG4gKiBHZXRzIG5leHQgdG9rZW4gaW4gc291cmNlLlxuICogQHJldHVybnMge3tzdGF0ZTogKG51bWJlciksIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyfX1cbiAqL1xuQ29uc3RydWN0b3JUb2tlbml6ZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9jdXJyZW50U3RhdGUgPT09IFNUQVRFUy5JTExFR0FMIHx8XG5cdFx0dGhpcy5fY3VycmVudFN0YXRlID09PSBTVEFURVMuRU5EKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHN0YXRlOiB0aGlzLl9jdXJyZW50U3RhdGUsXG5cdFx0XHRzdGFydDogdGhpcy5fY3VycmVudEluZGV4LFxuXHRcdFx0ZW5kOiB0aGlzLl9jdXJyZW50SW5kZXggKyAxXG5cdFx0fTtcblx0fVxuXG5cdHZhciBzdGFydCA9IHRoaXMuX2N1cnJlbnRJbmRleCxcblx0XHRzdGF0ZSA9IHRoaXMuX2N1cnJlbnRTdGF0ZTtcblxuXHRzd2l0Y2ggKHRoaXMuX2N1cnJlbnRTdGF0ZSkge1xuXHRcdGNhc2UgU1RBVEVTLlBBUkVOVEhFU0VTX09QRU46XG5cdFx0XHR0aGlzLnBhcmVudGhlc2VzT3BlblN0YXRlKCk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIFNUQVRFUy5QQVJFTlRIRVNFU19DTE9TRTpcblx0XHRcdHRoaXMucGFyZW50aGVzZXNDbG9zZVN0YXRlKCk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIFNUQVRFUy5JREVOVElGSUVSOlxuXHRcdFx0dGhpcy5pZGVudGlmaWVyU3RhdGUoKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgU1RBVEVTLkNPTU1BOlxuXHRcdFx0dGhpcy5jb21tYVN0YXRlKCk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIFNUQVRFUy5GVU5DVElPTjpcblx0XHRcdHRoaXMuZnVuY3Rpb25TdGF0ZSgpO1xuXHRcdFx0YnJlYWs7XG5cdFx0ZGVmYXVsdDpcblx0XHRcdHRoaXMuc2tpcFdoaXRlc3BhY2UoKTtcblx0XHRcdHZhciBleHBlY3RlZCA9IHRoaXMuX3NvdXJjZS5zdWJzdHIoXG5cdFx0XHRcdHRoaXMuX2N1cnJlbnRJbmRleCwgS0VZV09SRFMuRlVOQ1RJT04ubGVuZ3RoXG5cdFx0XHQpO1xuXHRcdFx0aWYgKGV4cGVjdGVkID09PSBLRVlXT1JEUy5GVU5DVElPTikge1xuXHRcdFx0XHR0aGlzLl9jdXJyZW50U3RhdGUgPSBTVEFURVMuRlVOQ1RJT047XG5cdFx0XHRcdHJldHVybiB0aGlzLm5leHQoKTtcblx0XHRcdH1cblxuXHRcdFx0c3RhdGUgPSBTVEFURVMuSUxMRUdBTDtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0c3RhdGU6IHN0YXRlLFxuXHRcdHN0YXJ0OiBzdGFydCxcblx0XHRlbmQ6IHRoaXMuX2N1cnJlbnRFbmRcblx0fTtcbn07XG5cbi8qKlxuICogU2tpcHMgYWxsIHdoaXRlc3BhY2UgY2hhcmFjdGVycy5cbiAqL1xuQ29uc3RydWN0b3JUb2tlbml6ZXIucHJvdG90eXBlLnNraXBXaGl0ZXNwYWNlID0gZnVuY3Rpb24gKCkge1xuXHR3aGlsZSAoXG5cdFx0dGhpcy5fY3VycmVudEluZGV4IDwgdGhpcy5fc291cmNlLmxlbmd0aCAmJlxuXHRcdFdISVRFU1BBQ0VfVEVTVC50ZXN0KHRoaXMuX3NvdXJjZVt0aGlzLl9jdXJyZW50SW5kZXhdKSkge1xuXHRcdHRoaXMuX2N1cnJlbnRJbmRleCsrO1xuXHR9XG59O1xuXG4vKipcbiAqIERlc2NyaWJlcyBQQVJFTlRIRVNFU19PUEVOIHN0YXRlIG9mIG1hY2hpbmUuXG4gKi9cbkNvbnN0cnVjdG9yVG9rZW5pemVyLnByb3RvdHlwZS5wYXJlbnRoZXNlc09wZW5TdGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fY3VycmVudEluZGV4Kys7XG5cdHRoaXMuX2N1cnJlbnRFbmQgPSB0aGlzLl9jdXJyZW50SW5kZXg7XG5cblx0dGhpcy5za2lwV2hpdGVzcGFjZSgpO1xuXHRpZiAoSURFTlRJRklFUl9URVNULnRlc3QodGhpcy5fc291cmNlW3RoaXMuX2N1cnJlbnRJbmRleF0pKSB7XG5cdFx0dGhpcy5fY3VycmVudFN0YXRlID0gU1RBVEVTLklERU5USUZJRVI7XG5cdH0gZWxzZSBpZiAodGhpcy5fc291cmNlW3RoaXMuX2N1cnJlbnRJbmRleF0gPT09ICcpJykge1xuXHRcdHRoaXMuX2N1cnJlbnRTdGF0ZSA9IFNUQVRFUy5QQVJFTlRIRVNFU19DTE9TRTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9jdXJyZW50U3RhdGUgPSBTVEFURVMuSUxMRUdBTDtcblx0fVxufTtcblxuLyoqXG4gKiBEZXNjcmliZXMgUEFSRU5USEVTRVNfQ0xPU0Ugc3RhdGUgb2YgbWFjaGluZS5cbiAqL1xuQ29uc3RydWN0b3JUb2tlbml6ZXIucHJvdG90eXBlLnBhcmVudGhlc2VzQ2xvc2VTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fY3VycmVudEluZGV4Kys7XG5cdHRoaXMuX2N1cnJlbnRFbmQgPSB0aGlzLl9jdXJyZW50SW5kZXg7XG5cdHRoaXMuX2N1cnJlbnRTdGF0ZSA9IFNUQVRFUy5FTkQ7XG59O1xuXG4vKipcbiAqIERlc2NyaWJlcyBGVU5DVElPTiBzdGF0ZSBvZiBtYWNoaW5lLlxuICovXG5Db25zdHJ1Y3RvclRva2VuaXplci5wcm90b3R5cGUuZnVuY3Rpb25TdGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fY3VycmVudEluZGV4ICs9IEtFWVdPUkRTLkZVTkNUSU9OLmxlbmd0aDtcblx0dGhpcy5fY3VycmVudEVuZCA9IHRoaXMuX2N1cnJlbnRJbmRleDtcblxuXHR0aGlzLnNraXBXaGl0ZXNwYWNlKCk7XG5cblx0aWYgKHRoaXMuX3NvdXJjZVt0aGlzLl9jdXJyZW50SW5kZXhdID09PSAnKCcpIHtcblx0XHR0aGlzLl9jdXJyZW50U3RhdGUgPSBTVEFURVMuUEFSRU5USEVTRVNfT1BFTjtcblx0fSBlbHNlIGlmIChJREVOVElGSUVSX1RFU1QudGVzdCh0aGlzLl9zb3VyY2VbdGhpcy5fY3VycmVudEluZGV4XSkpIHtcblx0XHR0aGlzLl9jdXJyZW50U3RhdGUgPSBTVEFURVMuSURFTlRJRklFUjtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9jdXJyZW50U3RhdGUgPSBTVEFURVMuSUxMRUdBTDtcblx0fVxufTtcblxuLyoqXG4gKiBEZXNjcmliZXMgSURFTlRJRklFUiBzdGF0ZSBvZiBtYWNoaW5lLlxuICovXG5Db25zdHJ1Y3RvclRva2VuaXplci5wcm90b3R5cGUuaWRlbnRpZmllclN0YXRlID0gZnVuY3Rpb24gKCkge1xuXHR3aGlsZSAoXG5cdFx0dGhpcy5fY3VycmVudEluZGV4IDwgdGhpcy5fc291cmNlLmxlbmd0aCAmJlxuXHRcdElERU5USUZJRVJfVEVTVC50ZXN0KHRoaXMuX3NvdXJjZVt0aGlzLl9jdXJyZW50SW5kZXhdKSkge1xuXHRcdHRoaXMuX2N1cnJlbnRJbmRleCsrO1xuXHR9XG5cblx0dGhpcy5fY3VycmVudEVuZCA9IHRoaXMuX2N1cnJlbnRJbmRleDtcblxuXHR0aGlzLnNraXBXaGl0ZXNwYWNlKCk7XG5cdGlmICh0aGlzLl9zb3VyY2VbdGhpcy5fY3VycmVudEluZGV4XSA9PT0gJygnKSB7XG5cdFx0dGhpcy5fY3VycmVudFN0YXRlID0gU1RBVEVTLlBBUkVOVEhFU0VTX09QRU47XG5cdH0gZWxzZSBpZiAodGhpcy5fc291cmNlW3RoaXMuX2N1cnJlbnRJbmRleF0gPT09ICcpJykge1xuXHRcdHRoaXMuX2N1cnJlbnRTdGF0ZSA9IFNUQVRFUy5QQVJFTlRIRVNFU19DTE9TRTtcblx0fSBlbHNlIGlmICh0aGlzLl9zb3VyY2VbdGhpcy5fY3VycmVudEluZGV4XSA9PT0gJywnKSB7XG5cdFx0dGhpcy5fY3VycmVudFN0YXRlID0gU1RBVEVTLkNPTU1BO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX2N1cnJlbnRTdGF0ZSA9IFNUQVRFUy5JTExFR0FMO1xuXHR9XG59O1xuXG4vKipcbiAqIERlc2NyaWJlcyBDT01NQSBzdGF0ZSBvZiBtYWNoaW5lLlxuICovXG5Db25zdHJ1Y3RvclRva2VuaXplci5wcm90b3R5cGUuY29tbWFTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fY3VycmVudEluZGV4Kys7XG5cdHRoaXMuX2N1cnJlbnRFbmQgPSB0aGlzLl9jdXJyZW50SW5kZXg7XG5cblx0dGhpcy5za2lwV2hpdGVzcGFjZSgpO1xuXHRpZiAoSURFTlRJRklFUl9URVNULnRlc3QodGhpcy5fc291cmNlW3RoaXMuX2N1cnJlbnRJbmRleF0pKSB7XG5cdFx0dGhpcy5fY3VycmVudFN0YXRlID0gU1RBVEVTLklERU5USUZJRVI7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHRoaXMuX2N1cnJlbnRTdGF0ZSA9IFNUQVRFUy5JTExFR0FMO1xufTsiLCIvKlxuICogY2F0YmVycnktbG9jYXRvclxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5LWxvY2F0b3IncyBsaWNlbnNlIGZvbGxvd3M6XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAqIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uXG4gKiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICogcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAqIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gKiBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuICogaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuICogT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogU09GVFdBUkUuXG4gKlxuICogVGhpcyBsaWNlbnNlIGFwcGxpZXMgdG8gYWxsIHBhcnRzIG9mIGNhdGJlcnJ5LWxvY2F0b3IgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBTZXJ2aWNlTG9jYXRvcjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyksXG5cdENvbnN0cnVjdG9yVG9rZW5pemVyID0gcmVxdWlyZSgnLi9Db25zdHJ1Y3RvclRva2VuaXplcicpO1xuXG52YXIgREVQRU5ERU5DWV9SRUdFWFAgPSAvXlxcJFxcdysvLFxuXHRFUlJPUl9DT05TVFJVQ1RPUl9TSE9VTERfQkVfRlVOQ1RJT04gPSAnQ29uc3RydWN0b3Igc2hvdWxkIGJlIGEgZnVuY3Rpb24nLFxuXHRFUlJPUl9UWVBFX05PVF9SRUdJU1RFUkVEID0gJ1R5cGUgXCIlc1wiIG5vdCByZWdpc3RlcmVkJyxcblx0RVJST1JfVFlQRV9TSE9VTERfQkVfU1RSSU5HID0gJ1R5cGUgbmFtZSBcIiVzXCIgc2hvdWxkIGJlIGEgc3RyaW5nJztcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiBzZXJ2aWNlIGxvY2F0b3IuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gU2VydmljZUxvY2F0b3IoKSB7XG5cdHRoaXMuX3JlZ2lzdHJhdGlvbnMgPSB7fTtcbn1cblxuLyoqXG4gKiBDdXJyZW50IHR5cGUgcmVnaXN0cmF0aW9ucy5cbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJvdGVjdGVkXG4gKi9cblNlcnZpY2VMb2NhdG9yLnByb3RvdHlwZS5fcmVnaXN0cmF0aW9ucyA9IG51bGw7XG5cbi8qKlxuICogUmVnaXN0ZXJzIG5ldyB0eXBlIGluIHNlcnZpY2UgbG9jYXRvci5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIFR5cGUgbmFtZSwgd2hpY2ggd2lsbCBiZSBhbGlhcyBpbiBvdGhlciBjb25zdHJ1Y3RvcnMuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHJ1Y3RvciBDb25zdHJ1Y3RvciB3aGljaFxuICogaW5pdGlhbGl6ZXMgaW5zdGFuY2Ugb2Ygc3BlY2lmaWVkIHR5cGUuXG4gKiBAcGFyYW0ge09iamVjdD99IHBhcmFtZXRlcnMgU2V0IG9mIG5hbWVkIHBhcmFtZXRlcnNcbiAqIHdoaWNoIHdpbGwgYmUgYWxzbyBpbmplY3RlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbj99IGlzU2luZ2xldG9uIElmIHRydWUgZXZlcnkgcmVzb2x2ZSB3aWxsIHJldHVyblxuICogdGhlIHNhbWUgaW5zdGFuY2UuXG4gKi9cblNlcnZpY2VMb2NhdG9yLnByb3RvdHlwZS5yZWdpc3RlciA9XG5cdGZ1bmN0aW9uICh0eXBlLCBjb25zdHJ1Y3RvciwgcGFyYW1ldGVycywgaXNTaW5nbGV0b24pIHtcblx0XHR0aHJvd0lmTm90RnVuY3Rpb24oY29uc3RydWN0b3IpO1xuXHRcdHRocm93SWZOb3RTdHJpbmcodHlwZSk7XG5cblx0XHRpbml0aWFsaXplUmVnaXN0cmF0aW9uKHR5cGUsIHRoaXMpO1xuXHRcdHZhciBwYXJhbWV0ZXJOYW1lcyA9IGdldFBhcmFtZXRlck5hbWVzKGNvbnN0cnVjdG9yKTtcblxuXHRcdHRoaXMuX3JlZ2lzdHJhdGlvbnNbdHlwZV0udW5zaGlmdCh7XG5cdFx0XHRjb25zdHJ1Y3RvcjogY29uc3RydWN0b3IsXG5cdFx0XHRwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzIHx8IHt9LFxuXHRcdFx0cGFyYW1ldGVyTmFtZXM6IHBhcmFtZXRlck5hbWVzLFxuXHRcdFx0aXNTaW5nbGV0b246IEJvb2xlYW4oaXNTaW5nbGV0b24pLFxuXHRcdFx0c2luZ2xlSW5zdGFuY2U6IG51bGxcblx0XHR9KTtcblx0fTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgc2luZ2xlIGluc3RhbmNlIGZvciBzcGVjaWZpZWQgdHlwZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIFR5cGUgbmFtZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZSBJbnN0YW5jZSB0byByZWdpc3Rlci5cbiAqL1xuU2VydmljZUxvY2F0b3IucHJvdG90eXBlLnJlZ2lzdGVySW5zdGFuY2UgPSBmdW5jdGlvbiAodHlwZSwgaW5zdGFuY2UpIHtcblx0dGhyb3dJZk5vdFN0cmluZyh0eXBlKTtcblx0aW5pdGlhbGl6ZVJlZ2lzdHJhdGlvbih0eXBlLCB0aGlzKTtcblxuXHR0aGlzLl9yZWdpc3RyYXRpb25zW3R5cGVdLnVuc2hpZnQoe1xuXHRcdGNvbnN0cnVjdG9yOiBpbnN0YW5jZS5jb25zdHJ1Y3Rvcixcblx0XHRwYXJhbWV0ZXJzOiB7fSxcblx0XHRwYXJhbWV0ZXJOYW1lczogW10sXG5cdFx0aXNTaW5nbGV0b246IHRydWUsXG5cdFx0c2luZ2xlSW5zdGFuY2U6IGluc3RhbmNlXG5cdH0pO1xufTtcblxuLyoqXG4gKiBSZXNvbHZlcyBsYXN0IHJlZ2lzdGVyZWQgaW1wbGVtZW50YXRpb24gYnkgdHlwZSBuYW1lXG4gKiBpbmNsdWRpbmcgYWxsIGl0cyBkZXBlbmRlbmNpZXMgcmVjdXJzaXZlbHkuXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBUeXBlIG5hbWUuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBJbnN0YW5jZSBvZiBzcGVjaWZpZWQgdHlwZS5cbiAqL1xuU2VydmljZUxvY2F0b3IucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbiAodHlwZSkge1xuXHR0aHJvd0lmTm90U3RyaW5nKHR5cGUpO1xuXHR0aHJvd0lmTm9UeXBlKHRoaXMuX3JlZ2lzdHJhdGlvbnMsIHR5cGUpO1xuXHR2YXIgZmlyc3RSZWdpc3RyYXRpb24gPSB0aGlzLl9yZWdpc3RyYXRpb25zW3R5cGVdWzBdO1xuXHRyZXR1cm4gY3JlYXRlSW5zdGFuY2UoZmlyc3RSZWdpc3RyYXRpb24sIHRoaXMpO1xufTtcblxuLyoqXG4gKiBSZXNvbHZlcyBhbGwgcmVnaXN0ZXJlZCBpbXBsZW1lbnRhdGlvbnMgYnkgdHlwZSBuYW1lXG4gKiBpbmNsdWRpbmcgYWxsIGRlcGVuZGVuY2llcyByZWN1cnNpdmVseS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIFR5cGUgbmFtZS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgaW5zdGFuY2VzIHNwZWNpZmllZCB0eXBlLlxuICovXG5TZXJ2aWNlTG9jYXRvci5wcm90b3R5cGUucmVzb2x2ZUFsbCA9IGZ1bmN0aW9uICh0eXBlKSB7XG5cdHRocm93SWZOb3RTdHJpbmcodHlwZSk7XG5cdHRyeSB7XG5cdFx0dGhyb3dJZk5vVHlwZSh0aGlzLl9yZWdpc3RyYXRpb25zLCB0eXBlKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdHJldHVybiBbXTtcblx0fVxuXHRyZXR1cm4gdGhpcy5fcmVnaXN0cmF0aW9uc1t0eXBlXS5tYXAoZnVuY3Rpb24gKHJlZ2lzdHJhdGlvbikge1xuXHRcdHJldHVybiBjcmVhdGVJbnN0YW5jZShyZWdpc3RyYXRpb24sIHRoaXMpO1xuXHR9LCB0aGlzKTtcbn07XG5cbi8qKlxuICogUmVzb2x2ZXMgaW5zdGFuY2Ugb2Ygc3BlY2lmaWVkIGNvbnN0cnVjdG9yIGluY2x1ZGluZyBkZXBlbmRlbmNpZXMuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHJ1Y3RvciBDb25zdHJ1Y3RvciBmb3IgaW5zdGFuY2UgY3JlYXRpb24uXG4gKiBAcGFyYW0ge09iamVjdD99IHBhcmFtZXRlcnMgU2V0IG9mIGl0cyBwYXJhbWV0ZXJzIHZhbHVlcy5cbiAqIEByZXR1cm5zIHtPYmplY3R9IEluc3RhbmNlIG9mIHNwZWNpZmllZCBjb25zdHJ1Y3Rvci5cbiAqL1xuU2VydmljZUxvY2F0b3IucHJvdG90eXBlLnJlc29sdmVJbnN0YW5jZSA9IGZ1bmN0aW9uIChjb25zdHJ1Y3RvciwgcGFyYW1ldGVycykge1xuXHRyZXR1cm4gY3JlYXRlSW5zdGFuY2Uoe1xuXHRcdGNvbnN0cnVjdG9yOiBjb25zdHJ1Y3Rvcixcblx0XHRwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzIHx8IHt9LFxuXHRcdHBhcmFtZXRlck5hbWVzOiBnZXRQYXJhbWV0ZXJOYW1lcyhjb25zdHJ1Y3RvciksXG5cdFx0aXNTaW5nbGV0b246IGZhbHNlLFxuXHRcdHNpbmdsZUluc3RhbmNlOiBudWxsXG5cdH0sIHRoaXMpO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVycyBhbGwgcmVnaXN0cmF0aW9ucyBvZiBzcGVjaWZpZWQgdHlwZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIFR5cGUgbmFtZS5cbiAqL1xuU2VydmljZUxvY2F0b3IucHJvdG90eXBlLnVucmVnaXN0ZXIgPSBmdW5jdGlvbiAodHlwZSkge1xuXHR0aHJvd0lmTm90U3RyaW5nKHR5cGUpO1xuXHRkZWxldGUgdGhpcy5fcmVnaXN0cmF0aW9uc1t0eXBlXTtcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgcmVnaXN0cmF0aW9uIGFycmF5IGZvciBzcGVjaWZpZWQgdHlwZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIFR5cGUgbmFtZS5cbiAqIEBwYXJhbSB7U2VydmljZUxvY2F0b3J9IGNvbnRleHQgQ29udGV4dCBvZiBleGVjdXRpb24uXG4gKi9cbmZ1bmN0aW9uIGluaXRpYWxpemVSZWdpc3RyYXRpb24odHlwZSwgY29udGV4dCkge1xuXHRpZiAoIWNvbnRleHQuX3JlZ2lzdHJhdGlvbnMuaGFzT3duUHJvcGVydHkodHlwZSkpIHtcblx0XHRjb250ZXh0Ll9yZWdpc3RyYXRpb25zW3R5cGVdID0gW107XG5cdH1cbn1cblxuLyoqXG4gKiBUaHJvd3MgZXJyb3IgaWYgc3BlY2lmaWVkIHJlZ2lzdHJhdGlvbiBpcyBub3QgZm91bmQuXG4gKiBAcGFyYW0ge09iamVjdH0gcmVnaXN0cmF0aW9ucyBDdXJyZW50IHJlZ2lzdHJhdGlvbnMgc2V0LlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgVHlwZSB0byBjaGVjay5cbiAqL1xuZnVuY3Rpb24gdGhyb3dJZk5vVHlwZShyZWdpc3RyYXRpb25zLCB0eXBlKSB7XG5cdGlmICghcmVnaXN0cmF0aW9ucy5oYXNPd25Qcm9wZXJ0eSh0eXBlKSB8fFxuXHRcdHJlZ2lzdHJhdGlvbnNbdHlwZV0ubGVuZ3RoID09PSAwKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKHV0aWwuZm9ybWF0KEVSUk9SX1RZUEVfTk9UX1JFR0lTVEVSRUQsIHR5cGUpKTtcblx0fVxufVxuXG4vKipcbiAqIFRocm93cyBlcnJvciBpZiBzcGVjaWZpZWQgY29uc3RydWN0b3IgaXMgbm90IGEgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHJ1Y3RvciBDb25zdHJ1Y3RvciB0byBjaGVjay5cbiAqL1xuZnVuY3Rpb24gdGhyb3dJZk5vdEZ1bmN0aW9uKGNvbnN0cnVjdG9yKSB7XG5cdGlmIChjb25zdHJ1Y3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGhyb3cgbmV3IEVycm9yKEVSUk9SX0NPTlNUUlVDVE9SX1NIT1VMRF9CRV9GVU5DVElPTik7XG59XG5cbi8qKlxuICogVGhyb3dzIGVycm9yIGlmIHNwZWNpZmllZCB0eXBlIG5hbWUgaXMgbm90IGEgc3RyaW5nLlxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgVHlwZSBuYW1lIHRvIGNoZWNrLlxuICovXG5mdW5jdGlvbiB0aHJvd0lmTm90U3RyaW5nKHR5cGUpIHtcblx0aWYgKHR5cGVvZih0eXBlKSA9PT0gJ3N0cmluZycpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR0aHJvdyBuZXcgRXJyb3IodXRpbC5mb3JtYXQoRVJST1JfVFlQRV9TSE9VTERfQkVfU1RSSU5HLCB0eXBlKSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBpbnN0YW5jZSBvZiB0eXBlIHNwZWNpZmllZCBhbmQgcGFyYW1ldGVycyBpbiByZWdpc3RyYXRpb24uXG4gKiBAcGFyYW0ge09iamVjdH0gcmVnaXN0cmF0aW9uIFNwZWNpZmllZCByZWdpc3RyYXRpb24gb2YgdHlwZS5cbiAqIEBwYXJhbSB7U2VydmljZUxvY2F0b3J9IGNvbnRleHQgQ29udGV4dCBvZiBleGVjdXRpb24uXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBJbnN0YW5jZSBvZiB0eXBlIHNwZWNpZmllZCBpbiByZWdpc3RyYXRpb24uXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUluc3RhbmNlKHJlZ2lzdHJhdGlvbiwgY29udGV4dCkge1xuXHRpZiAocmVnaXN0cmF0aW9uLmlzU2luZ2xldG9uICYmIHJlZ2lzdHJhdGlvbi5zaW5nbGVJbnN0YW5jZSAhPT0gbnVsbCkge1xuXHRcdHJldHVybiByZWdpc3RyYXRpb24uc2luZ2xlSW5zdGFuY2U7XG5cdH1cblxuXHR2YXIgaW5zdGFuY2VQYXJhbWV0ZXJzID0gZ2V0UGFyYW1ldGVycyhyZWdpc3RyYXRpb24sIGNvbnRleHQpLFxuXHRcdGluc3RhbmNlID0gT2JqZWN0LmNyZWF0ZShyZWdpc3RyYXRpb24uY29uc3RydWN0b3IucHJvdG90eXBlKTtcblx0cmVnaXN0cmF0aW9uLmNvbnN0cnVjdG9yLmFwcGx5KGluc3RhbmNlLCBpbnN0YW5jZVBhcmFtZXRlcnMpO1xuXG5cdGlmIChyZWdpc3RyYXRpb24uaXNTaW5nbGV0b24pIHtcblx0XHRyZWdpc3RyYXRpb24uc2luZ2xlSW5zdGFuY2UgPSBpbnN0YW5jZTtcblx0fVxuXG5cdHJldHVybiBpbnN0YW5jZTtcbn1cblxuLyoqXG4gKiBHZXRzIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgc3BlY2lmaWVkIGluIHR5cGUgY29uc3RydWN0b3IuXG4gKiBAcGFyYW0ge09iamVjdH0gcmVnaXN0cmF0aW9uIFR5cGUgcmVnaXN0cmF0aW9uLlxuICogQHBhcmFtIHtTZXJ2aWNlTG9jYXRvcn0gY29udGV4dCBDb250ZXh0IG9mIGV4ZWN1dGlvbi5cbiAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgcmVzb2x2ZWQgZGVwZW5kZW5jaWVzIHRvIGluamVjdC5cbiAqL1xuZnVuY3Rpb24gZ2V0UGFyYW1ldGVycyhyZWdpc3RyYXRpb24sIGNvbnRleHQpIHtcblx0cmV0dXJuIHJlZ2lzdHJhdGlvbi5wYXJhbWV0ZXJOYW1lcy5tYXAoZnVuY3Rpb24gKHBhcmFtZXRlck5hbWUpIHtcblx0XHR2YXIgZGVwZW5kZW5jeU5hbWUgPSBnZXREZXBlbmRlbmN5TmFtZShwYXJhbWV0ZXJOYW1lKTtcblx0XHRyZXR1cm4gZGVwZW5kZW5jeU5hbWUgPT09IG51bGwgP1xuXHRcdFx0cmVnaXN0cmF0aW9uLnBhcmFtZXRlcnNbcGFyYW1ldGVyTmFtZV0gOlxuXHRcdFx0dGhpcy5yZXNvbHZlKGRlcGVuZGVuY3lOYW1lKTtcblx0fSwgY29udGV4dCk7XG59XG5cbi8qKlxuICogR2V0cyBuYW1lIG9mIGRlcGVuZGVuY3kgdHlwZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbWV0ZXJOYW1lIE5hbWUgb2YgY29uc3RydWN0b3IgcGFyYW1ldGVyLlxuICogQHJldHVybnMge3N0cmluZ3xudWxsfSBOYW1lIG9mIGRlcGVuZGVuY3kgdHlwZS5cbiAqL1xuZnVuY3Rpb24gZ2V0RGVwZW5kZW5jeU5hbWUocGFyYW1ldGVyTmFtZSkge1xuXHRpZiAoIURFUEVOREVOQ1lfUkVHRVhQLnRlc3QocGFyYW1ldGVyTmFtZSkpIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdHJldHVybiBwYXJhbWV0ZXJOYW1lLnN1YnN0cigxLCBwYXJhbWV0ZXJOYW1lLmxlbmd0aCAtIDEpO1xufVxuXG4vKipcbiAqIEdldHMgYWxsIHBhcmFtZXRlciBuYW1lcyB1c2VkIGluIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY29uc3RydWN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24uXG4gKiBAcmV0dXJucyB7QXJyYXk8c3RyaW5nPn0gQXJyYXkgb2YgcGFyYW1ldGVyIG5hbWVzLlxuICovXG5mdW5jdGlvbiBnZXRQYXJhbWV0ZXJOYW1lcyhjb25zdHJ1Y3Rvcikge1xuXHR2YXIgc291cmNlID0gY29uc3RydWN0b3IudG9TdHJpbmcoKSxcblx0XHR0b2tlbml6ZXIgPSBuZXcgQ29uc3RydWN0b3JUb2tlbml6ZXIoc291cmNlKSxcblx0XHRyZXN1bHQgPSBbXSxcblx0XHR0b2tlbiA9IHtcblx0XHRcdHN0YXRlOiBDb25zdHJ1Y3RvclRva2VuaXplci5TVEFURVMuTk8sXG5cdFx0XHRzdGFydDogMCxcblx0XHRcdGVuZDogMFxuXHRcdH0sXG5cdFx0YXJlUGFyYW1ldGVyc1N0YXJ0ZWQgPSBmYWxzZTtcblxuXHR3aGlsZSAoXG5cdFx0dG9rZW4uc3RhdGUgIT09IENvbnN0cnVjdG9yVG9rZW5pemVyLlNUQVRFUy5FTkQgJiZcblx0XHR0b2tlbi5zdGF0ZSAhPT0gQ29uc3RydWN0b3JUb2tlbml6ZXIuU1RBVEVTLklMTEVHQUwpIHtcblx0XHR0b2tlbiA9IHRva2VuaXplci5uZXh0KCk7XG5cdFx0aWYgKHRva2VuLnN0YXRlID09PSBDb25zdHJ1Y3RvclRva2VuaXplci5TVEFURVMuUEFSRU5USEVTRVNfT1BFTikge1xuXHRcdFx0YXJlUGFyYW1ldGVyc1N0YXJ0ZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmIChhcmVQYXJhbWV0ZXJzU3RhcnRlZCAmJlxuXHRcdFx0dG9rZW4uc3RhdGUgPT09IENvbnN0cnVjdG9yVG9rZW5pemVyLlNUQVRFUy5JREVOVElGSUVSKSB7XG5cdFx0XHRyZXN1bHQucHVzaChzb3VyY2Uuc3Vic3RyaW5nKHRva2VuLnN0YXJ0LCB0b2tlbi5lbmQpKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcblxufSIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFVIUjtcblxudmFyIFVIUkJhc2UgPSByZXF1aXJlKCcuLi9saWIvVUhSQmFzZScpLFxuXHRQcm9taXNlID0gcmVxdWlyZSgncHJvbWlzZScpLFxuXHRVUkkgPSByZXF1aXJlKCdjYXRiZXJyeS11cmknKS5VUkksXG5cdHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbi8vIGlmIGJyb3dzZXIgc3RpbGwgZG9lcyBub3QgaGF2ZSBwcm9taXNlcyB0aGVuIGFkZCBpdC5cbmlmICghKCdQcm9taXNlJyBpbiB3aW5kb3cpKSB7XG5cdHdpbmRvdy5Qcm9taXNlID0gUHJvbWlzZTtcbn1cblxudXRpbC5pbmhlcml0cyhVSFIsIFVIUkJhc2UpO1xuXG52YXIgTk9OX1NBRkVfSEVBREVSUyA9IHtcblx0Y29va2llOiB0cnVlLFxuXHQnYWNjZXB0LWNoYXJzZXQnOiB0cnVlXG59O1xuXG52YXIgRVJST1JfQ09OTkVDVElPTiA9ICdDb25uZWN0aW9uIGVycm9yJyxcblx0RVJST1JfVElNRU9VVCA9ICdSZXF1ZXN0IHRpbWVvdXQnLFxuXHRFUlJPUl9BQk9SVEVEID0gJ1JlcXVlc3QgYWJvcnRlZCc7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgY2xpZW50LXNpZGUgSFRUUChTKSByZXF1ZXN0IGltcGxlbWVudGF0aW9uLlxuICogQHBhcmFtIHtXaW5kb3d9ICR3aW5kb3cgQ3VycmVudCB3aW5kb3cgb2JqZWN0LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFVIUigkd2luZG93KSB7XG5cdFVIUkJhc2UuY2FsbCh0aGlzKTtcblx0dGhpcy53aW5kb3cgPSAkd2luZG93O1xufVxuXG4vKipcbiAqIEN1cnJlbnQgaW5zdGFuY2Ugb2Ygd2luZG93LlxuICogQHR5cGUge1dpbmRvd31cbiAqL1xuVUhSLnByb3RvdHlwZS53aW5kb3cgPSBudWxsO1xuXG4vKipcbiAqIERvZXMgcmVxdWVzdCB3aXRoIHNwZWNpZmllZCBwYXJhbWV0ZXJzIHVzaW5nIHByb3RvY29sIGltcGxlbWVudGF0aW9uLlxuICogQHBhcmFtIHtPYmplY3R9IHBhcmFtZXRlcnMgUmVxdWVzdCBwYXJhbWV0ZXJzLlxuICogQHBhcmFtIHtTdHJpbmd9IHBhcmFtZXRlcnMubWV0aG9kIEhUVFAgbWV0aG9kLlxuICogQHBhcmFtIHtTdHJpbmd9IHBhcmFtZXRlcnMudXJsIFVSTCBmb3IgcmVxdWVzdC5cbiAqIEBwYXJhbSB7VVJJfSBwYXJhbWV0ZXJzLnVyaSBVUkkgb2JqZWN0LlxuICogQHBhcmFtIHtPYmplY3R9IHBhcmFtZXRlcnMuaGVhZGVycyBIVFRQIGhlYWRlcnMgdG8gc2VuZC5cbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gcGFyYW1ldGVycy5kYXRhIERhdGEgdG8gc2VuZC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBwYXJhbWV0ZXJzLnRpbWVvdXQgUmVxdWVzdCB0aW1lb3V0LlxuICogQHBhcmFtIHtCb29sZWFufSBwYXJhbWV0ZXJzLnVuc2FmZUhUVFBTIElmIHRydWUgdGhlbiByZXF1ZXN0cyB0byBzZXJ2ZXJzIHdpdGhcbiAqIGludmFsaWQgSFRUUFMgY2VydGlmaWNhdGVzIGFyZSBhbGxvd2VkLlxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0Pn0gUHJvbWlzZSBmb3IgcmVzdWx0IHdpdGggc3RhdHVzIG9iamVjdCBhbmQgY29udGVudC5cbiAqIEBwcm90ZWN0ZWRcbiAqL1xuVUhSLnByb3RvdHlwZS5fZG9SZXF1ZXN0ID0gZnVuY3Rpb24gKHBhcmFtZXRlcnMpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdE9iamVjdC5rZXlzKHBhcmFtZXRlcnMuaGVhZGVycylcblx0XHQuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuXHRcdFx0aWYgKE5PTl9TQUZFX0hFQURFUlMuaGFzT3duUHJvcGVydHkobmFtZS50b0xvd2VyQ2FzZSgpKSkge1xuXHRcdFx0XHRkZWxldGUgcGFyYW1ldGVycy5oZWFkZXJzW25hbWVdO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoZnVsZmlsbCwgcmVqZWN0KSB7XG5cdFx0dmFyIHJlcXVlc3RFcnJvciA9IG51bGwsXG5cdFx0XHR4aHIgPSBuZXcgc2VsZi53aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblxuXHRcdHhoci5vbmFib3J0ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmVxdWVzdEVycm9yID0gbmV3IEVycm9yKEVSUk9SX0FCT1JURUQpO1xuXHRcdFx0cmVqZWN0KHJlcXVlc3RFcnJvcik7XG5cdFx0fTtcblx0XHR4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmVxdWVzdEVycm9yID0gbmV3IEVycm9yKEVSUk9SX1RJTUVPVVQpO1xuXHRcdFx0cmVqZWN0KHJlcXVlc3RFcnJvcik7XG5cdFx0fTtcblx0XHR4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJlcXVlc3RFcnJvciA9IG5ldyBFcnJvcih4aHIuc3RhdHVzVGV4dCB8fCBFUlJPUl9DT05ORUNUSU9OKTtcblx0XHRcdHJlamVjdChyZXF1ZXN0RXJyb3IpO1xuXHRcdH07XG5cdFx0eGhyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmIChyZXF1ZXN0RXJyb3IpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHN0YXR1c09iamVjdCA9IGdldFN0YXR1c09iamVjdCh4aHIpLFxuXHRcdFx0XHRjb250ZW50ID0gc2VsZi5jb252ZXJ0UmVzcG9uc2UoXG5cdFx0XHRcdFx0c3RhdHVzT2JqZWN0LmhlYWRlcnMsXG5cdFx0XHRcdFx0eGhyLnJlc3BvbnNlVGV4dFxuXHRcdFx0XHQpO1xuXHRcdFx0ZnVsZmlsbCh7c3RhdHVzOiBzdGF0dXNPYmplY3QsIGNvbnRlbnQ6IGNvbnRlbnR9KTtcblx0XHR9O1xuXG5cdFx0dmFyIHVzZXIgPSBwYXJhbWV0ZXJzLnVyaS5hdXRob3JpdHkudXNlckluZm8gP1xuXHRcdFx0XHRwYXJhbWV0ZXJzLnVyaS5hdXRob3JpdHkudXNlckluZm8udXNlciA6IG51bGwsXG5cdFx0XHRwYXNzd29yZCA9IHBhcmFtZXRlcnMudXJpLmF1dGhvcml0eS51c2VySW5mbyA/XG5cdFx0XHRcdHBhcmFtZXRlcnMudXJpLmF1dGhvcml0eS51c2VySW5mby5wYXNzd29yZCA6IG51bGw7XG5cdFx0eGhyLm9wZW4oXG5cdFx0XHRwYXJhbWV0ZXJzLm1ldGhvZCwgcGFyYW1ldGVycy51cmkudG9TdHJpbmcoKSwgdHJ1ZSxcblx0XHRcdHVzZXIgfHwgdW5kZWZpbmVkLCBwYXNzd29yZCB8fCB1bmRlZmluZWRcblx0XHQpO1xuXHRcdHhoci50aW1lb3V0ID0gcGFyYW1ldGVycy50aW1lb3V0O1xuXG5cdFx0T2JqZWN0LmtleXMocGFyYW1ldGVycy5oZWFkZXJzKVxuXHRcdFx0LmZvckVhY2goZnVuY3Rpb24gKGhlYWRlck5hbWUpIHtcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoXG5cdFx0XHRcdFx0aGVhZGVyTmFtZSwgcGFyYW1ldGVycy5oZWFkZXJzW2hlYWRlck5hbWVdXG5cdFx0XHRcdCk7XG5cdFx0XHR9KTtcblxuXHRcdHhoci5zZW5kKHBhcmFtZXRlcnMuZGF0YSk7XG5cdH0pO1xufTtcblxuLyoqXG4gKiBHZXRzIHN0YXRlIG9iamVjdCBmb3Igc3BlY2lmaWVkIGpRdWVyeSBYSFIgb2JqZWN0LlxuICogQHBhcmFtIHtPYmplY3Q/fSB4aHIgWEhSIG9iamVjdC5cbiAqIEByZXR1cm5zIHt7Y29kZTogbnVtYmVyLCB0ZXh0OiBzdHJpbmcsIGhlYWRlcnM6IE9iamVjdH19IFN0YXR1cyBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIGdldFN0YXR1c09iamVjdCh4aHIpIHtcblx0dmFyIGhlYWRlcnMgPSB7fTtcblxuXHRpZiAoIXhocikge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjb2RlOiAwLFxuXHRcdFx0dGV4dDogJycsXG5cdFx0XHRoZWFkZXJzOiBoZWFkZXJzXG5cdFx0fTtcblx0fVxuXG5cdHhoclxuXHRcdC5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKVxuXHRcdC5zcGxpdCgnXFxuJylcblx0XHQuZm9yRWFjaChmdW5jdGlvbiAoaGVhZGVyKSB7XG5cdFx0XHR2YXIgZGVsaW1pdGVySW5kZXggPSBoZWFkZXIuaW5kZXhPZignOicpO1xuXHRcdFx0aWYgKGRlbGltaXRlckluZGV4IDw9IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGhlYWRlck5hbWUgPSBoZWFkZXJcblx0XHRcdFx0LnN1YnN0cmluZygwLCBkZWxpbWl0ZXJJbmRleClcblx0XHRcdFx0LnRyaW0oKVxuXHRcdFx0XHQudG9Mb3dlckNhc2UoKTtcblx0XHRcdGhlYWRlcnNbaGVhZGVyTmFtZV0gPSBoZWFkZXJcblx0XHRcdFx0LnN1YnN0cmluZyhkZWxpbWl0ZXJJbmRleCArIDEpXG5cdFx0XHRcdC50cmltKCk7XG5cdFx0fSk7XG5cblx0cmV0dXJuIHtcblx0XHRjb2RlOiB4aHIuc3RhdHVzLFxuXHRcdHRleHQ6IHhoci5zdGF0dXNUZXh0LFxuXHRcdGhlYWRlcnM6IGhlYWRlcnNcblx0fTtcbn0iLCIvKlxuICogY2F0YmVycnlcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgRGVuaXMgUmVjaGt1bm92IGFuZCBwcm9qZWN0IGNvbnRyaWJ1dG9ycy5cbiAqXG4gKiBjYXRiZXJyeSdzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnkgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVIUiA9IHJlcXVpcmUoJy4vbGliL1VIUicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0LyoqXG5cdCAqIFJlZ2lzdGVycyBVSFIgaW4gc2VydmVyLXNpZGUgc2VydmljZSBsb2NhdG9yLlxuXHQgKiBAcGFyYW0ge1NlcnZpY2VMb2NhdG9yfSBsb2NhdG9yIENhdGJlcnJ5J3Mgc2VydmljZSBsb2NhdG9yLlxuXHQgKi9cblx0cmVnaXN0ZXI6IGZ1bmN0aW9uIChsb2NhdG9yKSB7XG5cdFx0dmFyIGNvbmZpZyA9IGxvY2F0b3IucmVzb2x2ZSgnY29uZmlnJyk7XG5cdFx0bG9jYXRvci5yZWdpc3RlcigndWhyJywgVUhSLCBjb25maWcsIHRydWUpO1xuXHR9LFxuXHRVSFI6IFVIUlxufTsiLCIvKlxuICogY2F0YmVycnlcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgRGVuaXMgUmVjaGt1bm92IGFuZCBwcm9qZWN0IGNvbnRyaWJ1dG9ycy5cbiAqXG4gKiBjYXRiZXJyeSdzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnkgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBVSFJCYXNlO1xuXG52YXIgY2F0YmVycnlVcmkgPSByZXF1aXJlKCdjYXRiZXJyeS11cmknKSxcblx0UXVlcnkgPSBjYXRiZXJyeVVyaS5RdWVyeSxcblx0VVJJID0gY2F0YmVycnlVcmkuVVJJO1xuXG52YXIgRVJST1JfVU5TVVBQT1JURURfUFJPVE9DT0wgPSAnUHJvdG9jb2wgaXMgdW5zdXBwb3J0ZWQnLFxuXHRFUlJPUl9QQVJBTUVURVJTX1NIT1VMRF9CRV9PQkpFQ1QgPSAnUmVxdWVzdCBwYXJhbWV0ZXJzIHNob3VsZCBiZSBvYmplY3QnLFxuXHRFUlJPUl9VUkxfSVNfUkVRVUlSRUQgPSAnVVJMIGlzIHJlcXVpcmVkIHBhcmFtZXRlcicsXG5cdEVSUk9SX01FVEhPRF9JU19SRVFVSVJFRCA9ICdSZXF1ZXN0IG1ldGhvZCBpcyByZXF1aXJlZCBwYXJhbWV0ZXInLFxuXHRFUlJPUl9IT1NUX0lTX1JFUVVJUkVEID0gJ0hvc3QgaW4gVVJMIGlzIHJlcXVpcmVkJyxcblx0RVJST1JfU0NIRU1FX0lTX1JFUVVJUkVEID0gJ1NjaGVtZSBpbiBVUkwgaXMgcmVxdWlyZWQnLFxuXHRFUlJPUl9USU1FT1VUX1NIT1VMRF9CRV9OVU1CRVIgPSAnVGltZW91dCBzaG91bGQgYmUgYSBudW1iZXInLFxuXHRERUZBVUxUX1RJTUVPVVQgPSAzMDAwMCxcblx0SFRUUF9QUk9UT0NPTF9SRUdFWFAgPSAvXihodHRwKXM/JC9pO1xuXG52YXIgTUVUSE9EUyA9IHtcblx0R0VUOiAnR0VUJyxcblx0SEVBRDogJ0hFQUQnLFxuXHRQT1NUOiAnUE9TVCcsXG5cdFBVVDogJ1BVVCcsXG5cdFBBVENIOiAnUEFUQ0gnLFxuXHRERUxFVEU6ICdERUxFVEUnLFxuXHRPUFRJT05TOiAnT1BUSU9OUycsXG5cdFRSQUNFOiAnVFJBQ0UnLFxuXHRDT05ORUNUOiAnQ09OTkVDVCdcbn07XG5cblVIUkJhc2UuVFlQRVMgPSB7XG5cdFVSTF9FTkNPREVEOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyxcblx0SlNPTjogJ2FwcGxpY2F0aW9uL2pzb24nLFxuXHRQTEFJTl9URVhUOiAndGV4dC9wbGFpbicsXG5cdEhUTUw6ICd0ZXh0L2h0bWwnXG59O1xuXG5VSFJCYXNlLkNIQVJTRVQgPSAnVVRGLTgnO1xuXG5VSFJCYXNlLkRFRkFVTFRfR0VORVJBTF9IRUFERVJTID0ge1xuXHRBY2NlcHQ6IFVIUkJhc2UuVFlQRVMuSlNPTiArICc7IHE9MC43LCAnICtcblx0XHRVSFJCYXNlLlRZUEVTLkhUTUwgKyAnOyBxPTAuMiwgJyArXG5cdFx0VUhSQmFzZS5UWVBFUy5QTEFJTl9URVhUICsgJzsgcT0wLjEnLFxuXHQnQWNjZXB0LUNoYXJzZXQnOiBVSFJCYXNlLkNIQVJTRVQgKyAnOyBxPTEnXG59O1xuXG5VSFJCYXNlLkNIQVJTRVRfUEFSQU1FVEVSID0gJzsgY2hhcnNldD0nICsgVUhSQmFzZS5DSEFSU0VUO1xuVUhSQmFzZS5VUkxfRU5DT0RFRF9FTlRJVFlfQ09OVEVOVF9UWVBFID0gVUhSQmFzZS5UWVBFUy5VUkxfRU5DT0RFRCArXG5cdFVIUkJhc2UuQ0hBUlNFVF9QQVJBTUVURVI7XG5cblVIUkJhc2UuSlNPTl9FTlRJVFlfQ09OVEVOVF9UWVBFID0gVUhSQmFzZS5UWVBFUy5KU09OICtcblx0VUhSQmFzZS5DSEFSU0VUX1BBUkFNRVRFUjtcblxuVUhSQmFzZS5QTEFJTl9URVhUX0VOVElUWV9DT05URU5UX1RZUEUgPSBVSFJCYXNlLlRZUEVTLlBMQUlOX1RFWFQgK1xuXHRVSFJCYXNlLkNIQVJTRVRfUEFSQU1FVEVSO1xuXG4vLyBUaGlzIG1vZHVsZSB3ZXJlIGRldmVsb3BlZCB1c2luZyBIVFRQLzEuMXYyIFJGQyAyNjE2XG4vLyAoaHR0cDovL3d3dy53My5vcmcvUHJvdG9jb2xzL3JmYzI2MTYvKVxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiBCYXNpYyBVbml2ZXJzYWwgSFRUUChTKSBSZXF1ZXN0IGltcGxlbWVudGF0aW9uLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFVIUkJhc2UoKSB7XG5cbn1cblxuLyoqXG4gKiBEb2VzIEdFVCByZXF1ZXN0IHRvIEhUVFAgc2VydmVyLlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBVUkwgdG8gcmVxdWVzdC5cbiAqIEBwYXJhbSB7T2JqZWN0P30gb3B0aW9ucyBSZXF1ZXN0IHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge09iamVjdD99IG9wdGlvbnMuaGVhZGVycyBIVFRQIGhlYWRlcnMgdG8gc2VuZC5cbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdD99IG9wdGlvbnMuZGF0YSBEYXRhIHRvIHNlbmQuXG4gKiBAcGFyYW0ge051bWJlcj99IG9wdGlvbnMudGltZW91dCBSZXF1ZXN0IHRpbWVvdXQuXG4gKiBAcGFyYW0ge0Jvb2xlYW4/fSBvcHRpb25zLnVuc2FmZUhUVFBTIElmIHRydWUgdGhlbiByZXF1ZXN0cyB0byBzZXJ2ZXJzIHdpdGhcbiAqIGludmFsaWQgSFRUUFMgY2VydGlmaWNhdGVzIGFyZSBhbGxvd2VkLlxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0Pn0gUHJvbWlzZSBmb3IgcmVzdWx0IHdpdGggc3RhdHVzIG9iamVjdCBhbmQgY29udGVudC5cbiAqL1xuVUhSQmFzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuXHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0dmFyIHBhcmFtZXRlcnMgPSBPYmplY3QuY3JlYXRlKG9wdGlvbnMpO1xuXHRwYXJhbWV0ZXJzLm1ldGhvZCA9IE1FVEhPRFMuR0VUO1xuXHRwYXJhbWV0ZXJzLnVybCA9IHVybDtcblx0cmV0dXJuIHRoaXMucmVxdWVzdChwYXJhbWV0ZXJzKTtcbn07XG5cbi8qKlxuICogRG9lcyBQT1NUIHJlcXVlc3QgdG8gSFRUUCBzZXJ2ZXIuXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFVSTCB0byByZXF1ZXN0LlxuICogQHBhcmFtIHtPYmplY3Q/fSBvcHRpb25zIFJlcXVlc3QgcGFyYW1ldGVycy5cbiAqIEBwYXJhbSB7T2JqZWN0P30gb3B0aW9ucy5oZWFkZXJzIEhUVFAgaGVhZGVycyB0byBzZW5kLlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0P30gb3B0aW9ucy5kYXRhIERhdGEgdG8gc2VuZC5cbiAqIEBwYXJhbSB7TnVtYmVyP30gb3B0aW9ucy50aW1lb3V0IFJlcXVlc3QgdGltZW91dC5cbiAqIEBwYXJhbSB7Qm9vbGVhbj99IG9wdGlvbnMudW5zYWZlSFRUUFMgSWYgdHJ1ZSB0aGVuIHJlcXVlc3RzIHRvIHNlcnZlcnMgd2l0aFxuICogaW52YWxpZCBIVFRQUyBjZXJ0aWZpY2F0ZXMgYXJlIGFsbG93ZWQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fSBQcm9taXNlIGZvciByZXN1bHQgd2l0aCBzdGF0dXMgb2JqZWN0IGFuZCBjb250ZW50LlxuICovXG5VSFJCYXNlLnByb3RvdHlwZS5wb3N0ID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuXHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0dmFyIHBhcmFtZXRlcnMgPSBPYmplY3QuY3JlYXRlKG9wdGlvbnMpO1xuXHRwYXJhbWV0ZXJzLm1ldGhvZCA9IE1FVEhPRFMuUE9TVDtcblx0cGFyYW1ldGVycy51cmwgPSB1cmw7XG5cdHJldHVybiB0aGlzLnJlcXVlc3QocGFyYW1ldGVycyk7XG59O1xuXG4vKipcbiAqIERvZXMgUFVUIHJlcXVlc3QgdG8gSFRUUCBzZXJ2ZXIuXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFVSTCB0byByZXF1ZXN0LlxuICogQHBhcmFtIHtPYmplY3Q/fSBvcHRpb25zIFJlcXVlc3QgcGFyYW1ldGVycy5cbiAqIEBwYXJhbSB7T2JqZWN0P30gb3B0aW9ucy5oZWFkZXJzIEhUVFAgaGVhZGVycyB0byBzZW5kLlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0P30gb3B0aW9ucy5kYXRhIERhdGEgdG8gc2VuZC5cbiAqIEBwYXJhbSB7TnVtYmVyP30gb3B0aW9ucy50aW1lb3V0IFJlcXVlc3QgdGltZW91dC5cbiAqIEBwYXJhbSB7Qm9vbGVhbj99IG9wdGlvbnMudW5zYWZlSFRUUFMgSWYgdHJ1ZSB0aGVuIHJlcXVlc3RzIHRvIHNlcnZlcnMgd2l0aFxuICogaW52YWxpZCBIVFRQUyBjZXJ0aWZpY2F0ZXMgYXJlIGFsbG93ZWQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fSBQcm9taXNlIGZvciByZXN1bHQgd2l0aCBzdGF0dXMgb2JqZWN0IGFuZCBjb250ZW50LlxuICovXG5VSFJCYXNlLnByb3RvdHlwZS5wdXQgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG5cdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHR2YXIgcGFyYW1ldGVycyA9IE9iamVjdC5jcmVhdGUob3B0aW9ucyk7XG5cdHBhcmFtZXRlcnMubWV0aG9kID0gTUVUSE9EUy5QVVQ7XG5cdHBhcmFtZXRlcnMudXJsID0gdXJsO1xuXHRyZXR1cm4gdGhpcy5yZXF1ZXN0KHBhcmFtZXRlcnMpO1xufTtcblxuLyoqXG4gKiBEb2VzIFBBVENIIHJlcXVlc3QgdG8gSFRUUCBzZXJ2ZXIuXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFVSTCB0byByZXF1ZXN0LlxuICogQHBhcmFtIHtPYmplY3Q/fSBvcHRpb25zIFJlcXVlc3QgcGFyYW1ldGVycy5cbiAqIEBwYXJhbSB7T2JqZWN0P30gb3B0aW9ucy5oZWFkZXJzIEhUVFAgaGVhZGVycyB0byBzZW5kLlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0P30gb3B0aW9ucy5kYXRhIERhdGEgdG8gc2VuZC5cbiAqIEBwYXJhbSB7TnVtYmVyP30gb3B0aW9ucy50aW1lb3V0IFJlcXVlc3QgdGltZW91dC5cbiAqIEBwYXJhbSB7Qm9vbGVhbj99IG9wdGlvbnMudW5zYWZlSFRUUFMgSWYgdHJ1ZSB0aGVuIHJlcXVlc3RzIHRvIHNlcnZlcnMgd2l0aFxuICogaW52YWxpZCBIVFRQUyBjZXJ0aWZpY2F0ZXMgYXJlIGFsbG93ZWQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fSBQcm9taXNlIGZvciByZXN1bHQgd2l0aCBzdGF0dXMgb2JqZWN0IGFuZCBjb250ZW50LlxuICovXG5VSFJCYXNlLnByb3RvdHlwZS5wYXRjaCA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcblx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdHZhciBwYXJhbWV0ZXJzID0gT2JqZWN0LmNyZWF0ZShvcHRpb25zKTtcblx0cGFyYW1ldGVycy5tZXRob2QgPSBNRVRIT0RTLlBBVENIO1xuXHRwYXJhbWV0ZXJzLnVybCA9IHVybDtcblx0cmV0dXJuIHRoaXMucmVxdWVzdChwYXJhbWV0ZXJzKTtcbn07XG5cbi8qKlxuICogRG9lcyBERUxFVEUgcmVxdWVzdCB0byBIVFRQIHNlcnZlci5cbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVVJMIHRvIHJlcXVlc3QuXG4gKiBAcGFyYW0ge09iamVjdD99IG9wdGlvbnMgUmVxdWVzdCBwYXJhbWV0ZXJzLlxuICogQHBhcmFtIHtPYmplY3Q/fSBvcHRpb25zLmhlYWRlcnMgSFRUUCBoZWFkZXJzIHRvIHNlbmQuXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3Q/fSBvcHRpb25zLmRhdGEgRGF0YSB0byBzZW5kLlxuICogQHBhcmFtIHtOdW1iZXI/fSBvcHRpb25zLnRpbWVvdXQgUmVxdWVzdCB0aW1lb3V0LlxuICogQHBhcmFtIHtCb29sZWFuP30gb3B0aW9ucy51bnNhZmVIVFRQUyBJZiB0cnVlIHRoZW4gcmVxdWVzdHMgdG8gc2VydmVycyB3aXRoXG4gKiBpbnZhbGlkIEhUVFBTIGNlcnRpZmljYXRlcyBhcmUgYWxsb3dlZC5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD59IFByb21pc2UgZm9yIHJlc3VsdCB3aXRoIHN0YXR1cyBvYmplY3QgYW5kIGNvbnRlbnQuXG4gKi9cblVIUkJhc2UucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcblx0dmFyIHBhcmFtZXRlcnMgPSBPYmplY3QuY3JlYXRlKG9wdGlvbnMpO1xuXHRwYXJhbWV0ZXJzLm1ldGhvZCA9IE1FVEhPRFMuREVMRVRFO1xuXHRwYXJhbWV0ZXJzLnVybCA9IHVybDtcblx0cmV0dXJuIHRoaXMucmVxdWVzdChwYXJhbWV0ZXJzKTtcbn07XG5cbi8qKlxuICogRG9lcyByZXF1ZXN0IHdpdGggc3BlY2lmaWVkIHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyYW1ldGVycyBSZXF1ZXN0IHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gcGFyYW1ldGVycy5tZXRob2QgSFRUUCBtZXRob2QuXG4gKiBAcGFyYW0ge1N0cmluZ30gcGFyYW1ldGVycy51cmwgVVJMIGZvciByZXF1ZXN0LlxuICogQHBhcmFtIHtPYmplY3Q/fSBwYXJhbWV0ZXJzLmhlYWRlcnMgSFRUUCBoZWFkZXJzIHRvIHNlbmQuXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3Q/fSBwYXJhbWV0ZXJzLmRhdGEgRGF0YSB0byBzZW5kLlxuICogQHBhcmFtIHtOdW1iZXI/fSBwYXJhbWV0ZXJzLnRpbWVvdXQgUmVxdWVzdCB0aW1lb3V0LlxuICogQHBhcmFtIHtCb29sZWFuP30gcGFyYW1ldGVycy51bnNhZmVIVFRQUyBJZiB0cnVlIHRoZW4gcmVxdWVzdHNcbiAqIHRvIHNlcnZlcnMgd2l0aCBpbnZhbGlkIEhUVFBTIGNlcnRpZmljYXRlcyBhcmUgYWxsb3dlZC5cbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD59IFByb21pc2UgZm9yIHJlc3VsdCB3aXRoIHN0YXR1cyBvYmplY3QgYW5kIGNvbnRlbnQuXG4gKi9cblVIUkJhc2UucHJvdG90eXBlLnJlcXVlc3QgPSBmdW5jdGlvbiAocGFyYW1ldGVycykge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdHJldHVybiB0aGlzLl92YWxpZGF0ZVJlcXVlc3QocGFyYW1ldGVycylcblx0XHQudGhlbihmdW5jdGlvbiAodmFsaWRhdGVkKSB7XG5cdFx0XHRyZXR1cm4gc2VsZi5fZG9SZXF1ZXN0KHZhbGlkYXRlZCk7XG5cdFx0fSk7XG59O1xuXG4vKipcbiAqIFZhbGlkYXRlcyBVSFIgcGFyYW1ldGVycy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbWV0ZXJzIFJlcXVlc3QgcGFyYW1ldGVycy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbWV0ZXJzLm1ldGhvZCBIVFRQIG1ldGhvZC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbWV0ZXJzLnVybCBVUkwgZm9yIHJlcXVlc3QuXG4gKiBAcGFyYW0ge09iamVjdD99IHBhcmFtZXRlcnMuaGVhZGVycyBIVFRQIGhlYWRlcnMgdG8gc2VuZC5cbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdD99IHBhcmFtZXRlcnMuZGF0YSBEYXRhIHRvIHNlbmQuXG4gKiBAcGFyYW0ge051bWJlcj99IHBhcmFtZXRlcnMudGltZW91dCBSZXF1ZXN0IHRpbWVvdXQuXG4gKiBAcGFyYW0ge0Jvb2xlYW4/fSBwYXJhbWV0ZXJzLnVuc2FmZUhUVFBTIElmIHRydWUgdGhlbiByZXF1ZXN0c1xuICogdG8gc2VydmVycyB3aXRoIGludmFsaWQgSFRUUFMgY2VydGlmaWNhdGVzIGFyZSBhbGxvd2VkLlxuICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgZm9yIG5vdGhpbmcuXG4gKiBAcHJpdmF0ZVxuICovXG4vKmpzaGludCBtYXhjb21wbGV4aXR5OmZhbHNlICovXG5VSFJCYXNlLnByb3RvdHlwZS5fdmFsaWRhdGVSZXF1ZXN0ID0gZnVuY3Rpb24gKHBhcmFtZXRlcnMpIHtcblx0aWYgKCFwYXJhbWV0ZXJzIHx8IHR5cGVvZihwYXJhbWV0ZXJzKSAhPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKEVSUk9SX1BBUkFNRVRFUlNfU0hPVUxEX0JFX09CSkVDVCkpO1xuXHR9XG5cblx0dmFyIHZhbGlkYXRlZCA9IE9iamVjdC5jcmVhdGUocGFyYW1ldGVycyk7XG5cblx0aWYgKHR5cGVvZihwYXJhbWV0ZXJzLnVybCkgIT09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihFUlJPUl9VUkxfSVNfUkVRVUlSRUQpKTtcblx0fVxuXHR2YWxpZGF0ZWQudXJpID0gbmV3IFVSSSh2YWxpZGF0ZWQudXJsKTtcblx0aWYgKCF2YWxpZGF0ZWQudXJpLnNjaGVtZSkge1xuXHRcdHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoRVJST1JfU0NIRU1FX0lTX1JFUVVJUkVEKSk7XG5cdH1cblx0aWYgKCFIVFRQX1BST1RPQ09MX1JFR0VYUC50ZXN0KHZhbGlkYXRlZC51cmkuc2NoZW1lKSkge1xuXHRcdHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoRVJST1JfVU5TVVBQT1JURURfUFJPVE9DT0wpKTtcblx0fVxuXHRpZiAoIXZhbGlkYXRlZC51cmkuYXV0aG9yaXR5IHx8ICF2YWxpZGF0ZWQudXJpLmF1dGhvcml0eS5ob3N0KSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihFUlJPUl9IT1NUX0lTX1JFUVVJUkVEKSk7XG5cdH1cblx0aWYgKHR5cGVvZih2YWxpZGF0ZWQubWV0aG9kKSAhPT0gJ3N0cmluZycgfHxcblx0XHQhKHZhbGlkYXRlZC5tZXRob2QgaW4gTUVUSE9EUykpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKEVSUk9SX01FVEhPRF9JU19SRVFVSVJFRCkpO1xuXHR9XG5cblx0dmFsaWRhdGVkLnRpbWVvdXQgPSB2YWxpZGF0ZWQudGltZW91dCB8fCBERUZBVUxUX1RJTUVPVVQ7XG5cdGlmICh0eXBlb2YodmFsaWRhdGVkLnRpbWVvdXQpICE9PSAnbnVtYmVyJykge1xuXHRcdHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoRVJST1JfVElNRU9VVF9TSE9VTERfQkVfTlVNQkVSKSk7XG5cdH1cblxuXHR2YWxpZGF0ZWQuaGVhZGVycyA9IHRoaXMuX2NyZWF0ZUhlYWRlcnModmFsaWRhdGVkLmhlYWRlcnMpO1xuXG5cdGlmICghdGhpcy5faXNVcHN0cmVhbVJlcXVlc3QocGFyYW1ldGVycy5tZXRob2QpICYmXG5cdFx0dmFsaWRhdGVkLmRhdGEgJiYgdHlwZW9mKHZhbGlkYXRlZC5kYXRhKSA9PT0gJ29iamVjdCcpIHtcblxuXHRcdHZhciBkYXRhS2V5cyA9IE9iamVjdC5rZXlzKHZhbGlkYXRlZC5kYXRhKTtcblxuXHRcdGlmIChkYXRhS2V5cy5sZW5ndGggPiAwICYmICF2YWxpZGF0ZWQudXJpLnF1ZXJ5KSB7XG5cdFx0XHR2YWxpZGF0ZWQudXJpLnF1ZXJ5ID0gbmV3IFF1ZXJ5KCcnKTtcblx0XHR9XG5cblx0XHRkYXRhS2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdHZhbGlkYXRlZC51cmkucXVlcnkudmFsdWVzW2tleV0gPSB2YWxpZGF0ZWQuZGF0YVtrZXldO1xuXHRcdH0pO1xuXHRcdHZhbGlkYXRlZC5kYXRhID0gbnVsbDtcblx0fSBlbHNlIHtcblx0XHR2YXIgZGF0YUFuZEhlYWRlcnMgPSB0aGlzLl9nZXREYXRhVG9TZW5kKFxuXHRcdFx0dmFsaWRhdGVkLmhlYWRlcnMsIHZhbGlkYXRlZC5kYXRhXG5cdFx0KTtcblx0XHR2YWxpZGF0ZWQuaGVhZGVycyA9IGRhdGFBbmRIZWFkZXJzLmhlYWRlcnM7XG5cdFx0dmFsaWRhdGVkLmRhdGEgPSBkYXRhQW5kSGVhZGVycy5kYXRhO1xuXHR9XG5cblx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh2YWxpZGF0ZWQpO1xufTtcblxuLyoqXG4gKiBHZXRzIGRhdGEgZm9yIHNlbmRpbmcgdmlhIEhUVFAgcmVxdWVzdCB1c2luZyBDb250ZW50IFR5cGUgSFRUUCBoZWFkZXIuXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVycyBIVFRQIGhlYWRlcnMuXG4gKiBAcGFyYW0ge09iamVjdHxzdHJpbmd9IGRhdGEgRGF0YSB0byBzZW5kLlxuICogQHJldHVybnMge3toZWFkZXJzOiBPYmplY3QsIGRhdGE6IE9iamVjdHxTdHJpbmd9fSBEYXRhIGFuZCBoZWFkZXJzIHRvIHNlbmQuXG4gKiBAcHJpdmF0ZVxuICovXG5VSFJCYXNlLnByb3RvdHlwZS5fZ2V0RGF0YVRvU2VuZCA9IGZ1bmN0aW9uIChoZWFkZXJzLCBkYXRhKSB7XG5cdHZhciBmb3VuZCA9IGZpbmRDb250ZW50VHlwZShoZWFkZXJzKSxcblx0XHRjb250ZW50VHlwZUhlYWRlciA9IGZvdW5kLm5hbWUsXG5cdFx0Y29udGVudFR5cGUgPSBmb3VuZC50eXBlO1xuXG5cdGlmICghZGF0YSB8fCB0eXBlb2YoZGF0YSkgIT09ICdvYmplY3QnKSB7XG5cdFx0ZGF0YSA9IGRhdGEgPyBTdHJpbmcoZGF0YSkgOiAnJztcblx0XHRpZiAoIWNvbnRlbnRUeXBlKSB7XG5cdFx0XHRoZWFkZXJzW2NvbnRlbnRUeXBlSGVhZGVyXSA9IFVIUkJhc2UuUExBSU5fVEVYVF9FTlRJVFlfQ09OVEVOVF9UWVBFO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0aGVhZGVyczogaGVhZGVycyxcblx0XHRcdGRhdGE6IGRhdGFcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNvbnRlbnRUeXBlID09PSBVSFJCYXNlLlRZUEVTLkpTT04pIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0aGVhZGVyczogaGVhZGVycyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpXG5cdFx0fTtcblx0fVxuXG5cdC8vIG90aGVyd2lzZSBvYmplY3Qgd2lsbCBiZSBzZW50IHdpdGhcblx0Ly8gYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkXG5cdGhlYWRlcnNbY29udGVudFR5cGVIZWFkZXJdID0gVUhSQmFzZS5VUkxfRU5DT0RFRF9FTlRJVFlfQ09OVEVOVF9UWVBFO1xuXG5cdHZhciBxdWVyeSA9IG5ldyBRdWVyeSgpO1xuXHRxdWVyeS52YWx1ZXMgPSBkYXRhO1xuXHRyZXR1cm4ge1xuXHRcdGhlYWRlcnM6IGhlYWRlcnMsXG5cdFx0ZGF0YTogcXVlcnkudG9TdHJpbmcoKS5yZXBsYWNlKCclMjAnLCAnKycpXG5cdH07XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgSFRUUCBoZWFkZXJzIGZvciByZXF1ZXN0IHVzaW5nIGRlZmF1bHRzIGFuZCBjdXJyZW50IHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyYW1ldGVySGVhZGVycyBIVFRQIGhlYWRlcnMgb2YgVUhSLlxuICogQHByb3RlY3RlZFxuICovXG5VSFJCYXNlLnByb3RvdHlwZS5fY3JlYXRlSGVhZGVycyA9IGZ1bmN0aW9uIChwYXJhbWV0ZXJIZWFkZXJzKSB7XG5cdGlmICghcGFyYW1ldGVySGVhZGVycyB8fCB0eXBlb2YocGFyYW1ldGVySGVhZGVycykgIT09ICdvYmplY3QnKSB7XG5cdFx0cGFyYW1ldGVySGVhZGVycyA9IHt9O1xuXHR9XG5cdHZhciBoZWFkZXJzID0ge307XG5cblx0T2JqZWN0LmtleXMoVUhSQmFzZS5ERUZBVUxUX0dFTkVSQUxfSEVBREVSUylcblx0XHQuZm9yRWFjaChmdW5jdGlvbiAoaGVhZGVyTmFtZSkge1xuXHRcdFx0aGVhZGVyc1toZWFkZXJOYW1lXSA9IFVIUkJhc2UuREVGQVVMVF9HRU5FUkFMX0hFQURFUlNbaGVhZGVyTmFtZV07XG5cdFx0fSk7XG5cblx0T2JqZWN0LmtleXMocGFyYW1ldGVySGVhZGVycylcblx0XHQuZm9yRWFjaChmdW5jdGlvbiAoaGVhZGVyTmFtZSkge1xuXHRcdFx0aWYgKHBhcmFtZXRlckhlYWRlcnNbaGVhZGVyTmFtZV0gPT09IG51bGwgfHxcblx0XHRcdFx0cGFyYW1ldGVySGVhZGVyc1toZWFkZXJOYW1lXSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGRlbGV0ZSBoZWFkZXJzW2hlYWRlck5hbWVdO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRoZWFkZXJzW2hlYWRlck5hbWVdID0gcGFyYW1ldGVySGVhZGVyc1toZWFkZXJOYW1lXTtcblx0XHR9KTtcblxuXHRyZXR1cm4gaGVhZGVycztcbn07XG5cbi8qKlxuICogRG9lcyByZXF1ZXN0IHdpdGggc3BlY2lmaWVkIHBhcmFtZXRlcnMgdXNpbmcgcHJvdG9jb2wgaW1wbGVtZW50YXRpb24uXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyYW1ldGVycyBSZXF1ZXN0IHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gcGFyYW1ldGVycy5tZXRob2QgSFRUUCBtZXRob2QuXG4gKiBAcGFyYW0ge1N0cmluZ30gcGFyYW1ldGVycy51cmwgVVJMIGZvciByZXF1ZXN0LlxuICogQHBhcmFtIHtVUkl9IHBhcmFtZXRlcnMudXJpIFVSSSBvYmplY3QuXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyYW1ldGVycy5oZWFkZXJzIEhUVFAgaGVhZGVycyB0byBzZW5kLlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBwYXJhbWV0ZXJzLmRhdGEgRGF0YSB0byBzZW5kLlxuICogQHBhcmFtIHtOdW1iZXJ9IHBhcmFtZXRlcnMudGltZW91dCBSZXF1ZXN0IHRpbWVvdXQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHBhcmFtZXRlcnMudW5zYWZlSFRUUFMgSWYgdHJ1ZSB0aGVuIHJlcXVlc3RzIHRvIHNlcnZlcnMgd2l0aFxuICogaW52YWxpZCBIVFRQUyBjZXJ0aWZpY2F0ZXMgYXJlIGFsbG93ZWQuXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fSBQcm9taXNlIGZvciByZXN1bHQgd2l0aCBzdGF0dXMgb2JqZWN0IGFuZCBjb250ZW50LlxuICogQHByb3RlY3RlZFxuICogQGFic3RyYWN0XG4gKi9cblVIUkJhc2UucHJvdG90eXBlLl9kb1JlcXVlc3QgPSBmdW5jdGlvbiAocGFyYW1ldGVycykge1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyByZXNwb25zZSBkYXRhIGFjY29yZGluZyBjb250ZW50IHR5cGUuXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVycyBIVFRQIGhlYWRlcnMuXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2VEYXRhIERhdGEgZnJvbSByZXNwb25zZS5cbiAqIEByZXR1cm5zIHtzdHJpbmd8T2JqZWN0fSBDb252ZXJ0ZWQgZGF0YS5cbiAqL1xuVUhSQmFzZS5wcm90b3R5cGUuY29udmVydFJlc3BvbnNlID0gZnVuY3Rpb24gKGhlYWRlcnMsIHJlc3BvbnNlRGF0YSkge1xuXHRpZiAodHlwZW9mKHJlc3BvbnNlRGF0YSkgIT09ICdzdHJpbmcnKSB7XG5cdFx0cmVzcG9uc2VEYXRhID0gJyc7XG5cdH1cblx0dmFyIGZvdW5kID0gZmluZENvbnRlbnRUeXBlKGhlYWRlcnMpLFxuXHRcdGNvbnRlbnRUeXBlID0gZm91bmQudHlwZSB8fCBVSFJCYXNlLlRZUEVTLlBMQUlOX1RFWFQ7XG5cblx0c3dpdGNoIChjb250ZW50VHlwZSkge1xuXHRcdGNhc2UgVUhSQmFzZS5UWVBFUy5KU09OOlxuXHRcdFx0dmFyIGpzb247XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZURhdGEpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBub3RoaW5nIHRvIGRvXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4ganNvbiB8fCB7fTtcblx0XHRjYXNlIFVIUkJhc2UuVFlQRVMuVVJMX0VOQ09ERUQ6XG5cdFx0XHR2YXIgb2JqZWN0O1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dmFyIHF1ZXJ5ID0gbmV3IFF1ZXJ5KHJlc3BvbnNlRGF0YS5yZXBsYWNlKCcrJywgJyUyMCcpKTtcblx0XHRcdFx0b2JqZWN0ID0gcXVlcnkudmFsdWVzO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBub3RoaW5nIHRvIGRvXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gb2JqZWN0IHx8IHt9O1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2VEYXRhO1xuXHR9XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgaXMgY3VycmVudCBxdWVyeSBuZWVkcyB0byB1c2UgdXBzdHJlYW0uXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIEhUVFAgbWV0aG9kLlxuICogQHJldHVybnMge0Jvb2xlYW59IElzIGN1cnJlbnQgSFRUUCBtZXRob2QgbWVhbnMgdXBzdHJlYW0gdXNhZ2UuXG4gKiBAcHJvdGVjdGVkXG4gKi9cblVIUkJhc2UucHJvdG90eXBlLl9pc1Vwc3RyZWFtUmVxdWVzdCA9IGZ1bmN0aW9uIChtZXRob2QpIHtcblx0cmV0dXJuIChcblx0XHRtZXRob2QgPT09IE1FVEhPRFMuUE9TVCB8fFxuXHRcdG1ldGhvZCA9PT0gTUVUSE9EUy5QVVQgfHxcblx0XHRtZXRob2QgPT09IE1FVEhPRFMuUEFUQ0hcblx0XHQpO1xufTtcblxuLyoqXG4gKiBGaW5kcyBjb250ZW50IHR5cGUgaGVhZGVyIGluIGhlYWRlcnMgb2JqZWN0LlxuICogQHBhcmFtIHtPYmplY3R9IGhlYWRlcnMgSFRUUCBoZWFkZXJzLlxuICogQHJldHVybnMge3tuYW1lOiBTdHJpbmcsIHR5cGU6IFN0cmluZ319IE5hbWUgb2YgaGVhZGVyIGFuZCBjb250ZW50IHR5cGUuXG4gKi9cbmZ1bmN0aW9uIGZpbmRDb250ZW50VHlwZShoZWFkZXJzKSB7XG5cdHZhciBjb250ZW50VHlwZVN0cmluZyA9ICcnLFxuXHRcdGNvbnRlbnRUeXBlSGVhZGVyID0gJ0NvbnRlbnQtVHlwZSc7XG5cblx0T2JqZWN0LmtleXMoaGVhZGVycylcblx0XHQuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0XHRpZiAoa2V5LnRvTG93ZXJDYXNlKCkgIT09ICdjb250ZW50LXR5cGUnKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGNvbnRlbnRUeXBlSGVhZGVyID0ga2V5O1xuXHRcdFx0Y29udGVudFR5cGVTdHJpbmcgPSBoZWFkZXJzW2tleV07XG5cdFx0fSk7XG5cblx0dmFyIHR5cGVBbmRQYXJhbWV0ZXJzID0gY29udGVudFR5cGVTdHJpbmcuc3BsaXQoJzsnKSxcblx0XHRjb250ZW50VHlwZSA9IHR5cGVBbmRQYXJhbWV0ZXJzWzBdLnRvTG93ZXJDYXNlKCk7XG5cdHJldHVybiB7XG5cdFx0bmFtZTogY29udGVudFR5cGVIZWFkZXIsXG5cdFx0dHlwZTogY29udGVudFR5cGVcblx0fTtcbn0iLCIvKlxuICogY2F0YmVycnlcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgRGVuaXMgUmVjaGt1bm92IGFuZCBwcm9qZWN0IGNvbnRyaWJ1dG9ycy5cbiAqXG4gKiBjYXRiZXJyeSdzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnkgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdFVSSTogcmVxdWlyZSgnLi9saWIvVVJJJyksXG5cdEF1dGhvcml0eTogcmVxdWlyZSgnLi9saWIvQXV0aG9yaXR5JyksXG5cdFVzZXJJbmZvOiByZXF1aXJlKCcuL2xpYi9Vc2VySW5mbycpLFxuXHRRdWVyeTogcmVxdWlyZSgnLi9saWIvUXVlcnknKVxufTsiLCIvKlxuICogY2F0YmVycnktdXJpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnktdXJpJ3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeS11cmkgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRob3JpdHk7XG5cbnZhciBVc2VySW5mbyA9IHJlcXVpcmUoJy4vVXNlckluZm8nKSxcblx0cGVyY2VudEVuY29kaW5nSGVscGVyID0gcmVxdWlyZSgnLi9wZXJjZW50RW5jb2RpbmdIZWxwZXInKSxcblx0cHVueWNvZGUgPSByZXF1aXJlKCdwdW55Y29kZScpO1xuXG52YXIgUE9SVF9SRUdFWFAgPSAvXlxcZCskLyxcblx0RVJST1JfUE9SVCA9ICdVUkkgYXV0aG9yaXR5IHBvcnQgbXVzdCBzYXRpc2Z5IGV4cHJlc3Npb24gJyArXG5cdFx0UE9SVF9SRUdFWFAudG9TdHJpbmcoKTtcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiBVUkkgYXV0aG9yaXR5IGNvbXBvbmVudCBwYXJzZXIuXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzk4NiNzZWN0aW9uLTMuMlxuICogQHBhcmFtIHtTdHJpbmc/fSBhdXRob3JpdHlTdHJpbmcgVVJJIGF1dGhvcml0eSBjb21wb25lbnQgc3RyaW5nLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEF1dGhvcml0eShhdXRob3JpdHlTdHJpbmcpIHtcblx0aWYgKHR5cGVvZihhdXRob3JpdHlTdHJpbmcpID09PSAnc3RyaW5nJyAmJiBhdXRob3JpdHlTdHJpbmcubGVuZ3RoID4gMCkge1xuXHRcdHZhciBmaXJzdEF0SW5kZXggPSBhdXRob3JpdHlTdHJpbmcuaW5kZXhPZignQCcpO1xuXHRcdGlmIChmaXJzdEF0SW5kZXggIT09IC0xKSB7XG5cdFx0XHR2YXIgdXNlckluZm9TdHJpbmcgPSBhdXRob3JpdHlTdHJpbmcuc3Vic3RyaW5nKDAsIGZpcnN0QXRJbmRleCk7XG5cdFx0XHR0aGlzLnVzZXJJbmZvID0gbmV3IFVzZXJJbmZvKHVzZXJJbmZvU3RyaW5nKTtcblx0XHRcdGF1dGhvcml0eVN0cmluZyA9IGF1dGhvcml0eVN0cmluZy5zdWJzdHJpbmcoZmlyc3RBdEluZGV4ICsgMSk7XG5cdFx0fVxuXG5cdFx0dmFyIGxhc3RDb2xvbkluZGV4ID0gYXV0aG9yaXR5U3RyaW5nLmxhc3RJbmRleE9mKCc6Jyk7XG5cdFx0aWYgKGxhc3RDb2xvbkluZGV4ICE9PSAtMSkge1xuXHRcdFx0dmFyIHBvcnRTdHJpbmcgPSBhdXRob3JpdHlTdHJpbmcuc3Vic3RyaW5nKGxhc3RDb2xvbkluZGV4ICsgMSk7XG5cdFx0XHRpZiAobGFzdENvbG9uSW5kZXggPT09IGF1dGhvcml0eVN0cmluZy5sZW5ndGggLSAxKSB7XG5cdFx0XHRcdHRoaXMucG9ydCA9ICcnO1xuXHRcdFx0XHRhdXRob3JpdHlTdHJpbmcgPSBhdXRob3JpdHlTdHJpbmcuc3Vic3RyaW5nKDAsIGxhc3RDb2xvbkluZGV4KTtcblx0XHRcdH1lbHNlIGlmIChQT1JUX1JFR0VYUC50ZXN0KHBvcnRTdHJpbmcpKSB7XG5cdFx0XHRcdHRoaXMucG9ydCA9IHBvcnRTdHJpbmc7XG5cdFx0XHRcdGF1dGhvcml0eVN0cmluZyA9IGF1dGhvcml0eVN0cmluZy5zdWJzdHJpbmcoMCwgbGFzdENvbG9uSW5kZXgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuaG9zdCA9IHB1bnljb2RlLnRvVW5pY29kZShcblx0XHRcdHBlcmNlbnRFbmNvZGluZ0hlbHBlci5kZWNvZGUoYXV0aG9yaXR5U3RyaW5nKVxuXHRcdCk7XG5cdH1cbn1cblxuLyoqXG4gKiBDdXJyZW50IHVzZXIgaW5mb3JtYXRpb24uXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzk4NiNzZWN0aW9uLTMuMi4xXG4gKiBAdHlwZSB7VXNlckluZm99XG4gKi9cbkF1dGhvcml0eS5wcm90b3R5cGUudXNlckluZm8gPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgaG9zdC5cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I3NlY3Rpb24tMy4yLjJcbiAqIEB0eXBlIHtTdHJpbmd9XG4gKi9cbkF1dGhvcml0eS5wcm90b3R5cGUuaG9zdCA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBwb3J0LlxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjc2VjdGlvbi0zLjIuM1xuICogQHR5cGUge1N0cmluZ31cbiAqL1xuQXV0aG9yaXR5LnByb3RvdHlwZS5wb3J0ID0gbnVsbDtcblxuLyoqXG4gKiBDbG9uZXMgY3VycmVudCBhdXRob3JpdHkuXG4gKiBAcmV0dXJucyB7QXV0aG9yaXR5fSBOZXcgY2xvbmUgb2YgY3VycmVudCBvYmplY3QuXG4gKi9cbkF1dGhvcml0eS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBhdXRob3JpdHkgPSBuZXcgQXV0aG9yaXR5KCk7XG5cdGlmICh0aGlzLnVzZXJJbmZvIGluc3RhbmNlb2YgVXNlckluZm8pIHtcblx0XHRhdXRob3JpdHkudXNlckluZm8gPSB0aGlzLnVzZXJJbmZvLmNsb25lKCk7XG5cdH1cblx0aWYgKHR5cGVvZih0aGlzLmhvc3QpID09PSAnc3RyaW5nJykge1xuXHRcdGF1dGhvcml0eS5ob3N0ID0gdGhpcy5ob3N0O1xuXHR9XG5cdGlmICh0eXBlb2YodGhpcy5wb3J0KSA9PT0gJ3N0cmluZycpIHtcblx0XHRhdXRob3JpdHkucG9ydCA9IHRoaXMucG9ydDtcblx0fVxuXHRyZXR1cm4gYXV0aG9yaXR5O1xufTtcblxuLyoqXG4gKiBSZWNvbWJpbmUgYWxsIGF1dGhvcml0eSBjb21wb25lbnRzIGludG8gYXV0aG9yaXR5IHN0cmluZy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IEF1dGhvcml0eSBjb21wb25lbnQgc3RyaW5nLlxuICovXG5BdXRob3JpdHkucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgcmVzdWx0ID0gJyc7XG5cdGlmICh0aGlzLnVzZXJJbmZvIGluc3RhbmNlb2YgVXNlckluZm8pIHtcblx0XHRyZXN1bHQgKz0gdGhpcy51c2VySW5mby50b1N0cmluZygpICsgJ0AnO1xuXHR9XG5cdGlmICh0aGlzLmhvc3QgIT09IHVuZGVmaW5lZCAmJiB0aGlzLmhvc3QgIT09IG51bGwpIHtcblx0XHR2YXIgaG9zdCA9IFN0cmluZyh0aGlzLmhvc3QpO1xuXHRcdHJlc3VsdCArPSBwZXJjZW50RW5jb2RpbmdIZWxwZXIuZW5jb2RlSG9zdChcblx0XHRcdHB1bnljb2RlLnRvQVNDSUkoaG9zdClcblx0XHQpO1xuXHR9XG5cdGlmICh0aGlzLnBvcnQgIT09IHVuZGVmaW5lZCAmJiB0aGlzLnBvcnQgIT09IG51bGwpIHtcblx0XHR2YXIgcG9ydCA9IFN0cmluZyh0aGlzLnBvcnQpO1xuXHRcdGlmIChwb3J0Lmxlbmd0aCA+IDAgJiYgIVBPUlRfUkVHRVhQLnRlc3QocG9ydCkpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihFUlJPUl9QT1JUKTtcblx0XHR9XG5cdFx0cmVzdWx0ICs9ICc6JyArIHBvcnQ7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn07IiwiLypcbiAqIGNhdGJlcnJ5LXVyaVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5LXVyaSdzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnktdXJpIHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gUXVlcnk7XG5cbnZhciBwZXJjZW50RW5jb2RpbmdIZWxwZXIgPSByZXF1aXJlKCcuL3BlcmNlbnRFbmNvZGluZ0hlbHBlcicpO1xuXG4vKipcbiAqIENyZWF0ZXMgbmV3IGluc3RhbmNlIG9mIFVSSSBxdWVyeSBjb21wb25lbnQgcGFyc2VyLlxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjc2VjdGlvbi0zLjRcbiAqIEBwYXJhbSB7U3RyaW5nP30gcXVlcnlTdHJpbmcgVVJJIHF1ZXJ5IGNvbXBvbmVudCBzdHJpbmcuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUXVlcnkocXVlcnlTdHJpbmcpIHtcblx0aWYgKHR5cGVvZihxdWVyeVN0cmluZykgPT09ICdzdHJpbmcnKSB7XG5cdFx0dGhpcy52YWx1ZXMgPSB7fTtcblxuXHRcdHF1ZXJ5U3RyaW5nXG5cdFx0XHQuc3BsaXQoJyYnKVxuXHRcdFx0LmZvckVhY2goZnVuY3Rpb24gKHBhaXIpIHtcblx0XHRcdFx0dmFyIHBhcnRzID0gcGFpci5zcGxpdCgnPScpLFxuXHRcdFx0XHRcdGtleSA9IHBlcmNlbnRFbmNvZGluZ0hlbHBlci5kZWNvZGUocGFydHNbMF0pO1xuXHRcdFx0XHRpZiAoIWtleSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoa2V5IGluIHRoaXMudmFsdWVzICYmXG5cdFx0XHRcdFx0ISh0aGlzLnZhbHVlc1trZXldIGluc3RhbmNlb2YgQXJyYXkpKSB7XG5cdFx0XHRcdFx0dGhpcy52YWx1ZXNba2V5XSA9IFt0aGlzLnZhbHVlc1trZXldXTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciB2YWx1ZSA9IHR5cGVvZihwYXJ0c1sxXSkgPT09ICdzdHJpbmcnID9cblx0XHRcdFx0XHRwZXJjZW50RW5jb2RpbmdIZWxwZXIuZGVjb2RlKHBhcnRzWzFdKSA6IG51bGw7XG5cblx0XHRcdFx0aWYgKHRoaXMudmFsdWVzW2tleV0gaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdHRoaXMudmFsdWVzW2tleV0ucHVzaCh2YWx1ZSk7XG5cdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdHRoaXMudmFsdWVzW2tleV0gPSB2YWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgdGhpcyk7XG5cdH1cbn1cblxuLyoqXG4gKiBDdXJyZW50IHNldCBvZiB2YWx1ZXMgb2YgcXVlcnkuXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5RdWVyeS5wcm90b3R5cGUudmFsdWVzID0gbnVsbDtcblxuLyoqXG4gKiBDbG9uZXMgY3VycmVudCBxdWVyeSB0byBhIG5ldyBvYmplY3QuXG4gKiBAcmV0dXJucyB7UXVlcnl9IE5ldyBjbG9uZSBvZiBjdXJyZW50IG9iamVjdC5cbiAqL1xuUXVlcnkucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgcXVlcnkgPSBuZXcgUXVlcnkoKTtcblx0aWYgKHRoaXMudmFsdWVzKSB7XG5cdFx0cXVlcnkudmFsdWVzID0ge307XG5cdFx0T2JqZWN0LmtleXModGhpcy52YWx1ZXMpXG5cdFx0XHQuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0XHRcdHF1ZXJ5LnZhbHVlc1trZXldID0gdGhpcy52YWx1ZXNba2V5XTtcblx0XHRcdH0sIHRoaXMpO1xuXHR9XG5cdHJldHVybiBxdWVyeTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgY3VycmVudCBzZXQgb2YgcXVlcnkgdmFsdWVzIHRvIHN0cmluZy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFF1ZXJ5IGNvbXBvbmVudCBzdHJpbmcuXG4gKi9cblF1ZXJ5LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKCF0aGlzLnZhbHVlcykge1xuXHRcdHJldHVybiAnJztcblx0fVxuXG5cdHZhciBxdWVyeVN0cmluZyA9ICcnO1xuXHRPYmplY3Qua2V5cyh0aGlzLnZhbHVlcylcblx0XHQuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0XHR2YXIgdmFsdWVzID0gdGhpcy52YWx1ZXNba2V5XSBpbnN0YW5jZW9mIEFycmF5ID9cblx0XHRcdFx0dGhpcy52YWx1ZXNba2V5XSA6IFt0aGlzLnZhbHVlc1trZXldXTtcblxuXHRcdFx0dmFsdWVzLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdHF1ZXJ5U3RyaW5nICs9ICcmJyArIHBlcmNlbnRFbmNvZGluZ0hlbHBlclxuXHRcdFx0XHRcdC5lbmNvZGVRdWVyeVN1YkNvbXBvbmVudChrZXkpO1xuXHRcdFx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YWx1ZSA9IFN0cmluZyh2YWx1ZSk7XG5cdFx0XHRcdHF1ZXJ5U3RyaW5nICs9ICc9JyArXG5cdFx0XHRcdFx0cGVyY2VudEVuY29kaW5nSGVscGVyLmVuY29kZVF1ZXJ5U3ViQ29tcG9uZW50KHZhbHVlKTtcblx0XHRcdH0pO1xuXHRcdH0sIHRoaXMpO1xuXG5cdHJldHVybiBxdWVyeVN0cmluZy5yZXBsYWNlKC9eJi8sICcnKTtcbn07IiwiLypcbiAqIGNhdGJlcnJ5XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnkncyBsaWNlbnNlIGZvbGxvd3M6XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAqIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uXG4gKiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICogcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAqIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gKiBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuICogaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuICogT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKlxuICogVGhpcyBsaWNlbnNlIGFwcGxpZXMgdG8gYWxsIHBhcnRzIG9mIGNhdGJlcnJ5IHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gVVJJO1xuXG52YXIgQXV0aG9yaXR5ID0gcmVxdWlyZSgnLi9BdXRob3JpdHknKSxcblx0cGVyY2VudEVuY29kaW5nSGVscGVyID0gcmVxdWlyZSgnLi9wZXJjZW50RW5jb2RpbmdIZWxwZXInKSxcblx0UXVlcnkgPSByZXF1aXJlKCcuL1F1ZXJ5Jyk7XG5cblx0Ly8gaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjYXBwZW5kaXgtQlxudmFyIFVSSV9QQVJTRV9SRUdFWFAgPSBuZXcgUmVnRXhwKFxuXHRcdCdeKChbXjovPyNdKyk6KT8oLy8oW14vPyNdKikpPyhbXj8jXSopKFxcXFw/KFteI10qKSk/KCMoLiopKT8nXG5cdCksXG5cdC8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I3NlY3Rpb24tMy4xXG5cdFNDSEVNRV9SRUdFWFAgPSAvXlthLXpdK1thLXpcXGRcXCtcXC4tXSokL2ksXG5cdEVSUk9SX1NDSEVNRSA9ICdVUkkgc2NoZW1lIG11c3Qgc2F0aXNmeSBleHByZXNzaW9uICcgK1xuXHRcdFNDSEVNRV9SRUdFWFAudG9TdHJpbmcoKSxcblx0RVJST1JfQkFTRV9TQ0hFTUUgPSAnU2NoZW1lIGNvbXBvbmVudCBpcyByZXF1aXJlZCB0byBiZSBwcmVzZW50ICcgK1xuXHRcdCdpbiBhIGJhc2UgVVJJJztcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiBVUkkgYWNjb3JkaW5nIHRvIFJGQyAzOTg2LlxuICogQHBhcmFtIHtTdHJpbmc/fSB1cmlTdHJpbmcgVVJJIHN0cmluZyB0byBwYXJzZSBjb21wb25lbnRzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFVSSSh1cmlTdHJpbmcpIHtcblx0aWYgKHR5cGVvZih1cmlTdHJpbmcpICE9PSAnc3RyaW5nJykge1xuXHRcdHVyaVN0cmluZyA9ICcnO1xuXHR9XG5cblx0Ly8gaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjYXBwZW5kaXgtQlxuXHR2YXIgbWF0Y2hlcyA9IHVyaVN0cmluZy5tYXRjaChVUklfUEFSU0VfUkVHRVhQKTtcblxuXHRpZiAobWF0Y2hlcykge1xuXHRcdGlmICh0eXBlb2YobWF0Y2hlc1syXSkgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aGlzLnNjaGVtZSA9IHBlcmNlbnRFbmNvZGluZ0hlbHBlci5kZWNvZGUobWF0Y2hlc1syXSk7XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YobWF0Y2hlc1s0XSkgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aGlzLmF1dGhvcml0eSA9IG5ldyBBdXRob3JpdHkobWF0Y2hlc1s0XSk7XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YobWF0Y2hlc1s1XSkgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aGlzLnBhdGggPSBwZXJjZW50RW5jb2RpbmdIZWxwZXIuZGVjb2RlKG1hdGNoZXNbNV0pO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mKG1hdGNoZXNbN10pID09PSAnc3RyaW5nJykge1xuXHRcdFx0dGhpcy5xdWVyeSA9IG5ldyBRdWVyeShtYXRjaGVzWzddKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZihtYXRjaGVzWzldKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHRoaXMuZnJhZ21lbnQgPSBwZXJjZW50RW5jb2RpbmdIZWxwZXIuZGVjb2RlKG1hdGNoZXNbOV0pO1xuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIEN1cnJlbnQgVVJJIHNjaGVtZS5cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I3NlY3Rpb24tMy4xXG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5VUkkucHJvdG90eXBlLnNjaGVtZSA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBVUkkgYXV0aG9yaXR5LlxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjc2VjdGlvbi0zLjJcbiAqIEB0eXBlIHtBdXRob3JpdHl9XG4gKi9cblVSSS5wcm90b3R5cGUuYXV0aG9yaXR5ID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IFVSSSBwYXRoLlxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjc2VjdGlvbi0zLjNcbiAqIEB0eXBlIHtTdHJpbmd9XG4gKi9cblVSSS5wcm90b3R5cGUucGF0aCA9IG51bGw7XG5cbi8qKlxuICogQ3VycmVudCBVUkkgcXVlcnkuXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzk4NiNzZWN0aW9uLTMuNFxuICogQHR5cGUge1F1ZXJ5fVxuICovXG5VUkkucHJvdG90eXBlLnF1ZXJ5ID0gbnVsbDtcblxuLyoqXG4gKiBDdXJyZW50IFVSSSBmcmFnbWVudC5cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I3NlY3Rpb24tMy41XG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5VUkkucHJvdG90eXBlLmZyYWdtZW50ID0gbnVsbDtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIFVSSSByZWZlcmVuY2UgdGhhdCBtaWdodCBiZSByZWxhdGl2ZSB0byBhIGdpdmVuIGJhc2UgVVJJXG4gKiBpbnRvIHRoZSByZWZlcmVuY2UncyB0YXJnZXQgVVJJLlxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjc2VjdGlvbi01LjJcbiAqIEBwYXJhbSB7VVJJfSBiYXNlVXJpIEJhc2UgVVJJLlxuICogQHJldHVybnMge1VSSX0gUmVzb2x2ZWQgVVJJLlxuICovXG5VUkkucHJvdG90eXBlLnJlc29sdmVSZWxhdGl2ZSA9IGZ1bmN0aW9uIChiYXNlVXJpKSB7XG5cdGlmICghYmFzZVVyaS5zY2hlbWUpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoRVJST1JfQkFTRV9TQ0hFTUUpO1xuXHR9XG5cblx0cmV0dXJuIHRyYW5zZm9ybVJlZmVyZW5jZShiYXNlVXJpLCB0aGlzKTtcbn07XG5cbi8qKlxuICogQ2xvbmVzIGN1cnJlbnQgVVJJIHRvIGEgbmV3IG9iamVjdC5cbiAqIEByZXR1cm5zIHtVUkl9IE5ldyBjbG9uZSBvZiBjdXJyZW50IG9iamVjdC5cbiAqL1xuVVJJLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHVyaSA9IG5ldyBVUkkoKTtcblxuXHRpZiAodHlwZW9mKHRoaXMuc2NoZW1lKSA9PT0gJ3N0cmluZycpIHtcblx0XHR1cmkuc2NoZW1lID0gdGhpcy5zY2hlbWU7XG5cdH1cblxuXHRpZiAodGhpcy5hdXRob3JpdHkpIHtcblx0XHR1cmkuYXV0aG9yaXR5ID0gdGhpcy5hdXRob3JpdHkuY2xvbmUoKTtcblx0fVxuXG5cdGlmICh0eXBlb2YodGhpcy5wYXRoKSA9PT0gJ3N0cmluZycpIHtcblx0XHR1cmkucGF0aCA9IHRoaXMucGF0aDtcblx0fVxuXG5cdGlmICh0aGlzLnF1ZXJ5KSB7XG5cdFx0dXJpLnF1ZXJ5ID0gdGhpcy5xdWVyeS5jbG9uZSgpO1xuXHR9XG5cblx0aWYgKHR5cGVvZih0aGlzLmZyYWdtZW50KSA9PT0gJ3N0cmluZycpIHtcblx0XHR1cmkuZnJhZ21lbnQgPSB0aGlzLmZyYWdtZW50O1xuXHR9XG5cblx0cmV0dXJuIHVyaTtcbn07XG5cbi8qKlxuICogUmVjb21wb3NlcyBVUkkgY29tcG9uZW50cyB0byBVUkkgc3RyaW5nLFxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjc2VjdGlvbi01LjNcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFVSSSBzdHJpbmcuXG4gKi9cblVSSS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciByZXN1bHQgPSAnJztcblxuXHRpZiAodGhpcy5zY2hlbWUgIT09IHVuZGVmaW5lZCAmJiB0aGlzLnNjaGVtZSAhPT0gbnVsbCkge1xuXHRcdHZhciBzY2hlbWUgPSBTdHJpbmcodGhpcy5zY2hlbWUpO1xuXHRcdGlmICghU0NIRU1FX1JFR0VYUC50ZXN0KHNjaGVtZSkpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihFUlJPUl9TQ0hFTUUpO1xuXHRcdH1cblx0XHRyZXN1bHQgKz0gc2NoZW1lICsgJzonO1xuXHR9XG5cblx0aWYgKHRoaXMuYXV0aG9yaXR5IGluc3RhbmNlb2YgQXV0aG9yaXR5KSB7XG5cdFx0cmVzdWx0ICs9ICcvLycgKyB0aGlzLmF1dGhvcml0eS50b1N0cmluZygpO1xuXHR9XG5cblx0dmFyIHBhdGggPSB0aGlzLnBhdGggPT09IHVuZGVmaW5lZCB8fCB0aGlzLnBhdGggPT09IG51bGwgP1xuXHRcdCcnIDogU3RyaW5nKHRoaXMucGF0aCk7XG5cdHJlc3VsdCArPSBwZXJjZW50RW5jb2RpbmdIZWxwZXIuZW5jb2RlUGF0aChwYXRoKTtcblxuXHRpZiAodGhpcy5xdWVyeSBpbnN0YW5jZW9mIFF1ZXJ5KSB7XG5cdFx0cmVzdWx0ICs9ICc/JyArIHRoaXMucXVlcnkudG9TdHJpbmcoKTtcblx0fVxuXG5cdGlmICh0aGlzLmZyYWdtZW50ICE9PSB1bmRlZmluZWQgJiYgdGhpcy5mcmFnbWVudCAhPT0gbnVsbCkge1xuXHRcdHZhciBmcmFnbWVudCA9IFN0cmluZyh0aGlzLmZyYWdtZW50KTtcblx0XHRyZXN1bHQgKz0gJyMnICsgcGVyY2VudEVuY29kaW5nSGVscGVyLmVuY29kZUZyYWdtZW50KGZyYWdtZW50KTtcblx0fVxuXG5cdHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybXMgcmVmZXJlbmNlIGZvciByZWxhdGl2ZSByZXNvbHV0aW9uLlxuICogV2hvbGUgYWxnb3JpdGhtIGhhcyBiZWVuIHRha2VuIGZyb21cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I3NlY3Rpb24tNS4yLjJcbiAqIEBwYXJhbSB7VVJJfSBiYXNlVXJpIEJhc2UgVVJJIGZvciByZXNvbHV0aW9uLlxuICogQHBhcmFtIHtVUkl9IHJlZmVyZW5jZVVyaSBSZWZlcmVuY2UgVVJJIHRvIHJlc29sdmUuXG4gKiBAcmV0dXJucyB7VVJJfSBDb21wb25lbnRzIG9mIHRhcmdldCBVUkkuXG4gKi9cbi8qanNoaW50IG1heGRlcHRoOmZhbHNlICovXG4vKmpzaGludCBtYXhjb21wbGV4aXR5OmZhbHNlICovXG5mdW5jdGlvbiB0cmFuc2Zvcm1SZWZlcmVuY2UoYmFzZVVyaSwgcmVmZXJlbmNlVXJpKSB7XG5cdHZhciB0YXJnZXRVcmkgPSBuZXcgVVJJKCcnKTtcblxuXHRpZiAocmVmZXJlbmNlVXJpLnNjaGVtZSkge1xuXHRcdHRhcmdldFVyaS5zY2hlbWUgPSByZWZlcmVuY2VVcmkuc2NoZW1lO1xuXHRcdHRhcmdldFVyaS5hdXRob3JpdHkgPSByZWZlcmVuY2VVcmkuYXV0aG9yaXR5IGluc3RhbmNlb2YgQXV0aG9yaXR5ID9cblx0XHRcdHJlZmVyZW5jZVVyaS5hdXRob3JpdHkuY2xvbmUoKSA6IHJlZmVyZW5jZVVyaS5hdXRob3JpdHk7XG5cdFx0dGFyZ2V0VXJpLnBhdGggPSByZW1vdmVEb3RTZWdtZW50cyhyZWZlcmVuY2VVcmkucGF0aCk7XG5cdFx0dGFyZ2V0VXJpLnF1ZXJ5ID0gcmVmZXJlbmNlVXJpLnF1ZXJ5IGluc3RhbmNlb2YgUXVlcnkgP1xuXHRcdFx0cmVmZXJlbmNlVXJpLnF1ZXJ5LmNsb25lKCkgOiByZWZlcmVuY2VVcmkucXVlcnk7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKHJlZmVyZW5jZVVyaS5hdXRob3JpdHkpIHtcblx0XHRcdHRhcmdldFVyaS5hdXRob3JpdHkgPSByZWZlcmVuY2VVcmkuYXV0aG9yaXR5IGluc3RhbmNlb2YgQXV0aG9yaXR5ID9cblx0XHRcdFx0cmVmZXJlbmNlVXJpLmF1dGhvcml0eS5jbG9uZSgpIDogcmVmZXJlbmNlVXJpLmF1dGhvcml0eTtcblx0XHRcdHRhcmdldFVyaS5wYXRoID0gcmVtb3ZlRG90U2VnbWVudHMocmVmZXJlbmNlVXJpLnBhdGgpO1xuXHRcdFx0dGFyZ2V0VXJpLnF1ZXJ5ID0gcmVmZXJlbmNlVXJpLnF1ZXJ5IGluc3RhbmNlb2YgUXVlcnkgP1xuXHRcdFx0XHRyZWZlcmVuY2VVcmkucXVlcnkuY2xvbmUoKSA6IHJlZmVyZW5jZVVyaS5xdWVyeTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHJlZmVyZW5jZVVyaS5wYXRoID09PSAnJykge1xuXHRcdFx0XHR0YXJnZXRVcmkucGF0aCA9IGJhc2VVcmkucGF0aDtcblx0XHRcdFx0aWYgKHJlZmVyZW5jZVVyaS5xdWVyeSBpbnN0YW5jZW9mIFF1ZXJ5KSB7XG5cdFx0XHRcdFx0dGFyZ2V0VXJpLnF1ZXJ5ID0gcmVmZXJlbmNlVXJpLnF1ZXJ5LmNsb25lKCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGFyZ2V0VXJpLnF1ZXJ5ID0gYmFzZVVyaS5xdWVyeSBpbnN0YW5jZW9mIFF1ZXJ5ID9cblx0XHRcdFx0XHRcdGJhc2VVcmkucXVlcnkuY2xvbmUoKSA6IGJhc2VVcmkucXVlcnk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChyZWZlcmVuY2VVcmkucGF0aFswXSA9PT0gJy8nKSB7XG5cdFx0XHRcdFx0dGFyZ2V0VXJpLnBhdGggPVxuXHRcdFx0XHRcdFx0cmVtb3ZlRG90U2VnbWVudHMocmVmZXJlbmNlVXJpLnBhdGgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRhcmdldFVyaS5wYXRoID1cblx0XHRcdFx0XHRcdG1lcmdlKGJhc2VVcmksIHJlZmVyZW5jZVVyaSk7XG5cdFx0XHRcdFx0dGFyZ2V0VXJpLnBhdGggPVxuXHRcdFx0XHRcdFx0cmVtb3ZlRG90U2VnbWVudHModGFyZ2V0VXJpLnBhdGgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRhcmdldFVyaS5xdWVyeSA9IHJlZmVyZW5jZVVyaS5xdWVyeSBpbnN0YW5jZW9mIFF1ZXJ5ID9cblx0XHRcdFx0XHRyZWZlcmVuY2VVcmkucXVlcnkuY2xvbmUoKSA6IHJlZmVyZW5jZVVyaS5xdWVyeTtcblx0XHRcdH1cblx0XHRcdHRhcmdldFVyaS5hdXRob3JpdHkgPSBiYXNlVXJpLmF1dGhvcml0eSBpbnN0YW5jZW9mIEF1dGhvcml0eSA/XG5cdFx0XHRcdGJhc2VVcmkuYXV0aG9yaXR5LmNsb25lKCkgOiBiYXNlVXJpLmF1dGhvcml0eTtcblx0XHR9XG5cdFx0dGFyZ2V0VXJpLnNjaGVtZSA9IGJhc2VVcmkuc2NoZW1lO1xuXHR9XG5cblx0dGFyZ2V0VXJpLmZyYWdtZW50ID0gcmVmZXJlbmNlVXJpLmZyYWdtZW50O1xuXHRyZXR1cm4gdGFyZ2V0VXJpO1xufVxuXG4vKipcbiAqIE1lcmdlcyBhIHJlbGF0aXZlLXBhdGggcmVmZXJlbmNlIHdpdGggdGhlIHBhdGggb2YgdGhlIGJhc2UgVVJJLlxuICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjc2VjdGlvbi01LjIuM1xuICogQHBhcmFtIHtVUkl9IGJhc2VVcmkgQ29tcG9uZW50cyBvZiBiYXNlIFVSSS5cbiAqIEBwYXJhbSB7VVJJfSByZWZlcmVuY2VVcmkgQ29tcG9uZW50cyBvZiByZWZlcmVuY2UgVVJJLlxuICogQHJldHVybnMge1N0cmluZ30gTWVyZ2VkIHBhdGguXG4gKi9cbmZ1bmN0aW9uIG1lcmdlKGJhc2VVcmksIHJlZmVyZW5jZVVyaSkge1xuXHRpZiAoYmFzZVVyaS5hdXRob3JpdHkgaW5zdGFuY2VvZiBBdXRob3JpdHkgJiYgYmFzZVVyaS5wYXRoID09PSAnJykge1xuXHRcdHJldHVybiAnLycgKyByZWZlcmVuY2VVcmkucGF0aDtcblx0fVxuXG5cdHZhciBzZWdtZW50c1N0cmluZyA9IGJhc2VVcmkucGF0aC5pbmRleE9mKCcvJykgIT09IC0xID9cblx0XHRiYXNlVXJpLnBhdGgucmVwbGFjZSgvXFwvW15cXC9dKyQvLCAnLycpIDogJyc7XG5cblx0cmV0dXJuIHNlZ21lbnRzU3RyaW5nICsgcmVmZXJlbmNlVXJpLnBhdGg7XG59XG5cbi8qKlxuICogUmVtb3ZlcyBkb3RzIHNlZ21lbnRzIGZyb20gVVJJIHBhdGguXG4gKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzk4NiNzZWN0aW9uLTUuMi40XG4gKiBAcGFyYW0ge1N0cmluZ30gdXJpUGF0aCBVUkkgcGF0aCB3aXRoIHBvc3NpYmxlIGRvdCBzZWdtZW50cy5cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFVSSSBwYXRoIHdpdGhvdXQgZG90IHNlZ21lbnRzLlxuICovXG5mdW5jdGlvbiByZW1vdmVEb3RTZWdtZW50cyh1cmlQYXRoKSB7XG5cdGlmICghdXJpUGF0aCkge1xuXHRcdHJldHVybiAnJztcblx0fVxuXG5cdHZhciBpbnB1dEJ1ZmZlciA9IHVyaVBhdGgsXG5cdFx0bmV3QnVmZmVyID0gJycsXG5cdFx0bmV4dFNlZ21lbnQgPSAnJyxcblx0XHRvdXRwdXRCdWZmZXIgPSAnJztcblxuXHR3aGlsZSAoaW5wdXRCdWZmZXIubGVuZ3RoICE9PSAwKSB7XG5cblx0XHQvLyBJZiB0aGUgaW5wdXQgYnVmZmVyIGJlZ2lucyB3aXRoIGEgcHJlZml4IG9mIFwiLi4vXCIgb3IgXCIuL1wiLFxuXHRcdC8vIHRoZW4gcmVtb3ZlIHRoYXQgcHJlZml4IGZyb20gdGhlIGlucHV0IGJ1ZmZlclxuXHRcdG5ld0J1ZmZlciA9IGlucHV0QnVmZmVyLnJlcGxhY2UoL15cXC4/XFwuXFwvLywgJycpO1xuXHRcdGlmIChuZXdCdWZmZXIgIT09IGlucHV0QnVmZmVyKSB7XG5cdFx0XHRpbnB1dEJ1ZmZlciA9IG5ld0J1ZmZlcjtcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblxuXHRcdC8vIGlmIHRoZSBpbnB1dCBidWZmZXIgYmVnaW5zIHdpdGggYSBwcmVmaXggb2YgXCIvLi9cIiBvciBcIi8uXCIsXG5cdFx0Ly8gd2hlcmUgXCIuXCIgaXMgYSBjb21wbGV0ZSBwYXRoIHNlZ21lbnQsIHRoZW4gcmVwbGFjZSB0aGF0XG5cdFx0Ly8gcHJlZml4IHdpdGggXCIvXCIgaW4gdGhlIGlucHV0IGJ1ZmZlclxuXHRcdG5ld0J1ZmZlciA9IGlucHV0QnVmZmVyLnJlcGxhY2UoL14oKFxcL1xcLlxcLyl8KFxcL1xcLiQpKS8sICcvJyk7XG5cdFx0aWYgKG5ld0J1ZmZlciAhPT0gaW5wdXRCdWZmZXIpIHtcblx0XHRcdGlucHV0QnVmZmVyID0gbmV3QnVmZmVyO1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0Ly8gaWYgdGhlIGlucHV0IGJ1ZmZlciBiZWdpbnMgd2l0aCBhIHByZWZpeCBvZiBcIi8uLi9cIiBvciBcIi8uLlwiLFxuXHRcdC8vIHdoZXJlIFwiLi5cIiBpcyBhIGNvbXBsZXRlIHBhdGggc2VnbWVudCwgdGhlbiByZXBsYWNlIHRoYXRcblx0XHQvLyBwcmVmaXggd2l0aCBcIi9cIiBpbiB0aGUgaW5wdXQgYnVmZmVyIGFuZCByZW1vdmUgdGhlIGxhc3Rcblx0XHQvLyBzZWdtZW50IGFuZCBpdHMgcHJlY2VkaW5nIFwiL1wiIChpZiBhbnkpIGZyb20gdGhlIG91dHB1dFxuXHRcdC8vIGJ1ZmZlclxuXHRcdG5ld0J1ZmZlciA9IGlucHV0QnVmZmVyLnJlcGxhY2UoL14oKFxcL1xcLlxcLlxcLyl8KFxcL1xcLlxcLiQpKS8sICcvJyk7XG5cdFx0aWYgKG5ld0J1ZmZlciAhPT0gaW5wdXRCdWZmZXIpIHtcblx0XHRcdG91dHB1dEJ1ZmZlciA9IG91dHB1dEJ1ZmZlci5yZXBsYWNlKC9cXC9bXlxcL10rJC8sICcnKTtcblx0XHRcdGlucHV0QnVmZmVyID0gbmV3QnVmZmVyO1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0Ly8gaWYgdGhlIGlucHV0IGJ1ZmZlciBjb25zaXN0cyBvbmx5IG9mIFwiLlwiIG9yIFwiLi5cIiwgdGhlbiByZW1vdmVcblx0XHQvLyB0aGF0IGZyb20gdGhlIGlucHV0IGJ1ZmZlclxuXHRcdGlmIChpbnB1dEJ1ZmZlciA9PT0gJy4nIHx8IGlucHV0QnVmZmVyID09PSAnLi4nKSB7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHQvLyBtb3ZlIHRoZSBmaXJzdCBwYXRoIHNlZ21lbnQgaW4gdGhlIGlucHV0IGJ1ZmZlciB0byB0aGUgZW5kIG9mXG5cdFx0Ly8gdGhlIG91dHB1dCBidWZmZXIsIGluY2x1ZGluZyB0aGUgaW5pdGlhbCBcIi9cIiBjaGFyYWN0ZXIgKGlmXG5cdFx0Ly8gYW55KSBhbmQgYW55IHN1YnNlcXVlbnQgY2hhcmFjdGVycyB1cCB0bywgYnV0IG5vdCBpbmNsdWRpbmcsXG5cdFx0Ly8gdGhlIG5leHQgXCIvXCIgY2hhcmFjdGVyIG9yIHRoZSBlbmQgb2YgdGhlIGlucHV0IGJ1ZmZlclxuXHRcdG5leHRTZWdtZW50ID0gL15cXC8/W15cXC9dKihcXC98JCkvLmV4ZWMoaW5wdXRCdWZmZXIpWzBdO1xuXHRcdG5leHRTZWdtZW50ID0gbmV4dFNlZ21lbnQucmVwbGFjZSgvKFteXFwvXSkoXFwvJCkvLCAnJDEnKTtcblx0XHRpbnB1dEJ1ZmZlciA9IGlucHV0QnVmZmVyLnN1YnN0cmluZyhuZXh0U2VnbWVudC5sZW5ndGgpO1xuXHRcdG91dHB1dEJ1ZmZlciArPSBuZXh0U2VnbWVudDtcblx0fVxuXG5cdHJldHVybiBvdXRwdXRCdWZmZXI7XG59IiwiLypcbiAqIGNhdGJlcnJ5LXVyaVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5LXVyaSdzIGxpY2Vuc2UgZm9sbG93czpcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICogb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb25cbiAqIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAqIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gKiBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICogYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqXG4gKiBUaGlzIGxpY2Vuc2UgYXBwbGllcyB0byBhbGwgcGFydHMgb2YgY2F0YmVycnktdXJpIHRoYXQgYXJlIG5vdCBleHRlcm5hbGx5XG4gKiBtYWludGFpbmVkIGxpYnJhcmllcy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gVXNlckluZm87XG5cbnZhciBwZXJjZW50RW5jb2RpbmdIZWxwZXIgPSByZXF1aXJlKCcuL3BlcmNlbnRFbmNvZGluZ0hlbHBlcicpO1xuXG4vKipcbiAqIENyZWF0ZXMgbmV3IGluc3RhbmNlIG9mIHVzZXIgaW5mb3JtYXRpb24gY29tcG9uZW50IHBhcnNlci5cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I3NlY3Rpb24tMy4yLjFcbiAqIEBwYXJhbSB7U3RyaW5nP30gdXNlckluZm9TdHJpbmcgVXNlciBpbmZvcm1hdGlvbiBjb21wb25lbnQgc3RyaW5nLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFVzZXJJbmZvKHVzZXJJbmZvU3RyaW5nKSB7XG5cdGlmICh0eXBlb2YodXNlckluZm9TdHJpbmcpID09PSAnc3RyaW5nJyAmJiB1c2VySW5mb1N0cmluZy5sZW5ndGggPiAwKSB7XG5cdFx0dmFyIHBhcnRzID0gdXNlckluZm9TdHJpbmcuc3BsaXQoJzonKTtcblx0XHRpZiAodHlwZW9mKHBhcnRzWzBdKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHRoaXMudXNlciA9IHBlcmNlbnRFbmNvZGluZ0hlbHBlci5kZWNvZGUocGFydHNbMF0pO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mKHBhcnRzWzFdKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHRoaXMucGFzc3dvcmQgPSBwZXJjZW50RW5jb2RpbmdIZWxwZXIuZGVjb2RlKHBhcnRzWzFdKTtcblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBDdXJyZW50IHVzZXIgY29tcG9uZW50LlxuICogQHR5cGUge1N0cmluZ31cbiAqL1xuVXNlckluZm8ucHJvdG90eXBlLnVzZXIgPSBudWxsO1xuXG4vKipcbiAqIEN1cnJlbnQgcGFzc3dvcmQuXG4gKiBAdHlwZSB7U3RyaW5nfVxuICovXG5Vc2VySW5mby5wcm90b3R5cGUucGFzc3dvcmQgPSBudWxsO1xuXG4vKipcbiAqIENsb25lcyBjdXJyZW50IHVzZXIgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7VXNlckluZm99IE5ldyBjbG9uZSBvZiBjdXJyZW50IG9iamVjdC5cbiAqL1xuVXNlckluZm8ucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgdXNlckluZm8gPSBuZXcgVXNlckluZm8oKTtcblx0aWYgKHR5cGVvZih0aGlzLnVzZXIpID09PSAnc3RyaW5nJykge1xuXHRcdHVzZXJJbmZvLnVzZXIgPSB0aGlzLnVzZXI7XG5cdH1cblx0aWYgKHR5cGVvZih0aGlzLnBhc3N3b3JkKSA9PT0gJ3N0cmluZycpIHtcblx0XHR1c2VySW5mby5wYXNzd29yZCA9IHRoaXMucGFzc3dvcmQ7XG5cdH1cblx0cmV0dXJuIHVzZXJJbmZvO1xufTtcblxuLyoqXG4gKiBSZWNvbWJpbmVzIHVzZXIgaW5mb3JtYXRpb24gY29tcG9uZW50cyB0byB1c2VySW5mbyBzdHJpbmcuXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBVc2VyIGluZm9ybWF0aW9uIGNvbXBvbmVudCBzdHJpbmcuXG4gKi9cblVzZXJJbmZvLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHJlc3VsdCA9ICcnO1xuXHRpZiAodGhpcy51c2VyICE9PSB1bmRlZmluZWQgJiYgdGhpcy51c2VyICE9PSBudWxsKSB7XG5cdFx0dmFyIHVzZXIgPSBTdHJpbmcodGhpcy51c2VyKTtcblx0XHRyZXN1bHQgKz0gcGVyY2VudEVuY29kaW5nSGVscGVyXG5cdFx0XHQuZW5jb2RlVXNlckluZm9TdWJDb21wb25lbnQodXNlcik7XG5cdH1cblx0aWYgKHRoaXMucGFzc3dvcmQgIT09IHVuZGVmaW5lZCAmJiB0aGlzLnBhc3N3b3JkICE9PSBudWxsKSB7XG5cdFx0dmFyIHBhc3N3b3JkID0gU3RyaW5nKHRoaXMucGFzc3dvcmQpO1xuXHRcdHJlc3VsdCArPSAnOicgKyBwZXJjZW50RW5jb2RpbmdIZWxwZXJcblx0XHRcdC5lbmNvZGVVc2VySW5mb1N1YkNvbXBvbmVudChwYXNzd29yZCk7XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0O1xufTsiLCIvKlxuICogY2F0YmVycnktdXJpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IERlbmlzIFJlY2hrdW5vdiBhbmQgcHJvamVjdCBjb250cmlidXRvcnMuXG4gKlxuICogY2F0YmVycnktdXJpJ3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeS11cmkgdGhhdCBhcmUgbm90IGV4dGVybmFsbHlcbiAqIG1haW50YWluZWQgbGlicmFyaWVzLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjc2VjdGlvbi0yLjFcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdC8qKlxuXHQgKiBFbmNvZGVzIGF1dGhvcml0eSB1c2VyIGluZm9ybWF0aW9uIHN1Yi1jb21wb25lbnQgYWNjb3JkaW5nIHRvIFJGQyAzOTg2LlxuXHQgKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIENvbXBvbmVudCB0byBlbmNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IEVuY29kZWQgY29tcG9uZW50LlxuXHQgKi9cblx0ZW5jb2RlVXNlckluZm9TdWJDb21wb25lbnQ6IGZ1bmN0aW9uIChzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnJlcGxhY2UoXG5cdFx0XHQvLyBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzk4NiNzZWN0aW9uLTMuMi4xXG5cdFx0XHQvW15cXHdcXC5+XFwtIVxcJCYnXFwoXFwpXFwqXFwrLDs9XS9nLCBlbmNvZGVVUklDb21wb25lbnRcblx0XHQpO1xuXHR9LFxuXHQvKipcblx0ICogRW5jb2RlcyBhdXRob3JpdHkgaG9zdCBjb21wb25lbnQgYWNjb3JkaW5nIHRvIFJGQyAzOTg2LlxuXHQgKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIENvbXBvbmVudCB0byBlbmNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IEVuY29kZWQgY29tcG9uZW50LlxuXHQgKi9cblx0ZW5jb2RlSG9zdDogZnVuY3Rpb24gKHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcucmVwbGFjZShcblx0XHRcdC8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I3NlY3Rpb24tMy4yLjJcblx0XHRcdC9bXlxcd1xcLn5cXC0hXFwkJidcXChcXClcXCpcXCssOz06XFxbXFxdXS9nLCBlbmNvZGVVUklDb21wb25lbnRcblx0XHQpO1xuXG5cdH0sXG5cdC8qKlxuXHQgKiBFbmNvZGVzIFVSSSBwYXRoIGNvbXBvbmVudCBhY2NvcmRpbmcgdG8gUkZDIDM5ODYuXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgQ29tcG9uZW50IHRvIGVuY29kZS5cblx0ICogQHJldHVybnMge1N0cmluZ30gRW5jb2RlZCBjb21wb25lbnQuXG5cdCAqL1xuXHRlbmNvZGVQYXRoOiBmdW5jdGlvbiAoc3RyaW5nKSB7XG5cdFx0cmV0dXJuIHN0cmluZy5yZXBsYWNlKFxuXHRcdFx0Ly8gaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjc2VjdGlvbi0zLjNcblx0XHRcdC9bXlxcd1xcLn5cXC0hXFwkJidcXChcXClcXCpcXCssOz06QFxcL10vZywgZW5jb2RlVVJJQ29tcG9uZW50XG5cdFx0KTtcblx0fSxcblx0LyoqXG5cdCAqIEVuY29kZXMgcXVlcnkgc3ViLWNvbXBvbmVudCBhY2NvcmRpbmcgdG8gUkZDIDM5ODYuXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgQ29tcG9uZW50IHRvIGVuY29kZS5cblx0ICogQHJldHVybnMge1N0cmluZ30gRW5jb2RlZCBjb21wb25lbnQuXG5cdCAqL1xuXHRlbmNvZGVRdWVyeVN1YkNvbXBvbmVudDogZnVuY3Rpb24gKHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcucmVwbGFjZShcblx0XHRcdC8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I3NlY3Rpb24tMy40XG5cdFx0XHQvW15cXHdcXC5+XFwtIVxcJCdcXChcXClcXCpcXCssOzpAXFwvXFw/XS9nLCBlbmNvZGVVUklDb21wb25lbnRcblx0XHQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBFbmNvZGVzIFVSSSBmcmFnbWVudCBjb21wb25lbnQgYWNjb3JkaW5nIHRvIFJGQyAzOTg2LlxuXHQgKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIENvbXBvbmVudCB0byBlbmNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IEVuY29kZWQgY29tcG9uZW50LlxuXHQgKi9cblx0ZW5jb2RlRnJhZ21lbnQ6IGZ1bmN0aW9uIChzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnJlcGxhY2UoXG5cdFx0XHQvLyBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzk4NiNzZWN0aW9uLTMuNVxuXHRcdFx0L1teXFx3XFwuflxcLSFcXCQmJ1xcKFxcKVxcKlxcKyw7PTpAXFwvXFw/XS9nLCBlbmNvZGVVUklDb21wb25lbnRcblx0XHQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEZWNvZGVzIHBlcmNlbnQgZW5jb2RlZCBjb21wb25lbnQuXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgQ29tcG9uZW50IHRvIGRlY29kZS5cblx0ICogQHJldHVybnMge1N0cmluZ30gRGVjb2RlZCBjb21wb25lbnQuXG5cdCAqL1xuXHRkZWNvZGU6IGZ1bmN0aW9uIChzdHJpbmcpIHtcblx0XHRyZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cmluZyk7XG5cdH1cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2NvcmUuanMnKVxucmVxdWlyZSgnLi9saWIvZG9uZS5qcycpXG5yZXF1aXJlKCcuL2xpYi9lczYtZXh0ZW5zaW9ucy5qcycpXG5yZXF1aXJlKCcuL2xpYi9ub2RlLWV4dGVuc2lvbnMuanMnKSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFzYXAgPSByZXF1aXJlKCdhc2FwJylcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9taXNlO1xuZnVuY3Rpb24gUHJvbWlzZShmbikge1xuICBpZiAodHlwZW9mIHRoaXMgIT09ICdvYmplY3QnKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlcyBtdXN0IGJlIGNvbnN0cnVjdGVkIHZpYSBuZXcnKVxuICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdub3QgYSBmdW5jdGlvbicpXG4gIHZhciBzdGF0ZSA9IG51bGxcbiAgdmFyIHZhbHVlID0gbnVsbFxuICB2YXIgZGVmZXJyZWRzID0gW11cbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgdGhpcy50aGVuID0gZnVuY3Rpb24ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgICByZXR1cm4gbmV3IHNlbGYuY29uc3RydWN0b3IoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBoYW5kbGUobmV3IEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHJlc29sdmUsIHJlamVjdCkpXG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZShkZWZlcnJlZCkge1xuICAgIGlmIChzdGF0ZSA9PT0gbnVsbCkge1xuICAgICAgZGVmZXJyZWRzLnB1c2goZGVmZXJyZWQpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgYXNhcChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjYiA9IHN0YXRlID8gZGVmZXJyZWQub25GdWxmaWxsZWQgOiBkZWZlcnJlZC5vblJlamVjdGVkXG4gICAgICBpZiAoY2IgPT09IG51bGwpIHtcbiAgICAgICAgKHN0YXRlID8gZGVmZXJyZWQucmVzb2x2ZSA6IGRlZmVycmVkLnJlamVjdCkodmFsdWUpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIHJldFxuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0ID0gY2IodmFsdWUpXG4gICAgICB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKHJldClcbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVzb2x2ZShuZXdWYWx1ZSkge1xuICAgIHRyeSB7IC8vUHJvbWlzZSBSZXNvbHV0aW9uIFByb2NlZHVyZTogaHR0cHM6Ly9naXRodWIuY29tL3Byb21pc2VzLWFwbHVzL3Byb21pc2VzLXNwZWMjdGhlLXByb21pc2UtcmVzb2x1dGlvbi1wcm9jZWR1cmVcbiAgICAgIGlmIChuZXdWYWx1ZSA9PT0gc2VsZikgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBwcm9taXNlIGNhbm5vdCBiZSByZXNvbHZlZCB3aXRoIGl0c2VsZi4nKVxuICAgICAgaWYgKG5ld1ZhbHVlICYmICh0eXBlb2YgbmV3VmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgdmFyIHRoZW4gPSBuZXdWYWx1ZS50aGVuXG4gICAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGRvUmVzb2x2ZSh0aGVuLmJpbmQobmV3VmFsdWUpLCByZXNvbHZlLCByZWplY3QpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHN0YXRlID0gdHJ1ZVxuICAgICAgdmFsdWUgPSBuZXdWYWx1ZVxuICAgICAgZmluYWxlKClcbiAgICB9IGNhdGNoIChlKSB7IHJlamVjdChlKSB9XG4gIH1cblxuICBmdW5jdGlvbiByZWplY3QobmV3VmFsdWUpIHtcbiAgICBzdGF0ZSA9IGZhbHNlXG4gICAgdmFsdWUgPSBuZXdWYWx1ZVxuICAgIGZpbmFsZSgpXG4gIH1cblxuICBmdW5jdGlvbiBmaW5hbGUoKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGRlZmVycmVkcy5sZW5ndGg7IGkgPCBsZW47IGkrKylcbiAgICAgIGhhbmRsZShkZWZlcnJlZHNbaV0pXG4gICAgZGVmZXJyZWRzID0gbnVsbFxuICB9XG5cbiAgZG9SZXNvbHZlKGZuLCByZXNvbHZlLCByZWplY3QpXG59XG5cblxuZnVuY3Rpb24gSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzb2x2ZSwgcmVqZWN0KXtcbiAgdGhpcy5vbkZ1bGZpbGxlZCA9IHR5cGVvZiBvbkZ1bGZpbGxlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uRnVsZmlsbGVkIDogbnVsbFxuICB0aGlzLm9uUmVqZWN0ZWQgPSB0eXBlb2Ygb25SZWplY3RlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uUmVqZWN0ZWQgOiBudWxsXG4gIHRoaXMucmVzb2x2ZSA9IHJlc29sdmVcbiAgdGhpcy5yZWplY3QgPSByZWplY3Rcbn1cblxuLyoqXG4gKiBUYWtlIGEgcG90ZW50aWFsbHkgbWlzYmVoYXZpbmcgcmVzb2x2ZXIgZnVuY3Rpb24gYW5kIG1ha2Ugc3VyZVxuICogb25GdWxmaWxsZWQgYW5kIG9uUmVqZWN0ZWQgYXJlIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogTWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCBhc3luY2hyb255LlxuICovXG5mdW5jdGlvbiBkb1Jlc29sdmUoZm4sIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIHZhciBkb25lID0gZmFsc2U7XG4gIHRyeSB7XG4gICAgZm4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAoZG9uZSkgcmV0dXJuXG4gICAgICBkb25lID0gdHJ1ZVxuICAgICAgb25GdWxmaWxsZWQodmFsdWUpXG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgaWYgKGRvbmUpIHJldHVyblxuICAgICAgZG9uZSA9IHRydWVcbiAgICAgIG9uUmVqZWN0ZWQocmVhc29uKVxuICAgIH0pXG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgaWYgKGRvbmUpIHJldHVyblxuICAgIGRvbmUgPSB0cnVlXG4gICAgb25SZWplY3RlZChleClcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vY29yZS5qcycpXG52YXIgYXNhcCA9IHJlcXVpcmUoJ2FzYXAnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2VcblByb21pc2UucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiAob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgdmFyIHNlbGYgPSBhcmd1bWVudHMubGVuZ3RoID8gdGhpcy50aGVuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiB0aGlzXG4gIHNlbGYudGhlbihudWxsLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICB0aHJvdyBlcnJcbiAgICB9KVxuICB9KVxufSIsIid1c2Ugc3RyaWN0JztcblxuLy9UaGlzIGZpbGUgY29udGFpbnMgdGhlIEVTNiBleHRlbnNpb25zIHRvIHRoZSBjb3JlIFByb21pc2VzL0ErIEFQSVxuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vY29yZS5qcycpXG52YXIgYXNhcCA9IHJlcXVpcmUoJ2FzYXAnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2VcblxuLyogU3RhdGljIEZ1bmN0aW9ucyAqL1xuXG5mdW5jdGlvbiBWYWx1ZVByb21pc2UodmFsdWUpIHtcbiAgdGhpcy50aGVuID0gZnVuY3Rpb24gKG9uRnVsZmlsbGVkKSB7XG4gICAgaWYgKHR5cGVvZiBvbkZ1bGZpbGxlZCAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIHRoaXNcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzb2x2ZShvbkZ1bGZpbGxlZCh2YWx1ZSkpXG4gICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgcmVqZWN0KGV4KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KVxuICB9XG59XG5WYWx1ZVByb21pc2UucHJvdG90eXBlID0gUHJvbWlzZS5wcm90b3R5cGVcblxudmFyIFRSVUUgPSBuZXcgVmFsdWVQcm9taXNlKHRydWUpXG52YXIgRkFMU0UgPSBuZXcgVmFsdWVQcm9taXNlKGZhbHNlKVxudmFyIE5VTEwgPSBuZXcgVmFsdWVQcm9taXNlKG51bGwpXG52YXIgVU5ERUZJTkVEID0gbmV3IFZhbHVlUHJvbWlzZSh1bmRlZmluZWQpXG52YXIgWkVSTyA9IG5ldyBWYWx1ZVByb21pc2UoMClcbnZhciBFTVBUWVNUUklORyA9IG5ldyBWYWx1ZVByb21pc2UoJycpXG5cblByb21pc2UucmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSByZXR1cm4gdmFsdWVcblxuICBpZiAodmFsdWUgPT09IG51bGwpIHJldHVybiBOVUxMXG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gVU5ERUZJTkVEXG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkgcmV0dXJuIFRSVUVcbiAgaWYgKHZhbHVlID09PSBmYWxzZSkgcmV0dXJuIEZBTFNFXG4gIGlmICh2YWx1ZSA9PT0gMCkgcmV0dXJuIFpFUk9cbiAgaWYgKHZhbHVlID09PSAnJykgcmV0dXJuIEVNUFRZU1RSSU5HXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciB0aGVuID0gdmFsdWUudGhlblxuICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSh0aGVuLmJpbmQodmFsdWUpKVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZWplY3QoZXgpXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgVmFsdWVQcm9taXNlKHZhbHVlKVxufVxuXG5Qcm9taXNlLmFsbCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIpXG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDApIHJldHVybiByZXNvbHZlKFtdKVxuICAgIHZhciByZW1haW5pbmcgPSBhcmdzLmxlbmd0aFxuICAgIGZ1bmN0aW9uIHJlcyhpLCB2YWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICh2YWwgJiYgKHR5cGVvZiB2YWwgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgdmFyIHRoZW4gPSB2YWwudGhlblxuICAgICAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhlbi5jYWxsKHZhbCwgZnVuY3Rpb24gKHZhbCkgeyByZXMoaSwgdmFsKSB9LCByZWplY3QpXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXJnc1tpXSA9IHZhbFxuICAgICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICByZXNvbHZlKGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICByZWplY3QoZXgpXG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgcmVzKGksIGFyZ3NbaV0pXG4gICAgfVxuICB9KVxufVxuXG5Qcm9taXNlLnJlamVjdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyBcbiAgICByZWplY3QodmFsdWUpO1xuICB9KTtcbn1cblxuUHJvbWlzZS5yYWNlID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyBcbiAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSl7XG4gICAgICBQcm9taXNlLnJlc29sdmUodmFsdWUpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KVxuICB9KTtcbn1cblxuLyogUHJvdG90eXBlIE1ldGhvZHMgKi9cblxuUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbiAob25SZWplY3RlZCkge1xuICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vL1RoaXMgZmlsZSBjb250YWlucyB0aGVuL3Byb21pc2Ugc3BlY2lmaWMgZXh0ZW5zaW9ucyB0aGF0IGFyZSBvbmx5IHVzZWZ1bCBmb3Igbm9kZS5qcyBpbnRlcm9wXG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9jb3JlLmpzJylcbnZhciBhc2FwID0gcmVxdWlyZSgnYXNhcCcpXG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZVxuXG4vKiBTdGF0aWMgRnVuY3Rpb25zICovXG5cblByb21pc2UuZGVub2RlaWZ5ID0gZnVuY3Rpb24gKGZuLCBhcmd1bWVudENvdW50KSB7XG4gIGFyZ3VtZW50Q291bnQgPSBhcmd1bWVudENvdW50IHx8IEluZmluaXR5XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHdoaWxlIChhcmdzLmxlbmd0aCAmJiBhcmdzLmxlbmd0aCA+IGFyZ3VtZW50Q291bnQpIHtcbiAgICAgICAgYXJncy5wb3AoKVxuICAgICAgfVxuICAgICAgYXJncy5wdXNoKGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKVxuICAgICAgICBlbHNlIHJlc29sdmUocmVzKVxuICAgICAgfSlcbiAgICAgIHZhciByZXMgPSBmbi5hcHBseShzZWxmLCBhcmdzKVxuICAgICAgaWYgKHJlcyAmJiAodHlwZW9mIHJlcyA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHJlcyA9PT0gJ2Z1bmN0aW9uJykgJiYgdHlwZW9mIHJlcy50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJlc29sdmUocmVzKVxuICAgICAgfVxuICAgIH0pXG4gIH1cbn1cblByb21pc2Uubm9kZWlmeSA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHZhciBjYWxsYmFjayA9IHR5cGVvZiBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPT09ICdmdW5jdGlvbicgPyBhcmdzLnBvcCgpIDogbnVsbFxuICAgIHZhciBjdHggPSB0aGlzXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpLm5vZGVpZnkoY2FsbGJhY2ssIGN0eClcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgaWYgKGNhbGxiYWNrID09PSBudWxsIHx8IHR5cGVvZiBjYWxsYmFjayA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyByZWplY3QoZXgpIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjYWxsYmFjay5jYWxsKGN0eCwgZXgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cblByb21pc2UucHJvdG90eXBlLm5vZGVpZnkgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGN0eCkge1xuICBpZiAodHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicpIHJldHVybiB0aGlzXG5cbiAgdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgY2FsbGJhY2suY2FsbChjdHgsIG51bGwsIHZhbHVlKVxuICAgIH0pXG4gIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgIGNhbGxiYWNrLmNhbGwoY3R4LCBlcnIpXG4gICAgfSlcbiAgfSlcbn1cbiIsIlxuLy8gVXNlIHRoZSBmYXN0ZXN0IHBvc3NpYmxlIG1lYW5zIHRvIGV4ZWN1dGUgYSB0YXNrIGluIGEgZnV0dXJlIHR1cm5cbi8vIG9mIHRoZSBldmVudCBsb29wLlxuXG4vLyBsaW5rZWQgbGlzdCBvZiB0YXNrcyAoc2luZ2xlLCB3aXRoIGhlYWQgbm9kZSlcbnZhciBoZWFkID0ge3Rhc2s6IHZvaWQgMCwgbmV4dDogbnVsbH07XG52YXIgdGFpbCA9IGhlYWQ7XG52YXIgZmx1c2hpbmcgPSBmYWxzZTtcbnZhciByZXF1ZXN0Rmx1c2ggPSB2b2lkIDA7XG52YXIgaXNOb2RlSlMgPSBmYWxzZTtcblxuZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgLyoganNoaW50IGxvb3BmdW5jOiB0cnVlICovXG5cbiAgICB3aGlsZSAoaGVhZC5uZXh0KSB7XG4gICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgICAgIHZhciB0YXNrID0gaGVhZC50YXNrO1xuICAgICAgICBoZWFkLnRhc2sgPSB2b2lkIDA7XG4gICAgICAgIHZhciBkb21haW4gPSBoZWFkLmRvbWFpbjtcblxuICAgICAgICBpZiAoZG9tYWluKSB7XG4gICAgICAgICAgICBoZWFkLmRvbWFpbiA9IHZvaWQgMDtcbiAgICAgICAgICAgIGRvbWFpbi5lbnRlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRhc2soKTtcblxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSlMpIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBub2RlLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBjb25zaWRlcmVkIGZhdGFsIGVycm9ycy5cbiAgICAgICAgICAgICAgICAvLyBSZS10aHJvdyB0aGVtIHN5bmNocm9ub3VzbHkgdG8gaW50ZXJydXB0IGZsdXNoaW5nIVxuXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNvbnRpbnVhdGlvbiBpZiB0aGUgdW5jYXVnaHQgZXhjZXB0aW9uIGlzIHN1cHByZXNzZWRcbiAgICAgICAgICAgICAgICAvLyBsaXN0ZW5pbmcgXCJ1bmNhdWdodEV4Y2VwdGlvblwiIGV2ZW50cyAoYXMgZG9tYWlucyBkb2VzKS5cbiAgICAgICAgICAgICAgICAvLyBDb250aW51ZSBpbiBuZXh0IGV2ZW50IHRvIGF2b2lkIHRpY2sgcmVjdXJzaW9uLlxuICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEluIGJyb3dzZXJzLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBub3QgZmF0YWwuXG4gICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBhc3luY2hyb25vdXNseSB0byBhdm9pZCBzbG93LWRvd25zLlxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgIGRvbWFpbi5leGl0KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmbHVzaGluZyA9IGZhbHNlO1xufVxuXG5pZiAodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2Vzcy5uZXh0VGljaykge1xuICAgIC8vIE5vZGUuanMgYmVmb3JlIDAuOS4gTm90ZSB0aGF0IHNvbWUgZmFrZS1Ob2RlIGVudmlyb25tZW50cywgbGlrZSB0aGVcbiAgICAvLyBNb2NoYSB0ZXN0IHJ1bm5lciwgaW50cm9kdWNlIGEgYHByb2Nlc3NgIGdsb2JhbCB3aXRob3V0IGEgYG5leHRUaWNrYC5cbiAgICBpc05vZGVKUyA9IHRydWU7XG5cbiAgICByZXF1ZXN0Rmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xuICAgIH07XG5cbn0gZWxzZSBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgLy8gSW4gSUUxMCwgTm9kZS5qcyAwLjkrLCBvciBodHRwczovL2dpdGh1Yi5jb20vTm9ibGVKUy9zZXRJbW1lZGlhdGVcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICByZXF1ZXN0Rmx1c2ggPSBzZXRJbW1lZGlhdGUuYmluZCh3aW5kb3csIGZsdXNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0Rmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZXRJbW1lZGlhdGUoZmx1c2gpO1xuICAgICAgICB9O1xuICAgIH1cblxufSBlbHNlIGlmICh0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAvLyBtb2Rlcm4gYnJvd3NlcnNcbiAgICAvLyBodHRwOi8vd3d3Lm5vbmJsb2NraW5nLmlvLzIwMTEvMDYvd2luZG93bmV4dHRpY2suaHRtbFxuICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgICByZXF1ZXN0Rmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgfTtcblxufSBlbHNlIHtcbiAgICAvLyBvbGQgYnJvd3NlcnNcbiAgICByZXF1ZXN0Rmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGFzYXAodGFzaykge1xuICAgIHRhaWwgPSB0YWlsLm5leHQgPSB7XG4gICAgICAgIHRhc2s6IHRhc2ssXG4gICAgICAgIGRvbWFpbjogaXNOb2RlSlMgJiYgcHJvY2Vzcy5kb21haW4sXG4gICAgICAgIG5leHQ6IG51bGxcbiAgICB9O1xuXG4gICAgaWYgKCFmbHVzaGluZykge1xuICAgICAgICBmbHVzaGluZyA9IHRydWU7XG4gICAgICAgIHJlcXVlc3RGbHVzaCgpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYXNhcDtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuLy8ganNjczpkaXNhYmxlIG1heGltdW1MaW5lTGVuZ3RoXG4vLyBUaGlzIGZpbGUgY29udGFpbnMgZGVmaW5pdGlvbnMgb2YgcnVsZXMgaG93IGxvY2F0aW9uIFVSTHMgYXJlIHRyYW5zbGF0ZWRcbi8vIHRvIFwicmVuZGVyXCIgbWV0aG9kcyBvZiBjYXRiZXJyeSdzIG1vZHVsZXMuXG4vL1xuLy8gRm9ybWF0OlxuLy8gL3NvbWUvOnBhcmFtZXRlclttb2R1bGUxLG1vZHVsZTIsbW9kdWxlM11cbi8vXG4vLyBNb3JlIGRldGFpbHMgaGVyZTpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9jYXRiZXJyeS9jYXRiZXJyeS9ibG9iL21hc3Rlci9kb2NzL2luZGV4Lm1kI3VybC1yb3V0ZS1kZWZpbml0aW9uXG5cbm1vZHVsZS5leHBvcnRzID0gW1xuXHQnLzpwYWdlW1BhZ2VzXScsXG5cdCcvOnBhZ2VbUGFnZXNdP3F1ZXJ5PTpxdWVyeVtjb21taXRzL1NlYXJjaF0nXG5dOyIsIi8qXG4gKiBjYXRiZXJyeVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBEZW5pcyBSZWNoa3Vub3YgYW5kIHByb2plY3QgY29udHJpYnV0b3JzLlxuICpcbiAqIGNhdGJlcnJ5J3MgbGljZW5zZSBmb2xsb3dzOlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gKiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvblxuICogZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICogaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAqIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gKiBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbiAqIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1NcbiAqIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICpcbiAqIFRoaXMgbGljZW5zZSBhcHBsaWVzIHRvIGFsbCBwYXJ0cyBvZiBjYXRiZXJyeSB0aGF0IGFyZSBub3QgZXh0ZXJuYWxseVxuICogbWFpbnRhaW5lZCBsaWJyYXJpZXMuXG4gKi9cblxuLyoqXG4gKiBUaGlzIG1vZHVsZSBpcyBhIHRlbXBsYXRlIGFuZCBpdCBpcyB1c2VkIG9ubHkgd2l0aCBzb21lIHN0cmluZyByZXBsYWNlc1xuICogYnkgQnJvd3NlckJ1bmRsZUJ1aWxkZXIgbW9kdWxlLiBJdCBkb2VzIG5vdCB3b3JrIGJ5IGl0c2VsZi5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzdG9yZXMgPSBbXG5cbntuYW1lOiAnQWJvdXQnLCBjb25zdHJ1Y3RvcjogcmVxdWlyZSgnLi9jYXRiZXJyeV9zdG9yZXMvQWJvdXQuanMnKX0sXG57bmFtZTogJ1BhZ2VzJywgY29uc3RydWN0b3I6IHJlcXVpcmUoJy4vY2F0YmVycnlfc3RvcmVzL1BhZ2VzLmpzJyl9LFxue25hbWU6ICdjb21taXRzL0ZlZWQnLCBjb25zdHJ1Y3RvcjogcmVxdWlyZSgnLi9jYXRiZXJyeV9zdG9yZXMvY29tbWl0cy9GZWVkLmpzJyl9LFxue25hbWU6ICdjb21taXRzL0xpc3QnLCBjb25zdHJ1Y3RvcjogcmVxdWlyZSgnLi9jYXRiZXJyeV9zdG9yZXMvY29tbWl0cy9MaXN0LmpzJyl9LFxue25hbWU6ICdjb21taXRzL1NlYXJjaCcsIGNvbnN0cnVjdG9yOiByZXF1aXJlKCcuL2NhdGJlcnJ5X3N0b3Jlcy9jb21taXRzL1NlYXJjaC5qcycpfVxuXTtcblxudmFyIGNvbXBvbmVudHMgPSBbXG5cbntuYW1lOiAnYWJvdXQnLCBjb25zdHJ1Y3RvcjogcmVxdWlyZSgnLi9jYXRiZXJyeV9jb21wb25lbnRzL2Fib3V0L2luZGV4LmpzJyksIHByb3BlcnRpZXM6IHtcIm5hbWVcIjpcImFib3V0XCIsXCJ0ZW1wbGF0ZVwiOlwiLi90ZW1wbGF0ZS5oYnNcIixcImVycm9yVGVtcGxhdGVcIjpcIi4vZXJyb3IuaGJzXCJ9LCB0ZW1wbGF0ZVNvdXJjZTogJ3tcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xcbiAgdmFyIHN0YWNrMSwgaGVscGVyLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBoZWxwZXJNaXNzaW5nPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYnVmZmVyID0gXCI8ZGl2IGNsYXNzPVxcXFxcImNvbnRhaW5lclxcXFxcIj5cXFxcblxcdFwiO1xcbiAgc3RhY2sxID0gKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5yZWFkbWVIVE1MIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5yZWFkbWVIVE1MIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInJlYWRtZUhUTUxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKTtcXG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XFxuICByZXR1cm4gYnVmZmVyICsgXCJcXFxcbjwvZGl2PlwiO1xcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0nLCBlcnJvclRlbXBsYXRlU291cmNlOiAne1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XFxuICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXFxcImFsZXJ0IGFsZXJ0LWRhbmdlclxcXFxcIiByb2xlPVxcXFxcImFsZXJ0XFxcXFwiPlxcXFxuXFx0TG9va3MgbGlrZSBhYm91dCBwYWdlIGlzIHVuYXZhaWxhYmxlIHJpZ2h0IG5vdy5cXFxcbjwvZGl2PlxcXFxuXCI7XFxuICB9LFwidXNlRGF0YVwiOnRydWV9J30sXG57bmFtZTogJ2RvY3VtZW50JywgY29uc3RydWN0b3I6IHJlcXVpcmUoJy4vY2F0YmVycnlfY29tcG9uZW50cy9kb2N1bWVudC9pbmRleC5qcycpLCBwcm9wZXJ0aWVzOiB7XCJuYW1lXCI6XCJkb2N1bWVudFwiLFwidGVtcGxhdGVcIjpcIi4vdGVtcGxhdGUuaGJzXCJ9LCB0ZW1wbGF0ZVNvdXJjZTogJ3tcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xcbiAgcmV0dXJuIFwiPCFET0NUWVBFIGh0bWw+XFxcXG48aHRtbCBsYW5nPVxcXFxcImVuXFxcXFwiPlxcXFxuPGhlYWQgY2F0LXN0b3JlPVxcXFxcIlBhZ2VzXFxcXFwiPjwvaGVhZD5cXFxcbjxib2R5PlxcXFxuXFx0PGNhdC1wYWdlcy1uYXZpZ2F0aW9uIGlkPVxcXFxcInBhZ2VzLW5hdmlnYXRpb25cXFxcXCIgY2F0LXN0b3JlPVxcXFxcIlBhZ2VzXFxcXFwiPjwvY2F0LXBhZ2VzLW5hdmlnYXRpb24+XFxcXG5cXHQ8Y2F0LXBhZ2VzLWNvbnRlbnQgaWQ9XFxcXFwicGFnZXMtY29udGVudFxcXFxcIiBjYXQtc3RvcmU9XFxcXFwiUGFnZXNcXFxcXCI+PC9jYXQtcGFnZXMtY29udGVudD5cXFxcbjwvYm9keT5cXFxcbjwvaHRtbD5cXFxcblwiO1xcbiAgfSxcInVzZURhdGFcIjp0cnVlfScsIGVycm9yVGVtcGxhdGVTb3VyY2U6IG51bGx9LFxue25hbWU6ICdoZWFkJywgY29uc3RydWN0b3I6IHJlcXVpcmUoJy4vY2F0YmVycnlfY29tcG9uZW50cy9oZWFkL2luZGV4LmpzJyksIHByb3BlcnRpZXM6IHtcIm5hbWVcIjpcImhlYWRcIixcInRlbXBsYXRlXCI6XCIuL3RlbXBsYXRlLmhic1wifSwgdGVtcGxhdGVTb3VyY2U6ICd7XCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcXG4gIHZhciBoZWxwZXIsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGhlbHBlck1pc3Npbmc9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcXG4gIHJldHVybiBcIjxtZXRhIGNoYXJzZXQ9XFxcXFwiVVRGLThcXFxcXCI+XFxcXG48bWV0YSBodHRwLWVxdWl2PVxcXFxcIlgtVUEtQ29tcGF0aWJsZVxcXFxcIiBjb250ZW50PVxcXFxcIklFPWVkZ2VcXFxcXCI+XFxcXG48bWV0YSBuYW1lPVxcXFxcInZpZXdwb3J0XFxcXFwiIGNvbnRlbnQ9XFxcXFwid2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTFcXFxcXCI+XFxcXG48dGl0bGU+XCJcXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudGl0bGUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnRpdGxlIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInRpdGxlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXFxuICAgICsgXCIgLSBcIlxcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5zdWJ0aXRsZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuc3VidGl0bGUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwic3VidGl0bGVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcXG4gICAgKyBcIjwvdGl0bGU+XFxcXG48bGluayBocmVmPVxcXFxcIi9jc3MvYm9vdHN0cmFwLm1pbi5jc3NcXFxcXCIgcmVsPVxcXFxcInN0eWxlc2hlZXRcXFxcXCI+XFxcXG48bGluayBocmVmPVxcXFxcIi9jc3MvbG9hZGVyLmNzc1xcXFxcIiByZWw9XFxcXFwic3R5bGVzaGVldFxcXFxcIj5cXFxcbjxzY3JpcHQgc3JjPVxcXFxcIi9idW5kbGUuanNcXFxcXCI+PC9zY3JpcHQ+XFxcXG5cXFxcblwiO1xcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0nLCBlcnJvclRlbXBsYXRlU291cmNlOiBudWxsfSxcbntuYW1lOiAnbG9hZGVyJywgY29uc3RydWN0b3I6IHJlcXVpcmUoJy4vY2F0YmVycnlfY29tcG9uZW50cy9sb2FkZXIvaW5kZXguanMnKSwgcHJvcGVydGllczoge1wibmFtZVwiOlwibG9hZGVyXCIsXCJ0ZW1wbGF0ZVwiOlwiLi90ZW1wbGF0ZS5oYnNcIn0sIHRlbXBsYXRlU291cmNlOiAne1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XFxuICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXFxcImxvYWRpbmdcXFxcXCI+PC9kaXY+XFxcXG5cIjtcXG4gIH0sXCJ1c2VEYXRhXCI6dHJ1ZX0nLCBlcnJvclRlbXBsYXRlU291cmNlOiBudWxsfSxcbntuYW1lOiAnY29tbWl0cy1kZXRhaWxzJywgY29uc3RydWN0b3I6IHJlcXVpcmUoJy4vY2F0YmVycnlfY29tcG9uZW50cy9jb21taXRzL2NvbW1pdHMtZGV0YWlscy9pbmRleC5qcycpLCBwcm9wZXJ0aWVzOiB7XCJuYW1lXCI6XCJjb21taXRzLWRldGFpbHNcIixcInRlbXBsYXRlXCI6XCIuL3RlbXBsYXRlLmhic1wiLFwiZXJyb3JUZW1wbGF0ZVwiOlwiLi9lcnJvci5oYnNcIn0sIHRlbXBsYXRlU291cmNlOiAne1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XFxuICB2YXIgc3RhY2sxLCBoZWxwZXIsIGxhbWJkYT10aGlzLmxhbWJkYSwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGhlbHBlck1pc3Npbmc9aGVscGVycy5oZWxwZXJNaXNzaW5nO1xcbiAgcmV0dXJuIFwiPGRpdiBjbGFzcz1cXFxcXCJwYW5lbCBwYW5lbC1kZWZhdWx0XFxcXFwiPlxcXFxuXFx0PGRpdiBjbGFzcz1cXFxcXCJwYW5lbC1ib2R5XFxcXFwiPlxcXFxuXFx0XFx0PHVsIGNsYXNzPVxcXFxcImxpc3QtaW5saW5lXFxcXFwiPlxcXFxuXFx0XFx0XFx0PGxpPlxcXFxuXFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XFxcXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcXFwiPjwvc3Bhbj5cXFxcblxcdFxcdFxcdDwvbGk+XFxcXG5cXHRcXHRcXHQ8bGkgY2xhc3M9XFxcXFwiYWRkaXRpb25zXFxcXFwiPlwiXFxuICAgICsgZXNjYXBlRXhwcmVzc2lvbihsYW1iZGEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuc3RhdHMgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmFkZGl0aW9ucyA6IHN0YWNrMSksIGRlcHRoMCkpXFxuICAgICsgXCI8L2xpPlxcXFxuXFx0XFx0XFx0PGxpPlxcXFxuXFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XFxcXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1taW51c1xcXFxcIj48L3NwYW4+XFxcXG5cXHRcXHRcXHQ8L2xpPlxcXFxuXFx0XFx0XFx0PGxpIGNsYXNzPVxcXFxcImRlbGV0aW9uc1xcXFxcIj5cIlxcbiAgICArIGVzY2FwZUV4cHJlc3Npb24obGFtYmRhKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnN0YXRzIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5kZWxldGlvbnMgOiBzdGFjazEpLCBkZXB0aDApKVxcbiAgICArIFwiPC9saT5cXFxcblxcdFxcdFxcdDxsaT5cXFxcblxcdFxcdFxcdFxcdDxzcGFuIGNsYXNzPVxcXFxcImdseXBoaWNvbiBnbHlwaGljb24tYXN0ZXJpc2tcXFxcXCI+PC9zcGFuPlxcXFxuXFx0XFx0XFx0PC9saT5cXFxcblxcdFxcdFxcdDxsaSBjbGFzcz1cXFxcXCJ0b3RhbFxcXFxcIj5cIlxcbiAgICArIGVzY2FwZUV4cHJlc3Npb24obGFtYmRhKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnN0YXRzIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS50b3RhbCA6IHN0YWNrMSksIGRlcHRoMCkpXFxuICAgICsgXCI8L2xpPlxcXFxuXFx0XFx0XFx0PGxpPlxcXFxuXFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XFxcXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1jb21tZW50XFxcXFwiPjwvc3Bhbj5cXFxcblxcdFxcdFxcdDwvbGk+XFxcXG5cXHRcXHRcXHQ8bGkgY2xhc3M9XFxcXFwiY29tbWVudC1jb3VudFxcXFxcIj5cIlxcbiAgICArIGVzY2FwZUV4cHJlc3Npb24obGFtYmRhKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNvbW1pdCA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuY29tbWVudF9jb3VudCA6IHN0YWNrMSksIGRlcHRoMCkpXFxuICAgICsgXCI8L2xpPlxcXFxuXFx0XFx0XFx0PGxpPlxcXFxuXFx0XFx0XFx0XFx0PGEgdGFyZ2V0PVxcXFxcIl9ibGFua1xcXFxcIiBjbGFzcz1cXFxcXCJjb21tZW50cy1saW5rXFxcXFwiIGhyZWY9XFxcXFwiXCJcXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaHRtbF91cmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmh0bWxfdXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcImh0bWxfdXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXFxuICAgICsgXCJcXFxcXCI+XFxcXG5cXHRcXHRcXHRcXHRcXHRTaG93IGNvbW1lbnRzXFxcXG5cXHRcXHRcXHRcXHQ8L2E+XFxcXG5cXHRcXHRcXHQ8L2xpPlxcXFxuXFx0XFx0PC91bD5cXFxcblxcdDwvZGl2PlxcXFxuPC9kaXY+XFxcXG5cIjtcXG59LFwidXNlRGF0YVwiOnRydWV9JywgZXJyb3JUZW1wbGF0ZVNvdXJjZTogJ3tcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xcbiAgcmV0dXJuIFwiPGRpdiBjbGFzcz1cXFxcXCJhbGVydCBhbGVydC1kYW5nZXJcXFxcXCIgcm9sZT1cXFxcXCJhbGVydFxcXFxcIj5cXFxcblxcdExvb2tzIGxpa2UgZGV0YWlscyBvZiB0aGlzIGNvbW1pdCBhcmUgdW5hdmFpbGFibGUgcmlnaHQgbm93LlxcXFxuPC9kaXY+XFxcXG5cIjtcXG4gIH0sXCJ1c2VEYXRhXCI6dHJ1ZX0nfSxcbntuYW1lOiAnY29tbWl0cy1saXN0JywgY29uc3RydWN0b3I6IHJlcXVpcmUoJy4vY2F0YmVycnlfY29tcG9uZW50cy9jb21taXRzL2NvbW1pdHMtbGlzdC9pbmRleC5qcycpLCBwcm9wZXJ0aWVzOiB7XCJuYW1lXCI6XCJjb21taXRzLWxpc3RcIixcInRlbXBsYXRlXCI6XCIuL3RlbXBsYXRlLmhic1wiLFwiZXJyb3JUZW1wbGF0ZVwiOlwiLi9lcnJvci5oYnNcIn0sIHRlbXBsYXRlU291cmNlOiAne1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcXG4gIHZhciBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgaGVscGVyTWlzc2luZz1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBsYW1iZGE9dGhpcy5sYW1iZGE7XFxuICByZXR1cm4gXCJcXHQ8YSBpZD1cXFxcXCJcIlxcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5zaGEgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnNoYSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJzaGFcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcXG4gICAgKyBcIlxcXFxcIiBocmVmPVxcXFxcIiNcXFxcXCIgY2xhc3M9XFxcXFwibGlzdC1ncm91cC1pdGVtIGpzLWNvbW1pdFxcXFxcIj5cXFxcblxcdFxcdFwiXFxuICAgICsgZXNjYXBlRXhwcmVzc2lvbihsYW1iZGEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuY29tbWl0IDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5tZXNzYWdlIDogc3RhY2sxKSwgZGVwdGgwKSlcXG4gICAgKyBcIiAoXCJcXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKGxhbWJkYSgoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNvbW1pdCA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuYXV0aG9yIDogc3RhY2sxKSkgIT0gbnVsbCA/IHN0YWNrMS5uYW1lIDogc3RhY2sxKSwgZGVwdGgwKSlcXG4gICAgKyBcIilcXFxcblxcdDwvYT5cXFxcblwiO1xcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcXG4gIHZhciBzdGFjazE7XFxuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5jb21taXRzIDogZGVwdGgwKSwge1wibmFtZVwiOlwiZWFjaFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KTtcXG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyByZXR1cm4gc3RhY2sxOyB9XFxuICBlbHNlIHsgcmV0dXJuIFxcJ1xcJzsgfVxcbiAgfSxcInVzZURhdGFcIjp0cnVlfScsIGVycm9yVGVtcGxhdGVTb3VyY2U6ICd7XCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcXFwiYWxlcnQgYWxlcnQtZGFuZ2VyXFxcXFwiIHJvbGU9XFxcXFwiYWxlcnRcXFxcXCI+XFxcXG5cXHRMb29rcyBsaWtlIGxpc3Qgb2YgY29tbWl0cyBpcyB1bmF2YWlsYWJsZSByaWdodCBub3cuXFxcXG48L2Rpdj5cIjtcXG4gIH0sXCJ1c2VEYXRhXCI6dHJ1ZX0nfSxcbntuYW1lOiAncGFnZXMtY29udGVudCcsIGNvbnN0cnVjdG9yOiByZXF1aXJlKCcuL2NhdGJlcnJ5X2NvbXBvbmVudHMvcGFnZXMvcGFnZXMtY29udGVudC9pbmRleC5qcycpLCBwcm9wZXJ0aWVzOiB7XCJuYW1lXCI6XCJwYWdlcy1jb250ZW50XCIsXCJ0ZW1wbGF0ZVwiOlwiLi90ZW1wbGF0ZS5oYnNcIn0sIHRlbXBsYXRlU291cmNlOiAne1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcXG4gIHJldHVybiBcIlxcdDxjYXQtYWJvdXQgaWQ9XFxcXFwicGFnZXMtY29udGVudC1hYm91dFxcXFxcIiBjYXQtc3RvcmU9XFxcXFwiQWJvdXRcXFxcXCIgPjwvY2F0LWFib3V0PlxcXFxuXCI7XFxuICB9LFwiM1wiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcXG4gIHJldHVybiBcIlxcdDxjYXQtY29tbWl0cy1saXN0IGlkPVxcXFxcInBhZ2VzLWNvbnRlbnQtY29tbWl0c1xcXFxcIiBjYXQtc3RvcmU9XFxcXFwiY29tbWl0cy9MaXN0XFxcXFwiID48L2NhdC1jb21taXRzLWxpc3Q+XFxcXG5cIjtcXG4gIH0sXCI1XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xcbiAgcmV0dXJuIFwiXFx0PGNhdC1zZWFyY2gtZm9ybSBpZD1cXFxcXCJwYWdlcy1jb250ZW50LXNlYXJjaFxcXFxcIiBjYXQtc3RvcmU9XFxcXFwiY29tbWl0cy9TZWFyY2hcXFxcXCIgPjwvY2F0LXNlYXJjaC1mb3JtPlxcXFxuXFx0PGNhdC1zZWFyY2gtcmVzdWx0cyBpZD1cXFxcXCJwYWdlcy1jb250ZW50LXNlYXJjaC1yZXN1bHRzXFxcXFwiIGNhdC1zdG9yZT1cXFxcXCJjb21taXRzL1NlYXJjaFxcXFxcIiA+PC9jYXQtc2VhcmNoLXJlc3VsdHM+XFxcXG5cIjtcXG4gIH0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcXG4gIHZhciBzdGFjazEsIGJ1ZmZlciA9IFwiPGNhdC1sb2FkZXIgaWQ9XFxcXFwicGFnZXMtY29udGVudC1sb2FkZXJcXFxcXCI+PC9jYXQtbG9hZGVyPlxcXFxuXCI7XFxuICBzdGFjazEgPSBoZWxwZXJzW1xcJ2lmXFwnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaXNBY3RpdmUgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmFib3V0IDogc3RhY2sxKSwge1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEpLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSk7XFxuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxcbiAgc3RhY2sxID0gaGVscGVyc1tcXCdpZlxcJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzQWN0aXZlIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5jb21taXRzIDogc3RhY2sxKSwge1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDMsIGRhdGEpLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSk7XFxuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxcbiAgc3RhY2sxID0gaGVscGVyc1tcXCdpZlxcJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzQWN0aXZlIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zZWFyY2ggOiBzdGFjazEpLCB7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oNSwgZGF0YSksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KTtcXG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XFxuICByZXR1cm4gYnVmZmVyO1xcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0nLCBlcnJvclRlbXBsYXRlU291cmNlOiBudWxsfSxcbntuYW1lOiAncGFnZXMtbmF2aWdhdGlvbicsIGNvbnN0cnVjdG9yOiByZXF1aXJlKCcuL2NhdGJlcnJ5X2NvbXBvbmVudHMvcGFnZXMvcGFnZXMtbmF2aWdhdGlvbi9pbmRleC5qcycpLCBwcm9wZXJ0aWVzOiB7XCJuYW1lXCI6XCJwYWdlcy1uYXZpZ2F0aW9uXCIsXCJ0ZW1wbGF0ZVwiOlwiLi90ZW1wbGF0ZS5oYnNcIn0sIHRlbXBsYXRlU291cmNlOiAne1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcXG4gIHJldHVybiBcImNsYXNzPVxcXFxcImFjdGl2ZVxcXFxcIlwiO1xcbiAgfSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xcbiAgdmFyIHN0YWNrMSwgYnVmZmVyID0gXCI8dWwgY2xhc3M9XFxcXFwibmF2IG5hdi10YWJzXFxcXFwiIHJvbGU9XFxcXFwidGFibGlzdFxcXFxcIj5cXFxcblxcdDxsaSBcIjtcXG4gIHN0YWNrMSA9IGhlbHBlcnNbXFwnaWZcXCddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pc0FjdGl2ZSA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuYWJvdXQgOiBzdGFjazEpLCB7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KTtcXG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XFxuICBidWZmZXIgKz0gXCI+XFxcXG5cXHRcXHQ8YSBocmVmPVxcXFxcIi9hYm91dFxcXFxcIj5BYm91dDwvYT5cXFxcblxcdDwvbGk+XFxcXG5cXHQ8bGkgXCI7XFxuICBzdGFjazEgPSBoZWxwZXJzW1xcJ2lmXFwnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaXNBY3RpdmUgOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmNvbW1pdHMgOiBzdGFjazEpLCB7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KTtcXG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XFxuICBidWZmZXIgKz0gXCI+XFxcXG5cXHRcXHQ8YSBocmVmPVxcXFxcIi9jb21taXRzXFxcXFwiPkNvbW1pdHM8L2E+XFxcXG5cXHQ8L2xpPlxcXFxuXFx0PGxpIFwiO1xcbiAgc3RhY2sxID0gaGVscGVyc1tcXCdpZlxcJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzQWN0aXZlIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5zZWFyY2ggOiBzdGFjazEpLCB7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KTtcXG4gIGlmIChzdGFjazEgIT0gbnVsbCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XFxuICByZXR1cm4gYnVmZmVyICsgXCI+XFxcXG5cXHRcXHQ8YSBocmVmPVxcXFxcIi9zZWFyY2hcXFxcXCI+U2VhcmNoPC9hPlxcXFxuXFx0PC9saT5cXFxcbjwvdWw+XCI7XFxufSxcInVzZURhdGFcIjp0cnVlfScsIGVycm9yVGVtcGxhdGVTb3VyY2U6IG51bGx9LFxue25hbWU6ICdzZWFyY2gtZm9ybScsIGNvbnN0cnVjdG9yOiByZXF1aXJlKCcuL2NhdGJlcnJ5X2NvbXBvbmVudHMvc2VhcmNoL3NlYXJjaC1mb3JtL2luZGV4LmpzJyksIHByb3BlcnRpZXM6IHtcIm5hbWVcIjpcInNlYXJjaC1mb3JtXCIsXCJ0ZW1wbGF0ZVwiOlwiLi90ZW1wbGF0ZS5oYnNcIn0sIHRlbXBsYXRlU291cmNlOiAne1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XFxuICB2YXIgaGVscGVyLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBoZWxwZXJNaXNzaW5nPWhlbHBlcnMuaGVscGVyTWlzc2luZywgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XFxuICByZXR1cm4gXCI8Zm9ybSBjbGFzcz1cXFxcXCJuYXZiYXItZm9ybVxcXFxcIiByb2xlPVxcXFxcInNlYXJjaFxcXFxcIlxcXFxuXFx0ICBuYW1lPVxcXFxcInNlYXJjaC1pbi1jb2RlXFxcXFwiIGRhdGEtbW9kdWxlPVxcXFxcInNlYXJjaFxcXFxcIj5cXFxcblxcdDxkaXYgY2xhc3M9XFxcXFwiZm9ybS1ncm91cFxcXFxcIj5cXFxcblxcdFxcdDxpbnB1dCB0eXBlPVxcXFxcInRleHRcXFxcXCIgY2xhc3M9XFxcXFwiZm9ybS1jb250cm9sXFxcXFwiIHBsYWNlaG9sZGVyPVxcXFxcIlNlYXJjaCBpbiBjb2RlXFxcXFwiXFxcXG5cXHRcXHRcXHQgICBuYW1lPVxcXFxcInF1ZXJ5XFxcXFwiIHZhbHVlPVxcXFxcIlwiXFxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnF1ZXJ5IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5xdWVyeSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJxdWVyeVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxcbiAgICArIFwiXFxcXFwiLz5cXFxcblxcdDwvZGl2PlxcXFxuXFx0PGlucHV0IHR5cGU9XFxcXFwic3VibWl0XFxcXFwiIGNsYXNzPVxcXFxcImJ0biBidG4tZGVmYXVsdFxcXFxcIiB2YWx1ZT1cXFxcXCJTZWFyY2hcXFxcXCIvPlxcXFxuPC9mb3JtPlxcXFxuPGNhdC1sb2FkZXIgaWQ9XFxcXFwic2VhcmNoLXByb2dyZXNzXFxcXFwiPjwvY2F0LWxvYWRlcj5cIjtcXG59LFwidXNlRGF0YVwiOnRydWV9JywgZXJyb3JUZW1wbGF0ZVNvdXJjZTogbnVsbH0sXG57bmFtZTogJ3NlYXJjaC1yZXN1bHRzJywgY29uc3RydWN0b3I6IHJlcXVpcmUoJy4vY2F0YmVycnlfY29tcG9uZW50cy9zZWFyY2gvc2VhcmNoLXJlc3VsdHMvaW5kZXguanMnKSwgcHJvcGVydGllczoge1wibmFtZVwiOlwic2VhcmNoLXJlc3VsdHNcIixcInRlbXBsYXRlXCI6XCIuL3RlbXBsYXRlLmhic1wifSwgdGVtcGxhdGVTb3VyY2U6ICd7XCIxXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xcbiAgdmFyIHN0YWNrMSwgaGVscGVyLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBoZWxwZXJNaXNzaW5nPWhlbHBlcnMuaGVscGVyTWlzc2luZywgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIGJ1ZmZlciA9IFwiXFx0PGRpdiBjbGFzcz1cXFxcXCJ3ZWxsXFxcXFwiPjxoMz5Gb3VuZCBcIlxcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy50b3RhbF9jb3VudCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudG90YWxfY291bnQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwidG90YWxfY291bnRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcXG4gICAgKyBcIiBmaWxlKHMpPC9oMz48L2Rpdj5cXFxcblxcdDxkaXYgY2xhc3M9XFxcXFwibGlzdC1ncm91cFxcXFxcIj5cXFxcblwiO1xcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaXRlbXMgOiBkZXB0aDApLCB7XCJuYW1lXCI6XCJlYWNoXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgyLCBkYXRhKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pO1xcbiAgaWYgKHN0YWNrMSAhPSBudWxsKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cXG4gIHJldHVybiBidWZmZXIgKyBcIlxcdDwvZGl2PlxcXFxuXCI7XFxufSxcIjJcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XFxuICB2YXIgaGVscGVyLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBoZWxwZXJNaXNzaW5nPWhlbHBlcnMuaGVscGVyTWlzc2luZywgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XFxuICByZXR1cm4gXCJcXHRcXHRcXHQ8YSBjbGFzcz1cXFxcXCJsaXN0LWdyb3VwLWl0ZW1cXFxcXCIgaHJlZj1cXFxcXCJcIlxcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5odG1sX3VybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaHRtbF91cmwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge1wibmFtZVwiOlwiaHRtbF91cmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcXG4gICAgKyBcIlxcXFxcIiB0YXJnZXQ9XFxcXFwiX2JsYW5rXFxcXFwiPlxcXFxuXFx0XFx0XFx0XFx0XCJcXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXFxuICAgICsgXCIgLSBcIlxcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5wYXRoIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5wYXRoIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtcIm5hbWVcIjpcInBhdGhcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcXG4gICAgKyBcIlxcXFxuXFx0XFx0XFx0PC9hPlxcXFxuXCI7XFxufSxcIjRcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XFxuICByZXR1cm4gXCJcXHQ8ZGl2IGNsYXNzPVxcXFxcIndlbGxcXFxcXCI+PGgzPk5vIHJlc3VsdHMgZm91bmQ8L2gzPjwvZGl2PlxcXFxuXCI7XFxuICB9LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XFxuICB2YXIgc3RhY2sxLCBidWZmZXIgPSBcIlwiO1xcbiAgc3RhY2sxID0gaGVscGVyc1tcXCdpZlxcJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5oYXNSZXN1bHRzIDogZGVwdGgwKSwge1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEpLFwiaW52ZXJzZVwiOnRoaXMucHJvZ3JhbSg0LCBkYXRhKSxcImRhdGFcIjpkYXRhfSk7XFxuICBpZiAoc3RhY2sxICE9IG51bGwpIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxcbiAgcmV0dXJuIGJ1ZmZlciArIFwiXFxcXG5cXFxcblwiO1xcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0nLCBlcnJvclRlbXBsYXRlU291cmNlOiBudWxsfVxuXTtcblxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyksXG5cdHJvdXRlRGVmaW5pdGlvbnMgPSByZXF1aXJlKCcuL3JvdXRlcy5qcycpIHx8IFtdLFxuXHRtb2R1bGVIZWxwZXIgPSByZXF1aXJlKCcuL25vZGVfbW9kdWxlcy9jYXRiZXJyeS9saWIvaGVscGVycy9tb2R1bGVIZWxwZXIuanMnKSxcblx0Q2F0YmVycnkgPSByZXF1aXJlKCcuL25vZGVfbW9kdWxlcy9jYXRiZXJyeS9icm93c2VyL0NhdGJlcnJ5LmpzJyksXG5cdExvZ2dlciA9IHJlcXVpcmUoJy4vbm9kZV9tb2R1bGVzL2NhdGJlcnJ5L2Jyb3dzZXIvTG9nZ2VyLmpzJyksXG5cdEJvb3RzdHJhcHBlckJhc2UgPVxuXHRcdHJlcXVpcmUoJy4vbm9kZV9tb2R1bGVzL2NhdGJlcnJ5L2xpYi9iYXNlL0Jvb3RzdHJhcHBlckJhc2UuanMnKTtcblxudmFyIElORk9fRE9DVU1FTlRfVVBEQVRFRCA9ICdEb2N1bWVudCB1cGRhdGVkICglZCBzdG9yZShzKSBjaGFuZ2VkKScsXG5cdElORk9fQ09NUE9ORU5UX0JPVU5EID0gJ0NvbXBvbmVudCBcIiVzXCIgaXMgYm91bmQnO1xuXG51dGlsLmluaGVyaXRzKEJvb3RzdHJhcHBlciwgQm9vdHN0cmFwcGVyQmFzZSk7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIGJyb3dzZXIgQ2F0YmVycnkncyBib290c3RyYXBwZXIuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIEJvb3RzdHJhcHBlckJhc2VcbiAqL1xuZnVuY3Rpb24gQm9vdHN0cmFwcGVyKCkge1xuXHRCb290c3RyYXBwZXJCYXNlLmNhbGwodGhpcywgQ2F0YmVycnkpO1xufVxuXG4vKipcbiAqIENvbmZpZ3VyZXMgQ2F0YmVycnkncyBzZXJ2aWNlIGxvY2F0b3IuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnT2JqZWN0IEFwcGxpY2F0aW9uIGNvbmZpZyBvYmplY3QuXG4gKiBAcGFyYW0ge1NlcnZpY2VMb2NhdG9yfSBsb2NhdG9yIFNlcnZpY2UgbG9jYXRvciB0byBjb25maWd1cmUuXG4gKi9cbkJvb3RzdHJhcHBlci5wcm90b3R5cGUuY29uZmlndXJlID0gZnVuY3Rpb24gKGNvbmZpZ09iamVjdCwgbG9jYXRvcikge1xuXHRCb290c3RyYXBwZXJCYXNlLnByb3RvdHlwZS5jb25maWd1cmUuY2FsbCh0aGlzLCBjb25maWdPYmplY3QsIGxvY2F0b3IpO1xuXG5cdC8vIGlmIGJyb3dzZXIgc3RpbGwgZG9lcyBub3QgaGF2ZSBwcm9taXNlcyB0aGVuIGFkZCBpdC5cblx0aWYgKCEoJ1Byb21pc2UnIGluIHdpbmRvdykpIHtcblx0XHR3aW5kb3cuUHJvbWlzZSA9IGxvY2F0b3IucmVzb2x2ZSgncHJvbWlzZScpO1xuXHR9XG5cblx0bG9jYXRvci5yZWdpc3Rlckluc3RhbmNlKCd3aW5kb3cnLCB3aW5kb3cpO1xuXG5cdHZhciBsb2dnZXJDb25maWcgPSBjb25maWdPYmplY3QubG9nZ2VyIHx8IHt9LFxuXHRcdGxvZ2dlciA9IG5ldyBMb2dnZXIobG9nZ2VyQ29uZmlnLmxldmVscyk7XG5cdGxvY2F0b3IucmVnaXN0ZXJJbnN0YW5jZSgnbG9nZ2VyJywgbG9nZ2VyKTtcblx0d2luZG93Lm9uZXJyb3IgPSBmdW5jdGlvbiBlcnJvckhhbmRsZXIobXNnLCB1cmksIGxpbmUpIHtcblx0XHRsb2dnZXIuZmF0YWwodXJpICsgJzonICsgbGluZSArICcgJyArIG1zZyk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH07XG5cdHZhciBldmVudEJ1cyA9IGxvY2F0b3IucmVzb2x2ZSgnZXZlbnRCdXMnKTtcblx0dGhpcy5fd3JhcEV2ZW50c1dpdGhMb2dnZXIoZXZlbnRCdXMsIGxvZ2dlcik7XG5cblx0cm91dGVEZWZpbml0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChyb3V0ZURlZmluaXRpb24pIHtcblx0XHRsb2NhdG9yLnJlZ2lzdGVySW5zdGFuY2UoJ3JvdXRlRGVmaW5pdGlvbicsIHJvdXRlRGVmaW5pdGlvbik7XG5cdH0pO1xuXG5cdHN0b3Jlcy5mb3JFYWNoKGZ1bmN0aW9uIChzdG9yZSkge1xuXHRcdGxvY2F0b3IucmVnaXN0ZXJJbnN0YW5jZSgnc3RvcmUnLCBzdG9yZSk7XG5cdH0pO1xufTtcblxuLyoqXG4gKiBXcmFwcyBldmVudCBidXMgd2l0aCBsb2cgbWVzc2FnZXMuXG4gKiBAcGFyYW0ge0V2ZW50RW1pdHRlcn0gZXZlbnRCdXMgRXZlbnQgZW1pdHRlciB0aGF0IGltcGxlbWVudHMgZXZlbnQgYnVzLlxuICogQHBhcmFtIHtMb2dnZXJ9IGxvZ2dlciBMb2dnZXIgdG8gd3JpdGUgbWVzc2FnZXMuXG4gKiBAcHJvdGVjdGVkXG4gKi9cbkJvb3RzdHJhcHBlci5wcm90b3R5cGUuX3dyYXBFdmVudHNXaXRoTG9nZ2VyID0gZnVuY3Rpb24gKGV2ZW50QnVzLCBsb2dnZXIpIHtcblx0Qm9vdHN0cmFwcGVyQmFzZS5wcm90b3R5cGUuX3dyYXBFdmVudHNXaXRoTG9nZ2VyXG5cdFx0LmNhbGwodGhpcywgZXZlbnRCdXMsIGxvZ2dlcik7XG5cdGV2ZW50QnVzXG5cdFx0Lm9uKCdkb2N1bWVudFVwZGF0ZWQnLCBmdW5jdGlvbiAoYXJncykge1xuXHRcdFx0bG9nZ2VyLmluZm8odXRpbC5mb3JtYXQoSU5GT19ET0NVTUVOVF9VUERBVEVELCBhcmdzLmxlbmd0aCkpO1xuXHRcdH0pXG5cdFx0Lm9uKCdjb21wb25lbnRCb3VuZCcsIGZ1bmN0aW9uIChhcmdzKSB7XG5cdFx0XHRsb2dnZXIuaW5mbyh1dGlsLmZvcm1hdChcblx0XHRcdFx0SU5GT19DT01QT05FTlRfQk9VTkQsIGFyZ3MuZWxlbWVudC50YWdOYW1lICsgJyMnICsgYXJncy5pZFxuXHRcdFx0KSk7XG5cdFx0fSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBCb290c3RyYXBwZXIoKTsiXX0=
