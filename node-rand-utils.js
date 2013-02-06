/**
 * Randomization module
 *
 * @author     James Brumond
 * @version    0.0.1
 * @copyright  Copyright 2011 James Brumond
 * @license    Dual licensed under MIT and GPL
 *
 * ------------------------------------------------------------------
 *
 * Methods:
 *   number    rand.double ([ string prng = 'SIMPLE' ])
 *   number    rand.int ([ object options { min, max, gen } ])
 *   number    rand.getGenerator ([ string prng = 'SIMPLE' ])
 *   number    rand.simple ( void )
 *   number    rand.arc4 ( void )
 *   string    rand.arc4.seed ([ string seed ])
 *   void      rand.shuffle ( array arr[, string prng = 'SIMPLE' ])
 */
	
/**
 * Wrapper for Math.random
 */
module.exports.simple = function() {
	return Math.random();
};

/**
 * Fetch a given PRNG function
 *
 * @access  public
 * @param   string    generator
 * @return  function
 */
module.exports.getGenerator = function(gen) {
	gen = gen || 'SIMPLE';
	switch (gen) {
		case 'ARC4':
			return module.exports.arc4;
		break;
		case 'SIMPLE':
			return module.exports.simple;
		break;
		default:
			throw 'Unknown value given for PRNG';
		break;
	}
};

/**
 * Generate a random double using the given algorithm
 *
 * @access  public
 * @param   string    generator
 * @return  number
 */
module.exports.double = function(gen) {
	return module.exports.getGenerator(gen || 'SIMPLE')();
};

/**
 * Generate a random integer between min and max using the given generator
 *
 * @access  public
 * @param   object    options { min, max, gen }
 * @return  number
 */
module.exports.int = function(opts) {
	var ret;
	opts.min = (opts.min === void(0)) ? 0 : opts.min;
	opts.max = (opts.max === void(0)) ? 32000 : opts.max;
	if (! opts.min && ! opts.max) {
		return 0;
	}
	ret = Math.floor(module.exports.double(opts.gen) * (opts.max + opts.min) + 1) - opts.min;
	if (ret === opts.max) {
		ret--;
	}
	return ret;
};

/**
 * Shuffle an array in place using the fisher-yates algorithm
 *
 * @access  public
 * @param   array     the array to shuffle
 * @param   string    optionally, the PRNG to use
 * @return  void
 * @link    http://en.wikipedia.org/wiki/Fisher-Yates_shuffle
 */
module.exports.shuffle = (function() {
	function Generator(gen) {
		return function(max) {
			return module.exports.int({
				min: 0, max: max, gen: gen
			});
		}
	}
	return function (arr, prng) {
		var randInt = Generator(prng), tmp;
		for (var i = arr.length - 1, j; i > 0; --i) {
			j = randInt(i);
			tmp = arr[i];
			arr[i] = arr[j];
			arr[j] = tmp;
		}
	}
}());

/**
 * ARC4 random double generator
 *
 * @function  number  module.exports.arc4 ( void )
 * @function  void    module.exports.arc4.seed ([ string seed[, boolean use_entropy ]])
 * 
 * This ARC4 implementation is borrowed from http://davidbau.com/encode/seedrandom.js
 * with modifications for this module.
 */
module.exports.arc4 = (function (pool, math, width, chunks, significance, overflow, startdenom) {
	// LICENSE (BSD):
	//
	// Copyright 2010 David Bau, all rights reserved.
	//
	// Redistribution and use in source and binary forms, with or without
	// modification, are permitted provided that the following conditions are met:
	// 
	//   1. Redistributions of source code must retain the above copyright
	//      notice, this list of conditions and the following disclaimer.
	//
	//   2. Redistributions in binary form must reproduce the above copyright
	//      notice, this list of conditions and the following disclaimer in the
	//      documentation and/or other materials provided with the distribution.
	// 
	//   3. Neither the name of this module nor the names of its contributors may
	//      be used to endorse or promote products derived from this software
	//      without specific prior written permission.
	// 
	// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
	// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
	// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
	// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
	// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
	// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
	// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
	// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	var ret = function() {
		return random();
	};
	var random = function() {
		throw 'You must seed the ARC4 generator before using it';
	};
	ret['seed'] = function seedrandom(seed, use_entropy) {
		var key = [];
		var arc4;
		seed = mixkey(flatten(
			use_entropy ? [seed, pool] :
			arguments.length ? seed :
			[new Date().getTime(), pool, window], 3), key);
		arc4 = new ARC4(key);
		mixkey(arc4.S, pool);

		random = function() {
			var n = arc4.g(chunks);
			var d = startdenom;
			var x = 0;
			while (n < significance) {
				n = (n + x) * width;
				d *= width;
				x = arc4.g(1);
			}
			while (n >= overflow) {
				n /= 2;
				d /= 2;
				x >>>= 1;
			}
			return (n + x) / d;
		};
		return seed;
	};

	function ARC4(key) {
		var t, u, me = this, keylen = key.length;
		var i = 0, j = me.i = me.j = me.m = 0;
		me.S = [];
		me.c = [];
		if (!keylen) { key = [keylen++]; }
		while (i < width) { me.S[i] = i++; }
		for (i = 0; i < width; i++) {
			t = me.S[i];
			j = lowbits(j + t + key[i % keylen]);
			u = me.S[j];
			me.S[i] = u;
			me.S[j] = t;
		}
		me.g = function getnext(count) {
			var s = me.S;
			var i = lowbits(me.i + 1); var t = s[i];
			var j = lowbits(me.j + t); var u = s[j];
			s[i] = u;
			s[j] = t;
			var r = s[lowbits(t + u)];
			while (--count) {
				i = lowbits(i + 1); t = s[i];
				j = lowbits(j + t); u = s[j];
				s[i] = u;
				s[j] = t;
				r = r * width + s[lowbits(t + u)];
			}
			me.i = i;
			me.j = j;
			return r;
		};
		me.g(width);
	}

	function flatten(obj, depth, result, prop, typ) {
		result = [];
		typ = typeof(obj);
		if (depth && typ == 'object') {
		for (prop in obj) {
			if (prop.indexOf('S') < 5) {
				try {
					result.push(flatten(obj[prop], depth - 1));
				} catch (e) { }
			}
		}
		}
		return (result.length ? result : obj + (typ != 'string' ? '\0' : ''));
	}

	function mixkey(seed, key, smear, j) {
		seed += '';
		smear = 0;
		for (j = 0; j < seed.length; j++) {
		key[lowbits(j)] =
			lowbits((smear ^= key[lowbits(j)] * 19) + seed.charCodeAt(j));
		}
		seed = '';
		for (j in key) { seed += String.fromCharCode(key[j]); }
		return seed;
	}

	function lowbits(n) { return n & (width - 1); }

	startdenom = math.pow(width, chunks);
	significance = math.pow(2, significance);
	overflow = significance * 2;

	mixkey(math.random(), pool);
	
	return ret;

// End anonymous scope, and pass initial values.
})(
	[],   // pool: entropy pool starts empty
	Math, // math: package containing random, pow, and seedrandom
	256,  // width: each RC4 output is 0 <= x < 256
	6,    // chunks: at least six RC4 outputs for each double
	52    // significance: there are 52 significant digits in a double
);

/* End of file rand.js */
