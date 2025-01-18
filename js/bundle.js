(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (root, factory) {
  if (typeof exports === 'object') {
      module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
      define(factory);
  } else {
      root.Alea = factory();
  }
}(this, function () {

  'use strict';

  // From http://baagoe.com/en/RandomMusings/javascript/

  // importState to sync generator states
  Alea.importState = function(i){
    var random = new Alea();
    random.importState(i);
    return random;
  };

  return Alea;

  function Alea() {
    return (function(args) {
      // Johannes Baagøe <baagoe@baagoe.com>, 2010
      var s0 = 0;
      var s1 = 0;
      var s2 = 0;
      var c = 1;

      if (args.length == 0) {
        args = [+new Date];
      }
      var mash = Mash();
      s0 = mash(' ');
      s1 = mash(' ');
      s2 = mash(' ');

      for (var i = 0; i < args.length; i++) {
        s0 -= mash(args[i]);
        if (s0 < 0) {
          s0 += 1;
        }
        s1 -= mash(args[i]);
        if (s1 < 0) {
          s1 += 1;
        }
        s2 -= mash(args[i]);
        if (s2 < 0) {
          s2 += 1;
        }
      }
      mash = null;

      var random = function() {
        var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
        s0 = s1;
        s1 = s2;
        return s2 = t - (c = t | 0);
      };
      random.uint32 = function() {
        return random() * 0x100000000; // 2^32
      };
      random.fract53 = function() {
        return random() + 
          (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
      };
      random.version = 'Alea 0.9';
      random.args = args;

      // my own additions to sync state between two generators
      random.exportState = function(){
        return [s0, s1, s2, c];
      };
      random.importState = function(i){
        s0 = +i[0] || 0;
        s1 = +i[1] || 0;
        s2 = +i[2] || 0;
        c = +i[3] || 0;
      };
 
      return random;

    } (Array.prototype.slice.call(arguments)));
  }

  function Mash() {
    var n = 0xefc8249d;

    var mash = function(data) {
      data = data.toString();
      for (var i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        var h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
      }
      return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };

    mash.version = 'Mash 0.9';
    return mash;
  }
}));

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
module.exports = clamp

function clamp(value, min, max) {
  return min < max
    ? (value < min ? min : value > max ? max : value)
    : (value < max ? max : value > min ? min : value)
}

},{}],4:[function(require,module,exports){
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.1.20150716
 *
 * By Eli Grey, http://eligrey.com
 * License: X11/MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, webkit_req_fs = view.webkitRequestFileSystem
		, req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		, fs_min_size = 0
		// See https://code.google.com/p/chromium/issues/detail?id=375297#c7 and
		// https://github.com/eligrey/FileSaver.js/commit/485930a#commitcomment-8768047
		// for the reasoning behind the timeout and revocation flow
		, arbitrary_revoke_timeout = 500 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			if (view.chrome) {
				revoker();
			} else {
				setTimeout(revoker, arbitrary_revoke_timeout);
			}
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob(["\ufeff", blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, blob_changed = false
				, object_url
				, target_view
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					// don't create more object URLs than needed
					if (blob_changed || !object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (target_view) {
						target_view.location.href = object_url;
					} else {
						var new_tab = view.open(object_url, "_blank");
						if (new_tab == undefined && typeof safari !== "undefined") {
							//Apple do not allow window.open, see http://bit.ly/1kZffRI
							view.location.href = object_url
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
				, abortable = function(func) {
					return function() {
						if (filesaver.readyState !== filesaver.DONE) {
							return func.apply(this, arguments);
						}
					};
				}
				, create_if_not_found = {create: true, exclusive: false}
				, slice
			;
			filesaver.readyState = filesaver.INIT;
			if (!name) {
				name = "download";
			}
			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				save_link.href = object_url;
				save_link.download = name;
				setTimeout(function() {
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}
			// Object and web filesystem URLs have a problem saving in Google Chrome when
			// viewed in a tab, so I force save with application/octet-stream
			// http://code.google.com/p/chromium/issues/detail?id=91158
			// Update: Google errantly closed 91158, I submitted it again:
			// https://code.google.com/p/chromium/issues/detail?id=389642
			if (view.chrome && type && type !== force_saveable_type) {
				slice = blob.slice || blob.webkitSlice;
				blob = slice.call(blob, 0, blob.size, force_saveable_type);
				blob_changed = true;
			}
			// Since I can't be sure that the guessed media type will trigger a download
			// in WebKit, I append .download to the filename.
			// https://bugs.webkit.org/show_bug.cgi?id=65440
			if (webkit_req_fs && name !== "download") {
				name += ".download";
			}
			if (type === force_saveable_type || webkit_req_fs) {
				target_view = view;
			}
			if (!req_fs) {
				fs_error();
				return;
			}
			fs_min_size += blob.size;
			req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
				fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
					var save = function() {
						dir.getFile(name, create_if_not_found, abortable(function(file) {
							file.createWriter(abortable(function(writer) {
								writer.onwriteend = function(event) {
									target_view.location.href = file.toURL();
									filesaver.readyState = filesaver.DONE;
									dispatch(filesaver, "writeend", event);
									revoke(file);
								};
								writer.onerror = function() {
									var error = writer.error;
									if (error.code !== error.ABORT_ERR) {
										fs_error();
									}
								};
								"writestart progress write abort".split(" ").forEach(function(event) {
									writer["on" + event] = filesaver["on" + event];
								});
								writer.write(blob);
								filesaver.abort = function() {
									writer.abort();
									filesaver.readyState = filesaver.DONE;
								};
								filesaver.readyState = filesaver.WRITING;
							}), fs_error);
						}), fs_error);
					};
					dir.getFile(name, {create: false}, abortable(function(file) {
						// delete file if it already exists
						file.remove();
						save();
					}), abortable(function(ex) {
						if (ex.code === ex.NOT_FOUND_ERR) {
							save();
						} else {
							fs_error();
						}
					}));
				}), fs_error);
			}), fs_error);
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name, no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name || "download");
		};
	}

	FS_proto.abort = function() {
		var filesaver = this;
		filesaver.readyState = filesaver.DONE;
		dispatch(filesaver, "abort");
	};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
  define([], function() {
    return saveAs;
  });
}

},{}],5:[function(require,module,exports){
/*!
@fileoverview gl-matrix - High performance matrix and vector operations
@author Brandon Jones
@author Colin MacKenzie IV
@version 2.7.0

Copyright (c) 2015-2018, Brandon Jones, Colin MacKenzie IV.

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

*/
!function(t,n){if("object"==typeof exports&&"object"==typeof module)module.exports=n();else if("function"==typeof define&&define.amd)define([],n);else{var r=n();for(var a in r)("object"==typeof exports?exports:t)[a]=r[a]}}("undefined"!=typeof self?self:this,function(){return function(t){var n={};function r(a){if(n[a])return n[a].exports;var e=n[a]={i:a,l:!1,exports:{}};return t[a].call(e.exports,e,e.exports,r),e.l=!0,e.exports}return r.m=t,r.c=n,r.d=function(t,n,a){r.o(t,n)||Object.defineProperty(t,n,{enumerable:!0,get:a})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,n){if(1&n&&(t=r(t)),8&n)return t;if(4&n&&"object"==typeof t&&t&&t.__esModule)return t;var a=Object.create(null);if(r.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:t}),2&n&&"string"!=typeof t)for(var e in t)r.d(a,e,function(n){return t[n]}.bind(null,e));return a},r.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(n,"a",n),n},r.o=function(t,n){return Object.prototype.hasOwnProperty.call(t,n)},r.p="",r(r.s=10)}([function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.setMatrixArrayType=function(t){n.ARRAY_TYPE=t},n.toRadian=function(t){return t*e},n.equals=function(t,n){return Math.abs(t-n)<=a*Math.max(1,Math.abs(t),Math.abs(n))};var a=n.EPSILON=1e-6;n.ARRAY_TYPE="undefined"!=typeof Float32Array?Float32Array:Array,n.RANDOM=Math.random;var e=Math.PI/180},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.forEach=n.sqrLen=n.len=n.sqrDist=n.dist=n.div=n.mul=n.sub=void 0,n.create=e,n.clone=function(t){var n=new a.ARRAY_TYPE(4);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n},n.fromValues=function(t,n,r,e){var u=new a.ARRAY_TYPE(4);return u[0]=t,u[1]=n,u[2]=r,u[3]=e,u},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t},n.set=function(t,n,r,a,e){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t},n.subtract=u,n.multiply=o,n.divide=i,n.ceil=function(t,n){return t[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t[2]=Math.ceil(n[2]),t[3]=Math.ceil(n[3]),t},n.floor=function(t,n){return t[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t[2]=Math.floor(n[2]),t[3]=Math.floor(n[3]),t},n.min=function(t,n,r){return t[0]=Math.min(n[0],r[0]),t[1]=Math.min(n[1],r[1]),t[2]=Math.min(n[2],r[2]),t[3]=Math.min(n[3],r[3]),t},n.max=function(t,n,r){return t[0]=Math.max(n[0],r[0]),t[1]=Math.max(n[1],r[1]),t[2]=Math.max(n[2],r[2]),t[3]=Math.max(n[3],r[3]),t},n.round=function(t,n){return t[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t[2]=Math.round(n[2]),t[3]=Math.round(n[3]),t},n.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t},n.scaleAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t[3]=n[3]+r[3]*a,t},n.distance=s,n.squaredDistance=c,n.length=f,n.squaredLength=M,n.negate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=-n[3],t},n.inverse=function(t,n){return t[0]=1/n[0],t[1]=1/n[1],t[2]=1/n[2],t[3]=1/n[3],t},n.normalize=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=r*r+a*a+e*e+u*u;o>0&&(o=1/Math.sqrt(o),t[0]=r*o,t[1]=a*o,t[2]=e*o,t[3]=u*o);return t},n.dot=function(t,n){return t[0]*n[0]+t[1]*n[1]+t[2]*n[2]+t[3]*n[3]},n.lerp=function(t,n,r,a){var e=n[0],u=n[1],o=n[2],i=n[3];return t[0]=e+a*(r[0]-e),t[1]=u+a*(r[1]-u),t[2]=o+a*(r[2]-o),t[3]=i+a*(r[3]-i),t},n.random=function(t,n){var r,e,u,o,i,s;n=n||1;do{r=2*a.RANDOM()-1,e=2*a.RANDOM()-1,i=r*r+e*e}while(i>=1);do{u=2*a.RANDOM()-1,o=2*a.RANDOM()-1,s=u*u+o*o}while(s>=1);var c=Math.sqrt((1-i)/s);return t[0]=n*r,t[1]=n*e,t[2]=n*u*c,t[3]=n*o*c,t},n.transformMat4=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3];return t[0]=r[0]*a+r[4]*e+r[8]*u+r[12]*o,t[1]=r[1]*a+r[5]*e+r[9]*u+r[13]*o,t[2]=r[2]*a+r[6]*e+r[10]*u+r[14]*o,t[3]=r[3]*a+r[7]*e+r[11]*u+r[15]*o,t},n.transformQuat=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=r[0],i=r[1],s=r[2],c=r[3],f=c*a+i*u-s*e,M=c*e+s*a-o*u,h=c*u+o*e-i*a,l=-o*a-i*e-s*u;return t[0]=f*c+l*-o+M*-s-h*-i,t[1]=M*c+l*-i+h*-o-f*-s,t[2]=h*c+l*-s+f*-i-M*-o,t[3]=n[3],t},n.str=function(t){return"vec4("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=n[0],s=n[1],c=n[2],f=n[3];return Math.abs(r-i)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(i))&&Math.abs(e-s)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(s))&&Math.abs(u-c)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(c))&&Math.abs(o-f)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(f))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(){var t=new a.ARRAY_TYPE(4);return a.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0,t[3]=0),t}function u(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t}function o(t,n,r){return t[0]=n[0]*r[0],t[1]=n[1]*r[1],t[2]=n[2]*r[2],t[3]=n[3]*r[3],t}function i(t,n,r){return t[0]=n[0]/r[0],t[1]=n[1]/r[1],t[2]=n[2]/r[2],t[3]=n[3]/r[3],t}function s(t,n){var r=n[0]-t[0],a=n[1]-t[1],e=n[2]-t[2],u=n[3]-t[3];return Math.sqrt(r*r+a*a+e*e+u*u)}function c(t,n){var r=n[0]-t[0],a=n[1]-t[1],e=n[2]-t[2],u=n[3]-t[3];return r*r+a*a+e*e+u*u}function f(t){var n=t[0],r=t[1],a=t[2],e=t[3];return Math.sqrt(n*n+r*r+a*a+e*e)}function M(t){var n=t[0],r=t[1],a=t[2],e=t[3];return n*n+r*r+a*a+e*e}n.sub=u,n.mul=o,n.div=i,n.dist=s,n.sqrDist=c,n.len=f,n.sqrLen=M,n.forEach=function(){var t=e();return function(n,r,a,e,u,o){var i=void 0,s=void 0;for(r||(r=4),a||(a=0),s=e?Math.min(e*r+a,n.length):n.length,i=a;i<s;i+=r)t[0]=n[i],t[1]=n[i+1],t[2]=n[i+2],t[3]=n[i+3],u(t,t,o),n[i]=t[0],n[i+1]=t[1],n[i+2]=t[2],n[i+3]=t[3];return n}}()},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.forEach=n.sqrLen=n.len=n.sqrDist=n.dist=n.div=n.mul=n.sub=void 0,n.create=e,n.clone=function(t){var n=new a.ARRAY_TYPE(3);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n},n.length=u,n.fromValues=o,n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t},n.set=function(t,n,r,a){return t[0]=n,t[1]=r,t[2]=a,t},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t},n.subtract=i,n.multiply=s,n.divide=c,n.ceil=function(t,n){return t[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t[2]=Math.ceil(n[2]),t},n.floor=function(t,n){return t[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t[2]=Math.floor(n[2]),t},n.min=function(t,n,r){return t[0]=Math.min(n[0],r[0]),t[1]=Math.min(n[1],r[1]),t[2]=Math.min(n[2],r[2]),t},n.max=function(t,n,r){return t[0]=Math.max(n[0],r[0]),t[1]=Math.max(n[1],r[1]),t[2]=Math.max(n[2],r[2]),t},n.round=function(t,n){return t[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t[2]=Math.round(n[2]),t},n.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t},n.scaleAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t},n.distance=f,n.squaredDistance=M,n.squaredLength=h,n.negate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t},n.inverse=function(t,n){return t[0]=1/n[0],t[1]=1/n[1],t[2]=1/n[2],t},n.normalize=l,n.dot=v,n.cross=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=r[0],i=r[1],s=r[2];return t[0]=e*s-u*i,t[1]=u*o-a*s,t[2]=a*i-e*o,t},n.lerp=function(t,n,r,a){var e=n[0],u=n[1],o=n[2];return t[0]=e+a*(r[0]-e),t[1]=u+a*(r[1]-u),t[2]=o+a*(r[2]-o),t},n.hermite=function(t,n,r,a,e,u){var o=u*u,i=o*(2*u-3)+1,s=o*(u-2)+u,c=o*(u-1),f=o*(3-2*u);return t[0]=n[0]*i+r[0]*s+a[0]*c+e[0]*f,t[1]=n[1]*i+r[1]*s+a[1]*c+e[1]*f,t[2]=n[2]*i+r[2]*s+a[2]*c+e[2]*f,t},n.bezier=function(t,n,r,a,e,u){var o=1-u,i=o*o,s=u*u,c=i*o,f=3*u*i,M=3*s*o,h=s*u;return t[0]=n[0]*c+r[0]*f+a[0]*M+e[0]*h,t[1]=n[1]*c+r[1]*f+a[1]*M+e[1]*h,t[2]=n[2]*c+r[2]*f+a[2]*M+e[2]*h,t},n.random=function(t,n){n=n||1;var r=2*a.RANDOM()*Math.PI,e=2*a.RANDOM()-1,u=Math.sqrt(1-e*e)*n;return t[0]=Math.cos(r)*u,t[1]=Math.sin(r)*u,t[2]=e*n,t},n.transformMat4=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=r[3]*a+r[7]*e+r[11]*u+r[15];return o=o||1,t[0]=(r[0]*a+r[4]*e+r[8]*u+r[12])/o,t[1]=(r[1]*a+r[5]*e+r[9]*u+r[13])/o,t[2]=(r[2]*a+r[6]*e+r[10]*u+r[14])/o,t},n.transformMat3=function(t,n,r){var a=n[0],e=n[1],u=n[2];return t[0]=a*r[0]+e*r[3]+u*r[6],t[1]=a*r[1]+e*r[4]+u*r[7],t[2]=a*r[2]+e*r[5]+u*r[8],t},n.transformQuat=function(t,n,r){var a=r[0],e=r[1],u=r[2],o=r[3],i=n[0],s=n[1],c=n[2],f=e*c-u*s,M=u*i-a*c,h=a*s-e*i,l=e*h-u*M,v=u*f-a*h,d=a*M-e*f,b=2*o;return f*=b,M*=b,h*=b,l*=2,v*=2,d*=2,t[0]=i+f+l,t[1]=s+M+v,t[2]=c+h+d,t},n.rotateX=function(t,n,r,a){var e=[],u=[];return e[0]=n[0]-r[0],e[1]=n[1]-r[1],e[2]=n[2]-r[2],u[0]=e[0],u[1]=e[1]*Math.cos(a)-e[2]*Math.sin(a),u[2]=e[1]*Math.sin(a)+e[2]*Math.cos(a),t[0]=u[0]+r[0],t[1]=u[1]+r[1],t[2]=u[2]+r[2],t},n.rotateY=function(t,n,r,a){var e=[],u=[];return e[0]=n[0]-r[0],e[1]=n[1]-r[1],e[2]=n[2]-r[2],u[0]=e[2]*Math.sin(a)+e[0]*Math.cos(a),u[1]=e[1],u[2]=e[2]*Math.cos(a)-e[0]*Math.sin(a),t[0]=u[0]+r[0],t[1]=u[1]+r[1],t[2]=u[2]+r[2],t},n.rotateZ=function(t,n,r,a){var e=[],u=[];return e[0]=n[0]-r[0],e[1]=n[1]-r[1],e[2]=n[2]-r[2],u[0]=e[0]*Math.cos(a)-e[1]*Math.sin(a),u[1]=e[0]*Math.sin(a)+e[1]*Math.cos(a),u[2]=e[2],t[0]=u[0]+r[0],t[1]=u[1]+r[1],t[2]=u[2]+r[2],t},n.angle=function(t,n){var r=o(t[0],t[1],t[2]),a=o(n[0],n[1],n[2]);l(r,r),l(a,a);var e=v(r,a);return e>1?0:e<-1?Math.PI:Math.acos(e)},n.str=function(t){return"vec3("+t[0]+", "+t[1]+", "+t[2]+")"},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=n[0],i=n[1],s=n[2];return Math.abs(r-o)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(o))&&Math.abs(e-i)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(i))&&Math.abs(u-s)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(s))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(){var t=new a.ARRAY_TYPE(3);return a.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0),t}function u(t){var n=t[0],r=t[1],a=t[2];return Math.sqrt(n*n+r*r+a*a)}function o(t,n,r){var e=new a.ARRAY_TYPE(3);return e[0]=t,e[1]=n,e[2]=r,e}function i(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t}function s(t,n,r){return t[0]=n[0]*r[0],t[1]=n[1]*r[1],t[2]=n[2]*r[2],t}function c(t,n,r){return t[0]=n[0]/r[0],t[1]=n[1]/r[1],t[2]=n[2]/r[2],t}function f(t,n){var r=n[0]-t[0],a=n[1]-t[1],e=n[2]-t[2];return Math.sqrt(r*r+a*a+e*e)}function M(t,n){var r=n[0]-t[0],a=n[1]-t[1],e=n[2]-t[2];return r*r+a*a+e*e}function h(t){var n=t[0],r=t[1],a=t[2];return n*n+r*r+a*a}function l(t,n){var r=n[0],a=n[1],e=n[2],u=r*r+a*a+e*e;return u>0&&(u=1/Math.sqrt(u),t[0]=n[0]*u,t[1]=n[1]*u,t[2]=n[2]*u),t}function v(t,n){return t[0]*n[0]+t[1]*n[1]+t[2]*n[2]}n.sub=i,n.mul=s,n.div=c,n.dist=f,n.sqrDist=M,n.len=u,n.sqrLen=h,n.forEach=function(){var t=e();return function(n,r,a,e,u,o){var i=void 0,s=void 0;for(r||(r=3),a||(a=0),s=e?Math.min(e*r+a,n.length):n.length,i=a;i<s;i+=r)t[0]=n[i],t[1]=n[i+1],t[2]=n[i+2],u(t,t,o),n[i]=t[0],n[i+1]=t[1],n[i+2]=t[2];return n}}()},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.setAxes=n.sqlerp=n.rotationTo=n.equals=n.exactEquals=n.normalize=n.sqrLen=n.squaredLength=n.len=n.length=n.lerp=n.dot=n.scale=n.mul=n.add=n.set=n.copy=n.fromValues=n.clone=void 0,n.create=s,n.identity=function(t){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t},n.setAxisAngle=c,n.getAxisAngle=function(t,n){var r=2*Math.acos(n[3]),e=Math.sin(r/2);e>a.EPSILON?(t[0]=n[0]/e,t[1]=n[1]/e,t[2]=n[2]/e):(t[0]=1,t[1]=0,t[2]=0);return r},n.multiply=f,n.rotateX=function(t,n,r){r*=.5;var a=n[0],e=n[1],u=n[2],o=n[3],i=Math.sin(r),s=Math.cos(r);return t[0]=a*s+o*i,t[1]=e*s+u*i,t[2]=u*s-e*i,t[3]=o*s-a*i,t},n.rotateY=function(t,n,r){r*=.5;var a=n[0],e=n[1],u=n[2],o=n[3],i=Math.sin(r),s=Math.cos(r);return t[0]=a*s-u*i,t[1]=e*s+o*i,t[2]=u*s+a*i,t[3]=o*s-e*i,t},n.rotateZ=function(t,n,r){r*=.5;var a=n[0],e=n[1],u=n[2],o=n[3],i=Math.sin(r),s=Math.cos(r);return t[0]=a*s+e*i,t[1]=e*s-a*i,t[2]=u*s+o*i,t[3]=o*s-u*i,t},n.calculateW=function(t,n){var r=n[0],a=n[1],e=n[2];return t[0]=r,t[1]=a,t[2]=e,t[3]=Math.sqrt(Math.abs(1-r*r-a*a-e*e)),t},n.slerp=M,n.random=function(t){var n=a.RANDOM(),r=a.RANDOM(),e=a.RANDOM(),u=Math.sqrt(1-n),o=Math.sqrt(n);return t[0]=u*Math.sin(2*Math.PI*r),t[1]=u*Math.cos(2*Math.PI*r),t[2]=o*Math.sin(2*Math.PI*e),t[3]=o*Math.cos(2*Math.PI*e),t},n.invert=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=r*r+a*a+e*e+u*u,i=o?1/o:0;return t[0]=-r*i,t[1]=-a*i,t[2]=-e*i,t[3]=u*i,t},n.conjugate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=n[3],t},n.fromMat3=h,n.fromEuler=function(t,n,r,a){var e=.5*Math.PI/180;n*=e,r*=e,a*=e;var u=Math.sin(n),o=Math.cos(n),i=Math.sin(r),s=Math.cos(r),c=Math.sin(a),f=Math.cos(a);return t[0]=u*s*f-o*i*c,t[1]=o*i*f+u*s*c,t[2]=o*s*c-u*i*f,t[3]=o*s*f+u*i*c,t},n.str=function(t){return"quat("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"};var a=i(r(0)),e=i(r(5)),u=i(r(2)),o=i(r(1));function i(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}function s(){var t=new a.ARRAY_TYPE(4);return a.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0),t[3]=1,t}function c(t,n,r){r*=.5;var a=Math.sin(r);return t[0]=a*n[0],t[1]=a*n[1],t[2]=a*n[2],t[3]=Math.cos(r),t}function f(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=r[0],s=r[1],c=r[2],f=r[3];return t[0]=a*f+o*i+e*c-u*s,t[1]=e*f+o*s+u*i-a*c,t[2]=u*f+o*c+a*s-e*i,t[3]=o*f-a*i-e*s-u*c,t}function M(t,n,r,e){var u=n[0],o=n[1],i=n[2],s=n[3],c=r[0],f=r[1],M=r[2],h=r[3],l=void 0,v=void 0,d=void 0,b=void 0,m=void 0;return(v=u*c+o*f+i*M+s*h)<0&&(v=-v,c=-c,f=-f,M=-M,h=-h),1-v>a.EPSILON?(l=Math.acos(v),d=Math.sin(l),b=Math.sin((1-e)*l)/d,m=Math.sin(e*l)/d):(b=1-e,m=e),t[0]=b*u+m*c,t[1]=b*o+m*f,t[2]=b*i+m*M,t[3]=b*s+m*h,t}function h(t,n){var r=n[0]+n[4]+n[8],a=void 0;if(r>0)a=Math.sqrt(r+1),t[3]=.5*a,a=.5/a,t[0]=(n[5]-n[7])*a,t[1]=(n[6]-n[2])*a,t[2]=(n[1]-n[3])*a;else{var e=0;n[4]>n[0]&&(e=1),n[8]>n[3*e+e]&&(e=2);var u=(e+1)%3,o=(e+2)%3;a=Math.sqrt(n[3*e+e]-n[3*u+u]-n[3*o+o]+1),t[e]=.5*a,a=.5/a,t[3]=(n[3*u+o]-n[3*o+u])*a,t[u]=(n[3*u+e]+n[3*e+u])*a,t[o]=(n[3*o+e]+n[3*e+o])*a}return t}n.clone=o.clone,n.fromValues=o.fromValues,n.copy=o.copy,n.set=o.set,n.add=o.add,n.mul=f,n.scale=o.scale,n.dot=o.dot,n.lerp=o.lerp;var l=n.length=o.length,v=(n.len=l,n.squaredLength=o.squaredLength),d=(n.sqrLen=v,n.normalize=o.normalize);n.exactEquals=o.exactEquals,n.equals=o.equals,n.rotationTo=function(){var t=u.create(),n=u.fromValues(1,0,0),r=u.fromValues(0,1,0);return function(a,e,o){var i=u.dot(e,o);return i<-.999999?(u.cross(t,n,e),u.len(t)<1e-6&&u.cross(t,r,e),u.normalize(t,t),c(a,t,Math.PI),a):i>.999999?(a[0]=0,a[1]=0,a[2]=0,a[3]=1,a):(u.cross(t,e,o),a[0]=t[0],a[1]=t[1],a[2]=t[2],a[3]=1+i,d(a,a))}}(),n.sqlerp=function(){var t=s(),n=s();return function(r,a,e,u,o,i){return M(t,a,o,i),M(n,e,u,i),M(r,t,n,2*i*(1-i)),r}}(),n.setAxes=function(){var t=e.create();return function(n,r,a,e){return t[0]=a[0],t[3]=a[1],t[6]=a[2],t[1]=e[0],t[4]=e[1],t[7]=e[2],t[2]=-r[0],t[5]=-r[1],t[8]=-r[2],d(n,h(n,t))}}()},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.sub=n.mul=void 0,n.create=function(){var t=new a.ARRAY_TYPE(16);a.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0);return t[0]=1,t[5]=1,t[10]=1,t[15]=1,t},n.clone=function(t){var n=new a.ARRAY_TYPE(16);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n[8]=t[8],n[9]=t[9],n[10]=t[10],n[11]=t[11],n[12]=t[12],n[13]=t[13],n[14]=t[14],n[15]=t[15],n},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],t},n.fromValues=function(t,n,r,e,u,o,i,s,c,f,M,h,l,v,d,b){var m=new a.ARRAY_TYPE(16);return m[0]=t,m[1]=n,m[2]=r,m[3]=e,m[4]=u,m[5]=o,m[6]=i,m[7]=s,m[8]=c,m[9]=f,m[10]=M,m[11]=h,m[12]=l,m[13]=v,m[14]=d,m[15]=b,m},n.set=function(t,n,r,a,e,u,o,i,s,c,f,M,h,l,v,d,b){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t[4]=u,t[5]=o,t[6]=i,t[7]=s,t[8]=c,t[9]=f,t[10]=M,t[11]=h,t[12]=l,t[13]=v,t[14]=d,t[15]=b,t},n.identity=e,n.transpose=function(t,n){if(t===n){var r=n[1],a=n[2],e=n[3],u=n[6],o=n[7],i=n[11];t[1]=n[4],t[2]=n[8],t[3]=n[12],t[4]=r,t[6]=n[9],t[7]=n[13],t[8]=a,t[9]=u,t[11]=n[14],t[12]=e,t[13]=o,t[14]=i}else t[0]=n[0],t[1]=n[4],t[2]=n[8],t[3]=n[12],t[4]=n[1],t[5]=n[5],t[6]=n[9],t[7]=n[13],t[8]=n[2],t[9]=n[6],t[10]=n[10],t[11]=n[14],t[12]=n[3],t[13]=n[7],t[14]=n[11],t[15]=n[15];return t},n.invert=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=n[6],c=n[7],f=n[8],M=n[9],h=n[10],l=n[11],v=n[12],d=n[13],b=n[14],m=n[15],p=r*i-a*o,P=r*s-e*o,A=r*c-u*o,E=a*s-e*i,O=a*c-u*i,R=e*c-u*s,y=f*d-M*v,q=f*b-h*v,x=f*m-l*v,_=M*b-h*d,Y=M*m-l*d,L=h*m-l*b,S=p*L-P*Y+A*_+E*x-O*q+R*y;if(!S)return null;return S=1/S,t[0]=(i*L-s*Y+c*_)*S,t[1]=(e*Y-a*L-u*_)*S,t[2]=(d*R-b*O+m*E)*S,t[3]=(h*O-M*R-l*E)*S,t[4]=(s*x-o*L-c*q)*S,t[5]=(r*L-e*x+u*q)*S,t[6]=(b*A-v*R-m*P)*S,t[7]=(f*R-h*A+l*P)*S,t[8]=(o*Y-i*x+c*y)*S,t[9]=(a*x-r*Y-u*y)*S,t[10]=(v*O-d*A+m*p)*S,t[11]=(M*A-f*O-l*p)*S,t[12]=(i*q-o*_-s*y)*S,t[13]=(r*_-a*q+e*y)*S,t[14]=(d*P-v*E-b*p)*S,t[15]=(f*E-M*P+h*p)*S,t},n.adjoint=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=n[6],c=n[7],f=n[8],M=n[9],h=n[10],l=n[11],v=n[12],d=n[13],b=n[14],m=n[15];return t[0]=i*(h*m-l*b)-M*(s*m-c*b)+d*(s*l-c*h),t[1]=-(a*(h*m-l*b)-M*(e*m-u*b)+d*(e*l-u*h)),t[2]=a*(s*m-c*b)-i*(e*m-u*b)+d*(e*c-u*s),t[3]=-(a*(s*l-c*h)-i*(e*l-u*h)+M*(e*c-u*s)),t[4]=-(o*(h*m-l*b)-f*(s*m-c*b)+v*(s*l-c*h)),t[5]=r*(h*m-l*b)-f*(e*m-u*b)+v*(e*l-u*h),t[6]=-(r*(s*m-c*b)-o*(e*m-u*b)+v*(e*c-u*s)),t[7]=r*(s*l-c*h)-o*(e*l-u*h)+f*(e*c-u*s),t[8]=o*(M*m-l*d)-f*(i*m-c*d)+v*(i*l-c*M),t[9]=-(r*(M*m-l*d)-f*(a*m-u*d)+v*(a*l-u*M)),t[10]=r*(i*m-c*d)-o*(a*m-u*d)+v*(a*c-u*i),t[11]=-(r*(i*l-c*M)-o*(a*l-u*M)+f*(a*c-u*i)),t[12]=-(o*(M*b-h*d)-f*(i*b-s*d)+v*(i*h-s*M)),t[13]=r*(M*b-h*d)-f*(a*b-e*d)+v*(a*h-e*M),t[14]=-(r*(i*b-s*d)-o*(a*b-e*d)+v*(a*s-e*i)),t[15]=r*(i*h-s*M)-o*(a*h-e*M)+f*(a*s-e*i),t},n.determinant=function(t){var n=t[0],r=t[1],a=t[2],e=t[3],u=t[4],o=t[5],i=t[6],s=t[7],c=t[8],f=t[9],M=t[10],h=t[11],l=t[12],v=t[13],d=t[14],b=t[15];return(n*o-r*u)*(M*b-h*d)-(n*i-a*u)*(f*b-h*v)+(n*s-e*u)*(f*d-M*v)+(r*i-a*o)*(c*b-h*l)-(r*s-e*o)*(c*d-M*l)+(a*s-e*i)*(c*v-f*l)},n.multiply=u,n.translate=function(t,n,r){var a=r[0],e=r[1],u=r[2],o=void 0,i=void 0,s=void 0,c=void 0,f=void 0,M=void 0,h=void 0,l=void 0,v=void 0,d=void 0,b=void 0,m=void 0;n===t?(t[12]=n[0]*a+n[4]*e+n[8]*u+n[12],t[13]=n[1]*a+n[5]*e+n[9]*u+n[13],t[14]=n[2]*a+n[6]*e+n[10]*u+n[14],t[15]=n[3]*a+n[7]*e+n[11]*u+n[15]):(o=n[0],i=n[1],s=n[2],c=n[3],f=n[4],M=n[5],h=n[6],l=n[7],v=n[8],d=n[9],b=n[10],m=n[11],t[0]=o,t[1]=i,t[2]=s,t[3]=c,t[4]=f,t[5]=M,t[6]=h,t[7]=l,t[8]=v,t[9]=d,t[10]=b,t[11]=m,t[12]=o*a+f*e+v*u+n[12],t[13]=i*a+M*e+d*u+n[13],t[14]=s*a+h*e+b*u+n[14],t[15]=c*a+l*e+m*u+n[15]);return t},n.scale=function(t,n,r){var a=r[0],e=r[1],u=r[2];return t[0]=n[0]*a,t[1]=n[1]*a,t[2]=n[2]*a,t[3]=n[3]*a,t[4]=n[4]*e,t[5]=n[5]*e,t[6]=n[6]*e,t[7]=n[7]*e,t[8]=n[8]*u,t[9]=n[9]*u,t[10]=n[10]*u,t[11]=n[11]*u,t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],t},n.rotate=function(t,n,r,e){var u=e[0],o=e[1],i=e[2],s=Math.sqrt(u*u+o*o+i*i),c=void 0,f=void 0,M=void 0,h=void 0,l=void 0,v=void 0,d=void 0,b=void 0,m=void 0,p=void 0,P=void 0,A=void 0,E=void 0,O=void 0,R=void 0,y=void 0,q=void 0,x=void 0,_=void 0,Y=void 0,L=void 0,S=void 0,w=void 0,I=void 0;if(s<a.EPSILON)return null;u*=s=1/s,o*=s,i*=s,c=Math.sin(r),f=Math.cos(r),M=1-f,h=n[0],l=n[1],v=n[2],d=n[3],b=n[4],m=n[5],p=n[6],P=n[7],A=n[8],E=n[9],O=n[10],R=n[11],y=u*u*M+f,q=o*u*M+i*c,x=i*u*M-o*c,_=u*o*M-i*c,Y=o*o*M+f,L=i*o*M+u*c,S=u*i*M+o*c,w=o*i*M-u*c,I=i*i*M+f,t[0]=h*y+b*q+A*x,t[1]=l*y+m*q+E*x,t[2]=v*y+p*q+O*x,t[3]=d*y+P*q+R*x,t[4]=h*_+b*Y+A*L,t[5]=l*_+m*Y+E*L,t[6]=v*_+p*Y+O*L,t[7]=d*_+P*Y+R*L,t[8]=h*S+b*w+A*I,t[9]=l*S+m*w+E*I,t[10]=v*S+p*w+O*I,t[11]=d*S+P*w+R*I,n!==t&&(t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]);return t},n.rotateX=function(t,n,r){var a=Math.sin(r),e=Math.cos(r),u=n[4],o=n[5],i=n[6],s=n[7],c=n[8],f=n[9],M=n[10],h=n[11];n!==t&&(t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]);return t[4]=u*e+c*a,t[5]=o*e+f*a,t[6]=i*e+M*a,t[7]=s*e+h*a,t[8]=c*e-u*a,t[9]=f*e-o*a,t[10]=M*e-i*a,t[11]=h*e-s*a,t},n.rotateY=function(t,n,r){var a=Math.sin(r),e=Math.cos(r),u=n[0],o=n[1],i=n[2],s=n[3],c=n[8],f=n[9],M=n[10],h=n[11];n!==t&&(t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]);return t[0]=u*e-c*a,t[1]=o*e-f*a,t[2]=i*e-M*a,t[3]=s*e-h*a,t[8]=u*a+c*e,t[9]=o*a+f*e,t[10]=i*a+M*e,t[11]=s*a+h*e,t},n.rotateZ=function(t,n,r){var a=Math.sin(r),e=Math.cos(r),u=n[0],o=n[1],i=n[2],s=n[3],c=n[4],f=n[5],M=n[6],h=n[7];n!==t&&(t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]);return t[0]=u*e+c*a,t[1]=o*e+f*a,t[2]=i*e+M*a,t[3]=s*e+h*a,t[4]=c*e-u*a,t[5]=f*e-o*a,t[6]=M*e-i*a,t[7]=h*e-s*a,t},n.fromTranslation=function(t,n){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=n[0],t[13]=n[1],t[14]=n[2],t[15]=1,t},n.fromScaling=function(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=n[1],t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=n[2],t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.fromRotation=function(t,n,r){var e=r[0],u=r[1],o=r[2],i=Math.sqrt(e*e+u*u+o*o),s=void 0,c=void 0,f=void 0;if(i<a.EPSILON)return null;return e*=i=1/i,u*=i,o*=i,s=Math.sin(n),c=Math.cos(n),f=1-c,t[0]=e*e*f+c,t[1]=u*e*f+o*s,t[2]=o*e*f-u*s,t[3]=0,t[4]=e*u*f-o*s,t[5]=u*u*f+c,t[6]=o*u*f+e*s,t[7]=0,t[8]=e*o*f+u*s,t[9]=u*o*f-e*s,t[10]=o*o*f+c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.fromXRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=a,t[6]=r,t[7]=0,t[8]=0,t[9]=-r,t[10]=a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.fromYRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=a,t[1]=0,t[2]=-r,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=r,t[9]=0,t[10]=a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.fromZRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=a,t[1]=r,t[2]=0,t[3]=0,t[4]=-r,t[5]=a,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.fromRotationTranslation=o,n.fromQuat2=function(t,n){var r=new a.ARRAY_TYPE(3),e=-n[0],u=-n[1],i=-n[2],s=n[3],c=n[4],f=n[5],M=n[6],h=n[7],l=e*e+u*u+i*i+s*s;l>0?(r[0]=2*(c*s+h*e+f*i-M*u)/l,r[1]=2*(f*s+h*u+M*e-c*i)/l,r[2]=2*(M*s+h*i+c*u-f*e)/l):(r[0]=2*(c*s+h*e+f*i-M*u),r[1]=2*(f*s+h*u+M*e-c*i),r[2]=2*(M*s+h*i+c*u-f*e));return o(t,n,r),t},n.getTranslation=function(t,n){return t[0]=n[12],t[1]=n[13],t[2]=n[14],t},n.getScaling=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[4],o=n[5],i=n[6],s=n[8],c=n[9],f=n[10];return t[0]=Math.sqrt(r*r+a*a+e*e),t[1]=Math.sqrt(u*u+o*o+i*i),t[2]=Math.sqrt(s*s+c*c+f*f),t},n.getRotation=function(t,n){var r=n[0]+n[5]+n[10],a=0;r>0?(a=2*Math.sqrt(r+1),t[3]=.25*a,t[0]=(n[6]-n[9])/a,t[1]=(n[8]-n[2])/a,t[2]=(n[1]-n[4])/a):n[0]>n[5]&&n[0]>n[10]?(a=2*Math.sqrt(1+n[0]-n[5]-n[10]),t[3]=(n[6]-n[9])/a,t[0]=.25*a,t[1]=(n[1]+n[4])/a,t[2]=(n[8]+n[2])/a):n[5]>n[10]?(a=2*Math.sqrt(1+n[5]-n[0]-n[10]),t[3]=(n[8]-n[2])/a,t[0]=(n[1]+n[4])/a,t[1]=.25*a,t[2]=(n[6]+n[9])/a):(a=2*Math.sqrt(1+n[10]-n[0]-n[5]),t[3]=(n[1]-n[4])/a,t[0]=(n[8]+n[2])/a,t[1]=(n[6]+n[9])/a,t[2]=.25*a);return t},n.fromRotationTranslationScale=function(t,n,r,a){var e=n[0],u=n[1],o=n[2],i=n[3],s=e+e,c=u+u,f=o+o,M=e*s,h=e*c,l=e*f,v=u*c,d=u*f,b=o*f,m=i*s,p=i*c,P=i*f,A=a[0],E=a[1],O=a[2];return t[0]=(1-(v+b))*A,t[1]=(h+P)*A,t[2]=(l-p)*A,t[3]=0,t[4]=(h-P)*E,t[5]=(1-(M+b))*E,t[6]=(d+m)*E,t[7]=0,t[8]=(l+p)*O,t[9]=(d-m)*O,t[10]=(1-(M+v))*O,t[11]=0,t[12]=r[0],t[13]=r[1],t[14]=r[2],t[15]=1,t},n.fromRotationTranslationScaleOrigin=function(t,n,r,a,e){var u=n[0],o=n[1],i=n[2],s=n[3],c=u+u,f=o+o,M=i+i,h=u*c,l=u*f,v=u*M,d=o*f,b=o*M,m=i*M,p=s*c,P=s*f,A=s*M,E=a[0],O=a[1],R=a[2],y=e[0],q=e[1],x=e[2],_=(1-(d+m))*E,Y=(l+A)*E,L=(v-P)*E,S=(l-A)*O,w=(1-(h+m))*O,I=(b+p)*O,N=(v+P)*R,g=(b-p)*R,T=(1-(h+d))*R;return t[0]=_,t[1]=Y,t[2]=L,t[3]=0,t[4]=S,t[5]=w,t[6]=I,t[7]=0,t[8]=N,t[9]=g,t[10]=T,t[11]=0,t[12]=r[0]+y-(_*y+S*q+N*x),t[13]=r[1]+q-(Y*y+w*q+g*x),t[14]=r[2]+x-(L*y+I*q+T*x),t[15]=1,t},n.fromQuat=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=r+r,i=a+a,s=e+e,c=r*o,f=a*o,M=a*i,h=e*o,l=e*i,v=e*s,d=u*o,b=u*i,m=u*s;return t[0]=1-M-v,t[1]=f+m,t[2]=h-b,t[3]=0,t[4]=f-m,t[5]=1-c-v,t[6]=l+d,t[7]=0,t[8]=h+b,t[9]=l-d,t[10]=1-c-M,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},n.frustum=function(t,n,r,a,e,u,o){var i=1/(r-n),s=1/(e-a),c=1/(u-o);return t[0]=2*u*i,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=2*u*s,t[6]=0,t[7]=0,t[8]=(r+n)*i,t[9]=(e+a)*s,t[10]=(o+u)*c,t[11]=-1,t[12]=0,t[13]=0,t[14]=o*u*2*c,t[15]=0,t},n.perspective=function(t,n,r,a,e){var u=1/Math.tan(n/2),o=void 0;t[0]=u/r,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=u,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=-1,t[12]=0,t[13]=0,t[15]=0,null!=e&&e!==1/0?(o=1/(a-e),t[10]=(e+a)*o,t[14]=2*e*a*o):(t[10]=-1,t[14]=-2*a);return t},n.perspectiveFromFieldOfView=function(t,n,r,a){var e=Math.tan(n.upDegrees*Math.PI/180),u=Math.tan(n.downDegrees*Math.PI/180),o=Math.tan(n.leftDegrees*Math.PI/180),i=Math.tan(n.rightDegrees*Math.PI/180),s=2/(o+i),c=2/(e+u);return t[0]=s,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=c,t[6]=0,t[7]=0,t[8]=-(o-i)*s*.5,t[9]=(e-u)*c*.5,t[10]=a/(r-a),t[11]=-1,t[12]=0,t[13]=0,t[14]=a*r/(r-a),t[15]=0,t},n.ortho=function(t,n,r,a,e,u,o){var i=1/(n-r),s=1/(a-e),c=1/(u-o);return t[0]=-2*i,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=-2*s,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=2*c,t[11]=0,t[12]=(n+r)*i,t[13]=(e+a)*s,t[14]=(o+u)*c,t[15]=1,t},n.lookAt=function(t,n,r,u){var o=void 0,i=void 0,s=void 0,c=void 0,f=void 0,M=void 0,h=void 0,l=void 0,v=void 0,d=void 0,b=n[0],m=n[1],p=n[2],P=u[0],A=u[1],E=u[2],O=r[0],R=r[1],y=r[2];if(Math.abs(b-O)<a.EPSILON&&Math.abs(m-R)<a.EPSILON&&Math.abs(p-y)<a.EPSILON)return e(t);h=b-O,l=m-R,v=p-y,d=1/Math.sqrt(h*h+l*l+v*v),o=A*(v*=d)-E*(l*=d),i=E*(h*=d)-P*v,s=P*l-A*h,(d=Math.sqrt(o*o+i*i+s*s))?(o*=d=1/d,i*=d,s*=d):(o=0,i=0,s=0);c=l*s-v*i,f=v*o-h*s,M=h*i-l*o,(d=Math.sqrt(c*c+f*f+M*M))?(c*=d=1/d,f*=d,M*=d):(c=0,f=0,M=0);return t[0]=o,t[1]=c,t[2]=h,t[3]=0,t[4]=i,t[5]=f,t[6]=l,t[7]=0,t[8]=s,t[9]=M,t[10]=v,t[11]=0,t[12]=-(o*b+i*m+s*p),t[13]=-(c*b+f*m+M*p),t[14]=-(h*b+l*m+v*p),t[15]=1,t},n.targetTo=function(t,n,r,a){var e=n[0],u=n[1],o=n[2],i=a[0],s=a[1],c=a[2],f=e-r[0],M=u-r[1],h=o-r[2],l=f*f+M*M+h*h;l>0&&(l=1/Math.sqrt(l),f*=l,M*=l,h*=l);var v=s*h-c*M,d=c*f-i*h,b=i*M-s*f;(l=v*v+d*d+b*b)>0&&(l=1/Math.sqrt(l),v*=l,d*=l,b*=l);return t[0]=v,t[1]=d,t[2]=b,t[3]=0,t[4]=M*b-h*d,t[5]=h*v-f*b,t[6]=f*d-M*v,t[7]=0,t[8]=f,t[9]=M,t[10]=h,t[11]=0,t[12]=e,t[13]=u,t[14]=o,t[15]=1,t},n.str=function(t){return"mat4("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+", "+t[8]+", "+t[9]+", "+t[10]+", "+t[11]+", "+t[12]+", "+t[13]+", "+t[14]+", "+t[15]+")"},n.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+Math.pow(t[6],2)+Math.pow(t[7],2)+Math.pow(t[8],2)+Math.pow(t[9],2)+Math.pow(t[10],2)+Math.pow(t[11],2)+Math.pow(t[12],2)+Math.pow(t[13],2)+Math.pow(t[14],2)+Math.pow(t[15],2))},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t[4]=n[4]+r[4],t[5]=n[5]+r[5],t[6]=n[6]+r[6],t[7]=n[7]+r[7],t[8]=n[8]+r[8],t[9]=n[9]+r[9],t[10]=n[10]+r[10],t[11]=n[11]+r[11],t[12]=n[12]+r[12],t[13]=n[13]+r[13],t[14]=n[14]+r[14],t[15]=n[15]+r[15],t},n.subtract=i,n.multiplyScalar=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=n[7]*r,t[8]=n[8]*r,t[9]=n[9]*r,t[10]=n[10]*r,t[11]=n[11]*r,t[12]=n[12]*r,t[13]=n[13]*r,t[14]=n[14]*r,t[15]=n[15]*r,t},n.multiplyScalarAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t[3]=n[3]+r[3]*a,t[4]=n[4]+r[4]*a,t[5]=n[5]+r[5]*a,t[6]=n[6]+r[6]*a,t[7]=n[7]+r[7]*a,t[8]=n[8]+r[8]*a,t[9]=n[9]+r[9]*a,t[10]=n[10]+r[10]*a,t[11]=n[11]+r[11]*a,t[12]=n[12]+r[12]*a,t[13]=n[13]+r[13]*a,t[14]=n[14]+r[14]*a,t[15]=n[15]+r[15]*a,t},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]&&t[6]===n[6]&&t[7]===n[7]&&t[8]===n[8]&&t[9]===n[9]&&t[10]===n[10]&&t[11]===n[11]&&t[12]===n[12]&&t[13]===n[13]&&t[14]===n[14]&&t[15]===n[15]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=t[4],s=t[5],c=t[6],f=t[7],M=t[8],h=t[9],l=t[10],v=t[11],d=t[12],b=t[13],m=t[14],p=t[15],P=n[0],A=n[1],E=n[2],O=n[3],R=n[4],y=n[5],q=n[6],x=n[7],_=n[8],Y=n[9],L=n[10],S=n[11],w=n[12],I=n[13],N=n[14],g=n[15];return Math.abs(r-P)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(P))&&Math.abs(e-A)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(A))&&Math.abs(u-E)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(E))&&Math.abs(o-O)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(O))&&Math.abs(i-R)<=a.EPSILON*Math.max(1,Math.abs(i),Math.abs(R))&&Math.abs(s-y)<=a.EPSILON*Math.max(1,Math.abs(s),Math.abs(y))&&Math.abs(c-q)<=a.EPSILON*Math.max(1,Math.abs(c),Math.abs(q))&&Math.abs(f-x)<=a.EPSILON*Math.max(1,Math.abs(f),Math.abs(x))&&Math.abs(M-_)<=a.EPSILON*Math.max(1,Math.abs(M),Math.abs(_))&&Math.abs(h-Y)<=a.EPSILON*Math.max(1,Math.abs(h),Math.abs(Y))&&Math.abs(l-L)<=a.EPSILON*Math.max(1,Math.abs(l),Math.abs(L))&&Math.abs(v-S)<=a.EPSILON*Math.max(1,Math.abs(v),Math.abs(S))&&Math.abs(d-w)<=a.EPSILON*Math.max(1,Math.abs(d),Math.abs(w))&&Math.abs(b-I)<=a.EPSILON*Math.max(1,Math.abs(b),Math.abs(I))&&Math.abs(m-N)<=a.EPSILON*Math.max(1,Math.abs(m),Math.abs(N))&&Math.abs(p-g)<=a.EPSILON*Math.max(1,Math.abs(p),Math.abs(g))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function u(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=n[6],f=n[7],M=n[8],h=n[9],l=n[10],v=n[11],d=n[12],b=n[13],m=n[14],p=n[15],P=r[0],A=r[1],E=r[2],O=r[3];return t[0]=P*a+A*i+E*M+O*d,t[1]=P*e+A*s+E*h+O*b,t[2]=P*u+A*c+E*l+O*m,t[3]=P*o+A*f+E*v+O*p,P=r[4],A=r[5],E=r[6],O=r[7],t[4]=P*a+A*i+E*M+O*d,t[5]=P*e+A*s+E*h+O*b,t[6]=P*u+A*c+E*l+O*m,t[7]=P*o+A*f+E*v+O*p,P=r[8],A=r[9],E=r[10],O=r[11],t[8]=P*a+A*i+E*M+O*d,t[9]=P*e+A*s+E*h+O*b,t[10]=P*u+A*c+E*l+O*m,t[11]=P*o+A*f+E*v+O*p,P=r[12],A=r[13],E=r[14],O=r[15],t[12]=P*a+A*i+E*M+O*d,t[13]=P*e+A*s+E*h+O*b,t[14]=P*u+A*c+E*l+O*m,t[15]=P*o+A*f+E*v+O*p,t}function o(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=a+a,s=e+e,c=u+u,f=a*i,M=a*s,h=a*c,l=e*s,v=e*c,d=u*c,b=o*i,m=o*s,p=o*c;return t[0]=1-(l+d),t[1]=M+p,t[2]=h-m,t[3]=0,t[4]=M-p,t[5]=1-(f+d),t[6]=v+b,t[7]=0,t[8]=h+m,t[9]=v-b,t[10]=1-(f+l),t[11]=0,t[12]=r[0],t[13]=r[1],t[14]=r[2],t[15]=1,t}function i(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t[4]=n[4]-r[4],t[5]=n[5]-r[5],t[6]=n[6]-r[6],t[7]=n[7]-r[7],t[8]=n[8]-r[8],t[9]=n[9]-r[9],t[10]=n[10]-r[10],t[11]=n[11]-r[11],t[12]=n[12]-r[12],t[13]=n[13]-r[13],t[14]=n[14]-r[14],t[15]=n[15]-r[15],t}n.mul=u,n.sub=i},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.sub=n.mul=void 0,n.create=function(){var t=new a.ARRAY_TYPE(9);a.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0,t[3]=0,t[5]=0,t[6]=0,t[7]=0);return t[0]=1,t[4]=1,t[8]=1,t},n.fromMat4=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[4],t[4]=n[5],t[5]=n[6],t[6]=n[8],t[7]=n[9],t[8]=n[10],t},n.clone=function(t){var n=new a.ARRAY_TYPE(9);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n[8]=t[8],n},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t},n.fromValues=function(t,n,r,e,u,o,i,s,c){var f=new a.ARRAY_TYPE(9);return f[0]=t,f[1]=n,f[2]=r,f[3]=e,f[4]=u,f[5]=o,f[6]=i,f[7]=s,f[8]=c,f},n.set=function(t,n,r,a,e,u,o,i,s,c){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t[4]=u,t[5]=o,t[6]=i,t[7]=s,t[8]=c,t},n.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t},n.transpose=function(t,n){if(t===n){var r=n[1],a=n[2],e=n[5];t[1]=n[3],t[2]=n[6],t[3]=r,t[5]=n[7],t[6]=a,t[7]=e}else t[0]=n[0],t[1]=n[3],t[2]=n[6],t[3]=n[1],t[4]=n[4],t[5]=n[7],t[6]=n[2],t[7]=n[5],t[8]=n[8];return t},n.invert=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=n[6],c=n[7],f=n[8],M=f*o-i*c,h=-f*u+i*s,l=c*u-o*s,v=r*M+a*h+e*l;if(!v)return null;return v=1/v,t[0]=M*v,t[1]=(-f*a+e*c)*v,t[2]=(i*a-e*o)*v,t[3]=h*v,t[4]=(f*r-e*s)*v,t[5]=(-i*r+e*u)*v,t[6]=l*v,t[7]=(-c*r+a*s)*v,t[8]=(o*r-a*u)*v,t},n.adjoint=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=n[6],c=n[7],f=n[8];return t[0]=o*f-i*c,t[1]=e*c-a*f,t[2]=a*i-e*o,t[3]=i*s-u*f,t[4]=r*f-e*s,t[5]=e*u-r*i,t[6]=u*c-o*s,t[7]=a*s-r*c,t[8]=r*o-a*u,t},n.determinant=function(t){var n=t[0],r=t[1],a=t[2],e=t[3],u=t[4],o=t[5],i=t[6],s=t[7],c=t[8];return n*(c*u-o*s)+r*(-c*e+o*i)+a*(s*e-u*i)},n.multiply=e,n.translate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=n[6],f=n[7],M=n[8],h=r[0],l=r[1];return t[0]=a,t[1]=e,t[2]=u,t[3]=o,t[4]=i,t[5]=s,t[6]=h*a+l*o+c,t[7]=h*e+l*i+f,t[8]=h*u+l*s+M,t},n.rotate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=n[6],f=n[7],M=n[8],h=Math.sin(r),l=Math.cos(r);return t[0]=l*a+h*o,t[1]=l*e+h*i,t[2]=l*u+h*s,t[3]=l*o-h*a,t[4]=l*i-h*e,t[5]=l*s-h*u,t[6]=c,t[7]=f,t[8]=M,t},n.scale=function(t,n,r){var a=r[0],e=r[1];return t[0]=a*n[0],t[1]=a*n[1],t[2]=a*n[2],t[3]=e*n[3],t[4]=e*n[4],t[5]=e*n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t},n.fromTranslation=function(t,n){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=n[0],t[7]=n[1],t[8]=1,t},n.fromRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=a,t[1]=r,t[2]=0,t[3]=-r,t[4]=a,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t},n.fromScaling=function(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=0,t[4]=n[1],t[5]=0,t[6]=0,t[7]=0,t[8]=1,t},n.fromMat2d=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=0,t[3]=n[2],t[4]=n[3],t[5]=0,t[6]=n[4],t[7]=n[5],t[8]=1,t},n.fromQuat=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=r+r,i=a+a,s=e+e,c=r*o,f=a*o,M=a*i,h=e*o,l=e*i,v=e*s,d=u*o,b=u*i,m=u*s;return t[0]=1-M-v,t[3]=f-m,t[6]=h+b,t[1]=f+m,t[4]=1-c-v,t[7]=l-d,t[2]=h-b,t[5]=l+d,t[8]=1-c-M,t},n.normalFromMat4=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=n[6],c=n[7],f=n[8],M=n[9],h=n[10],l=n[11],v=n[12],d=n[13],b=n[14],m=n[15],p=r*i-a*o,P=r*s-e*o,A=r*c-u*o,E=a*s-e*i,O=a*c-u*i,R=e*c-u*s,y=f*d-M*v,q=f*b-h*v,x=f*m-l*v,_=M*b-h*d,Y=M*m-l*d,L=h*m-l*b,S=p*L-P*Y+A*_+E*x-O*q+R*y;if(!S)return null;return S=1/S,t[0]=(i*L-s*Y+c*_)*S,t[1]=(s*x-o*L-c*q)*S,t[2]=(o*Y-i*x+c*y)*S,t[3]=(e*Y-a*L-u*_)*S,t[4]=(r*L-e*x+u*q)*S,t[5]=(a*x-r*Y-u*y)*S,t[6]=(d*R-b*O+m*E)*S,t[7]=(b*A-v*R-m*P)*S,t[8]=(v*O-d*A+m*p)*S,t},n.projection=function(t,n,r){return t[0]=2/n,t[1]=0,t[2]=0,t[3]=0,t[4]=-2/r,t[5]=0,t[6]=-1,t[7]=1,t[8]=1,t},n.str=function(t){return"mat3("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+", "+t[8]+")"},n.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+Math.pow(t[6],2)+Math.pow(t[7],2)+Math.pow(t[8],2))},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t[4]=n[4]+r[4],t[5]=n[5]+r[5],t[6]=n[6]+r[6],t[7]=n[7]+r[7],t[8]=n[8]+r[8],t},n.subtract=u,n.multiplyScalar=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=n[7]*r,t[8]=n[8]*r,t},n.multiplyScalarAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t[3]=n[3]+r[3]*a,t[4]=n[4]+r[4]*a,t[5]=n[5]+r[5]*a,t[6]=n[6]+r[6]*a,t[7]=n[7]+r[7]*a,t[8]=n[8]+r[8]*a,t},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]&&t[6]===n[6]&&t[7]===n[7]&&t[8]===n[8]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=t[4],s=t[5],c=t[6],f=t[7],M=t[8],h=n[0],l=n[1],v=n[2],d=n[3],b=n[4],m=n[5],p=n[6],P=n[7],A=n[8];return Math.abs(r-h)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(h))&&Math.abs(e-l)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(l))&&Math.abs(u-v)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(v))&&Math.abs(o-d)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(d))&&Math.abs(i-b)<=a.EPSILON*Math.max(1,Math.abs(i),Math.abs(b))&&Math.abs(s-m)<=a.EPSILON*Math.max(1,Math.abs(s),Math.abs(m))&&Math.abs(c-p)<=a.EPSILON*Math.max(1,Math.abs(c),Math.abs(p))&&Math.abs(f-P)<=a.EPSILON*Math.max(1,Math.abs(f),Math.abs(P))&&Math.abs(M-A)<=a.EPSILON*Math.max(1,Math.abs(M),Math.abs(A))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=n[6],f=n[7],M=n[8],h=r[0],l=r[1],v=r[2],d=r[3],b=r[4],m=r[5],p=r[6],P=r[7],A=r[8];return t[0]=h*a+l*o+v*c,t[1]=h*e+l*i+v*f,t[2]=h*u+l*s+v*M,t[3]=d*a+b*o+m*c,t[4]=d*e+b*i+m*f,t[5]=d*u+b*s+m*M,t[6]=p*a+P*o+A*c,t[7]=p*e+P*i+A*f,t[8]=p*u+P*s+A*M,t}function u(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t[4]=n[4]-r[4],t[5]=n[5]-r[5],t[6]=n[6]-r[6],t[7]=n[7]-r[7],t[8]=n[8]-r[8],t}n.mul=e,n.sub=u},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.forEach=n.sqrLen=n.sqrDist=n.dist=n.div=n.mul=n.sub=n.len=void 0,n.create=e,n.clone=function(t){var n=new a.ARRAY_TYPE(2);return n[0]=t[0],n[1]=t[1],n},n.fromValues=function(t,n){var r=new a.ARRAY_TYPE(2);return r[0]=t,r[1]=n,r},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t},n.set=function(t,n,r){return t[0]=n,t[1]=r,t},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t},n.subtract=u,n.multiply=o,n.divide=i,n.ceil=function(t,n){return t[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t},n.floor=function(t,n){return t[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t},n.min=function(t,n,r){return t[0]=Math.min(n[0],r[0]),t[1]=Math.min(n[1],r[1]),t},n.max=function(t,n,r){return t[0]=Math.max(n[0],r[0]),t[1]=Math.max(n[1],r[1]),t},n.round=function(t,n){return t[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t},n.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t},n.scaleAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t},n.distance=s,n.squaredDistance=c,n.length=f,n.squaredLength=M,n.negate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t},n.inverse=function(t,n){return t[0]=1/n[0],t[1]=1/n[1],t},n.normalize=function(t,n){var r=n[0],a=n[1],e=r*r+a*a;e>0&&(e=1/Math.sqrt(e),t[0]=n[0]*e,t[1]=n[1]*e);return t},n.dot=function(t,n){return t[0]*n[0]+t[1]*n[1]},n.cross=function(t,n,r){var a=n[0]*r[1]-n[1]*r[0];return t[0]=t[1]=0,t[2]=a,t},n.lerp=function(t,n,r,a){var e=n[0],u=n[1];return t[0]=e+a*(r[0]-e),t[1]=u+a*(r[1]-u),t},n.random=function(t,n){n=n||1;var r=2*a.RANDOM()*Math.PI;return t[0]=Math.cos(r)*n,t[1]=Math.sin(r)*n,t},n.transformMat2=function(t,n,r){var a=n[0],e=n[1];return t[0]=r[0]*a+r[2]*e,t[1]=r[1]*a+r[3]*e,t},n.transformMat2d=function(t,n,r){var a=n[0],e=n[1];return t[0]=r[0]*a+r[2]*e+r[4],t[1]=r[1]*a+r[3]*e+r[5],t},n.transformMat3=function(t,n,r){var a=n[0],e=n[1];return t[0]=r[0]*a+r[3]*e+r[6],t[1]=r[1]*a+r[4]*e+r[7],t},n.transformMat4=function(t,n,r){var a=n[0],e=n[1];return t[0]=r[0]*a+r[4]*e+r[12],t[1]=r[1]*a+r[5]*e+r[13],t},n.rotate=function(t,n,r,a){var e=n[0]-r[0],u=n[1]-r[1],o=Math.sin(a),i=Math.cos(a);return t[0]=e*i-u*o+r[0],t[1]=e*o+u*i+r[1],t},n.angle=function(t,n){var r=t[0],a=t[1],e=n[0],u=n[1],o=r*r+a*a;o>0&&(o=1/Math.sqrt(o));var i=e*e+u*u;i>0&&(i=1/Math.sqrt(i));var s=(r*e+a*u)*o*i;return s>1?0:s<-1?Math.PI:Math.acos(s)},n.str=function(t){return"vec2("+t[0]+", "+t[1]+")"},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]},n.equals=function(t,n){var r=t[0],e=t[1],u=n[0],o=n[1];return Math.abs(r-u)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(u))&&Math.abs(e-o)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(o))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(){var t=new a.ARRAY_TYPE(2);return a.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0),t}function u(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t}function o(t,n,r){return t[0]=n[0]*r[0],t[1]=n[1]*r[1],t}function i(t,n,r){return t[0]=n[0]/r[0],t[1]=n[1]/r[1],t}function s(t,n){var r=n[0]-t[0],a=n[1]-t[1];return Math.sqrt(r*r+a*a)}function c(t,n){var r=n[0]-t[0],a=n[1]-t[1];return r*r+a*a}function f(t){var n=t[0],r=t[1];return Math.sqrt(n*n+r*r)}function M(t){var n=t[0],r=t[1];return n*n+r*r}n.len=f,n.sub=u,n.mul=o,n.div=i,n.dist=s,n.sqrDist=c,n.sqrLen=M,n.forEach=function(){var t=e();return function(n,r,a,e,u,o){var i=void 0,s=void 0;for(r||(r=2),a||(a=0),s=e?Math.min(e*r+a,n.length):n.length,i=a;i<s;i+=r)t[0]=n[i],t[1]=n[i+1],u(t,t,o),n[i]=t[0],n[i+1]=t[1];return n}}()},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.sqrLen=n.squaredLength=n.len=n.length=n.dot=n.mul=n.setReal=n.getReal=void 0,n.create=function(){var t=new a.ARRAY_TYPE(8);a.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0,t[4]=0,t[5]=0,t[6]=0,t[7]=0);return t[3]=1,t},n.clone=function(t){var n=new a.ARRAY_TYPE(8);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n},n.fromValues=function(t,n,r,e,u,o,i,s){var c=new a.ARRAY_TYPE(8);return c[0]=t,c[1]=n,c[2]=r,c[3]=e,c[4]=u,c[5]=o,c[6]=i,c[7]=s,c},n.fromRotationTranslationValues=function(t,n,r,e,u,o,i){var s=new a.ARRAY_TYPE(8);s[0]=t,s[1]=n,s[2]=r,s[3]=e;var c=.5*u,f=.5*o,M=.5*i;return s[4]=c*e+f*r-M*n,s[5]=f*e+M*t-c*r,s[6]=M*e+c*n-f*t,s[7]=-c*t-f*n-M*r,s},n.fromRotationTranslation=i,n.fromTranslation=function(t,n){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t[4]=.5*n[0],t[5]=.5*n[1],t[6]=.5*n[2],t[7]=0,t},n.fromRotation=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=0,t[5]=0,t[6]=0,t[7]=0,t},n.fromMat4=function(t,n){var r=e.create();u.getRotation(r,n);var o=new a.ARRAY_TYPE(3);return u.getTranslation(o,n),i(t,r,o),t},n.copy=s,n.identity=function(t){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t[4]=0,t[5]=0,t[6]=0,t[7]=0,t},n.set=function(t,n,r,a,e,u,o,i,s){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t[4]=u,t[5]=o,t[6]=i,t[7]=s,t},n.getDual=function(t,n){return t[0]=n[4],t[1]=n[5],t[2]=n[6],t[3]=n[7],t},n.setDual=function(t,n){return t[4]=n[0],t[5]=n[1],t[6]=n[2],t[7]=n[3],t},n.getTranslation=function(t,n){var r=n[4],a=n[5],e=n[6],u=n[7],o=-n[0],i=-n[1],s=-n[2],c=n[3];return t[0]=2*(r*c+u*o+a*s-e*i),t[1]=2*(a*c+u*i+e*o-r*s),t[2]=2*(e*c+u*s+r*i-a*o),t},n.translate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=.5*r[0],s=.5*r[1],c=.5*r[2],f=n[4],M=n[5],h=n[6],l=n[7];return t[0]=a,t[1]=e,t[2]=u,t[3]=o,t[4]=o*i+e*c-u*s+f,t[5]=o*s+u*i-a*c+M,t[6]=o*c+a*s-e*i+h,t[7]=-a*i-e*s-u*c+l,t},n.rotateX=function(t,n,r){var a=-n[0],u=-n[1],o=-n[2],i=n[3],s=n[4],c=n[5],f=n[6],M=n[7],h=s*i+M*a+c*o-f*u,l=c*i+M*u+f*a-s*o,v=f*i+M*o+s*u-c*a,d=M*i-s*a-c*u-f*o;return e.rotateX(t,n,r),a=t[0],u=t[1],o=t[2],i=t[3],t[4]=h*i+d*a+l*o-v*u,t[5]=l*i+d*u+v*a-h*o,t[6]=v*i+d*o+h*u-l*a,t[7]=d*i-h*a-l*u-v*o,t},n.rotateY=function(t,n,r){var a=-n[0],u=-n[1],o=-n[2],i=n[3],s=n[4],c=n[5],f=n[6],M=n[7],h=s*i+M*a+c*o-f*u,l=c*i+M*u+f*a-s*o,v=f*i+M*o+s*u-c*a,d=M*i-s*a-c*u-f*o;return e.rotateY(t,n,r),a=t[0],u=t[1],o=t[2],i=t[3],t[4]=h*i+d*a+l*o-v*u,t[5]=l*i+d*u+v*a-h*o,t[6]=v*i+d*o+h*u-l*a,t[7]=d*i-h*a-l*u-v*o,t},n.rotateZ=function(t,n,r){var a=-n[0],u=-n[1],o=-n[2],i=n[3],s=n[4],c=n[5],f=n[6],M=n[7],h=s*i+M*a+c*o-f*u,l=c*i+M*u+f*a-s*o,v=f*i+M*o+s*u-c*a,d=M*i-s*a-c*u-f*o;return e.rotateZ(t,n,r),a=t[0],u=t[1],o=t[2],i=t[3],t[4]=h*i+d*a+l*o-v*u,t[5]=l*i+d*u+v*a-h*o,t[6]=v*i+d*o+h*u-l*a,t[7]=d*i-h*a-l*u-v*o,t},n.rotateByQuatAppend=function(t,n,r){var a=r[0],e=r[1],u=r[2],o=r[3],i=n[0],s=n[1],c=n[2],f=n[3];return t[0]=i*o+f*a+s*u-c*e,t[1]=s*o+f*e+c*a-i*u,t[2]=c*o+f*u+i*e-s*a,t[3]=f*o-i*a-s*e-c*u,i=n[4],s=n[5],c=n[6],f=n[7],t[4]=i*o+f*a+s*u-c*e,t[5]=s*o+f*e+c*a-i*u,t[6]=c*o+f*u+i*e-s*a,t[7]=f*o-i*a-s*e-c*u,t},n.rotateByQuatPrepend=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=r[0],s=r[1],c=r[2],f=r[3];return t[0]=a*f+o*i+e*c-u*s,t[1]=e*f+o*s+u*i-a*c,t[2]=u*f+o*c+a*s-e*i,t[3]=o*f-a*i-e*s-u*c,i=r[4],s=r[5],c=r[6],f=r[7],t[4]=a*f+o*i+e*c-u*s,t[5]=e*f+o*s+u*i-a*c,t[6]=u*f+o*c+a*s-e*i,t[7]=o*f-a*i-e*s-u*c,t},n.rotateAroundAxis=function(t,n,r,e){if(Math.abs(e)<a.EPSILON)return s(t,n);var u=Math.sqrt(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]);e*=.5;var o=Math.sin(e),i=o*r[0]/u,c=o*r[1]/u,f=o*r[2]/u,M=Math.cos(e),h=n[0],l=n[1],v=n[2],d=n[3];t[0]=h*M+d*i+l*f-v*c,t[1]=l*M+d*c+v*i-h*f,t[2]=v*M+d*f+h*c-l*i,t[3]=d*M-h*i-l*c-v*f;var b=n[4],m=n[5],p=n[6],P=n[7];return t[4]=b*M+P*i+m*f-p*c,t[5]=m*M+P*c+p*i-b*f,t[6]=p*M+P*f+b*c-m*i,t[7]=P*M-b*i-m*c-p*f,t},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t[4]=n[4]+r[4],t[5]=n[5]+r[5],t[6]=n[6]+r[6],t[7]=n[7]+r[7],t},n.multiply=c,n.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=n[7]*r,t},n.lerp=function(t,n,r,a){var e=1-a;f(n,r)<0&&(a=-a);return t[0]=n[0]*e+r[0]*a,t[1]=n[1]*e+r[1]*a,t[2]=n[2]*e+r[2]*a,t[3]=n[3]*e+r[3]*a,t[4]=n[4]*e+r[4]*a,t[5]=n[5]*e+r[5]*a,t[6]=n[6]*e+r[6]*a,t[7]=n[7]*e+r[7]*a,t},n.invert=function(t,n){var r=h(n);return t[0]=-n[0]/r,t[1]=-n[1]/r,t[2]=-n[2]/r,t[3]=n[3]/r,t[4]=-n[4]/r,t[5]=-n[5]/r,t[6]=-n[6]/r,t[7]=n[7]/r,t},n.conjugate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=n[3],t[4]=-n[4],t[5]=-n[5],t[6]=-n[6],t[7]=n[7],t},n.normalize=function(t,n){var r=h(n);if(r>0){r=Math.sqrt(r);var a=n[0]/r,e=n[1]/r,u=n[2]/r,o=n[3]/r,i=n[4],s=n[5],c=n[6],f=n[7],M=a*i+e*s+u*c+o*f;t[0]=a,t[1]=e,t[2]=u,t[3]=o,t[4]=(i-a*M)/r,t[5]=(s-e*M)/r,t[6]=(c-u*M)/r,t[7]=(f-o*M)/r}return t},n.str=function(t){return"quat2("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+")"},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]&&t[6]===n[6]&&t[7]===n[7]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=t[4],s=t[5],c=t[6],f=t[7],M=n[0],h=n[1],l=n[2],v=n[3],d=n[4],b=n[5],m=n[6],p=n[7];return Math.abs(r-M)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(M))&&Math.abs(e-h)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(h))&&Math.abs(u-l)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(l))&&Math.abs(o-v)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(v))&&Math.abs(i-d)<=a.EPSILON*Math.max(1,Math.abs(i),Math.abs(d))&&Math.abs(s-b)<=a.EPSILON*Math.max(1,Math.abs(s),Math.abs(b))&&Math.abs(c-m)<=a.EPSILON*Math.max(1,Math.abs(c),Math.abs(m))&&Math.abs(f-p)<=a.EPSILON*Math.max(1,Math.abs(f),Math.abs(p))};var a=o(r(0)),e=o(r(3)),u=o(r(4));function o(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}function i(t,n,r){var a=.5*r[0],e=.5*r[1],u=.5*r[2],o=n[0],i=n[1],s=n[2],c=n[3];return t[0]=o,t[1]=i,t[2]=s,t[3]=c,t[4]=a*c+e*s-u*i,t[5]=e*c+u*o-a*s,t[6]=u*c+a*i-e*o,t[7]=-a*o-e*i-u*s,t}function s(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t}n.getReal=e.copy;n.setReal=e.copy;function c(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=r[4],s=r[5],c=r[6],f=r[7],M=n[4],h=n[5],l=n[6],v=n[7],d=r[0],b=r[1],m=r[2],p=r[3];return t[0]=a*p+o*d+e*m-u*b,t[1]=e*p+o*b+u*d-a*m,t[2]=u*p+o*m+a*b-e*d,t[3]=o*p-a*d-e*b-u*m,t[4]=a*f+o*i+e*c-u*s+M*p+v*d+h*m-l*b,t[5]=e*f+o*s+u*i-a*c+h*p+v*b+l*d-M*m,t[6]=u*f+o*c+a*s-e*i+l*p+v*m+M*b-h*d,t[7]=o*f-a*i-e*s-u*c+v*p-M*d-h*b-l*m,t}n.mul=c;var f=n.dot=e.dot;var M=n.length=e.length,h=(n.len=M,n.squaredLength=e.squaredLength);n.sqrLen=h},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.sub=n.mul=void 0,n.create=function(){var t=new a.ARRAY_TYPE(6);a.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0,t[4]=0,t[5]=0);return t[0]=1,t[3]=1,t},n.clone=function(t){var n=new a.ARRAY_TYPE(6);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t},n.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=0,t[5]=0,t},n.fromValues=function(t,n,r,e,u,o){var i=new a.ARRAY_TYPE(6);return i[0]=t,i[1]=n,i[2]=r,i[3]=e,i[4]=u,i[5]=o,i},n.set=function(t,n,r,a,e,u,o){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t[4]=u,t[5]=o,t},n.invert=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=n[4],i=n[5],s=r*u-a*e;if(!s)return null;return s=1/s,t[0]=u*s,t[1]=-a*s,t[2]=-e*s,t[3]=r*s,t[4]=(e*i-u*o)*s,t[5]=(a*o-r*i)*s,t},n.determinant=function(t){return t[0]*t[3]-t[1]*t[2]},n.multiply=e,n.rotate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=Math.sin(r),f=Math.cos(r);return t[0]=a*f+u*c,t[1]=e*f+o*c,t[2]=a*-c+u*f,t[3]=e*-c+o*f,t[4]=i,t[5]=s,t},n.scale=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=r[0],f=r[1];return t[0]=a*c,t[1]=e*c,t[2]=u*f,t[3]=o*f,t[4]=i,t[5]=s,t},n.translate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=r[0],f=r[1];return t[0]=a,t[1]=e,t[2]=u,t[3]=o,t[4]=a*c+u*f+i,t[5]=e*c+o*f+s,t},n.fromRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=a,t[1]=r,t[2]=-r,t[3]=a,t[4]=0,t[5]=0,t},n.fromScaling=function(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=n[1],t[4]=0,t[5]=0,t},n.fromTranslation=function(t,n){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=n[0],t[5]=n[1],t},n.str=function(t){return"mat2d("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+")"},n.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+1)},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t[4]=n[4]+r[4],t[5]=n[5]+r[5],t},n.subtract=u,n.multiplyScalar=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t[4]=n[4]*r,t[5]=n[5]*r,t},n.multiplyScalarAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t[3]=n[3]+r[3]*a,t[4]=n[4]+r[4]*a,t[5]=n[5]+r[5]*a,t},n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=t[4],s=t[5],c=n[0],f=n[1],M=n[2],h=n[3],l=n[4],v=n[5];return Math.abs(r-c)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(c))&&Math.abs(e-f)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(f))&&Math.abs(u-M)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(M))&&Math.abs(o-h)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(h))&&Math.abs(i-l)<=a.EPSILON*Math.max(1,Math.abs(i),Math.abs(l))&&Math.abs(s-v)<=a.EPSILON*Math.max(1,Math.abs(s),Math.abs(v))};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=n[4],s=n[5],c=r[0],f=r[1],M=r[2],h=r[3],l=r[4],v=r[5];return t[0]=a*c+u*f,t[1]=e*c+o*f,t[2]=a*M+u*h,t[3]=e*M+o*h,t[4]=a*l+u*v+i,t[5]=e*l+o*v+s,t}function u(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t[4]=n[4]-r[4],t[5]=n[5]-r[5],t}n.mul=e,n.sub=u},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.sub=n.mul=void 0,n.create=function(){var t=new a.ARRAY_TYPE(4);a.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0);return t[0]=1,t[3]=1,t},n.clone=function(t){var n=new a.ARRAY_TYPE(4);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n},n.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t},n.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t},n.fromValues=function(t,n,r,e){var u=new a.ARRAY_TYPE(4);return u[0]=t,u[1]=n,u[2]=r,u[3]=e,u},n.set=function(t,n,r,a,e){return t[0]=n,t[1]=r,t[2]=a,t[3]=e,t},n.transpose=function(t,n){if(t===n){var r=n[1];t[1]=n[2],t[2]=r}else t[0]=n[0],t[1]=n[2],t[2]=n[1],t[3]=n[3];return t},n.invert=function(t,n){var r=n[0],a=n[1],e=n[2],u=n[3],o=r*u-e*a;if(!o)return null;return o=1/o,t[0]=u*o,t[1]=-a*o,t[2]=-e*o,t[3]=r*o,t},n.adjoint=function(t,n){var r=n[0];return t[0]=n[3],t[1]=-n[1],t[2]=-n[2],t[3]=r,t},n.determinant=function(t){return t[0]*t[3]-t[2]*t[1]},n.multiply=e,n.rotate=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=Math.sin(r),s=Math.cos(r);return t[0]=a*s+u*i,t[1]=e*s+o*i,t[2]=a*-i+u*s,t[3]=e*-i+o*s,t},n.scale=function(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=r[0],s=r[1];return t[0]=a*i,t[1]=e*i,t[2]=u*s,t[3]=o*s,t},n.fromRotation=function(t,n){var r=Math.sin(n),a=Math.cos(n);return t[0]=a,t[1]=r,t[2]=-r,t[3]=a,t},n.fromScaling=function(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=n[1],t},n.str=function(t){return"mat2("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"},n.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2))},n.LDU=function(t,n,r,a){return t[2]=a[2]/a[0],r[0]=a[0],r[1]=a[1],r[3]=a[3]-t[2]*r[1],[t,n,r]},n.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t},n.subtract=u,n.exactEquals=function(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]},n.equals=function(t,n){var r=t[0],e=t[1],u=t[2],o=t[3],i=n[0],s=n[1],c=n[2],f=n[3];return Math.abs(r-i)<=a.EPSILON*Math.max(1,Math.abs(r),Math.abs(i))&&Math.abs(e-s)<=a.EPSILON*Math.max(1,Math.abs(e),Math.abs(s))&&Math.abs(u-c)<=a.EPSILON*Math.max(1,Math.abs(u),Math.abs(c))&&Math.abs(o-f)<=a.EPSILON*Math.max(1,Math.abs(o),Math.abs(f))},n.multiplyScalar=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t},n.multiplyScalarAndAdd=function(t,n,r,a){return t[0]=n[0]+r[0]*a,t[1]=n[1]+r[1]*a,t[2]=n[2]+r[2]*a,t[3]=n[3]+r[3]*a,t};var a=function(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}(r(0));function e(t,n,r){var a=n[0],e=n[1],u=n[2],o=n[3],i=r[0],s=r[1],c=r[2],f=r[3];return t[0]=a*i+u*s,t[1]=e*i+o*s,t[2]=a*c+u*f,t[3]=e*c+o*f,t}function u(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t}n.mul=e,n.sub=u},function(t,n,r){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.vec4=n.vec3=n.vec2=n.quat2=n.quat=n.mat4=n.mat3=n.mat2d=n.mat2=n.glMatrix=void 0;var a=l(r(0)),e=l(r(9)),u=l(r(8)),o=l(r(5)),i=l(r(4)),s=l(r(3)),c=l(r(7)),f=l(r(6)),M=l(r(2)),h=l(r(1));function l(t){if(t&&t.__esModule)return t;var n={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n.default=t,n}n.glMatrix=a,n.mat2=e,n.mat2d=u,n.mat3=o,n.mat4=i,n.quat=s,n.quat2=c,n.vec2=f,n.vec3=M,n.vec4=h}])});
},{}],6:[function(require,module,exports){
module.exports = function(strings) {
  if (typeof strings === 'string') strings = [strings]
  var exprs = [].slice.call(arguments,1)
  var parts = []
  for (var i = 0; i < strings.length-1; i++) {
    parts.push(strings[i], exprs[i] || '')
  }
  parts.push(strings[i])
  return parts.join('')
}

},{}],7:[function(require,module,exports){
'use strict';

var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = require('./shams');

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

},{"./shams":8}],8:[function(require,module,exports){
'use strict';

/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

},{}],9:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  if (!fn) {
    return false
  }
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],10:[function(require,module,exports){
'use strict';

module.exports = function (obj) {

  return obj == null;
};

},{}],11:[function(require,module,exports){
'use strict';

module.exports = function isObject(x) {
	return typeof x === 'object' && x !== null;
};

},{}],12:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;
var hasSymbols = require('has-symbols')();

if (hasSymbols) {
	var symToStr = Symbol.prototype.toString;
	var symStringRegex = /^Symbol\(.*\)$/;
	var isSymbolObject = function isRealSymbolObject(value) {
		if (typeof value.valueOf() !== 'symbol') {
			return false;
		}
		return symStringRegex.test(symToStr.call(value));
	};

	module.exports = function isSymbol(value) {
		if (typeof value === 'symbol') {
			return true;
		}
		if (toStr.call(value) !== '[object Symbol]') {
			return false;
		}
		try {
			return isSymbolObject(value);
		} catch (e) {
			return false;
		}
	};
} else {

	module.exports = function isSymbol(value) {
		// this environment does not support Symbols.
		return false && value;
	};
}

},{"has-symbols":7}],13:[function(require,module,exports){
'use strict';

module.exports = 9007199254740991;

},{}],14:[function(require,module,exports){
'use strict';

var isNil         = require('is-nil');
var isObject      = require('is-object');
var toString      = require('to-str');
var randomNatural = require('random-natural');

var pools = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  number: '0123456789',
  symbol: '~!@#$%^&()*_+-={}[]'
};

pools.alpha  = pools.lower + pools.upper;
pools['all'] = pools.lower + pools.upper + pools.number + pools.symbol;

module.exports = function (options) {

  if (!isObject(options)) {
    if (isNil(options)) {
      options = { pool: pools.all };
    } else {
      options = toString(options);
      options = { pool: pools[options] || options };
    }
  }

  var pool;

  if (options.pool) {
    pool = options.pool;
  } else if (options.lower) {
    pool = pools.lower;
  } else if (options.upper) {
    pool = pools.upper;
  } else if (options.alpha) {
    pool = pools.alpha;
  } else if (options.number) {
    pool = pools.number;
  } else if (options.symbol) {
    pool = pools.symbol;
  } else {
    pool = pools.all;
  }

  pool = toString(pool);

  return pool.charAt(randomNatural({
    min: 0,
    max: pool.length - 1,
    inspected: true
  }));
};

},{"is-nil":10,"is-object":11,"random-natural":17,"to-str":30}],15:[function(require,module,exports){
'use strict';

var clamp        = require('clamp');
var toInteger    = require('to-integer');
var MAX_SAFE_INT = require('max-safe-int');
var MIN_SAFE_INT = -MAX_SAFE_INT;

function fixme(val, min, max, isMin) {

  if (typeof val !== 'number') {
    val = toInteger(val);
  }

  if (isNaN(val) || !isFinite(val)) {
    return isMin ? min : max;
  }

  return clamp(val, min, max);
}

module.exports = function (options) {

  if (options) {
    // for speed up
    if (!options.inspected) {
      options.min = fixme(options.min, MIN_SAFE_INT, MAX_SAFE_INT, true);
      options.max = fixme(options.max, MIN_SAFE_INT, MAX_SAFE_INT, false);
    }
  } else {
    options = {
      min: MIN_SAFE_INT,
      max: MAX_SAFE_INT
    };
  }

  var min = options.min;
  var max = options.max;

  // swap to variables
  // ref: http://stackoverflow.com/a/16201688
  if (min > max) {
    min = min ^ max;
    max = min ^ max;
    min = min ^ max;
  }

  return Math.round(Math.random() * (max - min)) + min;
};

module.exports.fixme = fixme;

},{"clamp":3,"max-safe-int":13,"to-integer":29}],16:[function(require,module,exports){
'use strict';

var clamp          = require('clamp');
var randomNatural  = require('random-natural');
var randomSyllable = require('random-syllable');

var MIN_LEN = 2;
var MAX_LEN = 18;

module.exports = function (options) {

  options = options || {
      syllables: randomNatural({
        min: 1,
        max: 3,
        inspected: true
      })
    };

  var length    = options.length;
  var syllables = options.syllables;

  var result = '';

  if (syllables) {
    for (var i = 0; i < syllables; i++) {
      result += randomSyllable();
    }

    return result.substring(0, MAX_LEN);
  }


  if (!length && ( options.min || options.max)) {
    length = randomNatural({
      min: options.min || MIN_LEN,
      max: options.max || MAX_LEN
    });
  }

  length = length || randomNatural({
      min: MIN_LEN,
      max: MAX_LEN,
      inspected: true
    });


  length = clamp(length, MIN_LEN, MAX_LEN);


  while (result.length < length) {
    result += randomSyllable();
  }

  return result.substring(0, length);
};

},{"clamp":3,"random-natural":17,"random-syllable":18}],17:[function(require,module,exports){
'use strict';

var randomInt    = require('random-integral');
var MAX_SAFE_INT = require('max-safe-int');

module.exports = function (options) {

  if (options) {
    if (!options.inspected) {
      options.min = randomInt.fixme(options.min, 0, MAX_SAFE_INT, true);
      options.max = randomInt.fixme(options.max, 0, MAX_SAFE_INT, false);
    }
  } else {
    options = {
      min: 0,
      max: MAX_SAFE_INT
    };
  }

  options.inspected = true;

  return randomInt(options);
};

module.exports.fixme = randomInt.fixme;

},{"max-safe-int":13,"random-integral":15}],18:[function(require,module,exports){
'use strict';

var clamp         = require('clamp');
var isObject      = require('is-object');
var toInteger     = require('to-integer');
var randomChar    = require('random-char');
var randomNatural = require('random-natural');

module.exports = function (options) {

  var length = isObject(options)
    ? options.length
    : options;

  if (length) {
    length = toInteger(length);
    length = clamp(length, 2, 3);
  } else {
    length = randomNatural({ min: 2, max: 3 });
  }

  var consonants = 'bcdfghjklmnprstvwz'; // consonants except hard to speak ones
  var vowels = 'aeiou';                  // vowels
  var all = consonants + vowels;         // all

  var text = '';
  var char;

  for (var i = 0; i < length; i++) {
    if (i === 0) {
      // First character can be anything
      char = randomChar({ pool: all });
    } else if (consonants.indexOf(char) === -1) {
      // Last character was a vowel, now we want a consonant
      char = randomChar({ pool: consonants });
    } else {
      // Last character was a consonant, now we want a vowel
      char = randomChar({ pool: vowels });
    }

    text += char;
  }

  return text;
};

},{"clamp":3,"is-object":11,"random-char":14,"random-natural":17,"to-integer":29}],19:[function(require,module,exports){
(function(U,X){"object"===typeof exports&&"undefined"!==typeof module?module.exports=X():"function"===typeof define&&define.amd?define(X):U.createREGL=X()})(this,function(){function U(a,b){this.id=Eb++;this.type=a;this.data=b}function X(a){if(0===a.length)return[];var b=a.charAt(0),c=a.charAt(a.length-1);if(1<a.length&&b===c&&('"'===b||"'"===b))return['"'+a.substr(1,a.length-2).replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"'];if(b=/\[(false|true|null|\d+|'[^']*'|"[^"]*")\]/.exec(a))return X(a.substr(0,
b.index)).concat(X(b[1])).concat(X(a.substr(b.index+b[0].length)));b=a.split(".");if(1===b.length)return['"'+a.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"'];a=[];for(c=0;c<b.length;++c)a=a.concat(X(b[c]));return a}function cb(a){return"["+X(a).join("][")+"]"}function db(a,b){if("function"===typeof a)return new U(0,a);if("number"===typeof a||"boolean"===typeof a)return new U(5,a);if(Array.isArray(a))return new U(6,a.map(function(a,e){return db(a,b+"["+e+"]")}));if(a instanceof U)return a}function Fb(){var a=
{"":0},b=[""];return{id:function(c){var e=a[c];if(e)return e;e=a[c]=b.length;b.push(c);return e},str:function(a){return b[a]}}}function Gb(a,b,c){function e(){var b=window.innerWidth,e=window.innerHeight;a!==document.body&&(e=a.getBoundingClientRect(),b=e.right-e.left,e=e.bottom-e.top);f.width=c*b;f.height=c*e;A(f.style,{width:b+"px",height:e+"px"})}var f=document.createElement("canvas");A(f.style,{border:0,margin:0,padding:0,top:0,left:0});a.appendChild(f);a===document.body&&(f.style.position="absolute",
A(a.style,{margin:0,padding:0}));var d;a!==document.body&&"function"===typeof ResizeObserver?(d=new ResizeObserver(function(){setTimeout(e)}),d.observe(a)):window.addEventListener("resize",e,!1);e();return{canvas:f,onDestroy:function(){d?d.disconnect():window.removeEventListener("resize",e);a.removeChild(f)}}}function Hb(a,b){function c(c){try{return a.getContext(c,b)}catch(f){return null}}return c("webgl")||c("experimental-webgl")||c("webgl-experimental")}function eb(a){return"string"===typeof a?
a.split():a}function fb(a){return"string"===typeof a?document.querySelector(a):a}function Ib(a){var b=a||{},c,e,f,d;a={};var p=[],n=[],u="undefined"===typeof window?1:window.devicePixelRatio,t=!1,w=function(a){},k=function(){};"string"===typeof b?c=document.querySelector(b):"object"===typeof b&&("string"===typeof b.nodeName&&"function"===typeof b.appendChild&&"function"===typeof b.getBoundingClientRect?c=b:"function"===typeof b.drawArrays||"function"===typeof b.drawElements?(d=b,f=d.canvas):("gl"in
b?d=b.gl:"canvas"in b?f=fb(b.canvas):"container"in b&&(e=fb(b.container)),"attributes"in b&&(a=b.attributes),"extensions"in b&&(p=eb(b.extensions)),"optionalExtensions"in b&&(n=eb(b.optionalExtensions)),"onDone"in b&&(w=b.onDone),"profile"in b&&(t=!!b.profile),"pixelRatio"in b&&(u=+b.pixelRatio)));c&&("canvas"===c.nodeName.toLowerCase()?f=c:e=c);if(!d){if(!f){c=Gb(e||document.body,w,u);if(!c)return null;f=c.canvas;k=c.onDestroy}void 0===a.premultipliedAlpha&&(a.premultipliedAlpha=!0);d=Hb(f,a)}return d?
{gl:d,canvas:f,container:e,extensions:p,optionalExtensions:n,pixelRatio:u,profile:t,onDone:w,onDestroy:k}:(k(),w("webgl not supported, try upgrading your browser or graphics drivers http://get.webgl.org"),null)}function Jb(a,b){function c(b){b=b.toLowerCase();var c;try{c=e[b]=a.getExtension(b)}catch(f){}return!!c}for(var e={},f=0;f<b.extensions.length;++f){var d=b.extensions[f];if(!c(d))return b.onDestroy(),b.onDone('"'+d+'" extension is not supported by the current WebGL context, try upgrading your system or a different browser'),
null}b.optionalExtensions.forEach(c);return{extensions:e,restore:function(){Object.keys(e).forEach(function(a){if(e[a]&&!c(a))throw Error("(regl): error restoring extension "+a);})}}}function J(a,b){for(var c=Array(a),e=0;e<a;++e)c[e]=b(e);return c}function gb(a){var b,c;b=(65535<a)<<4;a>>>=b;c=(255<a)<<3;a>>>=c;b|=c;c=(15<a)<<2;a>>>=c;b|=c;c=(3<a)<<1;return b|c|a>>>c>>1}function hb(){function a(a){a:{for(var b=16;268435456>=b;b*=16)if(a<=b){a=b;break a}a=0}b=c[gb(a)>>2];return 0<b.length?b.pop():
new ArrayBuffer(a)}function b(a){c[gb(a.byteLength)>>2].push(a)}var c=J(8,function(){return[]});return{alloc:a,free:b,allocType:function(b,c){var d=null;switch(b){case 5120:d=new Int8Array(a(c),0,c);break;case 5121:d=new Uint8Array(a(c),0,c);break;case 5122:d=new Int16Array(a(2*c),0,c);break;case 5123:d=new Uint16Array(a(2*c),0,c);break;case 5124:d=new Int32Array(a(4*c),0,c);break;case 5125:d=new Uint32Array(a(4*c),0,c);break;case 5126:d=new Float32Array(a(4*c),0,c);break;default:return null}return d.length!==
c?d.subarray(0,c):d},freeType:function(a){b(a.buffer)}}}function da(a){return!!a&&"object"===typeof a&&Array.isArray(a.shape)&&Array.isArray(a.stride)&&"number"===typeof a.offset&&a.shape.length===a.stride.length&&(Array.isArray(a.data)||M(a.data))}function ib(a,b,c,e,f,d){for(var p=0;p<b;++p)for(var n=a[p],u=0;u<c;++u)for(var t=n[u],w=0;w<e;++w)f[d++]=t[w]}function jb(a,b,c,e,f){for(var d=1,p=c+1;p<b.length;++p)d*=b[p];var n=b[c];if(4===b.length-c){var u=b[c+1],t=b[c+2];b=b[c+3];for(p=0;p<n;++p)ib(a[p],
u,t,b,e,f),f+=d}else for(p=0;p<n;++p)jb(a[p],b,c+1,e,f),f+=d}function Fa(a){return Ga[Object.prototype.toString.call(a)]|0}function kb(a,b){for(var c=0;c<b.length;++c)a[c]=b[c]}function lb(a,b,c,e,f,d,p){for(var n=0,u=0;u<c;++u)for(var t=0;t<e;++t)a[n++]=b[f*u+d*t+p]}function Kb(a,b,c,e){function f(b){this.id=u++;this.buffer=a.createBuffer();this.type=b;this.usage=35044;this.byteLength=0;this.dimension=1;this.dtype=5121;this.persistentData=null;c.profile&&(this.stats={size:0})}function d(b,c,l){b.byteLength=
c.byteLength;a.bufferData(b.type,c,l)}function p(a,b,c,h,g,q){a.usage=c;if(Array.isArray(b)){if(a.dtype=h||5126,0<b.length)if(Array.isArray(b[0])){g=mb(b);for(var r=h=1;r<g.length;++r)h*=g[r];a.dimension=h;b=Sa(b,g,a.dtype);d(a,b,c);q?a.persistentData=b:E.freeType(b)}else"number"===typeof b[0]?(a.dimension=g,g=E.allocType(a.dtype,b.length),kb(g,b),d(a,g,c),q?a.persistentData=g:E.freeType(g)):M(b[0])&&(a.dimension=b[0].length,a.dtype=h||Fa(b[0])||5126,b=Sa(b,[b.length,b[0].length],a.dtype),d(a,b,c),
q?a.persistentData=b:E.freeType(b))}else if(M(b))a.dtype=h||Fa(b),a.dimension=g,d(a,b,c),q&&(a.persistentData=new Uint8Array(new Uint8Array(b.buffer)));else if(da(b)){g=b.shape;var m=b.stride,r=b.offset,e=0,f=0,t=0,n=0;1===g.length?(e=g[0],f=1,t=m[0],n=0):2===g.length&&(e=g[0],f=g[1],t=m[0],n=m[1]);a.dtype=h||Fa(b.data)||5126;a.dimension=f;g=E.allocType(a.dtype,e*f);lb(g,b.data,e,f,t,n,r);d(a,g,c);q?a.persistentData=g:E.freeType(g)}else b instanceof ArrayBuffer&&(a.dtype=5121,a.dimension=g,d(a,b,
c),q&&(a.persistentData=new Uint8Array(new Uint8Array(b))))}function n(c){b.bufferCount--;e(c);a.deleteBuffer(c.buffer);c.buffer=null;delete t[c.id]}var u=0,t={};f.prototype.bind=function(){a.bindBuffer(this.type,this.buffer)};f.prototype.destroy=function(){n(this)};var w=[];c.profile&&(b.getTotalBufferSize=function(){var a=0;Object.keys(t).forEach(function(b){a+=t[b].stats.size});return a});return{create:function(k,e,d,h){function g(b){var m=35044,k=null,e=0,d=0,f=1;Array.isArray(b)||M(b)||da(b)||
b instanceof ArrayBuffer?k=b:"number"===typeof b?e=b|0:b&&("data"in b&&(k=b.data),"usage"in b&&(m=ob[b.usage]),"type"in b&&(d=Ia[b.type]),"dimension"in b&&(f=b.dimension|0),"length"in b&&(e=b.length|0));q.bind();k?p(q,k,m,d,f,h):(e&&a.bufferData(q.type,e,m),q.dtype=d||5121,q.usage=m,q.dimension=f,q.byteLength=e);c.profile&&(q.stats.size=q.byteLength*ha[q.dtype]);return g}b.bufferCount++;var q=new f(e);t[q.id]=q;d||g(k);g._reglType="buffer";g._buffer=q;g.subdata=function(b,c){var k=(c||0)|0,e;q.bind();
if(M(b)||b instanceof ArrayBuffer)a.bufferSubData(q.type,k,b);else if(Array.isArray(b)){if(0<b.length)if("number"===typeof b[0]){var h=E.allocType(q.dtype,b.length);kb(h,b);a.bufferSubData(q.type,k,h);E.freeType(h)}else if(Array.isArray(b[0])||M(b[0]))e=mb(b),h=Sa(b,e,q.dtype),a.bufferSubData(q.type,k,h),E.freeType(h)}else if(da(b)){e=b.shape;var d=b.stride,f=h=0,l=0,O=0;1===e.length?(h=e[0],f=1,l=d[0],O=0):2===e.length&&(h=e[0],f=e[1],l=d[0],O=d[1]);e=Array.isArray(b.data)?q.dtype:Fa(b.data);e=E.allocType(e,
h*f);lb(e,b.data,h,f,l,O,b.offset);a.bufferSubData(q.type,k,e);E.freeType(e)}return g};c.profile&&(g.stats=q.stats);g.destroy=function(){n(q)};return g},createStream:function(a,b){var c=w.pop();c||(c=new f(a));c.bind();p(c,b,35040,0,1,!1);return c},destroyStream:function(a){w.push(a)},clear:function(){S(t).forEach(n);w.forEach(n)},getBuffer:function(a){return a&&a._buffer instanceof f?a._buffer:null},restore:function(){S(t).forEach(function(b){b.buffer=a.createBuffer();a.bindBuffer(b.type,b.buffer);
a.bufferData(b.type,b.persistentData||b.byteLength,b.usage)})},_initBuffer:p}}function Lb(a,b,c,e){function f(a){this.id=u++;n[this.id]=this;this.buffer=a;this.primType=4;this.type=this.vertCount=0}function d(e,d,f,h,g,q,r){e.buffer.bind();var m;d?((m=r)||M(d)&&(!da(d)||M(d.data))||(m=b.oes_element_index_uint?5125:5123),c._initBuffer(e.buffer,d,f,m,3)):(a.bufferData(34963,q,f),e.buffer.dtype=m||5121,e.buffer.usage=f,e.buffer.dimension=3,e.buffer.byteLength=q);m=r;if(!r){switch(e.buffer.dtype){case 5121:case 5120:m=
5121;break;case 5123:case 5122:m=5123;break;case 5125:case 5124:m=5125}e.buffer.dtype=m}e.type=m;d=g;0>d&&(d=e.buffer.byteLength,5123===m?d>>=1:5125===m&&(d>>=2));e.vertCount=d;d=h;0>h&&(d=4,h=e.buffer.dimension,1===h&&(d=0),2===h&&(d=1),3===h&&(d=4));e.primType=d}function p(a){e.elementsCount--;delete n[a.id];a.buffer.destroy();a.buffer=null}var n={},u=0,t={uint8:5121,uint16:5123};b.oes_element_index_uint&&(t.uint32=5125);f.prototype.bind=function(){this.buffer.bind()};var w=[];return{create:function(a,
b){function l(a){if(a)if("number"===typeof a)h(a),g.primType=4,g.vertCount=a|0,g.type=5121;else{var b=null,c=35044,e=-1,f=-1,k=0,n=0;if(Array.isArray(a)||M(a)||da(a))b=a;else if("data"in a&&(b=a.data),"usage"in a&&(c=ob[a.usage]),"primitive"in a&&(e=Ta[a.primitive]),"count"in a&&(f=a.count|0),"type"in a&&(n=t[a.type]),"length"in a)k=a.length|0;else if(k=f,5123===n||5122===n)k*=2;else if(5125===n||5124===n)k*=4;d(g,b,c,e,f,k,n)}else h(),g.primType=4,g.vertCount=0,g.type=5121;return l}var h=c.create(null,
34963,!0),g=new f(h._buffer);e.elementsCount++;l(a);l._reglType="elements";l._elements=g;l.subdata=function(a,b){h.subdata(a,b);return l};l.destroy=function(){p(g)};return l},createStream:function(a){var b=w.pop();b||(b=new f(c.create(null,34963,!0,!1)._buffer));d(b,a,35040,-1,-1,0,0);return b},destroyStream:function(a){w.push(a)},getElements:function(a){return"function"===typeof a&&a._elements instanceof f?a._elements:null},clear:function(){S(n).forEach(p)}}}function pb(a){for(var b=E.allocType(5123,
a.length),c=0;c<a.length;++c)if(isNaN(a[c]))b[c]=65535;else if(Infinity===a[c])b[c]=31744;else if(-Infinity===a[c])b[c]=64512;else{qb[0]=a[c];var e=Mb[0],f=e>>>31<<15,d=(e<<1>>>24)-127,e=e>>13&1023;b[c]=-24>d?f:-14>d?f+(e+1024>>-14-d):15<d?f+31744:f+(d+15<<10)+e}return b}function ma(a){return Array.isArray(a)||M(a)}function na(a){return"[object "+a+"]"}function rb(a){return Array.isArray(a)&&(0===a.length||"number"===typeof a[0])}function sb(a){return Array.isArray(a)&&0!==a.length&&ma(a[0])?!0:!1}
function ea(a){return Object.prototype.toString.call(a)}function Ua(a){if(!a)return!1;var b=ea(a);return 0<=Nb.indexOf(b)?!0:rb(a)||sb(a)||da(a)}function tb(a,b){36193===a.type?(a.data=pb(b),E.freeType(b)):a.data=b}function Ja(a,b,c,e,f,d){a="undefined"!==typeof F[a]?F[a]:Q[a]*wa[b];d&&(a*=6);if(f){for(e=0;1<=c;)e+=a*c*c,c/=2;return e}return a*c*e}function Ob(a,b,c,e,f,d,p){function n(){this.format=this.internalformat=6408;this.type=5121;this.flipY=this.premultiplyAlpha=this.compressed=!1;this.unpackAlignment=
1;this.colorSpace=37444;this.channels=this.height=this.width=0}function u(a,b){a.internalformat=b.internalformat;a.format=b.format;a.type=b.type;a.compressed=b.compressed;a.premultiplyAlpha=b.premultiplyAlpha;a.flipY=b.flipY;a.unpackAlignment=b.unpackAlignment;a.colorSpace=b.colorSpace;a.width=b.width;a.height=b.height;a.channels=b.channels}function t(a,b){if("object"===typeof b&&b){"premultiplyAlpha"in b&&(a.premultiplyAlpha=b.premultiplyAlpha);"flipY"in b&&(a.flipY=b.flipY);"alignment"in b&&(a.unpackAlignment=
b.alignment);"colorSpace"in b&&(a.colorSpace=Pb[b.colorSpace]);"type"in b&&(a.type=N[b.type]);var c=a.width,g=a.height,e=a.channels,d=!1;"shape"in b?(c=b.shape[0],g=b.shape[1],3===b.shape.length&&(e=b.shape[2],d=!0)):("radius"in b&&(c=g=b.radius),"width"in b&&(c=b.width),"height"in b&&(g=b.height),"channels"in b&&(e=b.channels,d=!0));a.width=c|0;a.height=g|0;a.channels=e|0;c=!1;"format"in b&&(c=b.format,g=a.internalformat=C[c],a.format=P[g],c in N&&!("type"in b)&&(a.type=N[c]),c in v&&(a.compressed=
!0),c=!0);!d&&c?a.channels=Q[a.format]:d&&!c&&a.channels!==Ma[a.format]&&(a.format=a.internalformat=Ma[a.channels])}}function w(b){a.pixelStorei(37440,b.flipY);a.pixelStorei(37441,b.premultiplyAlpha);a.pixelStorei(37443,b.colorSpace);a.pixelStorei(3317,b.unpackAlignment)}function k(){n.call(this);this.yOffset=this.xOffset=0;this.data=null;this.needsFree=!1;this.element=null;this.needsCopy=!1}function B(a,b){var c=null;Ua(b)?c=b:b&&(t(a,b),"x"in b&&(a.xOffset=b.x|0),"y"in b&&(a.yOffset=b.y|0),Ua(b.data)&&
(c=b.data));if(b.copy){var g=f.viewportWidth,e=f.viewportHeight;a.width=a.width||g-a.xOffset;a.height=a.height||e-a.yOffset;a.needsCopy=!0}else if(!c)a.width=a.width||1,a.height=a.height||1,a.channels=a.channels||4;else if(M(c))a.channels=a.channels||4,a.data=c,"type"in b||5121!==a.type||(a.type=Ga[Object.prototype.toString.call(c)]|0);else if(rb(c)){a.channels=a.channels||4;g=c;e=g.length;switch(a.type){case 5121:case 5123:case 5125:case 5126:e=E.allocType(a.type,e);e.set(g);a.data=e;break;case 36193:a.data=
pb(g)}a.alignment=1;a.needsFree=!0}else if(da(c)){g=c.data;Array.isArray(g)||5121!==a.type||(a.type=Ga[Object.prototype.toString.call(g)]|0);var e=c.shape,d=c.stride,h,r,m,q;3===e.length?(m=e[2],q=d[2]):q=m=1;h=e[0];r=e[1];e=d[0];d=d[1];a.alignment=1;a.width=h;a.height=r;a.channels=m;a.format=a.internalformat=Ma[m];a.needsFree=!0;h=q;c=c.offset;m=a.width;q=a.height;r=a.channels;for(var x=E.allocType(36193===a.type?5126:a.type,m*q*r),I=0,ja=0;ja<q;++ja)for(var ka=0;ka<m;++ka)for(var Va=0;Va<r;++Va)x[I++]=
g[e*ka+d*ja+h*Va+c];tb(a,x)}else if(ea(c)===Wa||ea(c)===Xa||ea(c)===vb)ea(c)===Wa||ea(c)===Xa?a.element=c:a.element=c.canvas,a.width=a.element.width,a.height=a.element.height,a.channels=4;else if(ea(c)===wb)a.element=c,a.width=c.width,a.height=c.height,a.channels=4;else if(ea(c)===xb)a.element=c,a.width=c.naturalWidth,a.height=c.naturalHeight,a.channels=4;else if(ea(c)===yb)a.element=c,a.width=c.videoWidth,a.height=c.videoHeight,a.channels=4;else if(sb(c)){g=a.width||c[0].length;e=a.height||c.length;
d=a.channels;d=ma(c[0][0])?d||c[0][0].length:d||1;h=Oa.shape(c);m=1;for(q=0;q<h.length;++q)m*=h[q];m=E.allocType(36193===a.type?5126:a.type,m);Oa.flatten(c,h,"",m);tb(a,m);a.alignment=1;a.width=g;a.height=e;a.channels=d;a.format=a.internalformat=Ma[d];a.needsFree=!0}}function l(b,c,g,d,h){var m=b.element,f=b.data,r=b.internalformat,q=b.format,l=b.type,x=b.width,I=b.height;w(b);m?a.texSubImage2D(c,h,g,d,q,l,m):b.compressed?a.compressedTexSubImage2D(c,h,g,d,r,x,I,f):b.needsCopy?(e(),a.copyTexSubImage2D(c,
h,g,d,b.xOffset,b.yOffset,x,I)):a.texSubImage2D(c,h,g,d,x,I,q,l,f)}function h(){return J.pop()||new k}function g(a){a.needsFree&&E.freeType(a.data);k.call(a);J.push(a)}function q(){n.call(this);this.genMipmaps=!1;this.mipmapHint=4352;this.mipmask=0;this.images=Array(16)}function r(a,b,c){var g=a.images[0]=h();a.mipmask=1;g.width=a.width=b;g.height=a.height=c;g.channels=a.channels=4}function m(a,b){var c=null;if(Ua(b))c=a.images[0]=h(),u(c,a),B(c,b),a.mipmask=1;else if(t(a,b),Array.isArray(b.mipmap))for(var g=
b.mipmap,e=0;e<g.length;++e)c=a.images[e]=h(),u(c,a),c.width>>=e,c.height>>=e,B(c,g[e]),a.mipmask|=1<<e;else c=a.images[0]=h(),u(c,a),B(c,b),a.mipmask=1;u(a,a.images[0])}function z(b,c){for(var g=b.images,d=0;d<g.length&&g[d];++d){var h=g[d],m=c,f=d,r=h.element,q=h.data,l=h.internalformat,x=h.format,I=h.type,ja=h.width,ka=h.height;w(h);r?a.texImage2D(m,f,x,x,I,r):h.compressed?a.compressedTexImage2D(m,f,l,ja,ka,0,q):h.needsCopy?(e(),a.copyTexImage2D(m,f,x,h.xOffset,h.yOffset,ja,ka,0)):a.texImage2D(m,
f,x,ja,ka,0,x,I,q||null)}}function Ha(){var a=L.pop()||new q;n.call(a);for(var b=a.mipmask=0;16>b;++b)a.images[b]=null;return a}function nb(a){for(var b=a.images,c=0;c<b.length;++c)b[c]&&g(b[c]),b[c]=null;L.push(a)}function Z(){this.magFilter=this.minFilter=9728;this.wrapT=this.wrapS=33071;this.anisotropic=1;this.genMipmaps=!1;this.mipmapHint=4352}function G(a,b){"min"in b&&(a.minFilter=R[b.min],0<=Qb.indexOf(a.minFilter)&&!("faces"in b)&&(a.genMipmaps=!0));"mag"in b&&(a.magFilter=V[b.mag]);var c=
a.wrapS,g=a.wrapT;if("wrap"in b){var e=b.wrap;"string"===typeof e?c=g=la[e]:Array.isArray(e)&&(c=la[e[0]],g=la[e[1]])}else"wrapS"in b&&(c=la[b.wrapS]),"wrapT"in b&&(g=la[b.wrapT]);a.wrapS=c;a.wrapT=g;"anisotropic"in b&&(a.anisotropic=b.anisotropic);if("mipmap"in b){c=!1;switch(typeof b.mipmap){case "string":a.mipmapHint=y[b.mipmap];c=a.genMipmaps=!0;break;case "boolean":c=a.genMipmaps=b.mipmap;break;case "object":a.genMipmaps=!1,c=!0}!c||"min"in b||(a.minFilter=9984)}}function H(c,g){a.texParameteri(g,
10241,c.minFilter);a.texParameteri(g,10240,c.magFilter);a.texParameteri(g,10242,c.wrapS);a.texParameteri(g,10243,c.wrapT);b.ext_texture_filter_anisotropic&&a.texParameteri(g,34046,c.anisotropic);c.genMipmaps&&(a.hint(33170,c.mipmapHint),a.generateMipmap(g))}function O(b){n.call(this);this.mipmask=0;this.internalformat=6408;this.id=Y++;this.refCount=1;this.target=b;this.texture=a.createTexture();this.unit=-1;this.bindCount=0;this.texInfo=new Z;p.profile&&(this.stats={size:0})}function xa(b){a.activeTexture(33984);
a.bindTexture(b.target,b.texture)}function ya(){var b=W[0];b?a.bindTexture(b.target,b.texture):a.bindTexture(3553,null)}function D(b){var c=b.texture,g=b.unit,e=b.target;0<=g&&(a.activeTexture(33984+g),a.bindTexture(e,null),W[g]=null);a.deleteTexture(c);b.texture=null;b.params=null;b.pixels=null;b.refCount=0;delete ia[b.id];d.textureCount--}var y={"don't care":4352,"dont care":4352,nice:4354,fast:4353},la={repeat:10497,clamp:33071,mirror:33648},V={nearest:9728,linear:9729},R=A({mipmap:9987,"nearest mipmap nearest":9984,
"linear mipmap nearest":9985,"nearest mipmap linear":9986,"linear mipmap linear":9987},V),Pb={none:0,browser:37444},N={uint8:5121,rgba4:32819,rgb565:33635,"rgb5 a1":32820},C={alpha:6406,luminance:6409,"luminance alpha":6410,rgb:6407,rgba:6408,rgba4:32854,"rgb5 a1":32855,rgb565:36194},v={};b.ext_srgb&&(C.srgb=35904,C.srgba=35906);b.oes_texture_float&&(N.float32=N["float"]=5126);b.oes_texture_half_float&&(N.float16=N["half float"]=36193);b.webgl_depth_texture&&(A(C,{depth:6402,"depth stencil":34041}),
A(N,{uint16:5123,uint32:5125,"depth stencil":34042}));b.webgl_compressed_texture_s3tc&&A(v,{"rgb s3tc dxt1":33776,"rgba s3tc dxt1":33777,"rgba s3tc dxt3":33778,"rgba s3tc dxt5":33779});b.webgl_compressed_texture_atc&&A(v,{"rgb atc":35986,"rgba atc explicit alpha":35987,"rgba atc interpolated alpha":34798});b.webgl_compressed_texture_pvrtc&&A(v,{"rgb pvrtc 4bppv1":35840,"rgb pvrtc 2bppv1":35841,"rgba pvrtc 4bppv1":35842,"rgba pvrtc 2bppv1":35843});b.webgl_compressed_texture_etc1&&(v["rgb etc1"]=36196);
var F=Array.prototype.slice.call(a.getParameter(34467));Object.keys(v).forEach(function(a){var b=v[a];0<=F.indexOf(b)&&(C[a]=b)});var ta=Object.keys(C);c.textureFormats=ta;var aa=[];Object.keys(C).forEach(function(a){aa[C[a]]=a});var K=[];Object.keys(N).forEach(function(a){K[N[a]]=a});var fa=[];Object.keys(V).forEach(function(a){fa[V[a]]=a});var Da=[];Object.keys(R).forEach(function(a){Da[R[a]]=a});var ua=[];Object.keys(la).forEach(function(a){ua[la[a]]=a});var P=ta.reduce(function(a,c){var g=C[c];
6409===g||6406===g||6409===g||6410===g||6402===g||34041===g||b.ext_srgb&&(35904===g||35906===g)?a[g]=g:32855===g||0<=c.indexOf("rgba")?a[g]=6408:a[g]=6407;return a},{}),J=[],L=[],Y=0,ia={},ga=c.maxTextureUnits,W=Array(ga).map(function(){return null});A(O.prototype,{bind:function(){this.bindCount+=1;var b=this.unit;if(0>b){for(var c=0;c<ga;++c){var g=W[c];if(g){if(0<g.bindCount)continue;g.unit=-1}W[c]=this;b=c;break}p.profile&&d.maxTextureUnits<b+1&&(d.maxTextureUnits=b+1);this.unit=b;a.activeTexture(33984+
b);a.bindTexture(this.target,this.texture)}return b},unbind:function(){--this.bindCount},decRef:function(){0>=--this.refCount&&D(this)}});p.profile&&(d.getTotalTextureSize=function(){var a=0;Object.keys(ia).forEach(function(b){a+=ia[b].stats.size});return a});return{create2D:function(b,c){function e(a,b){var c=f.texInfo;Z.call(c);var g=Ha();"number"===typeof a?"number"===typeof b?r(g,a|0,b|0):r(g,a|0,a|0):a?(G(c,a),m(g,a)):r(g,1,1);c.genMipmaps&&(g.mipmask=(g.width<<1)-1);f.mipmask=g.mipmask;u(f,
g);f.internalformat=g.internalformat;e.width=g.width;e.height=g.height;xa(f);z(g,3553);H(c,3553);ya();nb(g);p.profile&&(f.stats.size=Ja(f.internalformat,f.type,g.width,g.height,c.genMipmaps,!1));e.format=aa[f.internalformat];e.type=K[f.type];e.mag=fa[c.magFilter];e.min=Da[c.minFilter];e.wrapS=ua[c.wrapS];e.wrapT=ua[c.wrapT];return e}var f=new O(3553);ia[f.id]=f;d.textureCount++;e(b,c);e.subimage=function(a,b,c,d){b|=0;c|=0;d|=0;var m=h();u(m,f);m.width=0;m.height=0;B(m,a);m.width=m.width||(f.width>>
d)-b;m.height=m.height||(f.height>>d)-c;xa(f);l(m,3553,b,c,d);ya();g(m);return e};e.resize=function(b,c){var g=b|0,d=c|0||g;if(g===f.width&&d===f.height)return e;e.width=f.width=g;e.height=f.height=d;xa(f);for(var h=0;f.mipmask>>h;++h){var m=g>>h,x=d>>h;if(!m||!x)break;a.texImage2D(3553,h,f.format,m,x,0,f.format,f.type,null)}ya();p.profile&&(f.stats.size=Ja(f.internalformat,f.type,g,d,!1,!1));return e};e._reglType="texture2d";e._texture=f;p.profile&&(e.stats=f.stats);e.destroy=function(){f.decRef()};
return e},createCube:function(b,c,e,f,q,n){function k(a,b,c,g,e,d){var f,ca=y.texInfo;Z.call(ca);for(f=0;6>f;++f)D[f]=Ha();if("number"===typeof a||!a)for(a=a|0||1,f=0;6>f;++f)r(D[f],a,a);else if("object"===typeof a)if(b)m(D[0],a),m(D[1],b),m(D[2],c),m(D[3],g),m(D[4],e),m(D[5],d);else if(G(ca,a),t(y,a),"faces"in a)for(a=a.faces,f=0;6>f;++f)u(D[f],y),m(D[f],a[f]);else for(f=0;6>f;++f)m(D[f],a);u(y,D[0]);y.mipmask=ca.genMipmaps?(D[0].width<<1)-1:D[0].mipmask;y.internalformat=D[0].internalformat;k.width=
D[0].width;k.height=D[0].height;xa(y);for(f=0;6>f;++f)z(D[f],34069+f);H(ca,34067);ya();p.profile&&(y.stats.size=Ja(y.internalformat,y.type,k.width,k.height,ca.genMipmaps,!0));k.format=aa[y.internalformat];k.type=K[y.type];k.mag=fa[ca.magFilter];k.min=Da[ca.minFilter];k.wrapS=ua[ca.wrapS];k.wrapT=ua[ca.wrapT];for(f=0;6>f;++f)nb(D[f]);return k}var y=new O(34067);ia[y.id]=y;d.cubeCount++;var D=Array(6);k(b,c,e,f,q,n);k.subimage=function(a,b,c,e,f){c|=0;e|=0;f|=0;var d=h();u(d,y);d.width=0;d.height=0;
B(d,b);d.width=d.width||(y.width>>f)-c;d.height=d.height||(y.height>>f)-e;xa(y);l(d,34069+a,c,e,f);ya();g(d);return k};k.resize=function(b){b|=0;if(b!==y.width){k.width=y.width=b;k.height=y.height=b;xa(y);for(var c=0;6>c;++c)for(var g=0;y.mipmask>>g;++g)a.texImage2D(34069+c,g,y.format,b>>g,b>>g,0,y.format,y.type,null);ya();p.profile&&(y.stats.size=Ja(y.internalformat,y.type,k.width,k.height,!1,!0));return k}};k._reglType="textureCube";k._texture=y;p.profile&&(k.stats=y.stats);k.destroy=function(){y.decRef()};
return k},clear:function(){for(var b=0;b<ga;++b)a.activeTexture(33984+b),a.bindTexture(3553,null),W[b]=null;S(ia).forEach(D);d.cubeCount=0;d.textureCount=0},getTexture:function(a){return null},restore:function(){for(var b=0;b<ga;++b){var c=W[b];c&&(c.bindCount=0,c.unit=-1,W[b]=null)}S(ia).forEach(function(b){b.texture=a.createTexture();a.bindTexture(b.target,b.texture);for(var c=0;32>c;++c)if(0!==(b.mipmask&1<<c))if(3553===b.target)a.texImage2D(3553,c,b.internalformat,b.width>>c,b.height>>c,0,b.internalformat,
b.type,null);else for(var g=0;6>g;++g)a.texImage2D(34069+g,c,b.internalformat,b.width>>c,b.height>>c,0,b.internalformat,b.type,null);H(b.texInfo,b.target)})},refresh:function(){for(var b=0;b<ga;++b){var c=W[b];c&&(c.bindCount=0,c.unit=-1,W[b]=null);a.activeTexture(33984+b);a.bindTexture(3553,null);a.bindTexture(34067,null)}}}}function Rb(a,b,c,e,f,d){function p(a,b,c){this.target=a;this.texture=b;this.renderbuffer=c;var g=a=0;b?(a=b.width,g=b.height):c&&(a=c.width,g=c.height);this.width=a;this.height=
g}function n(a){a&&(a.texture&&a.texture._texture.decRef(),a.renderbuffer&&a.renderbuffer._renderbuffer.decRef())}function u(a,b,c){a&&(a.texture?a.texture._texture.refCount+=1:a.renderbuffer._renderbuffer.refCount+=1)}function t(b,c){c&&(c.texture?a.framebufferTexture2D(36160,b,c.target,c.texture._texture.texture,0):a.framebufferRenderbuffer(36160,b,36161,c.renderbuffer._renderbuffer.renderbuffer))}function w(a){var b=3553,c=null,g=null,e=a;"object"===typeof a&&(e=a.data,"target"in a&&(b=a.target|
0));a=e._reglType;"texture2d"===a?c=e:"textureCube"===a?c=e:"renderbuffer"===a&&(g=e,b=36161);return new p(b,c,g)}function k(a,b,c,g,d){if(c)return a=e.create2D({width:a,height:b,format:g,type:d}),a._texture.refCount=0,new p(3553,a,null);a=f.create({width:a,height:b,format:g});a._renderbuffer.refCount=0;return new p(36161,null,a)}function B(a){return a&&(a.texture||a.renderbuffer)}function l(a,b,c){a&&(a.texture?a.texture.resize(b,c):a.renderbuffer&&a.renderbuffer.resize(b,c),a.width=b,a.height=c)}
function h(){this.id=G++;H[this.id]=this;this.framebuffer=a.createFramebuffer();this.height=this.width=0;this.colorAttachments=[];this.depthStencilAttachment=this.stencilAttachment=this.depthAttachment=null}function g(a){a.colorAttachments.forEach(n);n(a.depthAttachment);n(a.stencilAttachment);n(a.depthStencilAttachment)}function q(b){a.deleteFramebuffer(b.framebuffer);b.framebuffer=null;d.framebufferCount--;delete H[b.id]}function r(b){var g;a.bindFramebuffer(36160,b.framebuffer);var e=b.colorAttachments;
for(g=0;g<e.length;++g)t(36064+g,e[g]);for(g=e.length;g<c.maxColorAttachments;++g)a.framebufferTexture2D(36160,36064+g,3553,null,0);a.framebufferTexture2D(36160,33306,3553,null,0);a.framebufferTexture2D(36160,36096,3553,null,0);a.framebufferTexture2D(36160,36128,3553,null,0);t(36096,b.depthAttachment);t(36128,b.stencilAttachment);t(33306,b.depthStencilAttachment);a.checkFramebufferStatus(36160);a.isContextLost();a.bindFramebuffer(36160,z.next?z.next.framebuffer:null);z.cur=z.next;a.getError()}function m(a,
b){function c(a,b){var f,d=0,h=0,m=!0,q=!0;f=null;var l=!0,n="rgba",t="uint8",p=1,G=null,fa=null,z=null,O=!1;if("number"===typeof a)d=a|0,h=b|0||d;else if(a){"shape"in a?(h=a.shape,d=h[0],h=h[1]):("radius"in a&&(d=h=a.radius),"width"in a&&(d=a.width),"height"in a&&(h=a.height));if("color"in a||"colors"in a)f=a.color||a.colors,Array.isArray(f);if(!f){"colorCount"in a&&(p=a.colorCount|0);"colorTexture"in a&&(l=!!a.colorTexture,n="rgba4");if("colorType"in a&&(t=a.colorType,!l))if("half float"===t||"float16"===
t)n="rgba16f";else if("float"===t||"float32"===t)n="rgba32f";"colorFormat"in a&&(n=a.colorFormat,0<=Ha.indexOf(n)?l=!0:0<=v.indexOf(n)&&(l=!1))}if("depthTexture"in a||"depthStencilTexture"in a)O=!(!a.depthTexture&&!a.depthStencilTexture);"depth"in a&&("boolean"===typeof a.depth?m=a.depth:(G=a.depth,q=!1));"stencil"in a&&("boolean"===typeof a.stencil?q=a.stencil:(fa=a.stencil,m=!1));"depthStencil"in a&&("boolean"===typeof a.depthStencil?m=q=a.depthStencil:(z=a.depthStencil,q=m=!1))}else d=h=1;var P=
null,Z=null,H=null,A=null;if(Array.isArray(f))P=f.map(w);else if(f)P=[w(f)];else for(P=Array(p),f=0;f<p;++f)P[f]=k(d,h,l,n,t);d=d||P[0].width;h=h||P[0].height;G?Z=w(G):m&&!q&&(Z=k(d,h,O,"depth","uint32"));fa?H=w(fa):q&&!m&&(H=k(d,h,!1,"stencil","uint8"));z?A=w(z):!G&&!fa&&q&&m&&(A=k(d,h,O,"depth stencil","depth stencil"));m=null;for(f=0;f<P.length;++f)u(P[f],d,h),P[f]&&P[f].texture&&(q=Ya[P[f].texture._texture.format]*Pa[P[f].texture._texture.type],null===m&&(m=q));u(Z,d,h);u(H,d,h);u(A,d,h);g(e);
e.width=d;e.height=h;e.colorAttachments=P;e.depthAttachment=Z;e.stencilAttachment=H;e.depthStencilAttachment=A;c.color=P.map(B);c.depth=B(Z);c.stencil=B(H);c.depthStencil=B(A);c.width=e.width;c.height=e.height;r(e);return c}var e=new h;d.framebufferCount++;c(a,b);return A(c,{resize:function(a,b){var g=Math.max(a|0,1),f=Math.max(b|0||g,1);if(g===e.width&&f===e.height)return c;for(var d=e.colorAttachments,h=0;h<d.length;++h)l(d[h],g,f);l(e.depthAttachment,g,f);l(e.stencilAttachment,g,f);l(e.depthStencilAttachment,
g,f);e.width=c.width=g;e.height=c.height=f;r(e);return c},_reglType:"framebuffer",_framebuffer:e,destroy:function(){q(e);g(e)},use:function(a){z.setFBO({framebuffer:c},a)}})}var z={cur:null,next:null,dirty:!1,setFBO:null},Ha=["rgba"],v=["rgba4","rgb565","rgb5 a1"];b.ext_srgb&&v.push("srgba");b.ext_color_buffer_half_float&&v.push("rgba16f","rgb16f");b.webgl_color_buffer_float&&v.push("rgba32f");var Z=["uint8"];b.oes_texture_half_float&&Z.push("half float","float16");b.oes_texture_float&&Z.push("float",
"float32");var G=0,H={};return A(z,{getFramebuffer:function(a){return"function"===typeof a&&"framebuffer"===a._reglType&&(a=a._framebuffer,a instanceof h)?a:null},create:m,createCube:function(a){function b(a){var g,f={color:null},d=0,h=null;g="rgba";var q="uint8",r=1;if("number"===typeof a)d=a|0;else if(a){"shape"in a?d=a.shape[0]:("radius"in a&&(d=a.radius|0),"width"in a?d=a.width|0:"height"in a&&(d=a.height|0));if("color"in a||"colors"in a)h=a.color||a.colors,Array.isArray(h);h||("colorCount"in
a&&(r=a.colorCount|0),"colorType"in a&&(q=a.colorType),"colorFormat"in a&&(g=a.colorFormat));"depth"in a&&(f.depth=a.depth);"stencil"in a&&(f.stencil=a.stencil);"depthStencil"in a&&(f.depthStencil=a.depthStencil)}else d=1;if(h)if(Array.isArray(h))for(a=[],g=0;g<h.length;++g)a[g]=h[g];else a=[h];else for(a=Array(r),h={radius:d,format:g,type:q},g=0;g<r;++g)a[g]=e.createCube(h);f.color=Array(a.length);for(g=0;g<a.length;++g)r=a[g],d=d||r.width,f.color[g]={target:34069,data:a[g]};for(g=0;6>g;++g){for(r=
0;r<a.length;++r)f.color[r].target=34069+g;0<g&&(f.depth=c[0].depth,f.stencil=c[0].stencil,f.depthStencil=c[0].depthStencil);if(c[g])c[g](f);else c[g]=m(f)}return A(b,{width:d,height:d,color:a})}var c=Array(6);b(a);return A(b,{faces:c,resize:function(a){var g=a|0;if(g===b.width)return b;var e=b.color;for(a=0;a<e.length;++a)e[a].resize(g);for(a=0;6>a;++a)c[a].resize(g);b.width=b.height=g;return b},_reglType:"framebufferCube",destroy:function(){c.forEach(function(a){a.destroy()})}})},clear:function(){S(H).forEach(q)},
restore:function(){z.cur=null;z.next=null;z.dirty=!0;S(H).forEach(function(b){b.framebuffer=a.createFramebuffer();r(b)})}})}function Za(){this.w=this.z=this.y=this.x=this.state=0;this.buffer=null;this.size=0;this.normalized=!1;this.type=5126;this.divisor=this.stride=this.offset=0}function Sb(a,b,c,e,f){function d(a){if(a!==h.currentVAO){var c=b.oes_vertex_array_object;a?c.bindVertexArrayOES(a.vao):c.bindVertexArrayOES(null);h.currentVAO=a}}function p(c){if(c!==h.currentVAO){if(c)c.bindAttrs();else for(var e=
b.angle_instanced_arrays,f=0;f<k.length;++f){var d=k[f];d.buffer?(a.enableVertexAttribArray(f),a.vertexAttribPointer(f,d.size,d.type,d.normalized,d.stride,d.offfset),e&&d.divisor&&e.vertexAttribDivisorANGLE(f,d.divisor)):(a.disableVertexAttribArray(f),a.vertexAttrib4f(f,d.x,d.y,d.z,d.w))}h.currentVAO=c}}function n(){S(l).forEach(function(a){a.destroy()})}function u(){this.id=++B;this.attributes=[];var a=b.oes_vertex_array_object;this.vao=a?a.createVertexArrayOES():null;l[this.id]=this;this.buffers=
[]}function t(){b.oes_vertex_array_object&&S(l).forEach(function(a){a.refresh()})}var w=c.maxAttributes,k=Array(w);for(c=0;c<w;++c)k[c]=new Za;var B=0,l={},h={Record:Za,scope:{},state:k,currentVAO:null,targetVAO:null,restore:b.oes_vertex_array_object?t:function(){},createVAO:function(a){function b(a){var g={},e=c.attributes;e.length=a.length;for(var d=0;d<a.length;++d){var h=a[d],k=e[d]=new Za,l=h.data||h;if(Array.isArray(l)||M(l)||da(l)){var n;c.buffers[d]&&(n=c.buffers[d],M(l)&&n._buffer.byteLength>=
l.byteLength?n.subdata(l):(n.destroy(),c.buffers[d]=null));c.buffers[d]||(n=c.buffers[d]=f.create(h,34962,!1,!0));k.buffer=f.getBuffer(n);k.size=k.buffer.dimension|0;k.normalized=!1;k.type=k.buffer.dtype;k.offset=0;k.stride=0;k.divisor=0;k.state=1;g[d]=1}else f.getBuffer(h)?(k.buffer=f.getBuffer(h),k.size=k.buffer.dimension|0,k.normalized=!1,k.type=k.buffer.dtype,k.offset=0,k.stride=0,k.divisor=0,k.state=1):f.getBuffer(h.buffer)?(k.buffer=f.getBuffer(h.buffer),k.size=(+h.size||k.buffer.dimension)|
0,k.normalized=!!h.normalized||!1,k.type="type"in h?Ia[h.type]:k.buffer.dtype,k.offset=(h.offset||0)|0,k.stride=(h.stride||0)|0,k.divisor=(h.divisor||0)|0,k.state=1):"x"in h&&(k.x=+h.x||0,k.y=+h.y||0,k.z=+h.z||0,k.w=+h.w||0,k.state=2)}for(a=0;a<c.buffers.length;++a)!g[a]&&c.buffers[a]&&(c.buffers[a].destroy(),c.buffers[a]=null);c.refresh();return b}var c=new u;e.vaoCount+=1;b.destroy=function(){for(var a=0;a<c.buffers.length;++a)c.buffers[a]&&c.buffers[a].destroy();c.buffers.length=0;c.destroy()};
b._vao=c;b._reglType="vao";return b(a)},getVAO:function(a){return"function"===typeof a&&a._vao?a._vao:null},destroyBuffer:function(b){for(var c=0;c<k.length;++c){var e=k[c];e.buffer===b&&(a.disableVertexAttribArray(c),e.buffer=null)}},setVAO:b.oes_vertex_array_object?d:p,clear:b.oes_vertex_array_object?n:function(){}};u.prototype.bindAttrs=function(){for(var c=b.angle_instanced_arrays,e=this.attributes,f=0;f<e.length;++f){var d=e[f];d.buffer?(a.enableVertexAttribArray(f),a.bindBuffer(34962,d.buffer.buffer),
a.vertexAttribPointer(f,d.size,d.type,d.normalized,d.stride,d.offset),c&&d.divisor&&c.vertexAttribDivisorANGLE(f,d.divisor)):(a.disableVertexAttribArray(f),a.vertexAttrib4f(f,d.x,d.y,d.z,d.w))}for(c=e.length;c<w;++c)a.disableVertexAttribArray(c)};u.prototype.refresh=function(){var a=b.oes_vertex_array_object;a&&(a.bindVertexArrayOES(this.vao),this.bindAttrs(),h.currentVAO=this)};u.prototype.destroy=function(){if(this.vao){var a=b.oes_vertex_array_object;this===h.currentVAO&&(h.currentVAO=null,a.bindVertexArrayOES(null));
a.deleteVertexArrayOES(this.vao);this.vao=null}l[this.id]&&(delete l[this.id],--e.vaoCount)};return h}function Tb(a,b,c,e){function f(a,b,c,e){this.name=a;this.id=b;this.location=c;this.info=e}function d(a,b){for(var c=0;c<a.length;++c)if(a[c].id===b.id){a[c].location=b.location;return}a.push(b)}function p(c,g,e){e=35632===c?t:w;var d=e[g];if(!d){var f=b.str(g),d=a.createShader(c);a.shaderSource(d,f);a.compileShader(d);e[g]=d}return d}function n(a,b){this.id=l++;this.fragId=a;this.vertId=b;this.program=
null;this.uniforms=[];this.attributes=[];this.refCount=1;e.profile&&(this.stats={uniformsCount:0,attributesCount:0})}function u(c,g,k){var l;l=p(35632,c.fragId);var m=p(35633,c.vertId);g=c.program=a.createProgram();a.attachShader(g,l);a.attachShader(g,m);if(k)for(l=0;l<k.length;++l)m=k[l],a.bindAttribLocation(g,m[0],m[1]);a.linkProgram(g);m=a.getProgramParameter(g,35718);e.profile&&(c.stats.uniformsCount=m);var n=c.uniforms;for(l=0;l<m;++l)if(k=a.getActiveUniform(g,l))if(1<k.size)for(var t=0;t<k.size;++t){var u=
k.name.replace("[0]","["+t+"]");d(n,new f(u,b.id(u),a.getUniformLocation(g,u),k))}else d(n,new f(k.name,b.id(k.name),a.getUniformLocation(g,k.name),k));m=a.getProgramParameter(g,35721);e.profile&&(c.stats.attributesCount=m);c=c.attributes;for(l=0;l<m;++l)(k=a.getActiveAttrib(g,l))&&d(c,new f(k.name,b.id(k.name),a.getAttribLocation(g,k.name),k))}var t={},w={},k={},B=[],l=0;e.profile&&(c.getMaxUniformsCount=function(){var a=0;B.forEach(function(b){b.stats.uniformsCount>a&&(a=b.stats.uniformsCount)});
return a},c.getMaxAttributesCount=function(){var a=0;B.forEach(function(b){b.stats.attributesCount>a&&(a=b.stats.attributesCount)});return a});return{clear:function(){var b=a.deleteShader.bind(a);S(t).forEach(b);t={};S(w).forEach(b);w={};B.forEach(function(b){a.deleteProgram(b.program)});B.length=0;k={};c.shaderCount=0},program:function(b,e,d,f){var l=k[e];l||(l=k[e]={});var p=l[b];if(p&&(p.refCount++,!f))return p;var v=new n(e,b);c.shaderCount++;u(v,d,f);p||(l[b]=v);B.push(v);return A(v,{destroy:function(){v.refCount--;
if(0>=v.refCount){a.deleteProgram(v.program);var b=B.indexOf(v);B.splice(b,1);c.shaderCount--}0>=l[v.vertId].refCount&&(a.deleteShader(w[v.vertId]),delete w[v.vertId],delete k[v.fragId][v.vertId]);Object.keys(k[v.fragId]).length||(a.deleteShader(t[v.fragId]),delete t[v.fragId],delete k[v.fragId])}})},restore:function(){t={};w={};for(var a=0;a<B.length;++a)u(B[a],null,B[a].attributes.map(function(a){return[a.location,a.name]}))},shader:p,frag:-1,vert:-1}}function Ub(a,b,c,e,f,d,p){function n(d){var f;
f=null===b.next?5121:b.next.colorAttachments[0].texture._texture.type;var k=0,n=0,l=e.framebufferWidth,h=e.framebufferHeight,g=null;M(d)?g=d:d&&(k=d.x|0,n=d.y|0,l=(d.width||e.framebufferWidth-k)|0,h=(d.height||e.framebufferHeight-n)|0,g=d.data||null);c();d=l*h*4;g||(5121===f?g=new Uint8Array(d):5126===f&&(g=g||new Float32Array(d)));a.pixelStorei(3333,4);a.readPixels(k,n,l,h,6408,f,g);return g}function u(a){var c;b.setFBO({framebuffer:a.framebuffer},function(){c=n(a)});return c}return function(a){return a&&
"framebuffer"in a?u(a):n(a)}}function za(a){return Array.prototype.slice.call(a)}function Aa(a){return za(a).join("")}function Vb(){function a(){var a=[],b=[];return A(function(){a.push.apply(a,za(arguments))},{def:function(){var d="v"+c++;b.push(d);0<arguments.length&&(a.push(d,"="),a.push.apply(a,za(arguments)),a.push(";"));return d},toString:function(){return Aa([0<b.length?"var "+b.join(",")+";":"",Aa(a)])}})}function b(){function b(a,e){d(a,e,"=",c.def(a,e),";")}var c=a(),d=a(),e=c.toString,
f=d.toString;return A(function(){c.apply(c,za(arguments))},{def:c.def,entry:c,exit:d,save:b,set:function(a,d,e){b(a,d);c(a,d,"=",e,";")},toString:function(){return e()+f()}})}var c=0,e=[],f=[],d=a(),p={};return{global:d,link:function(a){for(var b=0;b<f.length;++b)if(f[b]===a)return e[b];b="g"+c++;e.push(b);f.push(a);return b},block:a,proc:function(a,c){function d(){var a="a"+e.length;e.push(a);return a}var e=[];c=c||0;for(var f=0;f<c;++f)d();var f=b(),B=f.toString;return p[a]=A(f,{arg:d,toString:function(){return Aa(["function(",
e.join(),"){",B(),"}"])}})},scope:b,cond:function(){var a=Aa(arguments),c=b(),d=b(),e=c.toString,f=d.toString;return A(c,{then:function(){c.apply(c,za(arguments));return this},"else":function(){d.apply(d,za(arguments));return this},toString:function(){var b=f();b&&(b="else{"+b+"}");return Aa(["if(",a,"){",e(),"}",b])}})},compile:function(){var a=['"use strict";',d,"return {"];Object.keys(p).forEach(function(b){a.push('"',b,'":',p[b].toString(),",")});a.push("}");var b=Aa(a).replace(/;/g,";\n").replace(/}/g,
"}\n").replace(/{/g,"{\n");return Function.apply(null,e.concat(b)).apply(null,f)}}}function Qa(a){return Array.isArray(a)||M(a)||da(a)}function zb(a){return a.sort(function(a,c){return"viewport"===a?-1:"viewport"===c?1:a<c?-1:1})}function K(a,b,c,e){this.thisDep=a;this.contextDep=b;this.propDep=c;this.append=e}function sa(a){return a&&!(a.thisDep||a.contextDep||a.propDep)}function v(a){return new K(!1,!1,!1,a)}function L(a,b){var c=a.type;if(0===c)return c=a.data.length,new K(!0,1<=c,2<=c,b);if(4===
c)return c=a.data,new K(c.thisDep,c.contextDep,c.propDep,b);if(5===c)return new K(!1,!1,!1,b);if(6===c){for(var e=c=!1,f=!1,d=0;d<a.data.length;++d){var p=a.data[d];1===p.type?f=!0:2===p.type?e=!0:3===p.type?c=!0:0===p.type?(c=!0,p=p.data,1<=p&&(e=!0),2<=p&&(f=!0)):4===p.type&&(c=c||p.data.thisDep,e=e||p.data.contextDep,f=f||p.data.propDep)}return new K(c,e,f,b)}return new K(3===c,2===c,1===c,b)}function Wb(a,b,c,e,f,d,p,n,u,t,w,k,B,l,h){function g(a){return a.replace(".","_")}function q(a,b,c){var d=
g(a);La.push(a);Ca[d]=pa[d]=!!c;qa[d]=b}function r(a,b,c){var d=g(a);La.push(a);Array.isArray(c)?(pa[d]=c.slice(),Ca[d]=c.slice()):pa[d]=Ca[d]=c;ra[d]=b}function m(){var a=Vb(),c=a.link,d=a.global;a.id=na++;a.batchId="0";var e=c(ub),f=a.shared={props:"a0"};Object.keys(ub).forEach(function(a){f[a]=d.def(e,".",a)});var g=a.next={},h=a.current={};Object.keys(ra).forEach(function(a){Array.isArray(pa[a])&&(g[a]=d.def(f.next,".",a),h[a]=d.def(f.current,".",a))});var ba=a.constants={};Object.keys(Na).forEach(function(a){ba[a]=
d.def(JSON.stringify(Na[a]))});a.invoke=function(b,d){switch(d.type){case 0:var e=["this",f.context,f.props,a.batchId];return b.def(c(d.data),".call(",e.slice(0,Math.max(d.data.length+1,4)),")");case 1:return b.def(f.props,d.data);case 2:return b.def(f.context,d.data);case 3:return b.def("this",d.data);case 4:return d.data.append(a,b),d.data.ref;case 5:return d.data.toString();case 6:return d.data.map(function(c){return a.invoke(b,c)})}};a.attribCache={};var va={};a.scopeAttrib=function(a){a=b.id(a);
if(a in va)return va[a];var d=t.scope[a];d||(d=t.scope[a]=new ga);return va[a]=c(d)};return a}function z(a){var b=a["static"];a=a.dynamic;var c;if("profile"in b){var d=!!b.profile;c=v(function(a,b){return d});c.enable=d}else if("profile"in a){var e=a.profile;c=L(e,function(a,b){return a.invoke(b,e)})}return c}function E(a,b){var c=a["static"],d=a.dynamic;if("framebuffer"in c){var e=c.framebuffer;return e?(e=n.getFramebuffer(e),v(function(a,b){var c=a.link(e),d=a.shared;b.set(d.framebuffer,".next",
c);d=d.context;b.set(d,".framebufferWidth",c+".width");b.set(d,".framebufferHeight",c+".height");return c})):v(function(a,b){var c=a.shared;b.set(c.framebuffer,".next","null");c=c.context;b.set(c,".framebufferWidth",c+".drawingBufferWidth");b.set(c,".framebufferHeight",c+".drawingBufferHeight");return"null"})}if("framebuffer"in d){var f=d.framebuffer;return L(f,function(a,b){var c=a.invoke(b,f),d=a.shared,e=d.framebuffer,c=b.def(e,".getFramebuffer(",c,")");b.set(e,".next",c);d=d.context;b.set(d,".framebufferWidth",
c+"?"+c+".width:"+d+".drawingBufferWidth");b.set(d,".framebufferHeight",c+"?"+c+".height:"+d+".drawingBufferHeight");return c})}return null}function F(a,b,c){function d(a){if(a in e){var c=e[a];a=!0;var g=c.x|0,x=c.y|0,h,k;"width"in c?h=c.width|0:a=!1;"height"in c?k=c.height|0:a=!1;return new K(!a&&b&&b.thisDep,!a&&b&&b.contextDep,!a&&b&&b.propDep,function(a,b){var d=a.shared.context,e=h;"width"in c||(e=b.def(d,".","framebufferWidth","-",g));var f=k;"height"in c||(f=b.def(d,".","framebufferHeight",
"-",x));return[g,x,e,f]})}if(a in f){var ca=f[a];a=L(ca,function(a,b){var c=a.invoke(b,ca),d=a.shared.context,e=b.def(c,".x|0"),f=b.def(c,".y|0"),g=b.def('"width" in ',c,"?",c,".width|0:","(",d,".","framebufferWidth","-",e,")"),c=b.def('"height" in ',c,"?",c,".height|0:","(",d,".","framebufferHeight","-",f,")");return[e,f,g,c]});b&&(a.thisDep=a.thisDep||b.thisDep,a.contextDep=a.contextDep||b.contextDep,a.propDep=a.propDep||b.propDep);return a}return b?new K(b.thisDep,b.contextDep,b.propDep,function(a,
b){var c=a.shared.context;return[0,0,b.def(c,".","framebufferWidth"),b.def(c,".","framebufferHeight")]}):null}var e=a["static"],f=a.dynamic;if(a=d("viewport")){var g=a;a=new K(a.thisDep,a.contextDep,a.propDep,function(a,b){var c=g.append(a,b),d=a.shared.context;b.set(d,".viewportWidth",c[2]);b.set(d,".viewportHeight",c[3]);return c})}return{viewport:a,scissor_box:d("scissor.box")}}function Z(a,b){var c=a["static"];if("string"===typeof c.frag&&"string"===typeof c.vert){if(0<Object.keys(b.dynamic).length)return null;
var c=b["static"],d=Object.keys(c);if(0<d.length&&"number"===typeof c[d[0]]){for(var e=[],f=0;f<d.length;++f)e.push([c[d[f]]|0,d[f]]);return e}}return null}function G(a,c,d){function e(a){if(a in f){var c=b.id(f[a]);a=v(function(){return c});a.id=c;return a}if(a in g){var d=g[a];return L(d,function(a,b){var c=a.invoke(b,d);return b.def(a.shared.strings,".id(",c,")")})}return null}var f=a["static"],g=a.dynamic,h=e("frag"),ba=e("vert"),va=null;sa(h)&&sa(ba)?(va=w.program(ba.id,h.id,null,d),a=v(function(a,
b){return a.link(va)})):a=new K(h&&h.thisDep||ba&&ba.thisDep,h&&h.contextDep||ba&&ba.contextDep,h&&h.propDep||ba&&ba.propDep,function(a,b){var c=a.shared.shader,d;d=h?h.append(a,b):b.def(c,".","frag");var e;e=ba?ba.append(a,b):b.def(c,".","vert");return b.def(c+".program("+e+","+d+")")});return{frag:h,vert:ba,progVar:a,program:va}}function H(a,b){function c(a,b){if(a in e){var d=e[a]|0;return v(function(a,c){b&&(a.OFFSET=d);return d})}if(a in f){var x=f[a];return L(x,function(a,c){var d=a.invoke(c,
x);b&&(a.OFFSET=d);return d})}return b&&g?v(function(a,b){a.OFFSET="0";return 0}):null}var e=a["static"],f=a.dynamic,g=function(){if("elements"in e){var a=e.elements;Qa(a)?a=d.getElements(d.create(a,!0)):a&&(a=d.getElements(a));var b=v(function(b,c){if(a){var d=b.link(a);return b.ELEMENTS=d}return b.ELEMENTS=null});b.value=a;return b}if("elements"in f){var c=f.elements;return L(c,function(a,b){var d=a.shared,e=d.isBufferArgs,d=d.elements,f=a.invoke(b,c),g=b.def("null"),e=b.def(e,"(",f,")"),f=a.cond(e).then(g,
"=",d,".createStream(",f,");")["else"](g,"=",d,".getElements(",f,");");b.entry(f);b.exit(a.cond(e).then(d,".destroyStream(",g,");"));return a.ELEMENTS=g})}return null}(),h=c("offset",!0);return{elements:g,primitive:function(){if("primitive"in e){var a=e.primitive;return v(function(b,c){return Ta[a]})}if("primitive"in f){var b=f.primitive;return L(b,function(a,c){var d=a.constants.primTypes,e=a.invoke(c,b);return c.def(d,"[",e,"]")})}return g?sa(g)?g.value?v(function(a,b){return b.def(a.ELEMENTS,".primType")}):
v(function(){return 4}):new K(g.thisDep,g.contextDep,g.propDep,function(a,b){var c=a.ELEMENTS;return b.def(c,"?",c,".primType:",4)}):null}(),count:function(){if("count"in e){var a=e.count|0;return v(function(){return a})}if("count"in f){var b=f.count;return L(b,function(a,c){return a.invoke(c,b)})}return g?sa(g)?g?h?new K(h.thisDep,h.contextDep,h.propDep,function(a,b){return b.def(a.ELEMENTS,".vertCount-",a.OFFSET)}):v(function(a,b){return b.def(a.ELEMENTS,".vertCount")}):v(function(){return-1}):
new K(g.thisDep||h.thisDep,g.contextDep||h.contextDep,g.propDep||h.propDep,function(a,b){var c=a.ELEMENTS;return a.OFFSET?b.def(c,"?",c,".vertCount-",a.OFFSET,":-1"):b.def(c,"?",c,".vertCount:-1")}):null}(),instances:c("instances",!1),offset:h}}function O(a,b){var c=a["static"],d=a.dynamic,e={};La.forEach(function(a){function b(g,x){if(a in c){var h=g(c[a]);e[f]=v(function(){return h})}else if(a in d){var I=d[a];e[f]=L(I,function(a,b){return x(a,b,a.invoke(b,I))})}}var f=g(a);switch(a){case "cull.enable":case "blend.enable":case "dither":case "stencil.enable":case "depth.enable":case "scissor.enable":case "polygonOffset.enable":case "sample.alpha":case "sample.enable":case "depth.mask":return b(function(a){return a},
function(a,b,c){return c});case "depth.func":return b(function(a){return ab[a]},function(a,b,c){return b.def(a.constants.compareFuncs,"[",c,"]")});case "depth.range":return b(function(a){return a},function(a,b,c){a=b.def("+",c,"[0]");b=b.def("+",c,"[1]");return[a,b]});case "blend.func":return b(function(a){return[Ea["srcRGB"in a?a.srcRGB:a.src],Ea["dstRGB"in a?a.dstRGB:a.dst],Ea["srcAlpha"in a?a.srcAlpha:a.src],Ea["dstAlpha"in a?a.dstAlpha:a.dst]]},function(a,b,c){function d(a,e){return b.def('"',
a,e,'" in ',c,"?",c,".",a,e,":",c,".",a)}a=a.constants.blendFuncs;var e=d("src","RGB"),f=d("dst","RGB"),e=b.def(a,"[",e,"]"),g=b.def(a,"[",d("src","Alpha"),"]"),f=b.def(a,"[",f,"]");a=b.def(a,"[",d("dst","Alpha"),"]");return[e,f,g,a]});case "blend.equation":return b(function(a){if("string"===typeof a)return[W[a],W[a]];if("object"===typeof a)return[W[a.rgb],W[a.alpha]]},function(a,b,c){var d=a.constants.blendEquations,e=b.def(),f=b.def();a=a.cond("typeof ",c,'==="string"');a.then(e,"=",f,"=",d,"[",
c,"];");a["else"](e,"=",d,"[",c,".rgb];",f,"=",d,"[",c,".alpha];");b(a);return[e,f]});case "blend.color":return b(function(a){return J(4,function(b){return+a[b]})},function(a,b,c){return J(4,function(a){return b.def("+",c,"[",a,"]")})});case "stencil.mask":return b(function(a){return a|0},function(a,b,c){return b.def(c,"|0")});case "stencil.func":return b(function(a){return[ab[a.cmp||"keep"],a.ref||0,"mask"in a?a.mask:-1]},function(a,b,c){a=b.def('"cmp" in ',c,"?",a.constants.compareFuncs,"[",c,".cmp]",
":",7680);var d=b.def(c,".ref|0");b=b.def('"mask" in ',c,"?",c,".mask|0:-1");return[a,d,b]});case "stencil.opFront":case "stencil.opBack":return b(function(b){return["stencil.opBack"===a?1029:1028,Ra[b.fail||"keep"],Ra[b.zfail||"keep"],Ra[b.zpass||"keep"]]},function(b,c,d){function e(a){return c.def('"',a,'" in ',d,"?",f,"[",d,".",a,"]:",7680)}var f=b.constants.stencilOps;return["stencil.opBack"===a?1029:1028,e("fail"),e("zfail"),e("zpass")]});case "polygonOffset.offset":return b(function(a){return[a.factor|
0,a.units|0]},function(a,b,c){a=b.def(c,".factor|0");b=b.def(c,".units|0");return[a,b]});case "cull.face":return b(function(a){var b=0;"front"===a?b=1028:"back"===a&&(b=1029);return b},function(a,b,c){return b.def(c,'==="front"?',1028,":",1029)});case "lineWidth":return b(function(a){return a},function(a,b,c){return c});case "frontFace":return b(function(a){return Ab[a]},function(a,b,c){return b.def(c+'==="cw"?2304:2305')});case "colorMask":return b(function(a){return a.map(function(a){return!!a})},
function(a,b,c){return J(4,function(a){return"!!"+c+"["+a+"]"})});case "sample.coverage":return b(function(a){return["value"in a?a.value:1,!!a.invert]},function(a,b,c){a=b.def('"value" in ',c,"?+",c,".value:1");b=b.def("!!",c,".invert");return[a,b]})}});return e}function M(a,b){var c=a["static"],d=a.dynamic,e={};Object.keys(c).forEach(function(a){var b=c[a],d;if("number"===typeof b||"boolean"===typeof b)d=v(function(){return b});else if("function"===typeof b){var f=b._reglType;if("texture2d"===f||
"textureCube"===f)d=v(function(a){return a.link(b)});else if("framebuffer"===f||"framebufferCube"===f)d=v(function(a){return a.link(b.color[0])})}else ma(b)&&(d=v(function(a){return a.global.def("[",J(b.length,function(a){return b[a]}),"]")}));d.value=b;e[a]=d});Object.keys(d).forEach(function(a){var b=d[a];e[a]=L(b,function(a,c){return a.invoke(c,b)})});return e}function S(a,c){var d=a["static"],e=a.dynamic,g={};Object.keys(d).forEach(function(a){var c=d[a],e=b.id(a),x=new ga;if(Qa(c))x.state=1,
x.buffer=f.getBuffer(f.create(c,34962,!1,!0)),x.type=0;else{var h=f.getBuffer(c);if(h)x.state=1,x.buffer=h,x.type=0;else if("constant"in c){var I=c.constant;x.buffer="null";x.state=2;"number"===typeof I?x.x=I:Ba.forEach(function(a,b){b<I.length&&(x[a]=I[b])})}else{var h=Qa(c.buffer)?f.getBuffer(f.create(c.buffer,34962,!1,!0)):f.getBuffer(c.buffer),k=c.offset|0,l=c.stride|0,m=c.size|0,ka=!!c.normalized,n=0;"type"in c&&(n=Ia[c.type]);c=c.divisor|0;x.buffer=h;x.state=1;x.size=m;x.normalized=ka;x.type=
n||h.dtype;x.offset=k;x.stride=l;x.divisor=c}}g[a]=v(function(a,b){var c=a.attribCache;if(e in c)return c[e];var d={isStream:!1};Object.keys(x).forEach(function(a){d[a]=x[a]});x.buffer&&(d.buffer=a.link(x.buffer),d.type=d.type||d.buffer+".dtype");return c[e]=d})});Object.keys(e).forEach(function(a){var b=e[a];g[a]=L(b,function(a,c){function d(a){c(h[a],"=",e,".",a,"|0;")}var e=a.invoke(c,b),f=a.shared,g=a.constants,x=f.isBufferArgs,f=f.buffer,h={isStream:c.def(!1)},I=new ga;I.state=1;Object.keys(I).forEach(function(a){h[a]=
c.def(""+I[a])});var k=h.buffer,l=h.type;c("if(",x,"(",e,")){",h.isStream,"=true;",k,"=",f,".createStream(",34962,",",e,");",l,"=",k,".dtype;","}else{",k,"=",f,".getBuffer(",e,");","if(",k,"){",l,"=",k,".dtype;",'}else if("constant" in ',e,"){",h.state,"=",2,";","if(typeof "+e+'.constant === "number"){',h[Ba[0]],"=",e,".constant;",Ba.slice(1).map(function(a){return h[a]}).join("="),"=0;","}else{",Ba.map(function(a,b){return h[a]+"="+e+".constant.length>"+b+"?"+e+".constant["+b+"]:0;"}).join(""),"}}else{",
"if(",x,"(",e,".buffer)){",k,"=",f,".createStream(",34962,",",e,".buffer);","}else{",k,"=",f,".getBuffer(",e,".buffer);","}",l,'="type" in ',e,"?",g.glTypes,"[",e,".type]:",k,".dtype;",h.normalized,"=!!",e,".normalized;");d("size");d("offset");d("stride");d("divisor");c("}}");c.exit("if(",h.isStream,"){",f,".destroyStream(",k,");","}");return h})});return g}function D(a,b){var c=a["static"],d=a.dynamic;if("vao"in c){var e=c.vao;null!==e&&null===t.getVAO(e)&&(e=t.createVAO(e));return v(function(a){return a.link(t.getVAO(e))})}if("vao"in
d){var f=d.vao;return L(f,function(a,b){var c=a.invoke(b,f);return b.def(a.shared.vao+".getVAO("+c+")")})}return null}function y(a){var b=a["static"],c=a.dynamic,d={};Object.keys(b).forEach(function(a){var c=b[a];d[a]=v(function(a,b){return"number"===typeof c||"boolean"===typeof c?""+c:a.link(c)})});Object.keys(c).forEach(function(a){var b=c[a];d[a]=L(b,function(a,c){return a.invoke(c,b)})});return d}function la(a,b,d,e,f){function h(a){var b=m[a];b&&($a[a]=b)}var k=Z(a,b),l=E(a,f),m=F(a,l,f),n=H(a,
f),$a=O(a,f),p=G(a,f,k);h("viewport");h(g("scissor.box"));var q=0<Object.keys($a).length,l={framebuffer:l,draw:n,shader:p,state:$a,dirty:q,scopeVAO:null,drawVAO:null,useVAO:!1,attributes:{}};l.profile=z(a,f);l.uniforms=M(d,f);l.drawVAO=l.scopeVAO=D(a,f);if(!l.drawVAO&&p.program&&!k&&c.angle_instanced_arrays){var r=!0;a=p.program.attributes.map(function(a){a=b["static"][a];r=r&&!!a;return a});if(r&&0<a.length){var w=t.getVAO(t.createVAO(a));l.drawVAO=new K(null,null,null,function(a,b){return a.link(w)});
l.useVAO=!0}}k?l.useVAO=!0:l.attributes=S(b,f);l.context=y(e,f);return l}function V(a,b,c){var d=a.shared.context,e=a.scope();Object.keys(c).forEach(function(f){b.save(d,"."+f);var g=c[f].append(a,b);Array.isArray(g)?e(d,".",f,"=[",g.join(),"];"):e(d,".",f,"=",g,";")});b(e)}function R(a,b,c,d){var e=a.shared,f=e.gl,g=e.framebuffer,h;Ka&&(h=b.def(e.extensions,".webgl_draw_buffers"));var k=a.constants,e=k.drawBuffer,k=k.backBuffer;a=c?c.append(a,b):b.def(g,".next");d||b("if(",a,"!==",g,".cur){");b("if(",
a,"){",f,".bindFramebuffer(",36160,",",a,".framebuffer);");Ka&&b(h,".drawBuffersWEBGL(",e,"[",a,".colorAttachments.length]);");b("}else{",f,".bindFramebuffer(",36160,",null);");Ka&&b(h,".drawBuffersWEBGL(",k,");");b("}",g,".cur=",a,";");d||b("}")}function T(a,b,c){var d=a.shared,e=d.gl,f=a.current,h=a.next,k=d.current,l=d.next,m=a.cond(k,".dirty");La.forEach(function(b){b=g(b);if(!(b in c.state)){var d,I;if(b in h){d=h[b];I=f[b];var n=J(pa[b].length,function(a){return m.def(d,"[",a,"]")});m(a.cond(n.map(function(a,
b){return a+"!=="+I+"["+b+"]"}).join("||")).then(e,".",ra[b],"(",n,");",n.map(function(a,b){return I+"["+b+"]="+a}).join(";"),";"))}else d=m.def(l,".",b),n=a.cond(d,"!==",k,".",b),m(n),b in qa?n(a.cond(d).then(e,".enable(",qa[b],");")["else"](e,".disable(",qa[b],");"),k,".",b,"=",d,";"):n(e,".",ra[b],"(",d,");",k,".",b,"=",d,";")}});0===Object.keys(c.state).length&&m(k,".dirty=false;");b(m)}function N(a,b,c,d){var e=a.shared,f=a.current,g=e.current,h=e.gl;zb(Object.keys(c)).forEach(function(e){var k=
c[e];if(!d||d(k)){var l=k.append(a,b);if(qa[e]){var m=qa[e];sa(k)?l?b(h,".enable(",m,");"):b(h,".disable(",m,");"):b(a.cond(l).then(h,".enable(",m,");")["else"](h,".disable(",m,");"));b(g,".",e,"=",l,";")}else if(ma(l)){var n=f[e];b(h,".",ra[e],"(",l,");",l.map(function(a,b){return n+"["+b+"]="+a}).join(";"),";")}else b(h,".",ra[e],"(",l,");",g,".",e,"=",l,";")}})}function C(a,b){oa&&(a.instancing=b.def(a.shared.extensions,".angle_instanced_arrays"))}function Q(a,b,c,d,e){function f(){return"undefined"===
typeof performance?"Date.now()":"performance.now()"}function g(a){r=b.def();a(r,"=",f(),";");"string"===typeof e?a(n,".count+=",e,";"):a(n,".count++;");l&&(d?(t=b.def(),a(t,"=",q,".getNumPendingQueries();")):a(q,".beginQuery(",n,");"))}function h(a){a(n,".cpuTime+=",f(),"-",r,";");l&&(d?a(q,".pushScopeStats(",t,",",q,".getNumPendingQueries(),",n,");"):a(q,".endQuery();"))}function k(a){var c=b.def(p,".profile");b(p,".profile=",a,";");b.exit(p,".profile=",c,";")}var m=a.shared,n=a.stats,p=m.current,
q=m.timer;c=c.profile;var r,t;if(c){if(sa(c)){c.enable?(g(b),h(b.exit),k("true")):k("false");return}c=c.append(a,b);k(c)}else c=b.def(p,".profile");m=a.block();g(m);b("if(",c,"){",m,"}");a=a.block();h(a);b.exit("if(",c,"){",a,"}")}function U(a,b,c,d,e){function f(a){switch(a){case 35664:case 35667:case 35671:return 2;case 35665:case 35668:case 35672:return 3;case 35666:case 35669:case 35673:return 4;default:return 1}}function g(c,d,e){function f(){b("if(!",n,".buffer){",l,".enableVertexAttribArray(",
m,");}");var c=e.type,g;g=e.size?b.def(e.size,"||",d):d;b("if(",n,".type!==",c,"||",n,".size!==",g,"||",q.map(function(a){return n+"."+a+"!=="+e[a]}).join("||"),"){",l,".bindBuffer(",34962,",",ja,".buffer);",l,".vertexAttribPointer(",[m,g,c,e.normalized,e.stride,e.offset],");",n,".type=",c,";",n,".size=",g,";",q.map(function(a){return n+"."+a+"="+e[a]+";"}).join(""),"}");oa&&(c=e.divisor,b("if(",n,".divisor!==",c,"){",a.instancing,".vertexAttribDivisorANGLE(",[m,c],");",n,".divisor=",c,";}"))}function k(){b("if(",
n,".buffer){",l,".disableVertexAttribArray(",m,");",n,".buffer=null;","}if(",Ba.map(function(a,b){return n+"."+a+"!=="+p[b]}).join("||"),"){",l,".vertexAttrib4f(",m,",",p,");",Ba.map(function(a,b){return n+"."+a+"="+p[b]+";"}).join(""),"}")}var l=h.gl,m=b.def(c,".location"),n=b.def(h.attributes,"[",m,"]");c=e.state;var ja=e.buffer,p=[e.x,e.y,e.z,e.w],q=["buffer","normalized","offset","stride"];1===c?f():2===c?k():(b("if(",c,"===",1,"){"),f(),b("}else{"),k(),b("}"))}var h=a.shared;d.forEach(function(d){var h=
d.name,k=c.attributes[h],l;if(k){if(!e(k))return;l=k.append(a,b)}else{if(!e(Bb))return;var m=a.scopeAttrib(h);l={};Object.keys(new ga).forEach(function(a){l[a]=b.def(m,".",a)})}g(a.link(d),f(d.info.type),l)})}function ta(a,c,d,e,f){for(var g=a.shared,h=g.gl,k,l=0;l<e.length;++l){var m=e[l],n=m.name,p=m.info.type,q=d.uniforms[n],m=a.link(m)+".location",r;if(q){if(!f(q))continue;if(sa(q)){n=q.value;if(35678===p||35680===p)p=a.link(n._texture||n.color[0]._texture),c(h,".uniform1i(",m,",",p+".bind());"),
c.exit(p,".unbind();");else if(35674===p||35675===p||35676===p)n=a.global.def("new Float32Array(["+Array.prototype.slice.call(n)+"])"),q=2,35675===p?q=3:35676===p&&(q=4),c(h,".uniformMatrix",q,"fv(",m,",false,",n,");");else{switch(p){case 5126:k="1f";break;case 35664:k="2f";break;case 35665:k="3f";break;case 35666:k="4f";break;case 35670:k="1i";break;case 5124:k="1i";break;case 35671:k="2i";break;case 35667:k="2i";break;case 35672:k="3i";break;case 35668:k="3i";break;case 35673:k="4i";break;case 35669:k=
"4i"}c(h,".uniform",k,"(",m,",",ma(n)?Array.prototype.slice.call(n):n,");")}continue}else r=q.append(a,c)}else{if(!f(Bb))continue;r=c.def(g.uniforms,"[",b.id(n),"]")}35678===p?c("if(",r,"&&",r,'._reglType==="framebuffer"){',r,"=",r,".color[0];","}"):35680===p&&c("if(",r,"&&",r,'._reglType==="framebufferCube"){',r,"=",r,".color[0];","}");n=1;switch(p){case 35678:case 35680:p=c.def(r,"._texture");c(h,".uniform1i(",m,",",p,".bind());");c.exit(p,".unbind();");continue;case 5124:case 35670:k="1i";break;
case 35667:case 35671:k="2i";n=2;break;case 35668:case 35672:k="3i";n=3;break;case 35669:case 35673:k="4i";n=4;break;case 5126:k="1f";break;case 35664:k="2f";n=2;break;case 35665:k="3f";n=3;break;case 35666:k="4f";n=4;break;case 35674:k="Matrix2fv";break;case 35675:k="Matrix3fv";break;case 35676:k="Matrix4fv"}c(h,".uniform",k,"(",m,",");if("M"===k.charAt(0)){var m=Math.pow(p-35674+2,2),t=a.global.def("new Float32Array(",m,")");Array.isArray(r)?c("false,(",J(m,function(a){return t+"["+a+"]="+r[a]}),
",",t,")"):c("false,(Array.isArray(",r,")||",r," instanceof Float32Array)?",r,":(",J(m,function(a){return t+"["+a+"]="+r+"["+a+"]"}),",",t,")")}else 1<n?c(J(n,function(a){return Array.isArray(r)?r[a]:r+"["+a+"]"})):c(r);c(");")}}function aa(a,b,c,d){function e(f){var g=m[f];return g?g.contextDep&&d.contextDynamic||g.propDep?g.append(a,c):g.append(a,b):b.def(l,".",f)}function f(){function a(){c(w,".drawElementsInstancedANGLE(",[p,q,u,r+"<<(("+u+"-5121)>>1)",t],");")}function b(){c(w,".drawArraysInstancedANGLE(",
[p,r,q,t],");")}n?B?a():(c("if(",n,"){"),a(),c("}else{"),b(),c("}")):b()}function g(){function a(){c(k+".drawElements("+[p,q,u,r+"<<(("+u+"-5121)>>1)"]+");")}function b(){c(k+".drawArrays("+[p,r,q]+");")}n?B?a():(c("if(",n,"){"),a(),c("}else{"),b(),c("}")):b()}var h=a.shared,k=h.gl,l=h.draw,m=d.draw,n=function(){var e=m.elements,f=b;if(e){if(e.contextDep&&d.contextDynamic||e.propDep)f=c;e=e.append(a,f)}else e=f.def(l,".","elements");e&&f("if("+e+")"+k+".bindBuffer(34963,"+e+".buffer.buffer);");return e}(),
p=e("primitive"),r=e("offset"),q=function(){var e=m.count,f=b;if(e){if(e.contextDep&&d.contextDynamic||e.propDep)f=c;e=e.append(a,f)}else e=f.def(l,".","count");return e}();if("number"===typeof q){if(0===q)return}else c("if(",q,"){"),c.exit("}");var t,w;oa&&(t=e("instances"),w=a.instancing);var u=n+".type",B=m.elements&&sa(m.elements);oa&&("number"!==typeof t||0<=t)?"string"===typeof t?(c("if(",t,">0){"),f(),c("}else if(",t,"<0){"),g(),c("}")):f():g()}function X(a,b,c,d,e){b=m();e=b.proc("body",e);
oa&&(b.instancing=e.def(b.shared.extensions,".angle_instanced_arrays"));a(b,e,c,d);return b.compile().body}function fa(a,b,c,d){C(a,b);c.useVAO?c.drawVAO?b(a.shared.vao,".setVAO(",c.drawVAO.append(a,b),");"):b(a.shared.vao,".setVAO(",a.shared.vao,".targetVAO);"):(b(a.shared.vao,".setVAO(null);"),U(a,b,c,d.attributes,function(){return!0}));ta(a,b,c,d.uniforms,function(){return!0});aa(a,b,b,c)}function Da(a,b){var c=a.proc("draw",1);C(a,c);V(a,c,b.context);R(a,c,b.framebuffer);T(a,c,b);N(a,c,b.state);
Q(a,c,b,!1,!0);var d=b.shader.progVar.append(a,c);c(a.shared.gl,".useProgram(",d,".program);");if(b.shader.program)fa(a,c,b,b.shader.program);else{c(a.shared.vao,".setVAO(null);");var e=a.global.def("{}"),f=c.def(d,".id"),g=c.def(e,"[",f,"]");c(a.cond(g).then(g,".call(this,a0);")["else"](g,"=",e,"[",f,"]=",a.link(function(c){return X(fa,a,b,c,1)}),"(",d,");",g,".call(this,a0);"))}0<Object.keys(b.state).length&&c(a.shared.current,".dirty=true;")}function ua(a,b,c,d){function e(){return!0}a.batchId=
"a1";C(a,b);U(a,b,c,d.attributes,e);ta(a,b,c,d.uniforms,e);aa(a,b,b,c)}function P(a,b,c,d){function e(a){return a.contextDep&&g||a.propDep}function f(a){return!e(a)}C(a,b);var g=c.contextDep,h=b.def(),k=b.def();a.shared.props=k;a.batchId=h;var l=a.scope(),m=a.scope();b(l.entry,"for(",h,"=0;",h,"<","a1",";++",h,"){",k,"=","a0","[",h,"];",m,"}",l.exit);c.needsContext&&V(a,m,c.context);c.needsFramebuffer&&R(a,m,c.framebuffer);N(a,m,c.state,e);c.profile&&e(c.profile)&&Q(a,m,c,!1,!0);d?(c.useVAO?c.drawVAO?
e(c.drawVAO)?m(a.shared.vao,".setVAO(",c.drawVAO.append(a,m),");"):l(a.shared.vao,".setVAO(",c.drawVAO.append(a,l),");"):l(a.shared.vao,".setVAO(",a.shared.vao,".targetVAO);"):(l(a.shared.vao,".setVAO(null);"),U(a,l,c,d.attributes,f),U(a,m,c,d.attributes,e)),ta(a,l,c,d.uniforms,f),ta(a,m,c,d.uniforms,e),aa(a,l,m,c)):(b=a.global.def("{}"),d=c.shader.progVar.append(a,m),k=m.def(d,".id"),l=m.def(b,"[",k,"]"),m(a.shared.gl,".useProgram(",d,".program);","if(!",l,"){",l,"=",b,"[",k,"]=",a.link(function(b){return X(ua,
a,c,b,2)}),"(",d,");}",l,".call(this,a0[",h,"],",h,");"))}function da(a,b){function c(a){return a.contextDep&&e||a.propDep}var d=a.proc("batch",2);a.batchId="0";C(a,d);var e=!1,f=!0;Object.keys(b.context).forEach(function(a){e=e||b.context[a].propDep});e||(V(a,d,b.context),f=!1);var g=b.framebuffer,h=!1;g?(g.propDep?e=h=!0:g.contextDep&&e&&(h=!0),h||R(a,d,g)):R(a,d,null);b.state.viewport&&b.state.viewport.propDep&&(e=!0);T(a,d,b);N(a,d,b.state,function(a){return!c(a)});b.profile&&c(b.profile)||Q(a,
d,b,!1,"a1");b.contextDep=e;b.needsContext=f;b.needsFramebuffer=h;f=b.shader.progVar;if(f.contextDep&&e||f.propDep)P(a,d,b,null);else if(f=f.append(a,d),d(a.shared.gl,".useProgram(",f,".program);"),b.shader.program)P(a,d,b,b.shader.program);else{d(a.shared.vao,".setVAO(null);");var g=a.global.def("{}"),h=d.def(f,".id"),k=d.def(g,"[",h,"]");d(a.cond(k).then(k,".call(this,a0,a1);")["else"](k,"=",g,"[",h,"]=",a.link(function(c){return X(P,a,b,c,2)}),"(",f,");",k,".call(this,a0,a1);"))}0<Object.keys(b.state).length&&
d(a.shared.current,".dirty=true;")}function ea(a,c){function d(b){var g=c.shader[b];g&&e.set(f.shader,"."+b,g.append(a,e))}var e=a.proc("scope",3);a.batchId="a2";var f=a.shared,g=f.current;V(a,e,c.context);c.framebuffer&&c.framebuffer.append(a,e);zb(Object.keys(c.state)).forEach(function(b){var d=c.state[b].append(a,e);ma(d)?d.forEach(function(c,d){e.set(a.next[b],"["+d+"]",c)}):e.set(f.next,"."+b,d)});Q(a,e,c,!0,!0);["elements","offset","count","instances","primitive"].forEach(function(b){var d=
c.draw[b];d&&e.set(f.draw,"."+b,""+d.append(a,e))});Object.keys(c.uniforms).forEach(function(d){var g=c.uniforms[d].append(a,e);Array.isArray(g)&&(g="["+g.join()+"]");e.set(f.uniforms,"["+b.id(d)+"]",g)});Object.keys(c.attributes).forEach(function(b){var d=c.attributes[b].append(a,e),f=a.scopeAttrib(b);Object.keys(new ga).forEach(function(a){e.set(f,"."+a,d[a])})});c.scopeVAO&&e.set(f.vao,".targetVAO",c.scopeVAO.append(a,e));d("vert");d("frag");0<Object.keys(c.state).length&&(e(g,".dirty=true;"),
e.exit(g,".dirty=true;"));e("a1(",a.shared.context,",a0,",a.batchId,");")}function ha(a){if("object"===typeof a&&!ma(a)){for(var b=Object.keys(a),c=0;c<b.length;++c)if(Y.isDynamic(a[b[c]]))return!0;return!1}}function ia(a,b,c){function d(a,b){g.forEach(function(c){var d=e[c];Y.isDynamic(d)&&(d=a.invoke(b,d),b(m,".",c,"=",d,";"))})}var e=b["static"][c];if(e&&ha(e)){var f=a.global,g=Object.keys(e),h=!1,k=!1,l=!1,m=a.global.def("{}");g.forEach(function(b){var c=e[b];if(Y.isDynamic(c))"function"===typeof c&&
(c=e[b]=Y.unbox(c)),b=L(c,null),h=h||b.thisDep,l=l||b.propDep,k=k||b.contextDep;else{f(m,".",b,"=");switch(typeof c){case "number":f(c);break;case "string":f('"',c,'"');break;case "object":Array.isArray(c)&&f("[",c.join(),"]");break;default:f(a.link(c))}f(";")}});b.dynamic[c]=new Y.DynamicVariable(4,{thisDep:h,contextDep:k,propDep:l,ref:m,append:d});delete b["static"][c]}}var ga=t.Record,W={add:32774,subtract:32778,"reverse subtract":32779};c.ext_blend_minmax&&(W.min=32775,W.max=32776);var oa=c.angle_instanced_arrays,
Ka=c.webgl_draw_buffers,pa={dirty:!0,profile:h.profile},Ca={},La=[],qa={},ra={};q("dither",3024);q("blend.enable",3042);r("blend.color","blendColor",[0,0,0,0]);r("blend.equation","blendEquationSeparate",[32774,32774]);r("blend.func","blendFuncSeparate",[1,0,1,0]);q("depth.enable",2929,!0);r("depth.func","depthFunc",513);r("depth.range","depthRange",[0,1]);r("depth.mask","depthMask",!0);r("colorMask","colorMask",[!0,!0,!0,!0]);q("cull.enable",2884);r("cull.face","cullFace",1029);r("frontFace","frontFace",
2305);r("lineWidth","lineWidth",1);q("polygonOffset.enable",32823);r("polygonOffset.offset","polygonOffset",[0,0]);q("sample.alpha",32926);q("sample.enable",32928);r("sample.coverage","sampleCoverage",[1,!1]);q("stencil.enable",2960);r("stencil.mask","stencilMask",-1);r("stencil.func","stencilFunc",[519,0,-1]);r("stencil.opFront","stencilOpSeparate",[1028,7680,7680,7680]);r("stencil.opBack","stencilOpSeparate",[1029,7680,7680,7680]);q("scissor.enable",3089);r("scissor.box","scissor",[0,0,a.drawingBufferWidth,
a.drawingBufferHeight]);r("viewport","viewport",[0,0,a.drawingBufferWidth,a.drawingBufferHeight]);var ub={gl:a,context:B,strings:b,next:Ca,current:pa,draw:k,elements:d,buffer:f,shader:w,attributes:t.state,vao:t,uniforms:u,framebuffer:n,extensions:c,timer:l,isBufferArgs:Qa},Na={primTypes:Ta,compareFuncs:ab,blendFuncs:Ea,blendEquations:W,stencilOps:Ra,glTypes:Ia,orientationType:Ab};Ka&&(Na.backBuffer=[1029],Na.drawBuffer=J(e.maxDrawbuffers,function(a){return 0===a?[0]:J(a,function(a){return 36064+a})}));
var na=0;return{next:Ca,current:pa,procs:function(){var a=m(),b=a.proc("poll"),d=a.proc("refresh"),f=a.block();b(f);d(f);var g=a.shared,h=g.gl,k=g.next,l=g.current;f(l,".dirty=false;");R(a,b);R(a,d,null,!0);var n;oa&&(n=a.link(oa));c.oes_vertex_array_object&&d(a.link(c.oes_vertex_array_object),".bindVertexArrayOES(null);");for(var p=0;p<e.maxAttributes;++p){var q=d.def(g.attributes,"[",p,"]"),r=a.cond(q,".buffer");r.then(h,".enableVertexAttribArray(",p,");",h,".bindBuffer(",34962,",",q,".buffer.buffer);",
h,".vertexAttribPointer(",p,",",q,".size,",q,".type,",q,".normalized,",q,".stride,",q,".offset);")["else"](h,".disableVertexAttribArray(",p,");",h,".vertexAttrib4f(",p,",",q,".x,",q,".y,",q,".z,",q,".w);",q,".buffer=null;");d(r);oa&&d(n,".vertexAttribDivisorANGLE(",p,",",q,".divisor);")}d(a.shared.vao,".currentVAO=null;",a.shared.vao,".setVAO(",a.shared.vao,".targetVAO);");Object.keys(qa).forEach(function(c){var e=qa[c],g=f.def(k,".",c),m=a.block();m("if(",g,"){",h,".enable(",e,")}else{",h,".disable(",
e,")}",l,".",c,"=",g,";");d(m);b("if(",g,"!==",l,".",c,"){",m,"}")});Object.keys(ra).forEach(function(c){var e=ra[c],g=pa[c],m,n,p=a.block();p(h,".",e,"(");ma(g)?(e=g.length,m=a.global.def(k,".",c),n=a.global.def(l,".",c),p(J(e,function(a){return m+"["+a+"]"}),");",J(e,function(a){return n+"["+a+"]="+m+"["+a+"];"}).join("")),b("if(",J(e,function(a){return m+"["+a+"]!=="+n+"["+a+"]"}).join("||"),"){",p,"}")):(m=f.def(k,".",c),n=f.def(l,".",c),p(m,");",l,".",c,"=",m,";"),b("if(",m,"!==",n,"){",p,"}"));
d(p)});return a.compile()}(),compile:function(a,b,c,d,e){var f=m();f.stats=f.link(e);Object.keys(b["static"]).forEach(function(a){ia(f,b,a)});Xb.forEach(function(b){ia(f,a,b)});var g=la(a,b,c,d,f);Da(f,g);ea(f,g);da(f,g);return A(f.compile(),{destroy:function(){g.shader.program.destroy()}})}}}function Cb(a,b){for(var c=0;c<a.length;++c)if(a[c]===b)return c;return-1}var A=function(a,b){for(var c=Object.keys(b),e=0;e<c.length;++e)a[c[e]]=b[c[e]];return a},Eb=0,Y={DynamicVariable:U,define:function(a,
b){return new U(a,cb(b+""))},isDynamic:function(a){return"function"===typeof a&&!a._reglType||a instanceof U},unbox:db,accessor:cb},bb={next:"function"===typeof requestAnimationFrame?function(a){return requestAnimationFrame(a)}:function(a){return setTimeout(a,16)},cancel:"function"===typeof cancelAnimationFrame?function(a){return cancelAnimationFrame(a)}:clearTimeout},Db="undefined"!==typeof performance&&performance.now?function(){return performance.now()}:function(){return+new Date},E=hb();E.zero=
hb();var Yb=function(a,b){var c=1;b.ext_texture_filter_anisotropic&&(c=a.getParameter(34047));var e=1,f=1;b.webgl_draw_buffers&&(e=a.getParameter(34852),f=a.getParameter(36063));var d=!!b.oes_texture_float;if(d){d=a.createTexture();a.bindTexture(3553,d);a.texImage2D(3553,0,6408,1,1,0,6408,5126,null);var p=a.createFramebuffer();a.bindFramebuffer(36160,p);a.framebufferTexture2D(36160,36064,3553,d,0);a.bindTexture(3553,null);if(36053!==a.checkFramebufferStatus(36160))d=!1;else{a.viewport(0,0,1,1);a.clearColor(1,
0,0,1);a.clear(16384);var n=E.allocType(5126,4);a.readPixels(0,0,1,1,6408,5126,n);a.getError()?d=!1:(a.deleteFramebuffer(p),a.deleteTexture(d),d=1===n[0]);E.freeType(n)}}n=!0;"undefined"!==typeof navigator&&(/MSIE/.test(navigator.userAgent)||/Trident\//.test(navigator.appVersion)||/Edge/.test(navigator.userAgent))||(n=a.createTexture(),p=E.allocType(5121,36),a.activeTexture(33984),a.bindTexture(34067,n),a.texImage2D(34069,0,6408,3,3,0,6408,5121,p),E.freeType(p),a.bindTexture(34067,null),a.deleteTexture(n),
n=!a.getError());return{colorBits:[a.getParameter(3410),a.getParameter(3411),a.getParameter(3412),a.getParameter(3413)],depthBits:a.getParameter(3414),stencilBits:a.getParameter(3415),subpixelBits:a.getParameter(3408),extensions:Object.keys(b).filter(function(a){return!!b[a]}),maxAnisotropic:c,maxDrawbuffers:e,maxColorAttachments:f,pointSizeDims:a.getParameter(33901),lineWidthDims:a.getParameter(33902),maxViewportDims:a.getParameter(3386),maxCombinedTextureUnits:a.getParameter(35661),maxCubeMapSize:a.getParameter(34076),
maxRenderbufferSize:a.getParameter(34024),maxTextureUnits:a.getParameter(34930),maxTextureSize:a.getParameter(3379),maxAttributes:a.getParameter(34921),maxVertexUniforms:a.getParameter(36347),maxVertexTextureUnits:a.getParameter(35660),maxVaryingVectors:a.getParameter(36348),maxFragmentUniforms:a.getParameter(36349),glsl:a.getParameter(35724),renderer:a.getParameter(7937),vendor:a.getParameter(7936),version:a.getParameter(7938),readFloat:d,npotTextureCube:n}},M=function(a){return a instanceof Uint8Array||
a instanceof Uint16Array||a instanceof Uint32Array||a instanceof Int8Array||a instanceof Int16Array||a instanceof Int32Array||a instanceof Float32Array||a instanceof Float64Array||a instanceof Uint8ClampedArray},S=function(a){return Object.keys(a).map(function(b){return a[b]})},Oa={shape:function(a){for(var b=[];a.length;a=a[0])b.push(a.length);return b},flatten:function(a,b,c,e){var f=1;if(b.length)for(var d=0;d<b.length;++d)f*=b[d];else f=0;c=e||E.allocType(c,f);switch(b.length){case 0:break;case 1:e=
b[0];for(b=0;b<e;++b)c[b]=a[b];break;case 2:e=b[0];b=b[1];for(d=f=0;d<e;++d)for(var p=a[d],n=0;n<b;++n)c[f++]=p[n];break;case 3:ib(a,b[0],b[1],b[2],c,0);break;default:jb(a,b,0,c,0)}return c}},Ga={"[object Int8Array]":5120,"[object Int16Array]":5122,"[object Int32Array]":5124,"[object Uint8Array]":5121,"[object Uint8ClampedArray]":5121,"[object Uint16Array]":5123,"[object Uint32Array]":5125,"[object Float32Array]":5126,"[object Float64Array]":5121,"[object ArrayBuffer]":5121},Ia={int8:5120,int16:5122,
int32:5124,uint8:5121,uint16:5123,uint32:5125,"float":5126,float32:5126},ob={dynamic:35048,stream:35040,"static":35044},Sa=Oa.flatten,mb=Oa.shape,ha=[];ha[5120]=1;ha[5122]=2;ha[5124]=4;ha[5121]=1;ha[5123]=2;ha[5125]=4;ha[5126]=4;var Ta={points:0,point:0,lines:1,line:1,triangles:4,triangle:4,"line loop":2,"line strip":3,"triangle strip":5,"triangle fan":6},qb=new Float32Array(1),Mb=new Uint32Array(qb.buffer),Qb=[9984,9986,9985,9987],Ma=[0,6409,6410,6407,6408],Q={};Q[6409]=Q[6406]=Q[6402]=1;Q[34041]=
Q[6410]=2;Q[6407]=Q[35904]=3;Q[6408]=Q[35906]=4;var Wa=na("HTMLCanvasElement"),Xa=na("OffscreenCanvas"),vb=na("CanvasRenderingContext2D"),wb=na("ImageBitmap"),xb=na("HTMLImageElement"),yb=na("HTMLVideoElement"),Nb=Object.keys(Ga).concat([Wa,Xa,vb,wb,xb,yb]),wa=[];wa[5121]=1;wa[5126]=4;wa[36193]=2;wa[5123]=2;wa[5125]=4;var F=[];F[32854]=2;F[32855]=2;F[36194]=2;F[34041]=4;F[33776]=.5;F[33777]=.5;F[33778]=1;F[33779]=1;F[35986]=.5;F[35987]=1;F[34798]=1;F[35840]=.5;F[35841]=.25;F[35842]=.5;F[35843]=.25;
F[36196]=.5;var T=[];T[32854]=2;T[32855]=2;T[36194]=2;T[33189]=2;T[36168]=1;T[34041]=4;T[35907]=4;T[34836]=16;T[34842]=8;T[34843]=6;var Zb=function(a,b,c,e,f){function d(a){this.id=t++;this.refCount=1;this.renderbuffer=a;this.format=32854;this.height=this.width=0;f.profile&&(this.stats={size:0})}function p(b){var c=b.renderbuffer;a.bindRenderbuffer(36161,null);a.deleteRenderbuffer(c);b.renderbuffer=null;b.refCount=0;delete w[b.id];e.renderbufferCount--}var n={rgba4:32854,rgb565:36194,"rgb5 a1":32855,
depth:33189,stencil:36168,"depth stencil":34041};b.ext_srgb&&(n.srgba=35907);b.ext_color_buffer_half_float&&(n.rgba16f=34842,n.rgb16f=34843);b.webgl_color_buffer_float&&(n.rgba32f=34836);var u=[];Object.keys(n).forEach(function(a){u[n[a]]=a});var t=0,w={};d.prototype.decRef=function(){0>=--this.refCount&&p(this)};f.profile&&(e.getTotalRenderbufferSize=function(){var a=0;Object.keys(w).forEach(function(b){a+=w[b].stats.size});return a});return{create:function(b,c){function l(b,c){var d=0,e=0,k=32854;
"object"===typeof b&&b?("shape"in b?(e=b.shape,d=e[0]|0,e=e[1]|0):("radius"in b&&(d=e=b.radius|0),"width"in b&&(d=b.width|0),"height"in b&&(e=b.height|0)),"format"in b&&(k=n[b.format])):"number"===typeof b?(d=b|0,e="number"===typeof c?c|0:d):b||(d=e=1);if(d!==h.width||e!==h.height||k!==h.format)return l.width=h.width=d,l.height=h.height=e,h.format=k,a.bindRenderbuffer(36161,h.renderbuffer),a.renderbufferStorage(36161,k,d,e),f.profile&&(h.stats.size=T[h.format]*h.width*h.height),l.format=u[h.format],
l}var h=new d(a.createRenderbuffer());w[h.id]=h;e.renderbufferCount++;l(b,c);l.resize=function(b,c){var d=b|0,e=c|0||d;if(d===h.width&&e===h.height)return l;l.width=h.width=d;l.height=h.height=e;a.bindRenderbuffer(36161,h.renderbuffer);a.renderbufferStorage(36161,h.format,d,e);f.profile&&(h.stats.size=T[h.format]*h.width*h.height);return l};l._reglType="renderbuffer";l._renderbuffer=h;f.profile&&(l.stats=h.stats);l.destroy=function(){h.decRef()};return l},clear:function(){S(w).forEach(p)},restore:function(){S(w).forEach(function(b){b.renderbuffer=
a.createRenderbuffer();a.bindRenderbuffer(36161,b.renderbuffer);a.renderbufferStorage(36161,b.format,b.width,b.height)});a.bindRenderbuffer(36161,null)}}},Ya=[];Ya[6408]=4;Ya[6407]=3;var Pa=[];Pa[5121]=1;Pa[5126]=4;Pa[36193]=2;var Ba=["x","y","z","w"],Xb="blend.func blend.equation stencil.func stencil.opFront stencil.opBack sample.coverage viewport scissor.box polygonOffset.offset".split(" "),Ea={0:0,1:1,zero:0,one:1,"src color":768,"one minus src color":769,"src alpha":770,"one minus src alpha":771,
"dst color":774,"one minus dst color":775,"dst alpha":772,"one minus dst alpha":773,"constant color":32769,"one minus constant color":32770,"constant alpha":32771,"one minus constant alpha":32772,"src alpha saturate":776},ab={never:512,less:513,"<":513,equal:514,"=":514,"==":514,"===":514,lequal:515,"<=":515,greater:516,">":516,notequal:517,"!=":517,"!==":517,gequal:518,">=":518,always:519},Ra={0:0,zero:0,keep:7680,replace:7681,increment:7682,decrement:7683,"increment wrap":34055,"decrement wrap":34056,
invert:5386},Ab={cw:2304,ccw:2305},Bb=new K(!1,!1,!1,function(){}),$b=function(a,b){function c(){this.endQueryIndex=this.startQueryIndex=-1;this.sum=0;this.stats=null}function e(a,b,d){var e=p.pop()||new c;e.startQueryIndex=a;e.endQueryIndex=b;e.sum=0;e.stats=d;n.push(e)}if(!b.ext_disjoint_timer_query)return null;var f=[],d=[],p=[],n=[],u=[],t=[];return{beginQuery:function(a){var c=f.pop()||b.ext_disjoint_timer_query.createQueryEXT();b.ext_disjoint_timer_query.beginQueryEXT(35007,c);d.push(c);e(d.length-
1,d.length,a)},endQuery:function(){b.ext_disjoint_timer_query.endQueryEXT(35007)},pushScopeStats:e,update:function(){var a,c;a=d.length;if(0!==a){t.length=Math.max(t.length,a+1);u.length=Math.max(u.length,a+1);u[0]=0;var e=t[0]=0;for(c=a=0;c<d.length;++c){var l=d[c];b.ext_disjoint_timer_query.getQueryObjectEXT(l,34919)?(e+=b.ext_disjoint_timer_query.getQueryObjectEXT(l,34918),f.push(l)):d[a++]=l;u[c+1]=e;t[c+1]=a}d.length=a;for(c=a=0;c<n.length;++c){var e=n[c],h=e.startQueryIndex,l=e.endQueryIndex;
e.sum+=u[l]-u[h];h=t[h];l=t[l];l===h?(e.stats.gpuTime+=e.sum/1E6,p.push(e)):(e.startQueryIndex=h,e.endQueryIndex=l,n[a++]=e)}n.length=a}},getNumPendingQueries:function(){return d.length},clear:function(){f.push.apply(f,d);for(var a=0;a<f.length;a++)b.ext_disjoint_timer_query.deleteQueryEXT(f[a]);d.length=0;f.length=0},restore:function(){d.length=0;f.length=0}}};return function(a){function b(){if(0===C.length)z&&z.update(),aa=null;else{aa=bb.next(b);w();for(var a=C.length-1;0<=a;--a){var c=C[a];c&&
c(G,null,0)}l.flush();z&&z.update()}}function c(){!aa&&0<C.length&&(aa=bb.next(b))}function e(){aa&&(bb.cancel(b),aa=null)}function f(a){a.preventDefault();e();S.forEach(function(a){a()})}function d(a){l.getError();g.restore();D.restore();O.restore();y.restore();L.restore();V.restore();J.restore();z&&z.restore();R.procs.refresh();c();T.forEach(function(a){a()})}function p(a){function b(a,c){var d={},e={};Object.keys(a).forEach(function(b){var f=a[b];if(Y.isDynamic(f))e[b]=Y.unbox(f,b);else{if(c&&
Array.isArray(f))for(var g=0;g<f.length;++g)if(Y.isDynamic(f[g])){e[b]=Y.unbox(f,b);return}d[b]=f}});return{dynamic:e,"static":d}}function c(a){for(;n.length<a;)n.push(null);return n}var d=b(a.context||{},!0),e=b(a.uniforms||{},!0),f=b(a.attributes||{},!1);a=b(function(a){function b(a){if(a in c){var d=c[a];delete c[a];Object.keys(d).forEach(function(b){c[a+"."+b]=d[b]})}}var c=A({},a);delete c.uniforms;delete c.attributes;delete c.context;delete c.vao;"stencil"in c&&c.stencil.op&&(c.stencil.opBack=
c.stencil.opFront=c.stencil.op,delete c.stencil.op);b("blend");b("depth");b("cull");b("stencil");b("polygonOffset");b("scissor");b("sample");"vao"in a&&(c.vao=a.vao);return c}(a),!1);var g={gpuTime:0,cpuTime:0,count:0},h=R.compile(a,f,e,d,g),k=h.draw,l=h.batch,m=h.scope,n=[];return A(function(a,b){var d;if("function"===typeof a)return m.call(this,null,a,0);if("function"===typeof b)if("number"===typeof a)for(d=0;d<a;++d)m.call(this,null,b,d);else if(Array.isArray(a))for(d=0;d<a.length;++d)m.call(this,
a[d],b,d);else return m.call(this,a,b,0);else if("number"===typeof a){if(0<a)return l.call(this,c(a|0),a|0)}else if(Array.isArray(a)){if(a.length)return l.call(this,a,a.length)}else return k.call(this,a)},{stats:g,destroy:function(){h.destroy()}})}function n(a,b){var c=0;R.procs.poll();var d=b.color;d&&(l.clearColor(+d[0]||0,+d[1]||0,+d[2]||0,+d[3]||0),c|=16384);"depth"in b&&(l.clearDepth(+b.depth),c|=256);"stencil"in b&&(l.clearStencil(b.stencil|0),c|=1024);l.clear(c)}function u(a){C.push(a);c();
return{cancel:function(){function b(){var a=Cb(C,b);C[a]=C[C.length-1];--C.length;0>=C.length&&e()}var c=Cb(C,a);C[c]=b}}}function t(){var a=Q.viewport,b=Q.scissor_box;a[0]=a[1]=b[0]=b[1]=0;G.viewportWidth=G.framebufferWidth=G.drawingBufferWidth=a[2]=b[2]=l.drawingBufferWidth;G.viewportHeight=G.framebufferHeight=G.drawingBufferHeight=a[3]=b[3]=l.drawingBufferHeight}function w(){G.tick+=1;G.time=v();t();R.procs.poll()}function k(){y.refresh();t();R.procs.refresh();z&&z.update()}function v(){return(Db()-
E)/1E3}a=Ib(a);if(!a)return null;var l=a.gl,h=l.getContextAttributes();l.isContextLost();var g=Jb(l,a);if(!g)return null;var q=Fb(),r={vaoCount:0,bufferCount:0,elementsCount:0,framebufferCount:0,shaderCount:0,textureCount:0,cubeCount:0,renderbufferCount:0,maxTextureUnits:0},m=g.extensions,z=$b(l,m),E=Db(),F=l.drawingBufferWidth,K=l.drawingBufferHeight,G={tick:0,time:0,viewportWidth:F,viewportHeight:K,framebufferWidth:F,framebufferHeight:K,drawingBufferWidth:F,drawingBufferHeight:K,pixelRatio:a.pixelRatio},
H=Yb(l,m),O=Kb(l,r,a,function(a){return J.destroyBuffer(a)}),J=Sb(l,m,H,r,O),M=Lb(l,m,O,r),D=Tb(l,q,r,a),y=Ob(l,m,H,function(){R.procs.poll()},G,r,a),L=Zb(l,m,H,r,a),V=Rb(l,m,H,y,L,r),R=Wb(l,q,m,H,O,M,y,V,{},J,D,{elements:null,primitive:4,count:-1,offset:0,instances:-1},G,z,a),q=Ub(l,V,R.procs.poll,G,h,m,H),Q=R.next,N=l.canvas,C=[],S=[],T=[],U=[a.onDestroy],aa=null;N&&(N.addEventListener("webglcontextlost",f,!1),N.addEventListener("webglcontextrestored",d,!1));var X=V.setFBO=p({framebuffer:Y.define.call(null,
1,"framebuffer")});k();h=A(p,{clear:function(a){if("framebuffer"in a)if(a.framebuffer&&"framebufferCube"===a.framebuffer_reglType)for(var b=0;6>b;++b)X(A({framebuffer:a.framebuffer.faces[b]},a),n);else X(a,n);else n(null,a)},prop:Y.define.bind(null,1),context:Y.define.bind(null,2),"this":Y.define.bind(null,3),draw:p({}),buffer:function(a){return O.create(a,34962,!1,!1)},elements:function(a){return M.create(a,!1)},texture:y.create2D,cube:y.createCube,renderbuffer:L.create,framebuffer:V.create,framebufferCube:V.createCube,
vao:J.createVAO,attributes:h,frame:u,on:function(a,b){var c;switch(a){case "frame":return u(b);case "lost":c=S;break;case "restore":c=T;break;case "destroy":c=U}c.push(b);return{cancel:function(){for(var a=0;a<c.length;++a)if(c[a]===b){c[a]=c[c.length-1];c.pop();break}}}},limits:H,hasExtension:function(a){return 0<=H.extensions.indexOf(a.toLowerCase())},read:q,destroy:function(){C.length=0;e();N&&(N.removeEventListener("webglcontextlost",f),N.removeEventListener("webglcontextrestored",d));D.clear();
V.clear();L.clear();y.clear();M.clear();O.clear();J.clear();z&&z.clear();U.forEach(function(a){a()})},_gl:l,_refresh:k,poll:function(){w();z&&z.update()},now:v,stats:r});a.onDone(null,h);return h}});

},{}],20:[function(require,module,exports){
// A library of seedable RNGs implemented in Javascript.
//
// Usage:
//
// var seedrandom = require('seedrandom');
// var random = seedrandom(1); // or any seed.
// var x = random();       // 0 <= x < 1.  Every bit is random.
// var x = random.quick(); // 0 <= x < 1.  32 bits of randomness.

// alea, a 53-bit multiply-with-carry generator by Johannes Baagøe.
// Period: ~2^116
// Reported to pass all BigCrush tests.
var alea = require('./lib/alea');

// xor128, a pure xor-shift generator by George Marsaglia.
// Period: 2^128-1.
// Reported to fail: MatrixRank and LinearComp.
var xor128 = require('./lib/xor128');

// xorwow, George Marsaglia's 160-bit xor-shift combined plus weyl.
// Period: 2^192-2^32
// Reported to fail: CollisionOver, SimpPoker, and LinearComp.
var xorwow = require('./lib/xorwow');

// xorshift7, by François Panneton and Pierre L'ecuyer, takes
// a different approach: it adds robustness by allowing more shifts
// than Marsaglia's original three.  It is a 7-shift generator
// with 256 bits, that passes BigCrush with no systmatic failures.
// Period 2^256-1.
// No systematic BigCrush failures reported.
var xorshift7 = require('./lib/xorshift7');

// xor4096, by Richard Brent, is a 4096-bit xor-shift with a
// very long period that also adds a Weyl generator. It also passes
// BigCrush with no systematic failures.  Its long period may
// be useful if you have many generators and need to avoid
// collisions.
// Period: 2^4128-2^32.
// No systematic BigCrush failures reported.
var xor4096 = require('./lib/xor4096');

// Tyche-i, by Samuel Neves and Filipe Araujo, is a bit-shifting random
// number generator derived from ChaCha, a modern stream cipher.
// https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf
// Period: ~2^127
// No systematic BigCrush failures reported.
var tychei = require('./lib/tychei');

// The original ARC4-based prng included in this library.
// Period: ~2^1600
var sr = require('./seedrandom');

sr.alea = alea;
sr.xor128 = xor128;
sr.xorwow = xorwow;
sr.xorshift7 = xorshift7;
sr.xor4096 = xor4096;
sr.tychei = tychei;

module.exports = sr;

},{"./lib/alea":21,"./lib/tychei":22,"./lib/xor128":23,"./lib/xor4096":24,"./lib/xorshift7":25,"./lib/xorwow":26,"./seedrandom":27}],21:[function(require,module,exports){
// A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
// http://baagoe.com/en/RandomMusings/javascript/
// https://github.com/nquinlan/better-random-numbers-for-javascript-mirror
// Original work is under MIT license -

// Copyright (C) 2010 by Johannes Baagøe <baagoe@baagoe.org>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.



(function(global, module, define) {

function Alea(seed) {
  var me = this, mash = Mash();

  me.next = function() {
    var t = 2091639 * me.s0 + me.c * 2.3283064365386963e-10; // 2^-32
    me.s0 = me.s1;
    me.s1 = me.s2;
    return me.s2 = t - (me.c = t | 0);
  };

  // Apply the seeding algorithm from Baagoe.
  me.c = 1;
  me.s0 = mash(' ');
  me.s1 = mash(' ');
  me.s2 = mash(' ');
  me.s0 -= mash(seed);
  if (me.s0 < 0) { me.s0 += 1; }
  me.s1 -= mash(seed);
  if (me.s1 < 0) { me.s1 += 1; }
  me.s2 -= mash(seed);
  if (me.s2 < 0) { me.s2 += 1; }
  mash = null;
}

function copy(f, t) {
  t.c = f.c;
  t.s0 = f.s0;
  t.s1 = f.s1;
  t.s2 = f.s2;
  return t;
}

function impl(seed, opts) {
  var xg = new Alea(seed),
      state = opts && opts.state,
      prng = xg.next;
  prng.int32 = function() { return (xg.next() * 0x100000000) | 0; }
  prng.double = function() {
    return prng() + (prng() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
  };
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

function Mash() {
  var n = 0xefc8249d;

  var mash = function(data) {
    data = data.toString();
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  return mash;
}


if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.alea = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],22:[function(require,module,exports){
// A Javascript implementaion of the "Tyche-i" prng algorithm by
// Samuel Neves and Filipe Araujo.
// See https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  // Set up generator function.
  me.next = function() {
    var b = me.b, c = me.c, d = me.d, a = me.a;
    b = (b << 25) ^ (b >>> 7) ^ c;
    c = (c - d) | 0;
    d = (d << 24) ^ (d >>> 8) ^ a;
    a = (a - b) | 0;
    me.b = b = (b << 20) ^ (b >>> 12) ^ c;
    me.c = c = (c - d) | 0;
    me.d = (d << 16) ^ (c >>> 16) ^ a;
    return me.a = (a - b) | 0;
  };

  /* The following is non-inverted tyche, which has better internal
   * bit diffusion, but which is about 25% slower than tyche-i in JS.
  me.next = function() {
    var a = me.a, b = me.b, c = me.c, d = me.d;
    a = (me.a + me.b | 0) >>> 0;
    d = me.d ^ a; d = d << 16 ^ d >>> 16;
    c = me.c + d | 0;
    b = me.b ^ c; b = b << 12 ^ d >>> 20;
    me.a = a = a + b | 0;
    d = d ^ a; me.d = d = d << 8 ^ d >>> 24;
    me.c = c = c + d | 0;
    b = b ^ c;
    return me.b = (b << 7 ^ b >>> 25);
  }
  */

  me.a = 0;
  me.b = 0;
  me.c = 2654435769 | 0;
  me.d = 1367130551;

  if (seed === Math.floor(seed)) {
    // Integer seed.
    me.a = (seed / 0x100000000) | 0;
    me.b = seed | 0;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 20; k++) {
    me.b ^= strseed.charCodeAt(k) | 0;
    me.next();
  }
}

function copy(f, t) {
  t.a = f.a;
  t.b = f.b;
  t.c = f.c;
  t.d = f.d;
  return t;
};

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.tychei = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],23:[function(require,module,exports){
// A Javascript implementaion of the "xor128" prng algorithm by
// George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  me.x = 0;
  me.y = 0;
  me.z = 0;
  me.w = 0;

  // Set up generator function.
  me.next = function() {
    var t = me.x ^ (me.x << 11);
    me.x = me.y;
    me.y = me.z;
    me.z = me.w;
    return me.w ^= (me.w >>> 19) ^ t ^ (t >>> 8);
  };

  if (seed === (seed | 0)) {
    // Integer seed.
    me.x = seed;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 64; k++) {
    me.x ^= strseed.charCodeAt(k) | 0;
    me.next();
  }
}

function copy(f, t) {
  t.x = f.x;
  t.y = f.y;
  t.z = f.z;
  t.w = f.w;
  return t;
}

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xor128 = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],24:[function(require,module,exports){
// A Javascript implementaion of Richard Brent's Xorgens xor4096 algorithm.
//
// This fast non-cryptographic random number generator is designed for
// use in Monte-Carlo algorithms. It combines a long-period xorshift
// generator with a Weyl generator, and it passes all common batteries
// of stasticial tests for randomness while consuming only a few nanoseconds
// for each prng generated.  For background on the generator, see Brent's
// paper: "Some long-period random number generators using shifts and xors."
// http://arxiv.org/pdf/1004.3115v1.pdf
//
// Usage:
//
// var xor4096 = require('xor4096');
// random = xor4096(1);                        // Seed with int32 or string.
// assert.equal(random(), 0.1520436450538547); // (0, 1) range, 53 bits.
// assert.equal(random.int32(), 1806534897);   // signed int32, 32 bits.
//
// For nonzero numeric keys, this impelementation provides a sequence
// identical to that by Brent's xorgens 3 implementaion in C.  This
// implementation also provides for initalizing the generator with
// string seeds, or for saving and restoring the state of the generator.
//
// On Chrome, this prng benchmarks about 2.1 times slower than
// Javascript's built-in Math.random().

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    var w = me.w,
        X = me.X, i = me.i, t, v;
    // Update Weyl generator.
    me.w = w = (w + 0x61c88647) | 0;
    // Update xor generator.
    v = X[(i + 34) & 127];
    t = X[i = ((i + 1) & 127)];
    v ^= v << 13;
    t ^= t << 17;
    v ^= v >>> 15;
    t ^= t >>> 12;
    // Update Xor generator array state.
    v = X[i] = v ^ t;
    me.i = i;
    // Result is the combination.
    return (v + (w ^ (w >>> 16))) | 0;
  };

  function init(me, seed) {
    var t, v, i, j, w, X = [], limit = 128;
    if (seed === (seed | 0)) {
      // Numeric seeds initialize v, which is used to generates X.
      v = seed;
      seed = null;
    } else {
      // String seeds are mixed into v and X one character at a time.
      seed = seed + '\0';
      v = 0;
      limit = Math.max(limit, seed.length);
    }
    // Initialize circular array and weyl value.
    for (i = 0, j = -32; j < limit; ++j) {
      // Put the unicode characters into the array, and shuffle them.
      if (seed) v ^= seed.charCodeAt((j + 32) % seed.length);
      // After 32 shuffles, take v as the starting w value.
      if (j === 0) w = v;
      v ^= v << 10;
      v ^= v >>> 15;
      v ^= v << 4;
      v ^= v >>> 13;
      if (j >= 0) {
        w = (w + 0x61c88647) | 0;     // Weyl.
        t = (X[j & 127] ^= (v + w));  // Combine xor and weyl to init array.
        i = (0 == t) ? i + 1 : 0;     // Count zeroes.
      }
    }
    // We have detected all zeroes; make the key nonzero.
    if (i >= 128) {
      X[(seed && seed.length || 0) & 127] = -1;
    }
    // Run the generator 512 times to further mix the state before using it.
    // Factoring this as a function slows the main generator, so it is just
    // unrolled here.  The weyl generator is not advanced while warming up.
    i = 127;
    for (j = 4 * 128; j > 0; --j) {
      v = X[(i + 34) & 127];
      t = X[i = ((i + 1) & 127)];
      v ^= v << 13;
      t ^= t << 17;
      v ^= v >>> 15;
      t ^= t >>> 12;
      X[i] = v ^ t;
    }
    // Storing state as object members is faster than using closure variables.
    me.w = w;
    me.X = X;
    me.i = i;
  }

  init(me, seed);
}

function copy(f, t) {
  t.i = f.i;
  t.w = f.w;
  t.X = f.X.slice();
  return t;
};

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.X) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xor4096 = impl;
}

})(
  this,                                     // window object or global
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);

},{}],25:[function(require,module,exports){
// A Javascript implementaion of the "xorshift7" algorithm by
// François Panneton and Pierre L'ecuyer:
// "On the Xorgshift Random Number Generators"
// http://saluc.engr.uconn.edu/refs/crypto/rng/panneton05onthexorshift.pdf

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    // Update xor generator.
    var X = me.x, i = me.i, t, v, w;
    t = X[i]; t ^= (t >>> 7); v = t ^ (t << 24);
    t = X[(i + 1) & 7]; v ^= t ^ (t >>> 10);
    t = X[(i + 3) & 7]; v ^= t ^ (t >>> 3);
    t = X[(i + 4) & 7]; v ^= t ^ (t << 7);
    t = X[(i + 7) & 7]; t = t ^ (t << 13); v ^= t ^ (t << 9);
    X[i] = v;
    me.i = (i + 1) & 7;
    return v;
  };

  function init(me, seed) {
    var j, w, X = [];

    if (seed === (seed | 0)) {
      // Seed state array using a 32-bit integer.
      w = X[0] = seed;
    } else {
      // Seed state using a string.
      seed = '' + seed;
      for (j = 0; j < seed.length; ++j) {
        X[j & 7] = (X[j & 7] << 15) ^
            (seed.charCodeAt(j) + X[(j + 1) & 7] << 13);
      }
    }
    // Enforce an array length of 8, not all zeroes.
    while (X.length < 8) X.push(0);
    for (j = 0; j < 8 && X[j] === 0; ++j);
    if (j == 8) w = X[7] = -1; else w = X[j];

    me.x = X;
    me.i = 0;

    // Discard an initial 256 values.
    for (j = 256; j > 0; --j) {
      me.next();
    }
  }

  init(me, seed);
}

function copy(f, t) {
  t.x = f.x.slice();
  t.i = f.i;
  return t;
}

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.x) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xorshift7 = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);


},{}],26:[function(require,module,exports){
// A Javascript implementaion of the "xorwow" prng algorithm by
// George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  // Set up generator function.
  me.next = function() {
    var t = (me.x ^ (me.x >>> 2));
    me.x = me.y; me.y = me.z; me.z = me.w; me.w = me.v;
    return (me.d = (me.d + 362437 | 0)) +
       (me.v = (me.v ^ (me.v << 4)) ^ (t ^ (t << 1))) | 0;
  };

  me.x = 0;
  me.y = 0;
  me.z = 0;
  me.w = 0;
  me.v = 0;

  if (seed === (seed | 0)) {
    // Integer seed.
    me.x = seed;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 64; k++) {
    me.x ^= strseed.charCodeAt(k) | 0;
    if (k == strseed.length) {
      me.d = me.x << 10 ^ me.x >>> 4;
    }
    me.next();
  }
}

function copy(f, t) {
  t.x = f.x;
  t.y = f.y;
  t.z = f.z;
  t.w = f.w;
  t.v = f.v;
  t.d = f.d;
  return t;
}

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xorwow = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],27:[function(require,module,exports){
/*
Copyright 2014 David Bau.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

(function (pool, math) {
//
// The following constants are related to IEEE 754 limits.
//

// Detect the global object, even if operating in strict mode.
// http://stackoverflow.com/a/14387057/265298
var global = (0, eval)('this'),
    width = 256,        // each RC4 output is 0 <= x < 256
    chunks = 6,         // at least six RC4 outputs for each double
    digits = 52,        // there are 52 significant digits in a double
    rngname = 'random', // rngname: name for Math.random and Math.seedrandom
    startdenom = math.pow(width, chunks),
    significance = math.pow(2, digits),
    overflow = significance * 2,
    mask = width - 1,
    nodecrypto;         // node.js crypto module, initialized at the bottom.

//
// seedrandom()
// This is the seedrandom function described above.
//
function seedrandom(seed, options, callback) {
  var key = [];
  options = (options == true) ? { entropy: true } : (options || {});

  // Flatten the seed string or build one from local entropy if needed.
  var shortseed = mixkey(flatten(
    options.entropy ? [seed, tostring(pool)] :
    (seed == null) ? autoseed() : seed, 3), key);

  // Use the seed to initialize an ARC4 generator.
  var arc4 = new ARC4(key);

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.
  var prng = function() {
    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
        d = startdenom,                 //   and denominator d = 2 ^ 48.
        x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  };

  prng.int32 = function() { return arc4.g(4) | 0; }
  prng.quick = function() { return arc4.g(4) / 0x100000000; }
  prng.double = prng;

  // Mix the randomness into accumulated entropy.
  mixkey(tostring(arc4.S), pool);

  // Calling convention: what to return as a function of prng, seed, is_math.
  return (options.pass || callback ||
      function(prng, seed, is_math_call, state) {
        if (state) {
          // Load the arc4 state from the given state if it has an S array.
          if (state.S) { copy(state, arc4); }
          // Only provide the .state method if requested via options.state.
          prng.state = function() { return copy(arc4, {}); }
        }

        // If called as a method of Math (Math.seedrandom()), mutate
        // Math.random because that is how seedrandom.js has worked since v1.0.
        if (is_math_call) { math[rngname] = prng; return seed; }

        // Otherwise, it is a newer calling convention, so return the
        // prng directly.
        else return prng;
      })(
  prng,
  shortseed,
  'global' in options ? options.global : (this == math),
  options.state);
}
math['seed' + rngname] = seedrandom;

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
function ARC4(key) {
  var t, keylen = key.length,
      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) {
    s[i] = i++;
  }
  for (i = 0; i < width; i++) {
    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
    s[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  (me.g = function(count) {
    // Using instance members instead of closure state nearly doubles speed.
    var t, r = 0,
        i = me.i, j = me.j, s = me.S;
    while (count--) {
      t = s[i = mask & (i + 1)];
      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
    }
    me.i = i; me.j = j;
    return r;
    // For robust unpredictability, the function call below automatically
    // discards an initial batch of values.  This is called RC4-drop[256].
    // See http://google.com/search?q=rsa+fluhrer+response&btnI
  })(width);
}

//
// copy()
// Copies internal state of ARC4 to or from a plain object.
//
function copy(f, t) {
  t.i = f.i;
  t.j = f.j;
  t.S = f.S.slice();
  return t;
};

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
function flatten(obj, depth) {
  var result = [], typ = (typeof obj), prop;
  if (depth && typ == 'object') {
    for (prop in obj) {
      try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
    }
  }
  return (result.length ? result : typ == 'string' ? obj : obj + '\0');
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
function mixkey(seed, key) {
  var stringseed = seed + '', smear, j = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }
  return tostring(key);
}

//
// autoseed()
// Returns an object for autoseeding, using window.crypto and Node crypto
// module if available.
//
function autoseed() {
  try {
    var out;
    if (nodecrypto && (out = nodecrypto.randomBytes)) {
      // The use of 'out' to remember randomBytes makes tight minified code.
      out = out(width);
    } else {
      out = new Uint8Array(width);
      (global.crypto || global.msCrypto).getRandomValues(out);
    }
    return tostring(out);
  } catch (e) {
    var browser = global.navigator,
        plugins = browser && browser.plugins;
    return [+new Date, global, plugins, global.screen, tostring(pool)];
  }
}

//
// tostring()
// Converts an array of charcodes to a string
//
function tostring(a) {
  return String.fromCharCode.apply(0, a);
}

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to interfere with deterministic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
mixkey(math.random(), pool);

//
// Nodejs and AMD support: export the implementation as a module using
// either convention.
//
if ((typeof module) == 'object' && module.exports) {
  module.exports = seedrandom;
  // When in node.js, try using crypto package for autoseeding.
  try {
    nodecrypto = require('crypto');
  } catch (ex) {}
} else if ((typeof define) == 'function' && define.amd) {
  define(function() { return seedrandom; });
}

// End anonymous scope, and pass initial values.
})(
  [],     // pool: entropy pool starts empty
  Math    // math: package containing random, pow, and seedrandom
);

},{"crypto":2}],28:[function(require,module,exports){
/**
sprintf() for JavaScript 0.7-beta1
http://www.diveintojavascript.com/projects/javascript-sprintf

Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of sprintf() for JavaScript nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


Changelog:
2010.11.07 - 0.7-beta1-node
  - converted it to a node.js compatible module

2010.09.06 - 0.7-beta1
  - features: vsprintf, support for named placeholders
  - enhancements: format cache, reduced global namespace pollution

2010.05.22 - 0.6:
 - reverted to 0.4 and fixed the bug regarding the sign of the number 0
 Note:
 Thanks to Raphael Pigulla <raph (at] n3rd [dot) org> (http://www.n3rd.org/)
 who warned me about a bug in 0.5, I discovered that the last update was
 a regress. I appologize for that.

2010.05.09 - 0.5:
 - bug fix: 0 is now preceeded with a + sign
 - bug fix: the sign was not at the right position on padded results (Kamal Abdali)
 - switched from GPL to BSD license

2007.10.21 - 0.4:
 - unit test and patch (David Baird)

2007.09.17 - 0.3:
 - bug fix: no longer throws exception on empty paramenters (Hans Pufal)

2007.09.11 - 0.2:
 - feature: added argument swapping

2007.04.03 - 0.1:
 - initial release
**/

var sprintf = (function() {
	function get_type(variable) {
		return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
	}
	function str_repeat(input, multiplier) {
		for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
		return output.join('');
	}

	var str_format = function() {
		if (!str_format.cache.hasOwnProperty(arguments[0])) {
			str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
		}
		return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
	};

	// convert object to simple one line string without indentation or
	// newlines. Note that this implementation does not print array
	// values to their actual place for sparse arrays. 
	//
	// For example sparse array like this
	//    l = []
	//    l[4] = 1
	// Would be printed as "[1]" instead of "[, , , , 1]"
	// 
	// If argument 'seen' is not null and array the function will check for 
	// circular object references from argument.
	str_format.object_stringify = function(obj, depth, maxdepth, seen) {
		var str = '';
		if (obj != null) {
			switch( typeof(obj) ) {
			case 'function': 
				return '[Function' + (obj.name ? ': '+obj.name : '') + ']';
			    break;
			case 'object':
				if ( obj instanceof Error) { return '[' + obj.toString() + ']' };
				if (depth >= maxdepth) return '[Object]'
				if (seen) {
					// add object to seen list
					seen = seen.slice(0)
					seen.push(obj);
				}
				if (obj.length != null) { //array
					str += '[';
					var arr = []
					for (var i in obj) {
						if (seen && seen.indexOf(obj[i]) >= 0) arr.push('[Circular]');
						else arr.push(str_format.object_stringify(obj[i], depth+1, maxdepth, seen));
					}
					str += arr.join(', ') + ']';
				} else if ('getMonth' in obj) { // date
					return 'Date(' + obj + ')';
				} else { // object
					str += '{';
					var arr = []
					for (var k in obj) { 
						if(obj.hasOwnProperty(k)) {
							if (seen && seen.indexOf(obj[k]) >= 0) arr.push(k + ': [Circular]');
							else arr.push(k +': ' +str_format.object_stringify(obj[k], depth+1, maxdepth, seen)); 
						}
					}
					str += arr.join(', ') + '}';
				}
				return str;
				break;
			case 'string':				
				return '"' + obj + '"';
				break
			}
		}
		return '' + obj;
	}

	str_format.format = function(parse_tree, argv) {
		var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
		for (i = 0; i < tree_length; i++) {
			node_type = get_type(parse_tree[i]);
			if (node_type === 'string') {
				output.push(parse_tree[i]);
			}
			else if (node_type === 'array') {
				match = parse_tree[i]; // convenience purposes only
				if (match[2]) { // keyword argument
					arg = argv[cursor];
					for (k = 0; k < match[2].length; k++) {
						if (!arg.hasOwnProperty(match[2][k])) {
							throw new Error(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
						}
						arg = arg[match[2][k]];
					}
				}
				else if (match[1]) { // positional argument (explicit)
					arg = argv[match[1]];
				}
				else { // positional argument (implicit)
					arg = argv[cursor++];
				}

				if (/[^sO]/.test(match[8]) && (get_type(arg) != 'number')) {
					throw new Error(sprintf('[sprintf] expecting number but found %s "' + arg + '"', get_type(arg)));
				}
				switch (match[8]) {
					case 'b': arg = arg.toString(2); break;
					case 'c': arg = String.fromCharCode(arg); break;
					case 'd': arg = parseInt(arg, 10); break;
					case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
					case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
				    case 'O': arg = str_format.object_stringify(arg, 0, parseInt(match[7]) || 5); break;
					case 'o': arg = arg.toString(8); break;
					case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
					case 'u': arg = Math.abs(arg); break;
					case 'x': arg = arg.toString(16); break;
					case 'X': arg = arg.toString(16).toUpperCase(); break;
				}
				arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
				pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
				pad_length = match[6] - String(arg).length;
				pad = match[6] ? str_repeat(pad_character, pad_length) : '';
				output.push(match[5] ? arg + pad : pad + arg);
			}
		}
		return output.join('');
	};

	str_format.cache = {};

	str_format.parse = function(fmt) {
		var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
		while (_fmt) {
			if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
				parse_tree.push(match[0]);
			}
			else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
				parse_tree.push('%');
			}
			else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosOuxX])/.exec(_fmt)) !== null) {
				if (match[2]) {
					arg_names |= 1;
					var field_list = [], replacement_field = match[2], field_match = [];
					if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
						field_list.push(field_match[1]);
						while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
							if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else {
								throw new Error('[sprintf] ' + replacement_field);
							}
						}
					}
					else {
                        throw new Error('[sprintf] ' + replacement_field);
					}
					match[2] = field_list;
				}
				else {
					arg_names |= 2;
				}
				if (arg_names === 3) {
					throw new Error('[sprintf] mixing positional and named placeholders is not (yet) supported');
				}
				parse_tree.push(match);
			}
			else {
				throw new Error('[sprintf] ' + _fmt);
			}
			_fmt = _fmt.substring(match[0].length);
		}
		return parse_tree;
	};

	return str_format;
})();

var vsprintf = function(fmt, argv) {
	var argvClone = argv.slice();
	argvClone.unshift(fmt);
	return sprintf.apply(null, argvClone);
};

module.exports = sprintf;
sprintf.sprintf = sprintf;
sprintf.vsprintf = vsprintf;

},{}],29:[function(require,module,exports){
'use strict';

var isNil      = require('is-nil');
var isSymbol   = require('is-symbol');
var isObject   = require('is-object');
var isFunction = require('is-function');

var NAN = 0 / 0;

module.exports = function (value) {

  if (isNil(value)) {
    return 0;
  }

  var type = typeof value;

  if (type === 'number') {
    return value;
  } else if (type === 'boolean') {
    return value ? 1 : 0;
  }

  if (isSymbol(value)) {
    return NAN;
  }

  if (isObject(value)) {

    var raw = isFunction(value.valueOf) ? value.valueOf() : value;

    value = isObject(raw) ? (raw + '') : raw;
  }


  type = typeof value;
  if (type !== 'string') {
    return type === 'number' ? value : parseInt(value, 10);
  }


  // trim
  value = value.replace(/^\s+|\s+$/g, '');


  if (/^0b[01]+$/i.test(value)) {
    return parseInt(value.slice(2), 2);
  } else if (/^0o[0-7]+$/i.test(value)) {
    return parseInt(value.slice(2), 8);
  } else if (/^0x[0-9a-f]+$/i.test(value)) {
    return parseInt(value.slice(2), 16);
  }

  if(/^0b/i.test(value)||/^0o/i.test(value)||/^[\+\-]?0x/i.test(value)){
    return NAN;
  }

  return parseInt(value, 10);
};

},{"is-function":9,"is-nil":10,"is-object":11,"is-symbol":12}],30:[function(require,module,exports){
'use strict';

/* global Symbol */

var isNil      = require('is-nil');
var isSymbol   = require('is-symbol');
var isObject   = require('is-object');
var isFunction = require('is-function');

module.exports = function (value) {

  if (typeof value === 'string') {
    return value;
  }

  if (isNil(value)) {
    return '';
  }

  if (isSymbol(value)) {
    return Symbol.prototype.toString.call(value);
  }

  if (isObject(value) && isFunction(value.toString)) {
    return value.toString();
  }

  var result = '' + value;

  return (result === '0' && (1 / value) === -1 / 0) ? '-0' : result;
};

},{"is-function":9,"is-nil":10,"is-object":11,"is-symbol":12}],31:[function(require,module,exports){
'use strict';

/*!
 * Procedural Badlands - Procedurally generated terrain.
 *
 * Licensed under MIT (https://github.com/bhudiaxyz/procedural-badlands/blob/master/LICENSE)
 *
 * Based on works of Rye Terrell (aka wwwtyro): https://github.com/wwwtyro/badlands
 */

const glslify = require('glslify');

module.exports = function (regl) {

  const cmd = {};

  cmd.copy = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n    uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tSource;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_FragColor = texture2D(tSource, uv);\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: { tSource: regl.prop('source') },
    viewport: regl.prop('vpScreen'),
    depth: { enable: false },
    framebuffer: regl.prop('destination')
  });

  cmd.position = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec3 position;\n\nuniform sampler2D tNoise;\nuniform mat4 model, view, projection;\nuniform float tNoiseSize, height, scale;\n\nvarying vec3 vPos;\n\nfloat smootherstep(float a, float b, float r) {\n    r = clamp(r, 0.0, 1.0);\n    r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);\n\n    return mix(a, b, r);\n}\n\nfloat perlin2D(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    vec2 p0 = floor(p);\n    vec2 p1 = p0 + vec2(1, 0);\n    vec2 p2 = p0 + vec2(1, 1);\n    vec2 p3 = p0 + vec2(0, 1);\n\n    vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;\n    vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;\n    vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;\n    vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;\n\n    vec2 p0p = p - p0;\n    vec2 p1p = p - p1;\n    vec2 p2p = p - p2;\n    vec2 p3p = p - p3;\n\n    float dp0 = dot(d0, p0p);\n    float dp1 = dot(d1, p1p);\n    float dp2 = dot(d2, p2p);\n    float dp3 = dot(d3, p3p);\n\n    float fx = p.x - p0.x;\n    float fy = p.y - p0.y;\n    float m01 = smootherstep(dp0, dp1, fx);\n    float m32 = smootherstep(dp3, dp2, fx);\n    float m01m32 = smootherstep(m01, m32, fy);\n\n    return m01m32;\n}\n\nfloat perlin2D_normal_1604150559(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    return perlin2D(p, tNoise, tNoiseSize) * 0.5 + 0.5;\n}\n\nfloat cursive_noise_1117569599(vec2 p, float scale, sampler2D tNoise, float tNoiseSize) {\n    const int steps = 13;\n    float sigma = 0.7;\n    float gamma = pow(1.0/sigma, float(steps));\n    vec2 displace = vec2(0);\n    for (int i = 0; i < steps; i++) {\n        displace = 1.5 * vec2(\n            perlin2D_normal_1604150559(p.xy * gamma + displace, tNoise, tNoiseSize),\n            perlin2D_normal_1604150559(p.yx * gamma + displace, tNoise, tNoiseSize)\n        );\n        gamma *= sigma;\n    }\n\n    return perlin2D_normal_1604150559(p * gamma + displace, tNoise, tNoiseSize);\n}\n\nfloat height_0(vec2 p, float scale, float height, sampler2D tNoise, float tNoiseSize) {\n    p = p * 0.001 * scale;\n    p += 11.0;\n    float h = cursive_noise_1117569599(p, scale, tNoise, tNoiseSize) * height * 1.0;\n    h += pow(perlin2D_normal_1604150559(p * 0.25, tNoise, tNoiseSize) + 0.25, 4.0) * height * 3.0;\n    h = mix(perlin2D_normal_1604150559(p * 0.4, tNoise, tNoiseSize) * height * 1.0, h, h/(height*4.0));\n\n    return h;\n}\n\nvoid main() {\n    vec4 p = model * vec4(position, 1);\n    p.y = height_0(p.xz, scale, height, tNoise, tNoiseSize);\n    gl_Position = projection * view * p;\n    vPos = p.xyz;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nvarying vec3 vPos;\n\nvoid main() {\n    gl_FragColor = vec4(vPos, 1);\n}\n"]),
    attributes: {
      position: regl.prop('position')
    },
    elements: regl.prop('elements'),
    uniforms: {
      model: regl.prop('model'),
      view: regl.prop('view'),
      projection: regl.prop('projection'),
      tNoise: regl.prop('tNoise'),
      tNoiseSize: regl.prop('tNoiseSize'),
      height: regl.prop('height'),
      scale: regl.prop('scale')
    },
    viewport: regl.prop('vpScreen'),
    cull: {
      enable: true,
      face: 'back'
    },
    depth: { enable: true },
    framebuffer: regl.prop('destination')
  });

  cmd.height = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n    uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tNoise;\nuniform float tNoiseSize, scale, height, dist;\nuniform bool origin;\n\nvarying vec2 uv;\n\nfloat smootherstep(float a, float b, float r) {\n    r = clamp(r, 0.0, 1.0);\n    r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);\n\n    return mix(a, b, r);\n}\n\nfloat perlin2D(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    vec2 p0 = floor(p);\n    vec2 p1 = p0 + vec2(1, 0);\n    vec2 p2 = p0 + vec2(1, 1);\n    vec2 p3 = p0 + vec2(0, 1);\n\n    vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;\n    vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;\n    vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;\n    vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;\n\n    vec2 p0p = p - p0;\n    vec2 p1p = p - p1;\n    vec2 p2p = p - p2;\n    vec2 p3p = p - p3;\n\n    float dp0 = dot(d0, p0p);\n    float dp1 = dot(d1, p1p);\n    float dp2 = dot(d2, p2p);\n    float dp3 = dot(d3, p3p);\n\n    float fx = p.x - p0.x;\n    float fy = p.y - p0.y;\n    float m01 = smootherstep(dp0, dp1, fx);\n    float m32 = smootherstep(dp3, dp2, fx);\n    float m01m32 = smootherstep(m01, m32, fy);\n\n    return m01m32;\n}\n\nfloat perlin2D_normal_1604150559(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    return perlin2D(p, tNoise, tNoiseSize) * 0.5 + 0.5;\n}\n\nfloat cursive_noise_1117569599(vec2 p, float scale, sampler2D tNoise, float tNoiseSize) {\n    const int steps = 13;\n    float sigma = 0.7;\n    float gamma = pow(1.0/sigma, float(steps));\n    vec2 displace = vec2(0);\n    for (int i = 0; i < steps; i++) {\n        displace = 1.5 * vec2(\n            perlin2D_normal_1604150559(p.xy * gamma + displace, tNoise, tNoiseSize),\n            perlin2D_normal_1604150559(p.yx * gamma + displace, tNoise, tNoiseSize)\n        );\n        gamma *= sigma;\n    }\n\n    return perlin2D_normal_1604150559(p * gamma + displace, tNoise, tNoiseSize);\n}\n\nfloat height_0(vec2 p, float scale, float height, sampler2D tNoise, float tNoiseSize) {\n    p = p * 0.001 * scale;\n    p += 11.0;\n    float h = cursive_noise_1117569599(p, scale, tNoise, tNoiseSize) * height * 1.0;\n    h += pow(perlin2D_normal_1604150559(p * 0.25, tNoise, tNoiseSize) + 0.25, 4.0) * height * 3.0;\n    h = mix(perlin2D_normal_1604150559(p * 0.4, tNoise, tNoiseSize) * height * 1.0, h, h/(height*4.0));\n\n    return h;\n}\n\nvoid main() {\n    vec2 p = uv * 2.0 - 1.0;\n    if (origin) p = vec2(0);\n\n    float h = height_0(p * dist, scale, height, tNoise, tNoiseSize);\n    gl_FragColor = vec4(h);\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: {
      tNoise: regl.prop('tNoise'),
      tNoiseSize: regl.prop('tNoiseSize'),
      scale: regl.prop('scale'),
      height: regl.prop('height'),
      dist: regl.prop('horizon'),
      origin: regl.prop('origin')
    },
    viewport: regl.prop('vpHmap'),
    depth: { enable: false },
    framebuffer: regl.prop('destination')
  });

  cmd.sky = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n    uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform mat4 _invpv;\nuniform vec3 sunDir;\n\nvarying vec2 uv;\n\n#define PI 3.141592\n#define iSteps 16\n#define jSteps 8\n\nvec2 rsi(vec3 r0, vec3 rd, float sr) {\n    // ray-sphere intersection that assumes\n    // the sphere is centered at the origin.\n    // No intersection when result.x > result.y\n    float a = dot(rd, rd);\n    float b = 2.0 * dot(rd, r0);\n    float c = dot(r0, r0) - (sr * sr);\n    float d = (b*b) - 4.0*a*c;\n    if (d < 0.0) return vec2(1e5,-1e5);\n    return vec2(\n        (-b - sqrt(d))/(2.0*a),\n        (-b + sqrt(d))/(2.0*a)\n    );\n}\n\nvec3 atmosphere(vec3 r, vec3 r0, vec3 pSun, float iSun, float rPlanet, float rAtmos, vec3 kRlh, float kMie, float shRlh, float shMie, float g) {\n    // Normalize the sun and view directions.\n    pSun = normalize(pSun);\n    r = normalize(r);\n\n    // Calculate the step size of the primary ray.\n    vec2 p = rsi(r0, r, rAtmos);\n    if (p.x > p.y) return vec3(0,0,0);\n    p.y = min(p.y, rsi(r0, r, rPlanet).x);\n    float iStepSize = (p.y - p.x) / float(iSteps);\n\n    // Initialize the primary ray time.\n    float iTime = 0.0;\n\n    // Initialize accumulators for Rayleigh and Mie scattering.\n    vec3 totalRlh = vec3(0,0,0);\n    vec3 totalMie = vec3(0,0,0);\n\n    // Initialize optical depth accumulators for the primary ray.\n    float iOdRlh = 0.0;\n    float iOdMie = 0.0;\n\n    // Calculate the Rayleigh and Mie phases.\n    float mu = dot(r, pSun);\n    float mumu = mu * mu;\n    float gg = g * g;\n    float pRlh = 3.0 / (16.0 * PI) * (1.0 + mumu);\n    float pMie = 3.0 / (8.0 * PI) * ((1.0 - gg) * (mumu + 1.0)) / (pow(1.0 + gg - 2.0 * mu * g, 1.5) * (2.0 + gg));\n\n    // Sample the primary ray.\n    for (int i = 0; i < iSteps; i++) {\n\n        // Calculate the primary ray sample position.\n        vec3 iPos = r0 + r * (iTime + iStepSize * 0.5);\n\n        // Calculate the height of the sample.\n        float iHeight = length(iPos) - rPlanet;\n\n        // Calculate the optical depth of the Rayleigh and Mie scattering for this step.\n        float odStepRlh = exp(-iHeight / shRlh) * iStepSize;\n        float odStepMie = exp(-iHeight / shMie) * iStepSize;\n\n        // Accumulate optical depth.\n        iOdRlh += odStepRlh;\n        iOdMie += odStepMie;\n\n        // Calculate the step size of the secondary ray.\n        float jStepSize = rsi(iPos, pSun, rAtmos).y / float(jSteps);\n\n        // Initialize the secondary ray time.\n        float jTime = 0.0;\n\n        // Initialize optical depth accumulators for the secondary ray.\n        float jOdRlh = 0.0;\n        float jOdMie = 0.0;\n\n        // Sample the secondary ray.\n        for (int j = 0; j < jSteps; j++) {\n\n            // Calculate the secondary ray sample position.\n            vec3 jPos = iPos + pSun * (jTime + jStepSize * 0.5);\n\n            // Calculate the height of the sample.\n            float jHeight = length(jPos) - rPlanet;\n\n            // Accumulate the optical depth.\n            jOdRlh += exp(-jHeight / shRlh) * jStepSize;\n            jOdMie += exp(-jHeight / shMie) * jStepSize;\n\n            // Increment the secondary ray time.\n            jTime += jStepSize;\n        }\n\n        // Calculate attenuation.\n        vec3 attn = exp(-(kMie * (iOdMie + jOdMie) + kRlh * (iOdRlh + jOdRlh)));\n\n        // Accumulate scattering.\n        totalRlh += odStepRlh * attn;\n        totalMie += odStepMie * attn;\n\n        // Increment the primary ray time.\n        iTime += iStepSize;\n\n    }\n\n    // Calculate and return the final color.\n    return iSun * (pRlh * kRlh * totalRlh + pMie * kMie * totalMie);\n}\n\nvoid main() {\n    vec4 r4 = _invpv * vec4(2.0 * uv - 1.0, 1, 1);\n    vec3 r = normalize(r4.xyz/r4.w);\n    vec3 c = atmosphere(\n        r, // normalized ray direction\n        vec3(0, 6372e3, 0), // ray origin\n        sunDir, // direction of the sun\n        22.0, // intensity of the sun\n        6371e3, // radius of the planet in meters\n        6471e3, // radius of the atmosphere in meters\n        vec3(5.5e-6, 13.0e-6, 22.4e-6), // Rayleigh scattering coefficient\n        21e-6, // Mie scattering coefficient\n        8e3, // Rayleigh scale height\n        1.2e3, // Mie scale height\n        0.758// Mie preferred scattering direction\n    );\n\n    // super duper hacky approximation of sun intensity & radius\n    float d = clamp(dot(r, sunDir), 0.0, 1.0);\n    float d2 = clamp(dot(vec3(0, 1, 0), sunDir), 0.0, 1.0);\n    c = mix(c, c * mix(4.0, 8.0, d2), smoothstep(0.999, 0.9999, d));\n    gl_FragColor = vec4(c, 1);\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: {
      _invpv: regl.prop('_invpv'),
      sunDir: regl.prop('sunDir')
    },
    viewport: regl.prop('vpSky'),
    depth: { enable: false },
    framebuffer: regl.prop('destination')
  });

  cmd.shadow = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n    uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tHeight;\nuniform vec3 sunDir;\nuniform float horizon;\n\nvarying vec2 uv;\n\nfloat noise(vec2 p) {\n    p = (p + horizon) / (horizon * 2.0);\n    return texture2D(tHeight, p).r;\n}\n\nvoid main() {\n    vec2 r0_2d = horizon * (uv * 2.0 - 1.0);\n    vec3 r0 = vec3(r0_2d.x, noise(r0_2d.xy), r0_2d.y);\n    float t = 0.1;\n    float dt = 8.0;\n    float hShadow = 0.0;\n    for (int i = 0; i < 8192; i++) {\n        vec3 r = r0 + sunDir * t;\n        float h = noise(r.xz) - sunDir.y * t;\n        hShadow = max(hShadow, h);\n        t += dt;\n    }\n    gl_FragColor = vec4(hShadow);\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: {
      tHeight: regl.prop('tHeight'),
      sunDir: regl.prop('sunDir'),
      horizon: regl.prop('horizon')
    },
    viewport: regl.prop('vpHmap'),
    depth: { enable: false },
    framebuffer: regl.prop('destination'),
    scissor: { enable: true, box: regl.prop('scissorbox') }
  });

  cmd.normal = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n    uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tPosition, tNoise;\nuniform float tNoiseSize, scale, height;\n\nvarying vec2 uv;\n\nfloat smootherstep(float a, float b, float r) {\n    r = clamp(r, 0.0, 1.0);\n    r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);\n\n    return mix(a, b, r);\n}\n\nfloat perlin2D(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    vec2 p0 = floor(p);\n    vec2 p1 = p0 + vec2(1, 0);\n    vec2 p2 = p0 + vec2(1, 1);\n    vec2 p3 = p0 + vec2(0, 1);\n\n    vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;\n    vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;\n    vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;\n    vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;\n\n    vec2 p0p = p - p0;\n    vec2 p1p = p - p1;\n    vec2 p2p = p - p2;\n    vec2 p3p = p - p3;\n\n    float dp0 = dot(d0, p0p);\n    float dp1 = dot(d1, p1p);\n    float dp2 = dot(d2, p2p);\n    float dp3 = dot(d3, p3p);\n\n    float fx = p.x - p0.x;\n    float fy = p.y - p0.y;\n    float m01 = smootherstep(dp0, dp1, fx);\n    float m32 = smootherstep(dp3, dp2, fx);\n    float m01m32 = smootherstep(m01, m32, fy);\n\n    return m01m32;\n}\n\nfloat perlin2D_normal_1604150559(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    return perlin2D(p, tNoise, tNoiseSize) * 0.5 + 0.5;\n}\n\nfloat cursive_noise_1117569599(vec2 p, float scale, sampler2D tNoise, float tNoiseSize) {\n    const int steps = 13;\n    float sigma = 0.7;\n    float gamma = pow(1.0/sigma, float(steps));\n    vec2 displace = vec2(0);\n    for (int i = 0; i < steps; i++) {\n        displace = 1.5 * vec2(\n            perlin2D_normal_1604150559(p.xy * gamma + displace, tNoise, tNoiseSize),\n            perlin2D_normal_1604150559(p.yx * gamma + displace, tNoise, tNoiseSize)\n        );\n        gamma *= sigma;\n    }\n\n    return perlin2D_normal_1604150559(p * gamma + displace, tNoise, tNoiseSize);\n}\n\nfloat height_0(vec2 p, float scale, float height, sampler2D tNoise, float tNoiseSize) {\n    p = p * 0.001 * scale;\n    p += 11.0;\n    float h = cursive_noise_1117569599(p, scale, tNoise, tNoiseSize) * height * 1.0;\n    h += pow(perlin2D_normal_1604150559(p * 0.25, tNoise, tNoiseSize) + 0.25, 4.0) * height * 3.0;\n    h = mix(perlin2D_normal_1604150559(p * 0.4, tNoise, tNoiseSize) * height * 1.0, h, h/(height*4.0));\n\n    return h;\n}\n\nvoid main() {\n    vec4 src = texture2D(tPosition, uv);\n    if (src.a == 0.0) discard;\n    vec2 p = src.xz;\n    float dr = 0.1;\n    float n0 = height_0(p, scale, height, tNoise, tNoiseSize);\n    float nx = height_0(p + vec2(dr, 0), scale, height, tNoise, tNoiseSize);\n    float nz = height_0(p + vec2(0, dr), scale, height, tNoise, tNoiseSize);\n\n    vec3 n0nx = vec3(dr, nx - n0, 0);\n    vec3 n0nz = vec3(0, nz - n0, dr);\n    gl_FragColor = vec4(normalize(cross(n0nz, n0nx)), 1);\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: {
      tPosition: regl.prop('tPosition'),
      tNoise: regl.prop('tNoise'),
      tNoiseSize: regl.prop('tNoiseSize'),
      scale: regl.prop('scale'),
      height: regl.prop('height')
    },
    viewport: regl.prop('vpScreen'),
    depth: { enable: false },
    framebuffer: regl.prop('destination'),
    scissor: { enable: true, box: regl.prop('scissorbox') }
  });

  cmd.media = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n    uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform samplerCube tSky;\nuniform sampler2D tPosition, tShadow;\nuniform mat4 invpv;\nuniform vec3 sunDir, campos;\nuniform float horizon, fog, groundFog, groundFogAlt;\n\nvarying vec2 uv;\n\nfloat shadow(vec2 p) {\n    p = (p + horizon) / (horizon * 2.0);\n    return texture2D(tShadow, p).r;\n}\n\nfloat light(vec3 r0) {\n    return clamp(0.01 * (r0.y - shadow(r0.xz)), 0.0, 1.0);\n}\n\nfloat density(vec3 p) {\n    float constant_fog = fog;\n    float ground_fog = (1.0 - exp(-0.001 * max(0.0, groundFogAlt - p.y))) * groundFog;\n    return constant_fog + ground_fog;\n}\n\nvoid main() {\n    vec4 pos = texture2D(tPosition, uv);\n    vec3 sunColor = textureCube(tSky, sunDir).rgb;\n    vec3 skyColor = textureCube(tSky, vec3(0, 1, 0)).rgb;\n    float extinction = 1.0;\n    vec3 scattering = vec3(0);\n    const int steps = 256;\n    const float scatteringFactor = 0.01;\n    const float extinctionFactor = 0.05;\n\n    float dist;\n    vec3 rd;\n    if (pos.a == 0.0) {\n        dist = horizon;\n        vec4 r4 = invpv * vec4(2.0 * uv - 1.0, 1, 1);\n        rd = normalize(r4.xyz/r4.w);\n    } else {\n        dist = distance(pos.xyz, campos);\n        rd = normalize(pos.xyz - campos);\n    }\n\n    float dt = dist/float(steps - 1);\n    float t = 0.0;\n    for (int i = 0; i < steps; i++) {\n        vec3 r = campos + rd * t;\n        float dens = density(r);\n        float coeffScattering = scatteringFactor * dens;\n        float coeffExtinction = extinctionFactor * dens;\n        extinction *= exp(-coeffExtinction * dt);\n        vec3 sun = skyColor * 8.0;\n        sun += light(r) * sunColor;\n        vec3 stepScattering = coeffScattering * dt * sun;\n        scattering += extinction * stepScattering;\n        t += dt;\n    }\n\n    gl_FragColor = vec4(scattering, extinction);\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: {
      tPosition: regl.prop('tPosition'),
      tSky: regl.prop('tSky'),
      tShadow: regl.prop('tShadow'),
      invpv: regl.prop('invpv'),
      sunDir: regl.prop('sunDir'),
      campos: regl.prop('campos'),
      horizon: regl.prop('horizon'),
      fog: regl.prop('fog'),
      groundFog: regl.prop('groundFog'),
      groundFogAlt: regl.prop('groundFogAlt')
    },
    viewport: regl.prop('vpScreen'),
    depth: { enable: false },
    framebuffer: regl.prop('destination'),
    scissor: { enable: true, box: regl.prop('scissorbox') }
  });

  cmd.diffuse = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n    uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tPosition, tNormal, tNoise;\nuniform vec3 highFlat0, highFlat1, highSteep0, highSteep1, lowFlat0, lowFlat1, lowSteep0, lowSteep1;\nuniform float tNoiseSize;\n\nfloat smootherstep(float a, float b, float r) {\n    r = clamp(r, 0.0, 1.0);\n    r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);\n\n    return mix(a, b, r);\n}\n\nfloat perlin2D(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    vec2 p0 = floor(p);\n    vec2 p1 = p0 + vec2(1, 0);\n    vec2 p2 = p0 + vec2(1, 1);\n    vec2 p3 = p0 + vec2(0, 1);\n\n    vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;\n    vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;\n    vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;\n    vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;\n\n    vec2 p0p = p - p0;\n    vec2 p1p = p - p1;\n    vec2 p2p = p - p2;\n    vec2 p3p = p - p3;\n\n    float dp0 = dot(d0, p0p);\n    float dp1 = dot(d1, p1p);\n    float dp2 = dot(d2, p2p);\n    float dp3 = dot(d3, p3p);\n\n    float fx = p.x - p0.x;\n    float fy = p.y - p0.y;\n    float m01 = smootherstep(dp0, dp1, fx);\n    float m32 = smootherstep(dp3, dp2, fx);\n    float m01m32 = smootherstep(m01, m32, fy);\n\n    return m01m32;\n}\n\nfloat perlin2D_normal_1604150559(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    return perlin2D(p, tNoise, tNoiseSize) * 0.5 + 0.5;\n}\n\nfloat cursive_noise_1117569599(vec2 p, float scale, sampler2D tNoise, float tNoiseSize) {\n    const int steps = 13;\n    float sigma = 0.7;\n    float gamma = pow(1.0/sigma, float(steps));\n    vec2 displace = vec2(0);\n    for (int i = 0; i < steps; i++) {\n        displace = 1.5 * vec2(\n            perlin2D_normal_1604150559(p.xy * gamma + displace, tNoise, tNoiseSize),\n            perlin2D_normal_1604150559(p.yx * gamma + displace, tNoise, tNoiseSize)\n        );\n        gamma *= sigma;\n    }\n\n    return perlin2D_normal_1604150559(p * gamma + displace, tNoise, tNoiseSize);\n}\n\nvarying vec2 uv;\n\nvoid main() {\n    vec4 pos = texture2D(tPosition, uv).rgba;\n    if (pos.a == 0.0) discard;\n    vec3 n = texture2D(tNormal, uv).xyz;\n    float slope = pow(clamp(dot(n, vec3(0, 1, 0)), 0.0, 1.0), 4.0);\n\n    float h = clamp(pos.y/51200.0, 0.0, 1.0);\n    vec3 lowFlat = mix(lowFlat0, lowFlat1, cursive_noise_1117569599(pos.xz * 0.001 + 1.0, 1.0, tNoise, tNoiseSize));\n    vec3 highFlat = mix(highFlat0, highFlat1, cursive_noise_1117569599(pos.xz * 0.001 - 1.0, 1.0, tNoise, tNoiseSize));\n    vec3 lowSteep = mix(lowSteep0, lowSteep1, cursive_noise_1117569599(pos.xz * 0.001 + 2.0, 1.0, tNoise, tNoiseSize));\n    vec3 highSteep = mix(highSteep0, highSteep1, cursive_noise_1117569599(pos.xz * 0.001 - 2.0, 1.0, tNoise, tNoiseSize));\n    vec3 flatness = mix(lowFlat, highFlat, h);\n    vec3 steep = mix(lowSteep, highSteep, h);\n\n    vec3 c = mix(steep, flatness, slope) * 0.25;\n    gl_FragColor = vec4(c, 1);\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: {
      tPosition: regl.prop('tPosition'),
      tNormal: regl.prop('tNormal'),
      tNoise: regl.prop('tNoise'),
      tNoiseSize: regl.prop('tNoiseSize'),
      highFlat0: regl.prop('highFlat0'),
      highFlat1: regl.prop('highFlat1'),
      highSteep0: regl.prop('highSteep0'),
      highSteep1: regl.prop('highSteep1'),
      lowFlat0: regl.prop('lowFlat0'),
      lowFlat1: regl.prop('lowFlat1'),
      lowSteep0: regl.prop('lowSteep0'),
      lowSteep1: regl.prop('lowSteep1')
    },
    viewport: regl.prop('vpScreen'),
    depth: { enable: false },
    framebuffer: regl.prop('destination')
  });

  cmd.ao = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n    uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform samplerCube tSky;\nuniform sampler2D tPosition, tNormal, tAOSampling, tNoise;\nuniform float tNoiseSize, scale, height, tAOSamplingSize;\n\nvarying vec2 uv;\n\nfloat smootherstep(float a, float b, float r) {\n    r = clamp(r, 0.0, 1.0);\n    r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);\n\n    return mix(a, b, r);\n}\n\nfloat perlin2D(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    vec2 p0 = floor(p);\n    vec2 p1 = p0 + vec2(1, 0);\n    vec2 p2 = p0 + vec2(1, 1);\n    vec2 p3 = p0 + vec2(0, 1);\n\n    vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;\n    vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;\n    vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;\n    vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;\n\n    vec2 p0p = p - p0;\n    vec2 p1p = p - p1;\n    vec2 p2p = p - p2;\n    vec2 p3p = p - p3;\n\n    float dp0 = dot(d0, p0p);\n    float dp1 = dot(d1, p1p);\n    float dp2 = dot(d2, p2p);\n    float dp3 = dot(d3, p3p);\n\n    float fx = p.x - p0.x;\n    float fy = p.y - p0.y;\n    float m01 = smootherstep(dp0, dp1, fx);\n    float m32 = smootherstep(dp3, dp2, fx);\n    float m01m32 = smootherstep(m01, m32, fy);\n\n    return m01m32;\n}\n\nfloat perlin2D_normal_1604150559(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    return perlin2D(p, tNoise, tNoiseSize) * 0.5 + 0.5;\n}\n\nfloat cursive_noise_1117569599(vec2 p, float scale, sampler2D tNoise, float tNoiseSize) {\n    const int steps = 13;\n    float sigma = 0.7;\n    float gamma = pow(1.0/sigma, float(steps));\n    vec2 displace = vec2(0);\n    for (int i = 0; i < steps; i++) {\n        displace = 1.5 * vec2(\n            perlin2D_normal_1604150559(p.xy * gamma + displace, tNoise, tNoiseSize),\n            perlin2D_normal_1604150559(p.yx * gamma + displace, tNoise, tNoiseSize)\n        );\n        gamma *= sigma;\n    }\n\n    return perlin2D_normal_1604150559(p * gamma + displace, tNoise, tNoiseSize);\n}\n\nfloat height_0(vec2 p, float scale, float height, sampler2D tNoise, float tNoiseSize) {\n    p = p * 0.001 * scale;\n    p += 11.0;\n    float h = cursive_noise_1117569599(p, scale, tNoise, tNoiseSize) * height * 1.0;\n    h += pow(perlin2D_normal_1604150559(p * 0.25, tNoise, tNoiseSize) + 0.25, 4.0) * height * 3.0;\n    h = mix(perlin2D_normal_1604150559(p * 0.4, tNoise, tNoiseSize) * height * 1.0, h, h/(height*4.0));\n\n    return h;\n}\n\nvoid main() {\n    vec4 src = texture2D(tPosition, uv);\n    if (src.a == 0.0) discard;\n    vec3 n = texture2D(tNormal, uv).xyz;\n    vec3 p = src.xyz;\n    p.y = height_0(p.xz, scale, height, tNoise, tNoiseSize);\n\n    vec3 ambient = vec3(0);\n    float occlusion = 0.0;\n    for (int i = 0; i < 65536; i++) {\n        if (float(i) > tAOSamplingSize) break;\n        vec3 r = texture2D(tAOSampling, vec2(float(i)/tAOSamplingSize)).xyz;\n        if (dot(n, r) < 0.0) {\n            r = -r;\n        }\n        vec3 p2 = p + r;\n        if (p2.y <= height_0(p2.xz, scale, height, tNoise, tNoiseSize)) {\n            occlusion += 1.0;\n        }\n        r.y = abs(r.y);\n        ambient += textureCube(tSky, normalize(r)).rgb;\n    }\n\n    ambient = ambient / tAOSamplingSize;\n    float ao = 1.0 - occlusion / tAOSamplingSize;\n    gl_FragColor = vec4(ambient, ao);\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: {
      tSky: regl.prop('tSky'),
      tPosition: regl.prop('tPosition'),
      tNormal: regl.prop('tNormal'),
      tAOSampling: regl.prop('tAOSampling'),
      tAOSamplingSize: regl.prop('tAOSamplingSize'),
      tNoise: regl.prop('tNoise'),
      tNoiseSize: regl.prop('tNoiseSize'),
      scale: regl.prop('scale'),
      height: regl.prop('height')
    },
    viewport: regl.prop('vpScreen'),
    depth: { enable: false },
    framebuffer: regl.prop('destination'),
    scissor: { enable: true, box: regl.prop('scissorbox') }
  });

  cmd.direct = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n    uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform samplerCube tSky;\nuniform sampler2D tPosition, tNormal, tHeight, tShadow;\nuniform vec3 sunDir;\nuniform float horizon;\n\nvarying vec2 uv;\n\nfloat noise(vec2 p) {\n    p = (p + horizon) / (horizon * 2.0);\n    return texture2D(tHeight, p).r;\n}\n\nfloat shadow(vec2 p) {\n    p = (p + horizon) / (horizon * 2.0);\n    return texture2D(tShadow, p).r;\n}\n\nfloat light(vec3 r0) {\n    return clamp(0.01 * (r0.y - shadow(r0.xz)), 0.0, 1.0);\n}\n\nvoid main() {\n    vec4 src = texture2D(tPosition, uv);\n    if (src.a == 0.0) discard;\n    vec3 n = texture2D(tNormal, uv).xyz;\n    vec3 p = src.xyz;\n    p.y = noise(p.xz);\n    float angle = clamp(dot(n, sunDir), 0.0, 1.0);\n\n    vec3 sunlight = textureCube(tSky, sunDir).rgb * light(p + n * 64.0) * angle;\n    gl_FragColor = vec4(sunlight, 1);\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: {
      tSky: regl.prop('tSky'),
      tPosition: regl.prop('tPosition'),
      tNormal: regl.prop('tNormal'),
      tHeight: regl.prop('tHeight'),
      tShadow: regl.prop('tShadow'),
      horizon: regl.prop('horizon'),
      sunDir: regl.prop('sunDir')
    },
    viewport: regl.prop('vpScreen'),
    depth: { enable: false },
    framebuffer: regl.prop('destination')
  });

  cmd.compose = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n    uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform samplerCube tSky;\nuniform sampler2D tPosition, tDirect, tAO, tDiffuse, tMedia;\nuniform mat4 invpv;\nuniform vec3 sunDir;\n\nvarying vec2 uv;\n\nvoid main() {\n\n    vec4 pos = texture2D(tPosition, uv);\n    vec4 r4 = invpv * vec4(2.0 * uv - 1.0, 1, 1);\n    vec3 rd = normalize(r4.xyz/r4.w);\n    vec3 sky = textureCube(tSky, rd).rgb;\n    vec3 sun = textureCube(tSky, sunDir).rgb;\n    vec3 direct = texture2D(tDirect, uv).rgb;\n    vec4 ao = texture2D(tAO, uv);\n    vec3 diffuse = texture2D(tDiffuse, uv).rgb;\n    vec4 pmedia = texture2D(tMedia, uv);\n\n    vec3 c;\n    if (pos.a == 0.0) {\n        c = sky;\n    } else {\n        c = diffuse * (1.0 * direct + ao.rgb * pow(ao.a, 8.0));\n    }\n\n    c = pmedia.rgb + pmedia.a * c;\n    c = pow(c, vec3(1.0/2.2));\n    gl_FragColor = vec4(c, 1);\n\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: {
      tSky: regl.prop('tSky'),
      tPosition: regl.prop('tPosition'),
      tDirect: regl.prop('tDirect'),
      tAO: regl.prop('tAO'),
      tDiffuse: regl.prop('tDiffuse'),
      tMedia: regl.prop('tMedia'),
      invpv: regl.prop('invpv'),
      sunDir: regl.prop('sunDir')
    },
    viewport: regl.prop('vpScreen'),
    depth: { enable: false },
    framebuffer: regl.prop('destination')
  });

  return cmd;
};

},{"glslify":6}],32:[function(require,module,exports){
'use strict';

/*!
 * Procedural Badlands - Procedurally generated terrain.
 *
 * Licensed under MIT (https://github.com/bhudiaxyz/procedural-badlands/blob/master/LICENSE)
 *
 * Based on works of Rye Terrell (aka wwwtyro): https://github.com/wwwtyro/badlands
 */

const fb = {};

module.exports = function (regl, screenRes, hmapRes, skyRes) {

  fb.position = fb.position || regl.framebuffer();
  fb.height = fb.height || regl.framebuffer();
  fb.sky = fb.sky || regl.framebufferCube();
  fb.shadow = fb.shadow || regl.framebuffer();
  fb.normal = fb.normal || regl.framebuffer();
  fb.media = fb.media || regl.framebuffer();
  fb.diffuse = fb.diffuse || regl.framebuffer();
  fb.ao = fb.ao || regl.framebuffer();
  fb.direct = fb.direct || regl.framebuffer();
  fb.compose = fb.compose || regl.framebuffer();

  fb.position({
    width: screenRes.x,
    height: screenRes.y,
    colorFormat: "rgba",
    colorType: "float32"
  });

  fb.height({
    width: hmapRes.x,
    height: hmapRes.y,
    color: regl.texture({
      width: hmapRes.x, height: hmapRes.y,
      mag: 'linear', min: 'linear',
      format: 'rgba', type: 'float32'
    })
  });

  fb.sky({
    radius: skyRes,
    color: regl.cube({
      width: skyRes,
      height: skyRes,
      format: 'rgba', type: 'float32',
      mag: 'linear', min: 'linear'
    })
  });

  fb.shadow({
    width: hmapRes.x,
    height: hmapRes.y,
    color: regl.texture({
      width: hmapRes.x, height: hmapRes.y,
      mag: 'linear', min: 'linear',
      format: 'rgba', type: 'float32'
    })
  });

  fb.normal({
    width: screenRes.x,
    height: screenRes.y,
    colorFormat: "rgba",
    colorType: "float32"
  });

  fb.media({
    width: screenRes.x,
    height: screenRes.y,
    color: regl.texture({
      width: screenRes.x, height: screenRes.y,
      mag: 'linear', min: 'linear',
      format: 'rgba', type: 'float32'
    })
  });

  fb.diffuse({
    width: screenRes.x,
    height: screenRes.y,
    colorFormat: "rgba",
    colorType: "float32"
  });

  fb.ao({
    width: screenRes.x,
    height: screenRes.y,
    colorFormat: "rgba",
    colorType: "float32"
  });

  fb.direct({
    width: screenRes.x,
    height: screenRes.y,
    colorFormat: "rgba",
    colorType: "float32"
  });

  fb.compose({
    width: screenRes.x,
    height: screenRes.y,
    colorFormat: "rgba",
    colorType: "float32"
  });

  return fb;
};

},{}],33:[function(require,module,exports){
'use strict';

/*!
 * Procedural Badlands - Procedurally generated terrain.
 *
 * Licensed under MIT (https://github.com/bhudiaxyz/procedural-badlands/blob/master/LICENSE)
 *
 * Based on works of Rye Terrell (aka wwwtyro): https://github.com/wwwtyro/badlands
 */

const sprintf = require('sprintf').sprintf;
const reglib = require('regl');
const saveAs = require('filesaver.js').saveAs;
const renderer = require('./render.js');
const seedrandom = require('seedrandom');
const randomLorem = require('random-lorem');
var Alea = require('alea');

const status = document.getElementById('status');
const next = document.getElementById('next');
const download = document.getElementById('download');
const canvas = document.getElementById('render-canvas');

let regl;
let seedString;
let random;

document.addEventListener('DOMContentLoaded', main, false);
window.addEventListener('resize', reflow, false);
next.addEventListener('click', randomizeRender);
download.addEventListener('click', downloadImage);
window.addEventListener('error', handleError);

function updateQueryString(key, value, url) {
  if (!url) url = window.location.href;
  var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi"),
      hash;

  if (re.test(url)) {
    if (typeof value !== 'undefined' && value !== null) return url.replace(re, '$1' + key + "=" + value + '$2$3');else {
      hash = url.split('#');
      url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
      if (typeof hash[1] !== 'undefined' && hash[1] !== null) url += '#' + hash[1];
      return url;
    }
  } else {
    if (typeof value !== 'undefined' && value !== null) {
      var separator = url.indexOf('?') !== -1 ? '&' : '?';
      hash = url.split('#');
      url = hash[0] + separator + key + '=' + value;
      if (typeof hash[1] !== 'undefined' && hash[1] !== null) url += '#' + hash[1];
      return url;
    } else return url;
  }
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function updateUrl(seed) {
  let url = updateQueryString("seed", seed);
  window.history.pushState({ seed: seed }, seed, url);
}

function initSeed(seed) {
  seedString = seed;
  window.seedString = seedString;
  // window.rng = seedrandom(seedString);
  // random = window.rng;
  window.rng = random = new Alea(seedString);
  updateUrl(seed);
}

function generateNewSeed() {
  let n = Math.random();
  let wordCount = 0;
  if (n > 0.8) {
    wordCount = 1;
  } else if (n > 0.4) {
    wordCount = 2;
  } else {
    wordCount = 3;
  }

  let newSeedString = "";
  for (let i = 0; i < wordCount; ++i) {
    const randWord = randomLorem({ min: 2, max: 8 });
    const wordCapitalized = randWord.charAt(0).toUpperCase() + randWord.slice(1);
    newSeedString += wordCapitalized;
    if (i < wordCount - 1) {
      newSeedString += "-";
    }
  }
  return newSeedString;
}

function randomizeSeed() {
  initSeed(generateNewSeed());
}

function main() {
  reflow();
  regl = reglib({
    canvas: canvas,
    extensions: ['OES_texture_float', 'OES_texture_float_linear', 'OES_element_index_uint'],
    attributes: {
      preserveDrawingBuffer: true
    }
  });

  let seedString = getParameterByName("seed");
  if (seedString) {
    console.log("Using seed string: " + seedString);
    initSeed(seedString);
  } else {
    console.log("No seed string - randomizing");
    randomizeSeed();
  }

  render();
}

function randomizeRender() {
  randomizeSeed();
  render();
}

function render() {
  status.style.display = 'block';
  status.style.lineHeight = window.innerHeight + 'px';
  renderer.render(regl, {
    random: random,
    callback: updateStatus,
    canvas: canvas,
    fov: random() * 50 + 25,
    dir: random() * 360,
    alt: random() * 1024 * 2 + 1,
    tod: 6 + random(),
    colors: {
      high: {
        steep: [[0.41 - random() * 0.35, 0.25 - random() * 0.15, 0], [0.41 - random() * 0.35, 0.25 - random() * 0.15, 0]],
        flat: [[0.8, 0.9, 1], [1, 1, 1]]
      },
      low: {
        steep: [[0.5 - random() * 0.25, 0.25 - random() * 0.25, 0], [0.5 - random() * 0.25, 0.25 - random() * 0.25, 0]],
        flat: [[0.7, 0.8, 1], [1, 1, 1]]
      }
    },
    fog: random() * 0.0001,
    groundFog: random() * 0.01,
    groundFogAlt: random() * 1024 * 2
  });
}

function updateStatus(task, fraction, done) {
  if (fraction !== undefined) {
    status.innerText = sprintf('%s: %d%%', task, Math.round(fraction * 100));
  } else {
    status.innerText = task;
  }
  if (done) {
    status.style.display = 'none';
  }
}

function reflow() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function downloadImage() {
  canvas.toBlob(function (blob) {
    let filename = sprintf('procedural-badlands-%d.png', Math.round(random() * 10000));
    saveAs(blob, filename);
  });
}

function handleError(e, url, line) {
  status.style.display = 'block';
  status.style.lineHeight = '128px';
  status.innerHTML = `<div>Sorry, couldn't render the badlands because of the following error:</div> <div style='color:red'>${e.message}</div>`;
}

},{"./render.js":34,"alea":1,"filesaver.js":4,"random-lorem":16,"regl":19,"seedrandom":20,"sprintf":28}],34:[function(require,module,exports){
'use strict';

/*!
 * Procedural Badlands - Procedurally generated terrain.
 *
 * Licensed under MIT (https://github.com/bhudiaxyz/procedural-badlands/blob/master/LICENSE)
 *
 * Based on works of Rye Terrell (aka wwwtyro): https://github.com/wwwtyro/badlands
 */

let render = (() => {
  var _ref = _asyncToGenerator(function* (regl, params) {
    const statusCallback = params.callback || function () {};
    const canvas = params.canvas;
    const fov = params.fov / 360 * Math.PI * 2.0;
    const sunDir = tod2sundir(params.tod);
    const fog = params.fog;
    const groundFog = params.groundFog;
    const groundFogAlt = params.groundFogAlt;
    random = params.random;

    statusCallback('Compiling shaders...');
    yield display();
    cmd = cmd || createCommands(regl);

    const res = { x: canvas.width, y: canvas.height };
    const hmapRes = { x: 1024, y: 1024 };
    const skyres = 1024;

    statusCallback('Creating framebuffers...');
    yield display();
    const fb = createOrUpdateFramebuffers(regl, res, hmapRes, skyres);

    const distance = 65536;
    const terrainResolution = 32;
    const chunks = 32;
    const chunkSize = distance * 2.0 / chunks;
    const chunkResolution = chunkSize / terrainResolution;
    const height = 1024;
    const scale = 1.0;
    const tNoiseSize = 256;
    const tAOSamplingSize = 128;
    const tAOSamplingRate = 1 / 100;

    statusCallback('Creating AO sampling vectors...');
    yield display();
    generateAOSamplingTexture(regl, tAOSamplingSize, tAOSamplingRate);

    statusCallback('Creating noise...');
    yield display();
    generateNoiseTexture(regl, tNoiseSize);

    cmd.height({
      tNoise: tNoise,
      tNoiseSize: tNoiseSize,
      scale: scale,
      height: height,
      horizon: distance,
      vpHmap: { x: 0, y: 0, width: 1, height: 1 },
      destination: fb.height,
      origin: true
    });

    let terrainHeight;
    regl({ framebuffer: fb.height })(function () {
      let pixels = regl.read();
      terrainHeight = pixels[0];
    });

    const campos = [0, terrainHeight + params.alt, 0];
    const dirrad = params.dir / 360 * Math.PI * 2;
    const view = mat4.lookAt([], campos, [Math.cos(dirrad), campos[1], Math.sin(dirrad)], vec3.normalize([], [0, 1, 0]));
    const proj = mat4.perspective([], fov, res.x / res.y, 1, 65536);

    statusCallback('Generating chunk mesh...');
    yield display();
    if (chunkMesh === undefined) {
      chunkMesh = generateChunkMeshIndexed(chunkSize, chunkResolution);
      chunkMesh.cells = regl.elements({
        data: chunkMesh.cells,
        type: 'uint32'
      });
    }

    const pv = mat4.multiply([], proj, view);
    const invpv = mat4.invert([], pv);

    const cmdctx = {
      tPosition: fb.position,
      tHeight: fb.height,
      tSky: fb.sky,
      tShadow: fb.shadow,
      tNormal: fb.normal,
      tMedia: fb.media,
      tDiffuse: fb.diffuse,
      tAO: fb.ao,
      tDirect: fb.direct,
      tCompose: fb.compose,
      tNoise: tNoise,
      tNoiseSize: tNoiseSize,
      tAOSampling: tAOSampling,
      tAOSamplingSize: tAOSamplingSize,
      height: height,
      scale: scale,
      invpv: invpv,
      horizon: distance,
      sunDir: sunDir,
      campos: campos,
      fog: fog,
      highFlat0: params.colors.high.flat[0],
      highFlat1: params.colors.high.flat[1],
      highSteep0: params.colors.high.steep[0],
      highSteep1: params.colors.high.steep[1],
      lowFlat0: params.colors.low.flat[0],
      lowFlat1: params.colors.low.flat[1],
      lowSteep0: params.colors.low.steep[0],
      lowSteep1: params.colors.low.steep[1],
      groundFog: groundFog,
      groundFogAlt: groundFogAlt,
      vpScreen: { x: 0, y: 0, width: res.x, height: res.y },
      vpHmap: { x: 0, y: 0, width: hmapRes.x, height: hmapRes.y },
      vpSky: { x: 0, y: 0, width: skyres, height: skyres }
    };

    function ctx(src) {
      return Object.assign(cmdctx, src);
    }

    let visibleChunks = [];
    for (let z = 0; z < chunks; z++) {
      let cz = z - chunks / 2;
      for (let x = 0; x < chunks; x++) {
        let cx = x - chunks / 2;
        visibleChunks.push({
          x: cx * chunkSize,
          z: cz * chunkSize
        });
      }
    }

    let renderCount = 0,
        renderCountTarget = 1,
        totalCount = 0;
    let tLast = performance.now();
    for (let chunk of visibleChunks) {
      let model = mat4.create([]);
      model = mat4.translate(model, model, [chunk.x, 0, chunk.z]);
      cmd.position(ctx({
        position: chunkMesh.positions,
        elements: chunkMesh.cells,
        model: model,
        view: view,
        projection: proj,
        destination: fb.position
      }));
      renderCount++;
      totalCount++;
      if (renderCount === renderCountTarget) {
        statusCallback('Calculating terrain positions', totalCount / visibleChunks.length);
        yield display();
        if (performance.now() - tLast >= 1000 / 50) {
          renderCountTarget = Math.max(1, renderCountTarget - 1);
        } else {
          renderCountTarget = renderCountTarget * 2;
        }
        renderCount = 0;
        tLast = performance.now();
      }
    }

    let pr;

    pr = new ProgressiveRenderer(cmd.height, ctx({ destination: fb.height, origin: false }), hmapRes.x, hmapRes.y);
    while (true) {
      let fract = pr.render();
      statusCallback('Generating height map', fract);
      yield display();
      if (fract >= 1) break;
    }

    for (let i = 0; i < 6; i++) {
      let cam = [{ target: [1, 0, 0], up: [0, -1, 0] }, { target: [-1, 0, 0], up: [0, -1, 0] }, { target: [0, 1, 0], up: [0, 0, 1] }, { target: [0, -1, 0], up: [0, 0, -1] }, { target: [0, 0, 1], up: [0, -1, 0] }, { target: [0, 0, -1], up: [0, -1, 0] }][i];
      let _view = mat4.lookAt([], [0, 0, 0], cam.target, cam.up);
      let _proj = mat4.perspective([], Math.PI / 2, 1, 0.01, 100);
      let _pv = mat4.multiply([], _proj, _view);
      let _invpv = mat4.invert([], _pv);
      cmd.sky(ctx({ _invpv: _invpv, destination: fb.sky.faces[i] }));
      statusCallback('Generating sky cubemap', i / 5);
      yield display();
    }

    pr = new ProgressiveRenderer(cmd.shadow, ctx({ destination: fb.shadow }), hmapRes.x, hmapRes.y);
    while (true) {
      let fract = pr.render();
      statusCallback('Generating shadow volume', fract);
      yield display();
      if (fract >= 1) break;
    }

    pr = new ProgressiveRenderer(cmd.normal, ctx({ destination: fb.normal }), res.x, res.y);
    while (true) {
      let fract = pr.render();
      statusCallback('Generating normal map', fract);
      yield display();
      if (fract >= 1) break;
    }

    pr = new ProgressiveRenderer(cmd.media, ctx({ destination: fb.media }), res.x, res.y);
    while (true) {
      let fract = pr.render();
      statusCallback('Calculating participating media', fract);
      yield display();
      if (fract >= 1) break;
    }

    pr = new ProgressiveRenderer(cmd.diffuse, ctx({ destination: fb.diffuse }), res.x, res.y);
    while (true) {
      let fract = pr.render();
      statusCallback('Determining diffuse colors', fract);
      yield display();
      if (fract >= 1) break;
    }

    pr = new ProgressiveRenderer(cmd.ao, ctx({ destination: fb.ao }), res.x, res.y);
    while (true) {
      let fract = pr.render();
      statusCallback('Calculating ambient occlusion', fract);
      yield display();
      if (fract >= 1) break;
    }

    pr = new ProgressiveRenderer(cmd.direct, ctx({ destination: fb.direct }), res.x, res.y);
    while (true) {
      let fract = pr.render();
      statusCallback('Calculating direct lighting', fract);
      yield display();
      if (fract >= 1) break;
    }

    pr = new ProgressiveRenderer(cmd.compose, ctx({ destination: fb.compose }), res.x, res.y);
    while (true) {
      let fract = pr.render();
      statusCallback('Composing image', fract);
      yield display();
      if (fract >= 1) break;
    }

    cmd.copy(ctx({ source: fb.compose, destination: null }));
    statusCallback(null, null, true);
    yield display();
  });

  return function render(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;

const createOrUpdateFramebuffers = require('./framebuffers');
const createCommands = require('./commands');

let cmd, tNoise, tAOSampling, chunkMesh, progressiveCmd, random;

class ProgressiveRenderer {
  constructor(command, context, width, height) {
    this.y = 0;
    this.yStep = 1;
    this.cmd = command;
    this.ctx = context;
    this.w = width;
    this.h = height;
  }

  render() {
    if (this.last !== undefined) {
      if (performance.now() - this.last > 1000 / 10) {
        this.yStep = Math.max(1, this.yStep - 1);
      } else {
        this.yStep = this.yStep * 2;
      }
    }
    this.last = performance.now();
    this.cmd(Object.assign(this.ctx, {
      scissorbox: { x: 0, y: this.y, width: this.w, height: this.yStep }
    }));
    this.y = this.y + this.yStep;
    return Math.min(1, this.y / this.h);
  }
}

function generateNoiseTexture(regl, size) {
  tNoise = tNoise || regl.texture();
  let l = size * size * 2;
  let array = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    let r = random() * Math.PI * 2.0;
    array[i * 2 + 0] = Math.cos(r);
    array[i * 2 + 1] = Math.sin(r);
  }
  tNoise({
    format: 'luminance alpha',
    type: 'float',
    width: size,
    height: size,
    wrapS: 'repeat',
    wrapT: 'repeat',
    data: array
  });
}

function generateAOSamplingTexture(regl, size, rate) {
  tAOSampling = tAOSampling || regl.texture();
  let l = size * 3;
  let array = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    let len = 1.0 * Math.log(1 - Math.random()) / -rate;
    let r = random() * 2.0 * Math.PI;
    let z = random() * 2.0 - 1.0;
    let zScale = Math.sqrt(1.0 - z * z) * len;
    array[i * 3 + 0] = Math.cos(r) * zScale;
    array[i * 3 + 1] = Math.sin(r) * zScale;
    array[i * 3 + 2] = Math.tan(r) * zScale; // z * len;
  }
  tAOSampling({
    format: 'rgb',
    type: 'float',
    width: size,
    height: 1,
    wrapS: 'repeat',
    wrapT: 'repeat',
    data: array
  });
}

function generateChunkMeshIndexed(size, terrainResolution) {
  const rp1 = terrainResolution + 1;
  let positions = [];
  let step = size / terrainResolution;
  for (let i = 0; i < rp1; i++) {
    let x = i * step;
    for (let j = 0; j < rp1; j++) {
      let z = j * step;
      positions.push([x, 0, z]);
    }
  }
  let cells = [];
  let k = 0;
  for (let i = 0; i < terrainResolution; i++) {
    for (let j = 0; j < terrainResolution; j++) {
      cells.push([k, k + 1, k + rp1 + 1]);
      cells.push([k, k + rp1 + 1, k + rp1]);
      k++;
    }
    k++;
  }
  return {
    positions: positions,
    cells: cells
  };
}

function display() {
  return new Promise(resolve => {
    requestAnimationFrame(function () {
      resolve();
    });
  });
}

function tod2sundir(tod) {
  let phi = tod / 24 * Math.PI * 2 - Math.PI / 2;
  return vec3.normalize([], [1, Math.sin(phi), -Math.cos(phi)]);
}

module.exports.render = render;

},{"./commands":31,"./framebuffers":32,"gl-matrix":5}]},{},[33]);
