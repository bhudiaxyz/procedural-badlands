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

},{}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
(function(ka,N){"object"===typeof exports&&"undefined"!==typeof module?module.exports=N():"function"===typeof define&&define.amd?define(N):ka.createREGL=N()})(this,function(){function ka(a,b){this.id=Bb++;this.type=a;this.data=b}function N(a){if(0===a.length)return[];var b=a.charAt(0),c=a.charAt(a.length-1);if(1<a.length&&b===c&&('"'===b||"'"===b))return['"'+a.substr(1,a.length-2).replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"'];if(b=/\[(false|true|null|\d+|'[^']*'|"[^"]*")\]/.exec(a))return N(a.substr(0,
b.index)).concat(N(b[1])).concat(N(a.substr(b.index+b[0].length)));b=a.split(".");if(1===b.length)return['"'+a.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"'];a=[];for(c=0;c<b.length;++c)a=a.concat(N(b[c]));return a}function bb(a){return"["+N(a).join("][")+"]"}function Cb(){var a={"":0},b=[""];return{id:function(c){var e=a[c];if(e)return e;e=a[c]=b.length;b.push(c);return e},str:function(a){return b[a]}}}function Db(a,b,c){function e(){var b=window.innerWidth,e=window.innerHeight;a!==document.body&&
(e=a.getBoundingClientRect(),b=e.right-e.left,e=e.bottom-e.top);d.width=c*b;d.height=c*e;H(d.style,{width:b+"px",height:e+"px"})}var d=document.createElement("canvas");H(d.style,{border:0,margin:0,padding:0,top:0,left:0});a.appendChild(d);a===document.body&&(d.style.position="absolute",H(a.style,{margin:0,padding:0}));window.addEventListener("resize",e,!1);e();return{canvas:d,onDestroy:function(){window.removeEventListener("resize",e);a.removeChild(d)}}}function Eb(a,b){function c(c){try{return a.getContext(c,
b)}catch(d){return null}}return c("webgl")||c("experimental-webgl")||c("webgl-experimental")}function cb(a){return"string"===typeof a?a.split():a}function db(a){return"string"===typeof a?document.querySelector(a):a}function Fb(a){var b=a||{},c,e,d,g;a={};var r=[],n=[],u="undefined"===typeof window?1:window.devicePixelRatio,q=!1,t=function(a){},l=function(){};"string"===typeof b?c=document.querySelector(b):"object"===typeof b&&("string"===typeof b.nodeName&&"function"===typeof b.appendChild&&"function"===
typeof b.getBoundingClientRect?c=b:"function"===typeof b.drawArrays||"function"===typeof b.drawElements?(g=b,d=g.canvas):("gl"in b?g=b.gl:"canvas"in b?d=db(b.canvas):"container"in b&&(e=db(b.container)),"attributes"in b&&(a=b.attributes),"extensions"in b&&(r=cb(b.extensions)),"optionalExtensions"in b&&(n=cb(b.optionalExtensions)),"onDone"in b&&(t=b.onDone),"profile"in b&&(q=!!b.profile),"pixelRatio"in b&&(u=+b.pixelRatio)));c&&("canvas"===c.nodeName.toLowerCase()?d=c:e=c);if(!g){if(!d){c=Db(e||document.body,
t,u);if(!c)return null;d=c.canvas;l=c.onDestroy}a.premultipliedAlpha=a.premultipliedAlpha||!1;g=Eb(d,a)}return g?{gl:g,canvas:d,container:e,extensions:r,optionalExtensions:n,pixelRatio:u,profile:q,onDone:t,onDestroy:l}:(l(),t("webgl not supported, try upgrading your browser or graphics drivers http://get.webgl.org"),null)}function Gb(a,b){function c(b){b=b.toLowerCase();var c;try{c=e[b]=a.getExtension(b)}catch(d){}return!!c}for(var e={},d=0;d<b.extensions.length;++d){var g=b.extensions[d];if(!c(g))return b.onDestroy(),
b.onDone('"'+g+'" extension is not supported by the current WebGL context, try upgrading your system or a different browser'),null}b.optionalExtensions.forEach(c);return{extensions:e,restore:function(){Object.keys(e).forEach(function(a){if(e[a]&&!c(a))throw Error("(regl): error restoring extension "+a);})}}}function A(a,b){for(var c=Array(a),e=0;e<a;++e)c[e]=b(e);return c}function eb(a){var b,c;b=(65535<a)<<4;a>>>=b;c=(255<a)<<3;a>>>=c;b|=c;c=(15<a)<<2;a>>>=c;b|=c;c=(3<a)<<1;return b|c|a>>>c>>1}function fb(){function a(a){a:{for(var b=
16;268435456>=b;b*=16)if(a<=b){a=b;break a}a=0}b=c[eb(a)>>2];return 0<b.length?b.pop():new ArrayBuffer(a)}function b(a){c[eb(a.byteLength)>>2].push(a)}var c=A(8,function(){return[]});return{alloc:a,free:b,allocType:function(b,c){var g=null;switch(b){case 5120:g=new Int8Array(a(c),0,c);break;case 5121:g=new Uint8Array(a(c),0,c);break;case 5122:g=new Int16Array(a(2*c),0,c);break;case 5123:g=new Uint16Array(a(2*c),0,c);break;case 5124:g=new Int32Array(a(4*c),0,c);break;case 5125:g=new Uint32Array(a(4*
c),0,c);break;case 5126:g=new Float32Array(a(4*c),0,c);break;default:return null}return g.length!==c?g.subarray(0,c):g},freeType:function(a){b(a.buffer)}}}function X(a){return!!a&&"object"===typeof a&&Array.isArray(a.shape)&&Array.isArray(a.stride)&&"number"===typeof a.offset&&a.shape.length===a.stride.length&&(Array.isArray(a.data)||G(a.data))}function gb(a,b,c,e,d,g){for(var r=0;r<b;++r)for(var n=a[r],u=0;u<c;++u)for(var q=n[u],t=0;t<e;++t)d[g++]=q[t]}function hb(a,b,c,e,d){for(var g=1,r=c+1;r<
b.length;++r)g*=b[r];var n=b[c];if(4===b.length-c){var u=b[c+1],q=b[c+2];b=b[c+3];for(r=0;r<n;++r)gb(a[r],u,q,b,e,d),d+=g}else for(r=0;r<n;++r)hb(a[r],b,c+1,e,d),d+=g}function Ga(a){return Ha[Object.prototype.toString.call(a)]|0}function ib(a,b){for(var c=0;c<b.length;++c)a[c]=b[c]}function jb(a,b,c,e,d,g,r){for(var n=0,u=0;u<c;++u)for(var q=0;q<e;++q)a[n++]=b[d*u+g*q+r]}function Hb(a,b,c,e){function d(b){this.id=u++;this.buffer=a.createBuffer();this.type=b;this.usage=35044;this.byteLength=0;this.dimension=
1;this.dtype=5121;this.persistentData=null;c.profile&&(this.stats={size:0})}function g(b,c,k){b.byteLength=c.byteLength;a.bufferData(b.type,c,k)}function r(a,b,c,h,f,p){a.usage=c;if(Array.isArray(b)){if(a.dtype=h||5126,0<b.length)if(Array.isArray(b[0])){f=kb(b);for(var m=h=1;m<f.length;++m)h*=f[m];a.dimension=h;b=Ra(b,f,a.dtype);g(a,b,c);p?a.persistentData=b:z.freeType(b)}else"number"===typeof b[0]?(a.dimension=f,f=z.allocType(a.dtype,b.length),ib(f,b),g(a,f,c),p?a.persistentData=f:z.freeType(f)):
G(b[0])&&(a.dimension=b[0].length,a.dtype=h||Ga(b[0])||5126,b=Ra(b,[b.length,b[0].length],a.dtype),g(a,b,c),p?a.persistentData=b:z.freeType(b))}else if(G(b))a.dtype=h||Ga(b),a.dimension=f,g(a,b,c),p&&(a.persistentData=new Uint8Array(new Uint8Array(b.buffer)));else if(X(b)){f=b.shape;var v=b.stride,m=b.offset,e=0,d=0,q=0,n=0;1===f.length?(e=f[0],d=1,q=v[0],n=0):2===f.length&&(e=f[0],d=f[1],q=v[0],n=v[1]);a.dtype=h||Ga(b.data)||5126;a.dimension=d;f=z.allocType(a.dtype,e*d);jb(f,b.data,e,d,q,n,m);g(a,
f,c);p?a.persistentData=f:z.freeType(f)}else b instanceof ArrayBuffer&&(a.dtype=5121,a.dimension=f,g(a,b,c),p&&(a.persistentData=new Uint8Array(new Uint8Array(b))))}function n(c){b.bufferCount--;e(c);a.deleteBuffer(c.buffer);c.buffer=null;delete q[c.id]}var u=0,q={};d.prototype.bind=function(){a.bindBuffer(this.type,this.buffer)};d.prototype.destroy=function(){n(this)};var t=[];c.profile&&(b.getTotalBufferSize=function(){var a=0;Object.keys(q).forEach(function(b){a+=q[b].stats.size});return a});return{create:function(l,
e,k,h){function f(b){var l=35044,e=null,d=0,k=0,g=1;Array.isArray(b)||G(b)||X(b)||b instanceof ArrayBuffer?e=b:"number"===typeof b?d=b|0:b&&("data"in b&&(e=b.data),"usage"in b&&(l=lb[b.usage]),"type"in b&&(k=Ia[b.type]),"dimension"in b&&(g=b.dimension|0),"length"in b&&(d=b.length|0));p.bind();e?r(p,e,l,k,g,h):(d&&a.bufferData(p.type,d,l),p.dtype=k||5121,p.usage=l,p.dimension=g,p.byteLength=d);c.profile&&(p.stats.size=p.byteLength*ia[p.dtype]);return f}b.bufferCount++;var p=new d(e);q[p.id]=p;k||f(l);
f._reglType="buffer";f._buffer=p;f.subdata=function(b,c){var l=(c||0)|0,h;p.bind();if(G(b)||b instanceof ArrayBuffer)a.bufferSubData(p.type,l,b);else if(Array.isArray(b)){if(0<b.length)if("number"===typeof b[0]){var e=z.allocType(p.dtype,b.length);ib(e,b);a.bufferSubData(p.type,l,e);z.freeType(e)}else if(Array.isArray(b[0])||G(b[0]))h=kb(b),e=Ra(b,h,p.dtype),a.bufferSubData(p.type,l,e),z.freeType(e)}else if(X(b)){h=b.shape;var d=b.stride,k=e=0,g=0,q=0;1===h.length?(e=h[0],k=1,g=d[0],q=0):2===h.length&&
(e=h[0],k=h[1],g=d[0],q=d[1]);h=Array.isArray(b.data)?p.dtype:Ga(b.data);h=z.allocType(h,e*k);jb(h,b.data,e,k,g,q,b.offset);a.bufferSubData(p.type,l,h);z.freeType(h)}return f};c.profile&&(f.stats=p.stats);f.destroy=function(){n(p)};return f},createStream:function(a,b){var c=t.pop();c||(c=new d(a));c.bind();r(c,b,35040,0,1,!1);return c},destroyStream:function(a){t.push(a)},clear:function(){J(q).forEach(n);t.forEach(n)},getBuffer:function(a){return a&&a._buffer instanceof d?a._buffer:null},restore:function(){J(q).forEach(function(b){b.buffer=
a.createBuffer();a.bindBuffer(b.type,b.buffer);a.bufferData(b.type,b.persistentData||b.byteLength,b.usage)})},_initBuffer:r}}function Ib(a,b,c,e){function d(a){this.id=u++;n[this.id]=this;this.buffer=a;this.primType=4;this.type=this.vertCount=0}function g(e,d,g,h,f,p,m){e.buffer.bind();var v;d?((v=m)||G(d)&&(!X(d)||G(d.data))||(v=b.oes_element_index_uint?5125:5123),c._initBuffer(e.buffer,d,g,v,3)):(a.bufferData(34963,p,g),e.buffer.dtype=v||5121,e.buffer.usage=g,e.buffer.dimension=3,e.buffer.byteLength=
p);v=m;if(!m){switch(e.buffer.dtype){case 5121:case 5120:v=5121;break;case 5123:case 5122:v=5123;break;case 5125:case 5124:v=5125}e.buffer.dtype=v}e.type=v;d=f;0>d&&(d=e.buffer.byteLength,5123===v?d>>=1:5125===v&&(d>>=2));e.vertCount=d;d=h;0>h&&(d=4,h=e.buffer.dimension,1===h&&(d=0),2===h&&(d=1),3===h&&(d=4));e.primType=d}function r(a){e.elementsCount--;delete n[a.id];a.buffer.destroy();a.buffer=null}var n={},u=0,q={uint8:5121,uint16:5123};b.oes_element_index_uint&&(q.uint32=5125);d.prototype.bind=
function(){this.buffer.bind()};var t=[];return{create:function(a,b){function k(a){if(a)if("number"===typeof a)h(a),f.primType=4,f.vertCount=a|0,f.type=5121;else{var b=null,c=35044,e=-1,d=-1,l=0,n=0;if(Array.isArray(a)||G(a)||X(a))b=a;else if("data"in a&&(b=a.data),"usage"in a&&(c=lb[a.usage]),"primitive"in a&&(e=Ta[a.primitive]),"count"in a&&(d=a.count|0),"type"in a&&(n=q[a.type]),"length"in a)l=a.length|0;else if(l=d,5123===n||5122===n)l*=2;else if(5125===n||5124===n)l*=4;g(f,b,c,e,d,l,n)}else h(),
f.primType=4,f.vertCount=0,f.type=5121;return k}var h=c.create(null,34963,!0),f=new d(h._buffer);e.elementsCount++;k(a);k._reglType="elements";k._elements=f;k.subdata=function(a,b){h.subdata(a,b);return k};k.destroy=function(){r(f)};return k},createStream:function(a){var b=t.pop();b||(b=new d(c.create(null,34963,!0,!1)._buffer));g(b,a,35040,-1,-1,0,0);return b},destroyStream:function(a){t.push(a)},getElements:function(a){return"function"===typeof a&&a._elements instanceof d?a._elements:null},clear:function(){J(n).forEach(r)}}}
function nb(a){for(var b=z.allocType(5123,a.length),c=0;c<a.length;++c)if(isNaN(a[c]))b[c]=65535;else if(Infinity===a[c])b[c]=31744;else if(-Infinity===a[c])b[c]=64512;else{ob[0]=a[c];var e=Jb[0],d=e>>>31<<15,g=(e<<1>>>24)-127,e=e>>13&1023;b[c]=-24>g?d:-14>g?d+(e+1024>>-14-g):15<g?d+31744:d+(g+15<<10)+e}return b}function oa(a){return Array.isArray(a)||G(a)}function la(a){return"[object "+a+"]"}function pb(a){return Array.isArray(a)&&(0===a.length||"number"===typeof a[0])}function qb(a){return Array.isArray(a)&&
0!==a.length&&oa(a[0])?!0:!1}function Y(a){return Object.prototype.toString.call(a)}function Ua(a){if(!a)return!1;var b=Y(a);return 0<=Kb.indexOf(b)?!0:pb(a)||qb(a)||X(a)}function rb(a,b){36193===a.type?(a.data=nb(b),z.freeType(b)):a.data=b}function Ja(a,b,c,e,d,g){a="undefined"!==typeof w[a]?w[a]:S[a]*Z[b];g&&(a*=6);if(d){for(e=0;1<=c;)e+=a*c*c,c/=2;return e}return a*c*e}function Lb(a,b,c,e,d,g,r){function n(){this.format=this.internalformat=6408;this.type=5121;this.flipY=this.premultiplyAlpha=this.compressed=
!1;this.unpackAlignment=1;this.colorSpace=37444;this.channels=this.height=this.width=0}function u(a,b){a.internalformat=b.internalformat;a.format=b.format;a.type=b.type;a.compressed=b.compressed;a.premultiplyAlpha=b.premultiplyAlpha;a.flipY=b.flipY;a.unpackAlignment=b.unpackAlignment;a.colorSpace=b.colorSpace;a.width=b.width;a.height=b.height;a.channels=b.channels}function q(a,b){if("object"===typeof b&&b){"premultiplyAlpha"in b&&(a.premultiplyAlpha=b.premultiplyAlpha);"flipY"in b&&(a.flipY=b.flipY);
"alignment"in b&&(a.unpackAlignment=b.alignment);"colorSpace"in b&&(a.colorSpace=Mb[b.colorSpace]);"type"in b&&(a.type=K[b.type]);var c=a.width,f=a.height,e=a.channels,d=!1;"shape"in b?(c=b.shape[0],f=b.shape[1],3===b.shape.length&&(e=b.shape[2],d=!0)):("radius"in b&&(c=f=b.radius),"width"in b&&(c=b.width),"height"in b&&(f=b.height),"channels"in b&&(e=b.channels,d=!0));a.width=c|0;a.height=f|0;a.channels=e|0;c=!1;"format"in b&&(c=b.format,f=a.internalformat=B[c],a.format=M[f],c in K&&!("type"in b)&&
(a.type=K[c]),c in V&&(a.compressed=!0),c=!0);!d&&c?a.channels=S[a.format]:d&&!c&&a.channels!==Ma[a.format]&&(a.format=a.internalformat=Ma[a.channels])}}function t(b){a.pixelStorei(37440,b.flipY);a.pixelStorei(37441,b.premultiplyAlpha);a.pixelStorei(37443,b.colorSpace);a.pixelStorei(3317,b.unpackAlignment)}function l(){n.call(this);this.yOffset=this.xOffset=0;this.data=null;this.needsFree=!1;this.element=null;this.needsCopy=!1}function F(a,b){var c=null;Ua(b)?c=b:b&&(q(a,b),"x"in b&&(a.xOffset=b.x|
0),"y"in b&&(a.yOffset=b.y|0),Ua(b.data)&&(c=b.data));if(b.copy){var f=d.viewportWidth,e=d.viewportHeight;a.width=a.width||f-a.xOffset;a.height=a.height||e-a.yOffset;a.needsCopy=!0}else if(!c)a.width=a.width||1,a.height=a.height||1,a.channels=a.channels||4;else if(G(c))a.channels=a.channels||4,a.data=c,"type"in b||5121!==a.type||(a.type=Ha[Object.prototype.toString.call(c)]|0);else if(pb(c)){a.channels=a.channels||4;f=c;e=f.length;switch(a.type){case 5121:case 5123:case 5125:case 5126:e=z.allocType(a.type,
e);e.set(f);a.data=e;break;case 36193:a.data=nb(f)}a.alignment=1;a.needsFree=!0}else if(X(c)){f=c.data;Array.isArray(f)||5121!==a.type||(a.type=Ha[Object.prototype.toString.call(f)]|0);var e=c.shape,h=c.stride,g,m,k,p;3===e.length?(k=e[2],p=h[2]):p=k=1;g=e[0];m=e[1];e=h[0];h=h[1];a.alignment=1;a.width=g;a.height=m;a.channels=k;a.format=a.internalformat=Ma[k];a.needsFree=!0;g=p;c=c.offset;k=a.width;p=a.height;m=a.channels;for(var y=z.allocType(36193===a.type?5126:a.type,k*p*m),I=0,U=0;U<p;++U)for(var ea=
0;ea<k;++ea)for(var aa=0;aa<m;++aa)y[I++]=f[e*ea+h*U+g*aa+c];rb(a,y)}else if(Y(c)===Va||Y(c)===Wa||Y(c)===sb)Y(c)===Va||Y(c)===Wa?a.element=c:a.element=c.canvas,a.width=a.element.width,a.height=a.element.height,a.channels=4;else if(Y(c)===tb)a.element=c,a.width=c.width,a.height=c.height,a.channels=4;else if(Y(c)===ub)a.element=c,a.width=c.naturalWidth,a.height=c.naturalHeight,a.channels=4;else if(Y(c)===vb)a.element=c,a.width=c.videoWidth,a.height=c.videoHeight,a.channels=4;else if(qb(c)){f=a.width||
c[0].length;e=a.height||c.length;h=a.channels;h=oa(c[0][0])?h||c[0][0].length:h||1;g=Na.shape(c);k=1;for(p=0;p<g.length;++p)k*=g[p];k=z.allocType(36193===a.type?5126:a.type,k);Na.flatten(c,g,"",k);rb(a,k);a.alignment=1;a.width=f;a.height=e;a.channels=h;a.format=a.internalformat=Ma[h];a.needsFree=!0}}function k(b,c,f,h,d){var g=b.element,m=b.data,k=b.internalformat,p=b.format,v=b.type,y=b.width,I=b.height;t(b);g?a.texSubImage2D(c,d,f,h,p,v,g):b.compressed?a.compressedTexSubImage2D(c,d,f,h,k,y,I,m):
b.needsCopy?(e(),a.copyTexSubImage2D(c,d,f,h,b.xOffset,b.yOffset,y,I)):a.texSubImage2D(c,d,f,h,y,I,p,v,m)}function h(){return L.pop()||new l}function f(a){a.needsFree&&z.freeType(a.data);l.call(a);L.push(a)}function p(){n.call(this);this.genMipmaps=!1;this.mipmapHint=4352;this.mipmask=0;this.images=Array(16)}function m(a,b,c){var f=a.images[0]=h();a.mipmask=1;f.width=a.width=b;f.height=a.height=c;f.channels=a.channels=4}function v(a,b){var c=null;if(Ua(b))c=a.images[0]=h(),u(c,a),F(c,b),a.mipmask=
1;else if(q(a,b),Array.isArray(b.mipmap))for(var f=b.mipmap,e=0;e<f.length;++e)c=a.images[e]=h(),u(c,a),c.width>>=e,c.height>>=e,F(c,f[e]),a.mipmask|=1<<e;else c=a.images[0]=h(),u(c,a),F(c,b),a.mipmask=1;u(a,a.images[0])}function Q(b,c){for(var f=b.images,h=0;h<f.length&&f[h];++h){var d=f[h],g=c,m=h,k=d.element,p=d.data,v=d.internalformat,y=d.format,I=d.type,U=d.width,ea=d.height;t(d);k?a.texImage2D(g,m,y,y,I,k):d.compressed?a.compressedTexImage2D(g,m,v,U,ea,0,p):d.needsCopy?(e(),a.copyTexImage2D(g,
m,y,d.xOffset,d.yOffset,U,ea,0)):a.texImage2D(g,m,y,U,ea,0,y,I,p||null)}}function C(){var a=A.pop()||new p;n.call(a);for(var b=a.mipmask=0;16>b;++b)a.images[b]=null;return a}function wa(a){for(var b=a.images,c=0;c<b.length;++c)b[c]&&f(b[c]),b[c]=null;A.push(a)}function fa(){this.magFilter=this.minFilter=9728;this.wrapT=this.wrapS=33071;this.anisotropic=1;this.genMipmaps=!1;this.mipmapHint=4352}function mb(a,b){"min"in b&&(a.minFilter=O[b.min],0<=Nb.indexOf(a.minFilter)&&!("faces"in b)&&(a.genMipmaps=
!0));"mag"in b&&(a.magFilter=T[b.mag]);var c=a.wrapS,f=a.wrapT;if("wrap"in b){var e=b.wrap;"string"===typeof e?c=f=ma[e]:Array.isArray(e)&&(c=ma[e[0]],f=ma[e[1]])}else"wrapS"in b&&(c=ma[b.wrapS]),"wrapT"in b&&(f=ma[b.wrapT]);a.wrapS=c;a.wrapT=f;"anisotropic"in b&&(a.anisotropic=b.anisotropic);if("mipmap"in b){c=!1;switch(typeof b.mipmap){case "string":a.mipmapHint=x[b.mipmap];c=a.genMipmaps=!0;break;case "boolean":c=a.genMipmaps=b.mipmap;break;case "object":a.genMipmaps=!1,c=!0}!c||"min"in b||(a.minFilter=
9984)}}function Sa(c,f){a.texParameteri(f,10241,c.minFilter);a.texParameteri(f,10240,c.magFilter);a.texParameteri(f,10242,c.wrapS);a.texParameteri(f,10243,c.wrapT);b.ext_texture_filter_anisotropic&&a.texParameteri(f,34046,c.anisotropic);c.genMipmaps&&(a.hint(33170,c.mipmapHint),a.generateMipmap(f))}function R(b){n.call(this);this.mipmask=0;this.internalformat=6408;this.id=P++;this.refCount=1;this.target=b;this.texture=a.createTexture();this.unit=-1;this.bindCount=0;this.texInfo=new fa;r.profile&&
(this.stats={size:0})}function ta(b){a.activeTexture(33984);a.bindTexture(b.target,b.texture)}function Aa(){var b=W[0];b?a.bindTexture(b.target,b.texture):a.bindTexture(3553,null)}function D(b){var c=b.texture,f=b.unit,e=b.target;0<=f&&(a.activeTexture(33984+f),a.bindTexture(e,null),W[f]=null);a.deleteTexture(c);b.texture=null;b.params=null;b.pixels=null;b.refCount=0;delete E[b.id];g.textureCount--}var x={"don't care":4352,"dont care":4352,nice:4354,fast:4353},ma={repeat:10497,clamp:33071,mirror:33648},
T={nearest:9728,linear:9729},O=H({mipmap:9987,"nearest mipmap nearest":9984,"linear mipmap nearest":9985,"nearest mipmap linear":9986,"linear mipmap linear":9987},T),Mb={none:0,browser:37444},K={uint8:5121,rgba4:32819,rgb565:33635,"rgb5 a1":32820},B={alpha:6406,luminance:6409,"luminance alpha":6410,rgb:6407,rgba:6408,rgba4:32854,"rgb5 a1":32855,rgb565:36194},V={};b.ext_srgb&&(B.srgb=35904,B.srgba=35906);b.oes_texture_float&&(K.float32=K["float"]=5126);b.oes_texture_half_float&&(K.float16=K["half float"]=
36193);b.webgl_depth_texture&&(H(B,{depth:6402,"depth stencil":34041}),H(K,{uint16:5123,uint32:5125,"depth stencil":34042}));b.webgl_compressed_texture_s3tc&&H(V,{"rgb s3tc dxt1":33776,"rgba s3tc dxt1":33777,"rgba s3tc dxt3":33778,"rgba s3tc dxt5":33779});b.webgl_compressed_texture_atc&&H(V,{"rgb atc":35986,"rgba atc explicit alpha":35987,"rgba atc interpolated alpha":34798});b.webgl_compressed_texture_pvrtc&&H(V,{"rgb pvrtc 4bppv1":35840,"rgb pvrtc 2bppv1":35841,"rgba pvrtc 4bppv1":35842,"rgba pvrtc 2bppv1":35843});
b.webgl_compressed_texture_etc1&&(V["rgb etc1"]=36196);var w=Array.prototype.slice.call(a.getParameter(34467));Object.keys(V).forEach(function(a){var b=V[a];0<=w.indexOf(b)&&(B[a]=b)});var xa=Object.keys(B);c.textureFormats=xa;var ba=[];Object.keys(B).forEach(function(a){ba[B[a]]=a});var ya=[];Object.keys(K).forEach(function(a){ya[K[a]]=a});var ca=[];Object.keys(T).forEach(function(a){ca[T[a]]=a});var Ea=[];Object.keys(O).forEach(function(a){Ea[O[a]]=a});var ga=[];Object.keys(ma).forEach(function(a){ga[ma[a]]=
a});var M=xa.reduce(function(a,c){var f=B[c];6409===f||6406===f||6409===f||6410===f||6402===f||34041===f||b.ext_srgb&&(35904===f||35906===f)?a[f]=f:32855===f||0<=c.indexOf("rgba")?a[f]=6408:a[f]=6407;return a},{}),L=[],A=[],P=0,E={},ja=c.maxTextureUnits,W=Array(ja).map(function(){return null});H(R.prototype,{bind:function(){this.bindCount+=1;var b=this.unit;if(0>b){for(var c=0;c<ja;++c){var f=W[c];if(f){if(0<f.bindCount)continue;f.unit=-1}W[c]=this;b=c;break}r.profile&&g.maxTextureUnits<b+1&&(g.maxTextureUnits=
b+1);this.unit=b;a.activeTexture(33984+b);a.bindTexture(this.target,this.texture)}return b},unbind:function(){--this.bindCount},decRef:function(){0>=--this.refCount&&D(this)}});r.profile&&(g.getTotalTextureSize=function(){var a=0;Object.keys(E).forEach(function(b){a+=E[b].stats.size});return a});return{create2D:function(b,c){function e(a,b){var c=d.texInfo;fa.call(c);var f=C();"number"===typeof a?"number"===typeof b?m(f,a|0,b|0):m(f,a|0,a|0):a?(mb(c,a),v(f,a)):m(f,1,1);c.genMipmaps&&(f.mipmask=(f.width<<
1)-1);d.mipmask=f.mipmask;u(d,f);d.internalformat=f.internalformat;e.width=f.width;e.height=f.height;ta(d);Q(f,3553);Sa(c,3553);Aa();wa(f);r.profile&&(d.stats.size=Ja(d.internalformat,d.type,f.width,f.height,c.genMipmaps,!1));e.format=ba[d.internalformat];e.type=ya[d.type];e.mag=ca[c.magFilter];e.min=Ea[c.minFilter];e.wrapS=ga[c.wrapS];e.wrapT=ga[c.wrapT];return e}var d=new R(3553);E[d.id]=d;g.textureCount++;e(b,c);e.subimage=function(a,b,c,g){b|=0;c|=0;g|=0;var m=h();u(m,d);m.width=0;m.height=0;
F(m,a);m.width=m.width||(d.width>>g)-b;m.height=m.height||(d.height>>g)-c;ta(d);k(m,3553,b,c,g);Aa();f(m);return e};e.resize=function(b,c){var f=b|0,h=c|0||f;if(f===d.width&&h===d.height)return e;e.width=d.width=f;e.height=d.height=h;ta(d);for(var m=0;d.mipmask>>m;++m){var g=f>>m,y=h>>m;if(!g||!y)break;a.texImage2D(3553,m,d.format,g,y,0,d.format,d.type,null)}Aa();r.profile&&(d.stats.size=Ja(d.internalformat,d.type,f,h,!1,!1));return e};e._reglType="texture2d";e._texture=d;r.profile&&(e.stats=d.stats);
e.destroy=function(){d.decRef()};return e},createCube:function(b,c,e,d,p,n){function l(a,b,c,f,e,d){var h,na=x.texInfo;fa.call(na);for(h=0;6>h;++h)D[h]=C();if("number"===typeof a||!a)for(a=a|0||1,h=0;6>h;++h)m(D[h],a,a);else if("object"===typeof a)if(b)v(D[0],a),v(D[1],b),v(D[2],c),v(D[3],f),v(D[4],e),v(D[5],d);else if(mb(na,a),q(x,a),"faces"in a)for(a=a.faces,h=0;6>h;++h)u(D[h],x),v(D[h],a[h]);else for(h=0;6>h;++h)v(D[h],a);u(x,D[0]);x.mipmask=na.genMipmaps?(D[0].width<<1)-1:D[0].mipmask;x.internalformat=
D[0].internalformat;l.width=D[0].width;l.height=D[0].height;ta(x);for(h=0;6>h;++h)Q(D[h],34069+h);Sa(na,34067);Aa();r.profile&&(x.stats.size=Ja(x.internalformat,x.type,l.width,l.height,na.genMipmaps,!0));l.format=ba[x.internalformat];l.type=ya[x.type];l.mag=ca[na.magFilter];l.min=Ea[na.minFilter];l.wrapS=ga[na.wrapS];l.wrapT=ga[na.wrapT];for(h=0;6>h;++h)wa(D[h]);return l}var x=new R(34067);E[x.id]=x;g.cubeCount++;var D=Array(6);l(b,c,e,d,p,n);l.subimage=function(a,b,c,e,d){c|=0;e|=0;d|=0;var aa=h();
u(aa,x);aa.width=0;aa.height=0;F(aa,b);aa.width=aa.width||(x.width>>d)-c;aa.height=aa.height||(x.height>>d)-e;ta(x);k(aa,34069+a,c,e,d);Aa();f(aa);return l};l.resize=function(b){b|=0;if(b!==x.width){l.width=x.width=b;l.height=x.height=b;ta(x);for(var c=0;6>c;++c)for(var f=0;x.mipmask>>f;++f)a.texImage2D(34069+c,f,x.format,b>>f,b>>f,0,x.format,x.type,null);Aa();r.profile&&(x.stats.size=Ja(x.internalformat,x.type,l.width,l.height,!1,!0));return l}};l._reglType="textureCube";l._texture=x;r.profile&&
(l.stats=x.stats);l.destroy=function(){x.decRef()};return l},clear:function(){for(var b=0;b<ja;++b)a.activeTexture(33984+b),a.bindTexture(3553,null),W[b]=null;J(E).forEach(D);g.cubeCount=0;g.textureCount=0},getTexture:function(a){return null},restore:function(){for(var b=0;b<ja;++b){var c=W[b];c&&(c.bindCount=0,c.unit=-1,W[b]=null)}J(E).forEach(function(b){b.texture=a.createTexture();a.bindTexture(b.target,b.texture);for(var c=0;32>c;++c)if(0!==(b.mipmask&1<<c))if(3553===b.target)a.texImage2D(3553,
c,b.internalformat,b.width>>c,b.height>>c,0,b.internalformat,b.type,null);else for(var f=0;6>f;++f)a.texImage2D(34069+f,c,b.internalformat,b.width>>c,b.height>>c,0,b.internalformat,b.type,null);Sa(b.texInfo,b.target)})}}}function Ob(a,b,c,e,d,g){function r(a,b,c){this.target=a;this.texture=b;this.renderbuffer=c;var f=a=0;b?(a=b.width,f=b.height):c&&(a=c.width,f=c.height);this.width=a;this.height=f}function n(a){a&&(a.texture&&a.texture._texture.decRef(),a.renderbuffer&&a.renderbuffer._renderbuffer.decRef())}
function u(a,b,c){a&&(a.texture?a.texture._texture.refCount+=1:a.renderbuffer._renderbuffer.refCount+=1)}function q(b,c){c&&(c.texture?a.framebufferTexture2D(36160,b,c.target,c.texture._texture.texture,0):a.framebufferRenderbuffer(36160,b,36161,c.renderbuffer._renderbuffer.renderbuffer))}function t(a){var b=3553,c=null,f=null,e=a;"object"===typeof a&&(e=a.data,"target"in a&&(b=a.target|0));a=e._reglType;"texture2d"===a?c=e:"textureCube"===a?c=e:"renderbuffer"===a&&(f=e,b=36161);return new r(b,c,f)}
function l(a,b,c,f,h){if(c)return a=e.create2D({width:a,height:b,format:f,type:h}),a._texture.refCount=0,new r(3553,a,null);a=d.create({width:a,height:b,format:f});a._renderbuffer.refCount=0;return new r(36161,null,a)}function F(a){return a&&(a.texture||a.renderbuffer)}function k(a,b,c){a&&(a.texture?a.texture.resize(b,c):a.renderbuffer&&a.renderbuffer.resize(b,c),a.width=b,a.height=c)}function h(){this.id=z++;w[this.id]=this;this.framebuffer=a.createFramebuffer();this.height=this.width=0;this.colorAttachments=
[];this.depthStencilAttachment=this.stencilAttachment=this.depthAttachment=null}function f(a){a.colorAttachments.forEach(n);n(a.depthAttachment);n(a.stencilAttachment);n(a.depthStencilAttachment)}function p(b){a.deleteFramebuffer(b.framebuffer);b.framebuffer=null;g.framebufferCount--;delete w[b.id]}function m(b){var f;a.bindFramebuffer(36160,b.framebuffer);var e=b.colorAttachments;for(f=0;f<e.length;++f)q(36064+f,e[f]);for(f=e.length;f<c.maxColorAttachments;++f)a.framebufferTexture2D(36160,36064+
f,3553,null,0);a.framebufferTexture2D(36160,33306,3553,null,0);a.framebufferTexture2D(36160,36096,3553,null,0);a.framebufferTexture2D(36160,36128,3553,null,0);q(36096,b.depthAttachment);q(36128,b.stencilAttachment);q(33306,b.depthStencilAttachment);a.checkFramebufferStatus(36160);a.isContextLost();a.bindFramebuffer(36160,Q.next?Q.next.framebuffer:null);Q.cur=Q.next;a.getError()}function v(a,b){function c(a,b){var d,h=0,g=0,k=!0,p=!0;d=null;var v=!0,n="rgba",q="uint8",r=1,fa=null,ca=null,Q=null,ga=
!1;if("number"===typeof a)h=a|0,g=b|0||h;else if(a){"shape"in a?(g=a.shape,h=g[0],g=g[1]):("radius"in a&&(h=g=a.radius),"width"in a&&(h=a.width),"height"in a&&(g=a.height));if("color"in a||"colors"in a)d=a.color||a.colors,Array.isArray(d);if(!d){"colorCount"in a&&(r=a.colorCount|0);"colorTexture"in a&&(v=!!a.colorTexture,n="rgba4");if("colorType"in a&&(q=a.colorType,!v))if("half float"===q||"float16"===q)n="rgba16f";else if("float"===q||"float32"===q)n="rgba32f";"colorFormat"in a&&(n=a.colorFormat,
0<=C.indexOf(n)?v=!0:0<=wa.indexOf(n)&&(v=!1))}if("depthTexture"in a||"depthStencilTexture"in a)ga=!(!a.depthTexture&&!a.depthStencilTexture);"depth"in a&&("boolean"===typeof a.depth?k=a.depth:(fa=a.depth,p=!1));"stencil"in a&&("boolean"===typeof a.stencil?p=a.stencil:(ca=a.stencil,k=!1));"depthStencil"in a&&("boolean"===typeof a.depthStencil?k=p=a.depthStencil:(Q=a.depthStencil,p=k=!1))}else h=g=1;var M=null,z=null,w=null,R=null;if(Array.isArray(d))M=d.map(t);else if(d)M=[t(d)];else for(M=Array(r),
d=0;d<r;++d)M[d]=l(h,g,v,n,q);h=h||M[0].width;g=g||M[0].height;fa?z=t(fa):k&&!p&&(z=l(h,g,ga,"depth","uint32"));ca?w=t(ca):p&&!k&&(w=l(h,g,!1,"stencil","uint8"));Q?R=t(Q):!fa&&!ca&&p&&k&&(R=l(h,g,ga,"depth stencil","depth stencil"));k=null;for(d=0;d<M.length;++d)u(M[d],h,g),M[d]&&M[d].texture&&(p=Xa[M[d].texture._texture.format]*Oa[M[d].texture._texture.type],null===k&&(k=p));u(z,h,g);u(w,h,g);u(R,h,g);f(e);e.width=h;e.height=g;e.colorAttachments=M;e.depthAttachment=z;e.stencilAttachment=w;e.depthStencilAttachment=
R;c.color=M.map(F);c.depth=F(z);c.stencil=F(w);c.depthStencil=F(R);c.width=e.width;c.height=e.height;m(e);return c}var e=new h;g.framebufferCount++;c(a,b);return H(c,{resize:function(a,b){var f=Math.max(a|0,1),d=Math.max(b|0||f,1);if(f===e.width&&d===e.height)return c;for(var h=e.colorAttachments,g=0;g<h.length;++g)k(h[g],f,d);k(e.depthAttachment,f,d);k(e.stencilAttachment,f,d);k(e.depthStencilAttachment,f,d);e.width=c.width=f;e.height=c.height=d;m(e);return c},_reglType:"framebuffer",_framebuffer:e,
destroy:function(){p(e);f(e)},use:function(a){Q.setFBO({framebuffer:c},a)}})}var Q={cur:null,next:null,dirty:!1,setFBO:null},C=["rgba"],wa=["rgba4","rgb565","rgb5 a1"];b.ext_srgb&&wa.push("srgba");b.ext_color_buffer_half_float&&wa.push("rgba16f","rgb16f");b.webgl_color_buffer_float&&wa.push("rgba32f");var fa=["uint8"];b.oes_texture_half_float&&fa.push("half float","float16");b.oes_texture_float&&fa.push("float","float32");var z=0,w={};return H(Q,{getFramebuffer:function(a){return"function"===typeof a&&
"framebuffer"===a._reglType&&(a=a._framebuffer,a instanceof h)?a:null},create:v,createCube:function(a){function b(a){var f,d={color:null},h=0,g=null;f="rgba";var m="uint8",k=1;if("number"===typeof a)h=a|0;else if(a){"shape"in a?h=a.shape[0]:("radius"in a&&(h=a.radius|0),"width"in a?h=a.width|0:"height"in a&&(h=a.height|0));if("color"in a||"colors"in a)g=a.color||a.colors,Array.isArray(g);g||("colorCount"in a&&(k=a.colorCount|0),"colorType"in a&&(m=a.colorType),"colorFormat"in a&&(f=a.colorFormat));
"depth"in a&&(d.depth=a.depth);"stencil"in a&&(d.stencil=a.stencil);"depthStencil"in a&&(d.depthStencil=a.depthStencil)}else h=1;if(g)if(Array.isArray(g))for(a=[],f=0;f<g.length;++f)a[f]=g[f];else a=[g];else for(a=Array(k),g={radius:h,format:f,type:m},f=0;f<k;++f)a[f]=e.createCube(g);d.color=Array(a.length);for(f=0;f<a.length;++f)k=a[f],h=h||k.width,d.color[f]={target:34069,data:a[f]};for(f=0;6>f;++f){for(k=0;k<a.length;++k)d.color[k].target=34069+f;0<f&&(d.depth=c[0].depth,d.stencil=c[0].stencil,
d.depthStencil=c[0].depthStencil);if(c[f])c[f](d);else c[f]=v(d)}return H(b,{width:h,height:h,color:a})}var c=Array(6);b(a);return H(b,{faces:c,resize:function(a){var f=a|0;if(f===b.width)return b;var d=b.color;for(a=0;a<d.length;++a)d[a].resize(f);for(a=0;6>a;++a)c[a].resize(f);b.width=b.height=f;return b},_reglType:"framebufferCube",destroy:function(){c.forEach(function(a){a.destroy()})}})},clear:function(){J(w).forEach(p)},restore:function(){Q.cur=null;Q.next=null;Q.dirty=!0;J(w).forEach(function(b){b.framebuffer=
a.createFramebuffer();m(b)})}})}function Ya(){this.w=this.z=this.y=this.x=this.state=0;this.buffer=null;this.size=0;this.normalized=!1;this.type=5126;this.divisor=this.stride=this.offset=0}function Pb(a,b,c,e,d){function g(a){if(a!==h.currentVAO){var c=b.oes_vertex_array_object;a?c.bindVertexArrayOES(a.vao):c.bindVertexArrayOES(null);h.currentVAO=a}}function r(c){if(c!==h.currentVAO){if(c)c.bindAttrs();else for(var d=b.angle_instanced_arrays,e=0;e<l.length;++e){var g=l[e];g.buffer?(a.enableVertexAttribArray(e),
a.vertexAttribPointer(e,g.size,g.type,g.normalized,g.stride,g.offfset),d&&d.vertexAttribDivisorANGLE(e,g.divisor)):(a.disableVertexAttribArray(e),a.vertexAttrib4f(e,g.x,g.y,g.z,g.w))}h.currentVAO=c}}function n(a){J(k).forEach(function(a){a.destroy()})}function u(){this.id=++F;this.attributes=[];var a=b.oes_vertex_array_object;this.vao=a?a.createVertexArrayOES():null;k[this.id]=this;this.buffers=[]}function q(){b.oes_vertex_array_object&&J(k).forEach(function(a){a.refresh()})}var t=c.maxAttributes,
l=Array(t);for(c=0;c<t;++c)l[c]=new Ya;var F=0,k={},h={Record:Ya,scope:{},state:l,currentVAO:null,targetVAO:null,restore:b.oes_vertex_array_object?q:function(){},createVAO:function(a){function b(a){for(var f=0;f<c.buffers.length;++f)c.buffers[f].destroy();c.buffers.length=0;f=c.attributes;f.length=a.length;for(var e=0;e<a.length;++e){var h=a[e],g=f[e]=new Ya;Array.isArray(h)||G(h)||X(h)?(h=d.create(h,34962,!1,!0),g.buffer=d.getBuffer(h),g.size=g.buffer.dimension|0,g.normalized=!1,g.type=g.buffer.dtype,
g.offset=0,g.stride=0,g.divisor=0,g.state=1,c.buffers.push(h)):d.getBuffer(h)?(g.buffer=d.getBuffer(h),g.size=g.buffer.dimension|0,g.normalized=!1,g.type=g.buffer.dtype,g.offset=0,g.stride=0,g.divisor=0,g.state=1):d.getBuffer(h.buffer)?(g.buffer=d.getBuffer(h.buffer),g.size=(+h.size||g.buffer.dimension)|0,g.normalized=!!h.normalized||!1,g.type="type"in h?Ia[h.type]:g.buffer.dtype,g.offset=(h.offset||0)|0,g.stride=(h.stride||0)|0,g.divisor=(h.divisor||0)|0,g.state=1):"x"in h&&(g.x=+h.x||0,g.y=+h.y||
0,g.z=+h.z||0,g.w=+h.w||0,g.state=2)}c.refresh();return b}var c=new u;e.vaoCount+=1;b.destroy=function(){c.destroy()};b._vao=c;b._reglType="vao";return b(a)},getVAO:function(a){return"function"===typeof a&&a._vao?a._vao:null},destroyBuffer:function(b){for(var c=0;c<l.length;++c){var e=l[c];e.buffer===b&&(a.disableVertexAttribArray(c),e.buffer=null)}},setVAO:b.oes_vertex_array_object?g:r,clear:b.oes_vertex_array_object?n:function(){}};u.prototype.bindAttrs=function(){for(var c=b.angle_instanced_arrays,
e=this.attributes,h=0;h<e.length;++h){var d=e[h];d.buffer?(a.enableVertexAttribArray(h),a.bindBuffer(34962,d.buffer.buffer),a.vertexAttribPointer(h,d.size,d.type,d.normalized,d.stride,d.offset),c&&c.vertexAttribDivisorANGLE(h,d.divisor)):(a.disableVertexAttribArray(h),a.vertexAttrib4f(h,d.x,d.y,d.z,d.w))}for(c=e.length;c<t;++c)a.disableVertexAttribArray(c)};u.prototype.refresh=function(){var a=b.oes_vertex_array_object;a&&(a.bindVertexArrayOES(this.vao),this.bindAttrs(),h.currentVAO=this)};u.prototype.destroy=
function(){if(this.vao){var a=b.oes_vertex_array_object;this===h.currentVAO&&(h.currentVAO=null,a.bindVertexArrayOES(null));a.deleteVertexArrayOES(this.vao);this.vao=null}k[this.id]&&(delete k[this.id],--e.vaoCount)};return h}function Qb(a,b,c,e){function d(a,b,c,e){this.name=a;this.id=b;this.location=c;this.info=e}function g(a,b){for(var c=0;c<a.length;++c)if(a[c].id===b.id){a[c].location=b.location;return}a.push(b)}function r(c,f,e){e=35632===c?q:t;var d=e[f];if(!d){var g=b.str(f),d=a.createShader(c);
a.shaderSource(d,g);a.compileShader(d);e[f]=d}return d}function n(a,b){this.id=k++;this.fragId=a;this.vertId=b;this.program=null;this.uniforms=[];this.attributes=[];e.profile&&(this.stats={uniformsCount:0,attributesCount:0})}function u(c,f,k){var l;l=r(35632,c.fragId);var n=r(35633,c.vertId);f=c.program=a.createProgram();a.attachShader(f,l);a.attachShader(f,n);if(k)for(l=0;l<k.length;++l)n=k[l],a.bindAttribLocation(f,n[0],n[1]);a.linkProgram(f);n=a.getProgramParameter(f,35718);e.profile&&(c.stats.uniformsCount=
n);var q=c.uniforms;for(k=0;k<n;++k)if(l=a.getActiveUniform(f,k))if(1<l.size)for(var u=0;u<l.size;++u){var t=l.name.replace("[0]","["+u+"]");g(q,new d(t,b.id(t),a.getUniformLocation(f,t),l))}else g(q,new d(l.name,b.id(l.name),a.getUniformLocation(f,l.name),l));n=a.getProgramParameter(f,35721);e.profile&&(c.stats.attributesCount=n);c=c.attributes;for(k=0;k<n;++k)(l=a.getActiveAttrib(f,k))&&g(c,new d(l.name,b.id(l.name),a.getAttribLocation(f,l.name),l))}var q={},t={},l={},F=[],k=0;e.profile&&(c.getMaxUniformsCount=
function(){var a=0;F.forEach(function(b){b.stats.uniformsCount>a&&(a=b.stats.uniformsCount)});return a},c.getMaxAttributesCount=function(){var a=0;F.forEach(function(b){b.stats.attributesCount>a&&(a=b.stats.attributesCount)});return a});return{clear:function(){var b=a.deleteShader.bind(a);J(q).forEach(b);q={};J(t).forEach(b);t={};F.forEach(function(b){a.deleteProgram(b.program)});F.length=0;l={};c.shaderCount=0},program:function(a,b,e,d){var g=l[b];g||(g=l[b]={});var k=g[a];if(k&&!d)return k;b=new n(b,
a);c.shaderCount++;u(b,e,d);k||(g[a]=b);F.push(b);return b},restore:function(){q={};t={};for(var a=0;a<F.length;++a)u(F[a],null,F[a].attributes.map(function(a){return[a.location,a.name]}))},shader:r,frag:-1,vert:-1}}function Rb(a,b,c,e,d,g,r){function n(d){var g;g=null===b.next?5121:b.next.colorAttachments[0].texture._texture.type;var l=0,n=0,k=e.framebufferWidth,h=e.framebufferHeight,f=null;G(d)?f=d:d&&(l=d.x|0,n=d.y|0,k=(d.width||e.framebufferWidth-l)|0,h=(d.height||e.framebufferHeight-n)|0,f=d.data||
null);c();d=k*h*4;f||(5121===g?f=new Uint8Array(d):5126===g&&(f=f||new Float32Array(d)));a.pixelStorei(3333,4);a.readPixels(l,n,k,h,6408,g,f);return f}function u(a){var c;b.setFBO({framebuffer:a.framebuffer},function(){c=n(a)});return c}return function(a){return a&&"framebuffer"in a?u(a):n(a)}}function ua(a){return Array.prototype.slice.call(a)}function Ba(a){return ua(a).join("")}function Sb(){function a(){var a=[],b=[];return H(function(){a.push.apply(a,ua(arguments))},{def:function(){var d="v"+
c++;b.push(d);0<arguments.length&&(a.push(d,"="),a.push.apply(a,ua(arguments)),a.push(";"));return d},toString:function(){return Ba([0<b.length?"var "+b.join(",")+";":"",Ba(a)])}})}function b(){function b(a,e){d(a,e,"=",c.def(a,e),";")}var c=a(),d=a(),e=c.toString,g=d.toString;return H(function(){c.apply(c,ua(arguments))},{def:c.def,entry:c,exit:d,save:b,set:function(a,d,e){b(a,d);c(a,d,"=",e,";")},toString:function(){return e()+g()}})}var c=0,e=[],d=[],g=a(),r={};return{global:g,link:function(a){for(var b=
0;b<d.length;++b)if(d[b]===a)return e[b];b="g"+c++;e.push(b);d.push(a);return b},block:a,proc:function(a,c){function d(){var a="a"+e.length;e.push(a);return a}var e=[];c=c||0;for(var g=0;g<c;++g)d();var g=b(),F=g.toString;return r[a]=H(g,{arg:d,toString:function(){return Ba(["function(",e.join(),"){",F(),"}"])}})},scope:b,cond:function(){var a=Ba(arguments),c=b(),d=b(),e=c.toString,g=d.toString;return H(c,{then:function(){c.apply(c,ua(arguments));return this},"else":function(){d.apply(d,ua(arguments));
return this},toString:function(){var b=g();b&&(b="else{"+b+"}");return Ba(["if(",a,"){",e(),"}",b])}})},compile:function(){var a=['"use strict";',g,"return {"];Object.keys(r).forEach(function(b){a.push('"',b,'":',r[b].toString(),",")});a.push("}");var b=Ba(a).replace(/;/g,";\n").replace(/}/g,"}\n").replace(/{/g,"{\n");return Function.apply(null,e.concat(b)).apply(null,d)}}}function Pa(a){return Array.isArray(a)||G(a)||X(a)}function wb(a){return a.sort(function(a,c){return"viewport"===a?-1:"viewport"===
c?1:a<c?-1:1})}function P(a,b,c,e){this.thisDep=a;this.contextDep=b;this.propDep=c;this.append=e}function va(a){return a&&!(a.thisDep||a.contextDep||a.propDep)}function C(a){return new P(!1,!1,!1,a)}function L(a,b){var c=a.type;return 0===c?(c=a.data.length,new P(!0,1<=c,2<=c,b)):4===c?(c=a.data,new P(c.thisDep,c.contextDep,c.propDep,b)):new P(3===c,2===c,1===c,b)}function Tb(a,b,c,e,d,g,r,n,u,q,t,l,F,k,h){function f(a){return a.replace(".","_")}function p(a,b,c){var d=f(a);La.push(a);Da[d]=qa[d]=
!!c;ra[d]=b}function m(a,b,c){var d=f(a);La.push(a);Array.isArray(c)?(qa[d]=c.slice(),Da[d]=c.slice()):qa[d]=Da[d]=c;sa[d]=b}function v(){var a=Sb(),c=a.link,d=a.global;a.id=ua++;a.batchId="0";var e=c(la),f=a.shared={props:"a0"};Object.keys(la).forEach(function(a){f[a]=d.def(e,".",a)});var g=a.next={},h=a.current={};Object.keys(sa).forEach(function(a){Array.isArray(qa[a])&&(g[a]=d.def(f.next,".",a),h[a]=d.def(f.current,".",a))});var da=a.constants={};Object.keys(Z).forEach(function(a){da[a]=d.def(JSON.stringify(Z[a]))});
a.invoke=function(b,d){switch(d.type){case 0:var e=["this",f.context,f.props,a.batchId];return b.def(c(d.data),".call(",e.slice(0,Math.max(d.data.length+1,4)),")");case 1:return b.def(f.props,d.data);case 2:return b.def(f.context,d.data);case 3:return b.def("this",d.data);case 4:return d.data.append(a,b),d.data.ref}};a.attribCache={};var za={};a.scopeAttrib=function(a){a=b.id(a);if(a in za)return za[a];var d=q.scope[a];d||(d=q.scope[a]=new ja);return za[a]=c(d)};return a}function Q(a){var b=a["static"];
a=a.dynamic;var c;if("profile"in b){var d=!!b.profile;c=C(function(a,b){return d});c.enable=d}else if("profile"in a){var e=a.profile;c=L(e,function(a,b){return a.invoke(b,e)})}return c}function z(a,b){var c=a["static"],d=a.dynamic;if("framebuffer"in c){var e=c.framebuffer;return e?(e=n.getFramebuffer(e),C(function(a,b){var c=a.link(e),d=a.shared;b.set(d.framebuffer,".next",c);d=d.context;b.set(d,".framebufferWidth",c+".width");b.set(d,".framebufferHeight",c+".height");return c})):C(function(a,b){var c=
a.shared;b.set(c.framebuffer,".next","null");c=c.context;b.set(c,".framebufferWidth",c+".drawingBufferWidth");b.set(c,".framebufferHeight",c+".drawingBufferHeight");return"null"})}if("framebuffer"in d){var f=d.framebuffer;return L(f,function(a,b){var c=a.invoke(b,f),d=a.shared,e=d.framebuffer,c=b.def(e,".getFramebuffer(",c,")");b.set(e,".next",c);d=d.context;b.set(d,".framebufferWidth",c+"?"+c+".width:"+d+".drawingBufferWidth");b.set(d,".framebufferHeight",c+"?"+c+".height:"+d+".drawingBufferHeight");
return c})}return null}function w(a,b,c){function d(a){if(a in e){var c=e[a];a=!0;var g=c.x|0,y=c.y|0,h,U;"width"in c?h=c.width|0:a=!1;"height"in c?U=c.height|0:a=!1;return new P(!a&&b&&b.thisDep,!a&&b&&b.contextDep,!a&&b&&b.propDep,function(a,b){var d=a.shared.context,e=h;"width"in c||(e=b.def(d,".","framebufferWidth","-",g));var f=U;"height"in c||(f=b.def(d,".","framebufferHeight","-",y));return[g,y,e,f]})}if(a in f){var k=f[a];a=L(k,function(a,b){var c=a.invoke(b,k),d=a.shared.context,e=b.def(c,
".x|0"),f=b.def(c,".y|0"),g=b.def('"width" in ',c,"?",c,".width|0:","(",d,".","framebufferWidth","-",e,")"),c=b.def('"height" in ',c,"?",c,".height|0:","(",d,".","framebufferHeight","-",f,")");return[e,f,g,c]});b&&(a.thisDep=a.thisDep||b.thisDep,a.contextDep=a.contextDep||b.contextDep,a.propDep=a.propDep||b.propDep);return a}return b?new P(b.thisDep,b.contextDep,b.propDep,function(a,b){var c=a.shared.context;return[0,0,b.def(c,".","framebufferWidth"),b.def(c,".","framebufferHeight")]}):null}var e=
a["static"],f=a.dynamic;if(a=d("viewport")){var g=a;a=new P(a.thisDep,a.contextDep,a.propDep,function(a,b){var c=g.append(a,b),d=a.shared.context;b.set(d,".viewportWidth",c[2]);b.set(d,".viewportHeight",c[3]);return c})}return{viewport:a,scissor_box:d("scissor.box")}}function H(a,b){var c=a["static"];if("string"===typeof c.frag&&"string"===typeof c.vert){if(0<Object.keys(b.dynamic).length)return null;var c=b["static"],d=Object.keys(c);if(0<d.length&&"number"===typeof c[d[0]]){for(var e=[],f=0;f<d.length;++f)e.push([c[d[f]]|
0,d[f]]);return e}}return null}function E(a,c,d){function e(a){if(a in f){var c=b.id(f[a]);a=C(function(){return c});a.id=c;return a}if(a in g){var d=g[a];return L(d,function(a,b){var c=a.invoke(b,d);return b.def(a.shared.strings,".id(",c,")")})}return null}var f=a["static"],g=a.dynamic,h=e("frag"),da=e("vert"),za=null;va(h)&&va(da)?(za=t.program(da.id,h.id,null,d),a=C(function(a,b){return a.link(za)})):a=new P(h&&h.thisDep||da&&da.thisDep,h&&h.contextDep||da&&da.contextDep,h&&h.propDep||da&&da.propDep,
function(a,b){var c=a.shared.shader,d;d=h?h.append(a,b):b.def(c,".","frag");var e;e=da?da.append(a,b):b.def(c,".","vert");return b.def(c+".program("+e+","+d+")")});return{frag:h,vert:da,progVar:a,program:za}}function G(a,b){function c(a,b){if(a in d){var g=d[a]|0;return C(function(a,c){b&&(a.OFFSET=g);return g})}if(a in e){var h=e[a];return L(h,function(a,c){var d=a.invoke(c,h);b&&(a.OFFSET=d);return d})}return b&&f?C(function(a,b){a.OFFSET="0";return 0}):null}var d=a["static"],e=a.dynamic,f=function(){if("elements"in
d){var a=d.elements;Pa(a)?a=g.getElements(g.create(a,!0)):a&&(a=g.getElements(a));var b=C(function(b,c){if(a){var d=b.link(a);return b.ELEMENTS=d}return b.ELEMENTS=null});b.value=a;return b}if("elements"in e){var c=e.elements;return L(c,function(a,b){var d=a.shared,e=d.isBufferArgs,d=d.elements,f=a.invoke(b,c),g=b.def("null"),e=b.def(e,"(",f,")"),f=a.cond(e).then(g,"=",d,".createStream(",f,");")["else"](g,"=",d,".getElements(",f,");");b.entry(f);b.exit(a.cond(e).then(d,".destroyStream(",g,");"));
return a.ELEMENTS=g})}return null}(),h=c("offset",!0);return{elements:f,primitive:function(){if("primitive"in d){var a=d.primitive;return C(function(b,c){return Ta[a]})}if("primitive"in e){var b=e.primitive;return L(b,function(a,c){var d=a.constants.primTypes,e=a.invoke(c,b);return c.def(d,"[",e,"]")})}return f?va(f)?f.value?C(function(a,b){return b.def(a.ELEMENTS,".primType")}):C(function(){return 4}):new P(f.thisDep,f.contextDep,f.propDep,function(a,b){var c=a.ELEMENTS;return b.def(c,"?",c,".primType:",
4)}):null}(),count:function(){if("count"in d){var a=d.count|0;return C(function(){return a})}if("count"in e){var b=e.count;return L(b,function(a,c){return a.invoke(c,b)})}return f?va(f)?f?h?new P(h.thisDep,h.contextDep,h.propDep,function(a,b){return b.def(a.ELEMENTS,".vertCount-",a.OFFSET)}):C(function(a,b){return b.def(a.ELEMENTS,".vertCount")}):C(function(){return-1}):new P(f.thisDep||h.thisDep,f.contextDep||h.contextDep,f.propDep||h.propDep,function(a,b){var c=a.ELEMENTS;return a.OFFSET?b.def(c,
"?",c,".vertCount-",a.OFFSET,":-1"):b.def(c,"?",c,".vertCount:-1")}):null}(),instances:c("instances",!1),offset:h}}function R(a,b){var c=a["static"],d=a.dynamic,e={};La.forEach(function(a){function b(f,h){if(a in c){var y=f(c[a]);e[g]=C(function(){return y})}else if(a in d){var I=d[a];e[g]=L(I,function(a,b){return h(a,b,a.invoke(b,I))})}}var g=f(a);switch(a){case "cull.enable":case "blend.enable":case "dither":case "stencil.enable":case "depth.enable":case "scissor.enable":case "polygonOffset.enable":case "sample.alpha":case "sample.enable":case "depth.mask":return b(function(a){return a},
function(a,b,c){return c});case "depth.func":return b(function(a){return $a[a]},function(a,b,c){return b.def(a.constants.compareFuncs,"[",c,"]")});case "depth.range":return b(function(a){return a},function(a,b,c){a=b.def("+",c,"[0]");b=b.def("+",c,"[1]");return[a,b]});case "blend.func":return b(function(a){return[Fa["srcRGB"in a?a.srcRGB:a.src],Fa["dstRGB"in a?a.dstRGB:a.dst],Fa["srcAlpha"in a?a.srcAlpha:a.src],Fa["dstAlpha"in a?a.dstAlpha:a.dst]]},function(a,b,c){function d(a,e){return b.def('"',
a,e,'" in ',c,"?",c,".",a,e,":",c,".",a)}a=a.constants.blendFuncs;var e=d("src","RGB"),f=d("dst","RGB"),e=b.def(a,"[",e,"]"),g=b.def(a,"[",d("src","Alpha"),"]"),f=b.def(a,"[",f,"]");a=b.def(a,"[",d("dst","Alpha"),"]");return[e,f,g,a]});case "blend.equation":return b(function(a){if("string"===typeof a)return[W[a],W[a]];if("object"===typeof a)return[W[a.rgb],W[a.alpha]]},function(a,b,c){var d=a.constants.blendEquations,e=b.def(),f=b.def();a=a.cond("typeof ",c,'==="string"');a.then(e,"=",f,"=",d,"[",
c,"];");a["else"](e,"=",d,"[",c,".rgb];",f,"=",d,"[",c,".alpha];");b(a);return[e,f]});case "blend.color":return b(function(a){return A(4,function(b){return+a[b]})},function(a,b,c){return A(4,function(a){return b.def("+",c,"[",a,"]")})});case "stencil.mask":return b(function(a){return a|0},function(a,b,c){return b.def(c,"|0")});case "stencil.func":return b(function(a){return[$a[a.cmp||"keep"],a.ref||0,"mask"in a?a.mask:-1]},function(a,b,c){a=b.def('"cmp" in ',c,"?",a.constants.compareFuncs,"[",c,".cmp]",
":",7680);var d=b.def(c,".ref|0");b=b.def('"mask" in ',c,"?",c,".mask|0:-1");return[a,d,b]});case "stencil.opFront":case "stencil.opBack":return b(function(b){return["stencil.opBack"===a?1029:1028,Qa[b.fail||"keep"],Qa[b.zfail||"keep"],Qa[b.zpass||"keep"]]},function(b,c,d){function e(a){return c.def('"',a,'" in ',d,"?",f,"[",d,".",a,"]:",7680)}var f=b.constants.stencilOps;return["stencil.opBack"===a?1029:1028,e("fail"),e("zfail"),e("zpass")]});case "polygonOffset.offset":return b(function(a){return[a.factor|
0,a.units|0]},function(a,b,c){a=b.def(c,".factor|0");b=b.def(c,".units|0");return[a,b]});case "cull.face":return b(function(a){var b=0;"front"===a?b=1028:"back"===a&&(b=1029);return b},function(a,b,c){return b.def(c,'==="front"?',1028,":",1029)});case "lineWidth":return b(function(a){return a},function(a,b,c){return c});case "frontFace":return b(function(a){return xb[a]},function(a,b,c){return b.def(c+'==="cw"?2304:2305')});case "colorMask":return b(function(a){return a.map(function(a){return!!a})},
function(a,b,c){return A(4,function(a){return"!!"+c+"["+a+"]"})});case "sample.coverage":return b(function(a){return["value"in a?a.value:1,!!a.invert]},function(a,b,c){a=b.def('"value" in ',c,"?+",c,".value:1");b=b.def("!!",c,".invert");return[a,b]})}});return e}function ta(a,b){var c=a["static"],d=a.dynamic,e={};Object.keys(c).forEach(function(a){var b=c[a],d;if("number"===typeof b||"boolean"===typeof b)d=C(function(){return b});else if("function"===typeof b){var f=b._reglType;if("texture2d"===f||
"textureCube"===f)d=C(function(a){return a.link(b)});else if("framebuffer"===f||"framebufferCube"===f)d=C(function(a){return a.link(b.color[0])})}else oa(b)&&(d=C(function(a){return a.global.def("[",A(b.length,function(a){return b[a]}),"]")}));d.value=b;e[a]=d});Object.keys(d).forEach(function(a){var b=d[a];e[a]=L(b,function(a,c){return a.invoke(c,b)})});return e}function J(a,c){var e=a["static"],f=a.dynamic,g={};Object.keys(e).forEach(function(a){var c=e[a],f=b.id(a),h=new ja;if(Pa(c))h.state=1,
h.buffer=d.getBuffer(d.create(c,34962,!1,!0)),h.type=0;else{var y=d.getBuffer(c);if(y)h.state=1,h.buffer=y,h.type=0;else if("constant"in c){var I=c.constant;h.buffer="null";h.state=2;"number"===typeof I?h.x=I:Ca.forEach(function(a,b){b<I.length&&(h[a]=I[b])})}else{var y=Pa(c.buffer)?d.getBuffer(d.create(c.buffer,34962,!1,!0)):d.getBuffer(c.buffer),k=c.offset|0,l=c.stride|0,ea=c.size|0,n=!!c.normalized,m=0;"type"in c&&(m=Ia[c.type]);c=c.divisor|0;h.buffer=y;h.state=1;h.size=ea;h.normalized=n;h.type=
m||y.dtype;h.offset=k;h.stride=l;h.divisor=c}}g[a]=C(function(a,b){var c=a.attribCache;if(f in c)return c[f];var d={isStream:!1};Object.keys(h).forEach(function(a){d[a]=h[a]});h.buffer&&(d.buffer=a.link(h.buffer),d.type=d.type||d.buffer+".dtype");return c[f]=d})});Object.keys(f).forEach(function(a){var b=f[a];g[a]=L(b,function(a,c){function d(a){c(y[a],"=",e,".",a,"|0;")}var e=a.invoke(c,b),f=a.shared,g=a.constants,h=f.isBufferArgs,f=f.buffer,y={isStream:c.def(!1)},I=new ja;I.state=1;Object.keys(I).forEach(function(a){y[a]=
c.def(""+I[a])});var k=y.buffer,U=y.type;c("if(",h,"(",e,")){",y.isStream,"=true;",k,"=",f,".createStream(",34962,",",e,");",U,"=",k,".dtype;","}else{",k,"=",f,".getBuffer(",e,");","if(",k,"){",U,"=",k,".dtype;",'}else if("constant" in ',e,"){",y.state,"=",2,";","if(typeof "+e+'.constant === "number"){',y[Ca[0]],"=",e,".constant;",Ca.slice(1).map(function(a){return y[a]}).join("="),"=0;","}else{",Ca.map(function(a,b){return y[a]+"="+e+".constant.length>"+b+"?"+e+".constant["+b+"]:0;"}).join(""),"}}else{",
"if(",h,"(",e,".buffer)){",k,"=",f,".createStream(",34962,",",e,".buffer);","}else{",k,"=",f,".getBuffer(",e,".buffer);","}",U,'="type" in ',e,"?",g.glTypes,"[",e,".type]:",k,".dtype;",y.normalized,"=!!",e,".normalized;");d("size");d("offset");d("stride");d("divisor");c("}}");c.exit("if(",y.isStream,"){",f,".destroyStream(",k,");","}");return y})});return g}function D(a,b){var c=a["static"],d=a.dynamic;if("vao"in c){var e=c.vao;null!==e&&null===q.getVAO(e)&&(e=q.createVAO(e));return C(function(a){return a.link(q.getVAO(e))})}if("vao"in
d){var f=d.vao;return L(f,function(a,b){var c=a.invoke(b,f);return b.def(a.shared.vao+".getVAO("+c+")")})}return null}function x(a){var b=a["static"],c=a.dynamic,d={};Object.keys(b).forEach(function(a){var c=b[a];d[a]=C(function(a,b){return"number"===typeof c||"boolean"===typeof c?""+c:a.link(c)})});Object.keys(c).forEach(function(a){var b=c[a];d[a]=L(b,function(a,c){return a.invoke(c,b)})});return d}function ma(a,b,d,e,g){function h(a){var b=n[a];b&&(Za[a]=b)}var k=H(a,b),l=z(a,g),n=w(a,l,g),m=G(a,
g),Za=R(a,g),p=E(a,g,k);h("viewport");h(f("scissor.box"));var r=0<Object.keys(Za).length,l={framebuffer:l,draw:m,shader:p,state:Za,dirty:r,scopeVAO:null,drawVAO:null,useVAO:!1,attributes:{}};l.profile=Q(a,g);l.uniforms=ta(d,g);l.drawVAO=l.scopeVAO=D(a,g);if(!l.drawVAO&&p.program&&!k&&c.angle_instanced_arrays){var t=!0;a=p.program.attributes.map(function(a){a=b["static"][a];t=t&&!!a;return a});if(t&&0<a.length){var v=q.getVAO(q.createVAO(a));l.drawVAO=new P(null,null,null,function(a,b){return a.link(v)});
l.useVAO=!0}}k?l.useVAO=!0:l.attributes=J(b,g);l.context=x(e,g);return l}function T(a,b,c){var d=a.shared.context,e=a.scope();Object.keys(c).forEach(function(f){b.save(d,"."+f);e(d,".",f,"=",c[f].append(a,b),";")});b(e)}function O(a,b,c,d){var e=a.shared,f=e.gl,g=e.framebuffer,h;Ka&&(h=b.def(e.extensions,".webgl_draw_buffers"));var k=a.constants,e=k.drawBuffer,k=k.backBuffer;a=c?c.append(a,b):b.def(g,".next");d||b("if(",a,"!==",g,".cur){");b("if(",a,"){",f,".bindFramebuffer(",36160,",",a,".framebuffer);");
Ka&&b(h,".drawBuffersWEBGL(",e,"[",a,".colorAttachments.length]);");b("}else{",f,".bindFramebuffer(",36160,",null);");Ka&&b(h,".drawBuffersWEBGL(",k,");");b("}",g,".cur=",a,";");d||b("}")}function S(a,b,c){var d=a.shared,e=d.gl,g=a.current,h=a.next,k=d.current,l=d.next,n=a.cond(k,".dirty");La.forEach(function(b){b=f(b);if(!(b in c.state)){var d,I;if(b in h){d=h[b];I=g[b];var m=A(qa[b].length,function(a){return n.def(d,"[",a,"]")});n(a.cond(m.map(function(a,b){return a+"!=="+I+"["+b+"]"}).join("||")).then(e,
".",sa[b],"(",m,");",m.map(function(a,b){return I+"["+b+"]="+a}).join(";"),";"))}else d=n.def(l,".",b),m=a.cond(d,"!==",k,".",b),n(m),b in ra?m(a.cond(d).then(e,".enable(",ra[b],");")["else"](e,".disable(",ra[b],");"),k,".",b,"=",d,";"):m(e,".",sa[b],"(",d,");",k,".",b,"=",d,";")}});0===Object.keys(c.state).length&&n(k,".dirty=false;");b(n)}function K(a,b,c,d){var e=a.shared,f=a.current,g=e.current,h=e.gl;wb(Object.keys(c)).forEach(function(e){var k=c[e];if(!d||d(k)){var l=k.append(a,b);if(ra[e]){var n=
ra[e];va(k)?l?b(h,".enable(",n,");"):b(h,".disable(",n,");"):b(a.cond(l).then(h,".enable(",n,");")["else"](h,".disable(",n,");"));b(g,".",e,"=",l,";")}else if(oa(l)){var m=f[e];b(h,".",sa[e],"(",l,");",l.map(function(a,b){return m+"["+b+"]="+a}).join(";"),";")}else b(h,".",sa[e],"(",l,");",g,".",e,"=",l,";")}})}function B(a,b){pa&&(a.instancing=b.def(a.shared.extensions,".angle_instanced_arrays"))}function V(a,b,c,d,e){function f(){return"undefined"===typeof performance?"Date.now()":"performance.now()"}
function g(a){q=b.def();a(q,"=",f(),";");"string"===typeof e?a(m,".count+=",e,";"):a(m,".count++;");k&&(d?(t=b.def(),a(t,"=",r,".getNumPendingQueries();")):a(r,".beginQuery(",m,");"))}function h(a){a(m,".cpuTime+=",f(),"-",q,";");k&&(d?a(r,".pushScopeStats(",t,",",r,".getNumPendingQueries(),",m,");"):a(r,".endQuery();"))}function l(a){var c=b.def(p,".profile");b(p,".profile=",a,";");b.exit(p,".profile=",c,";")}var n=a.shared,m=a.stats,p=n.current,r=n.timer;c=c.profile;var q,t;if(c){if(va(c)){c.enable?
(g(b),h(b.exit),l("true")):l("false");return}c=c.append(a,b);l(c)}else c=b.def(p,".profile");n=a.block();g(n);b("if(",c,"){",n,"}");a=a.block();h(a);b.exit("if(",c,"){",a,"}")}function N(a,b,c,d,e){function f(a){switch(a){case 35664:case 35667:case 35671:return 2;case 35665:case 35668:case 35672:return 3;case 35666:case 35669:case 35673:return 4;default:return 1}}function g(c,d,e){function f(){b("if(!",m,".buffer){",l,".enableVertexAttribArray(",n,");}");var c=e.type,g;g=e.size?b.def(e.size,"||",
d):d;b("if(",m,".type!==",c,"||",m,".size!==",g,"||",ea.map(function(a){return m+"."+a+"!=="+e[a]}).join("||"),"){",l,".bindBuffer(",34962,",",U,".buffer);",l,".vertexAttribPointer(",[n,g,c,e.normalized,e.stride,e.offset],");",m,".type=",c,";",m,".size=",g,";",ea.map(function(a){return m+"."+a+"="+e[a]+";"}).join(""),"}");pa&&(c=e.divisor,b("if(",m,".divisor!==",c,"){",a.instancing,".vertexAttribDivisorANGLE(",[n,c],");",m,".divisor=",c,";}"))}function k(){b("if(",m,".buffer){",l,".disableVertexAttribArray(",
n,");",m,".buffer=null;","}if(",Ca.map(function(a,b){return m+"."+a+"!=="+p[b]}).join("||"),"){",l,".vertexAttrib4f(",n,",",p,");",Ca.map(function(a,b){return m+"."+a+"="+p[b]+";"}).join(""),"}")}var l=h.gl,n=b.def(c,".location"),m=b.def(h.attributes,"[",n,"]");c=e.state;var U=e.buffer,p=[e.x,e.y,e.z,e.w],ea=["buffer","normalized","offset","stride"];1===c?f():2===c?k():(b("if(",c,"===",1,"){"),f(),b("}else{"),k(),b("}"))}var h=a.shared;d.forEach(function(d){var h=d.name,k=c.attributes[h],l;if(k){if(!e(k))return;
l=k.append(a,b)}else{if(!e(yb))return;var n=a.scopeAttrib(h);l={};Object.keys(new ja).forEach(function(a){l[a]=b.def(n,".",a)})}g(a.link(d),f(d.info.type),l)})}function xa(a,c,d,e,f){for(var g=a.shared,h=g.gl,k,l=0;l<e.length;++l){var n=e[l],m=n.name,p=n.info.type,r=d.uniforms[m],n=a.link(n)+".location",q;if(r){if(!f(r))continue;if(va(r)){m=r.value;if(35678===p||35680===p)p=a.link(m._texture||m.color[0]._texture),c(h,".uniform1i(",n,",",p+".bind());"),c.exit(p,".unbind();");else if(35674===p||35675===
p||35676===p)m=a.global.def("new Float32Array(["+Array.prototype.slice.call(m)+"])"),r=2,35675===p?r=3:35676===p&&(r=4),c(h,".uniformMatrix",r,"fv(",n,",false,",m,");");else{switch(p){case 5126:k="1f";break;case 35664:k="2f";break;case 35665:k="3f";break;case 35666:k="4f";break;case 35670:k="1i";break;case 5124:k="1i";break;case 35671:k="2i";break;case 35667:k="2i";break;case 35672:k="3i";break;case 35668:k="3i";break;case 35673:k="4i";break;case 35669:k="4i"}c(h,".uniform",k,"(",n,",",oa(m)?Array.prototype.slice.call(m):
m,");")}continue}else q=r.append(a,c)}else{if(!f(yb))continue;q=c.def(g.uniforms,"[",b.id(m),"]")}35678===p?c("if(",q,"&&",q,'._reglType==="framebuffer"){',q,"=",q,".color[0];","}"):35680===p&&c("if(",q,"&&",q,'._reglType==="framebufferCube"){',q,"=",q,".color[0];","}");m=1;switch(p){case 35678:case 35680:p=c.def(q,"._texture");c(h,".uniform1i(",n,",",p,".bind());");c.exit(p,".unbind();");continue;case 5124:case 35670:k="1i";break;case 35667:case 35671:k="2i";m=2;break;case 35668:case 35672:k="3i";
m=3;break;case 35669:case 35673:k="4i";m=4;break;case 5126:k="1f";break;case 35664:k="2f";m=2;break;case 35665:k="3f";m=3;break;case 35666:k="4f";m=4;break;case 35674:k="Matrix2fv";break;case 35675:k="Matrix3fv";break;case 35676:k="Matrix4fv"}c(h,".uniform",k,"(",n,",");if("M"===k.charAt(0)){var n=Math.pow(p-35674+2,2),t=a.global.def("new Float32Array(",n,")");c("false,(Array.isArray(",q,")||",q," instanceof Float32Array)?",q,":(",A(n,function(a){return t+"["+a+"]="+q+"["+a+"]"}),",",t,")")}else 1<
m?c(A(m,function(a){return q+"["+a+"]"})):c(q);c(");")}}function ba(a,b,c,d){function e(f){var g=m[f];return g?g.contextDep&&d.contextDynamic||g.propDep?g.append(a,c):g.append(a,b):b.def(l,".",f)}function f(){function a(){c(v,".drawElementsInstancedANGLE(",[p,r,u,q+"<<(("+u+"-5121)>>1)",t],");")}function b(){c(v,".drawArraysInstancedANGLE(",[p,q,r,t],");")}n?ca?a():(c("if(",n,"){"),a(),c("}else{"),b(),c("}")):b()}function g(){function a(){c(k+".drawElements("+[p,r,u,q+"<<(("+u+"-5121)>>1)"]+");")}
function b(){c(k+".drawArrays("+[p,q,r]+");")}n?ca?a():(c("if(",n,"){"),a(),c("}else{"),b(),c("}")):b()}var h=a.shared,k=h.gl,l=h.draw,m=d.draw,n=function(){var e=m.elements,f=b;if(e){if(e.contextDep&&d.contextDynamic||e.propDep)f=c;e=e.append(a,f)}else e=f.def(l,".","elements");e&&f("if("+e+")"+k+".bindBuffer(34963,"+e+".buffer.buffer);");return e}(),p=e("primitive"),q=e("offset"),r=function(){var e=m.count,f=b;if(e){if(e.contextDep&&d.contextDynamic||e.propDep)f=c;e=e.append(a,f)}else e=f.def(l,
".","count");return e}();if("number"===typeof r){if(0===r)return}else c("if(",r,"){"),c.exit("}");var t,v;pa&&(t=e("instances"),v=a.instancing);var u=n+".type",ca=m.elements&&va(m.elements);pa&&("number"!==typeof t||0<=t)?"string"===typeof t?(c("if(",t,">0){"),f(),c("}else if(",t,"<0){"),g(),c("}")):f():g()}function ya(a,b,c,d,e){b=v();e=b.proc("body",e);pa&&(b.instancing=e.def(b.shared.extensions,".angle_instanced_arrays"));a(b,e,c,d);return b.compile().body}function ca(a,b,c,d){B(a,b);c.useVAO?
c.drawVAO?b(a.shared.vao,".setVAO(",c.drawVAO.append(a,b),");"):b(a.shared.vao,".setVAO(",a.shared.vao,".targetVAO);"):(b(a.shared.vao,".setVAO(null);"),N(a,b,c,d.attributes,function(){return!0}));xa(a,b,c,d.uniforms,function(){return!0});ba(a,b,b,c)}function Ea(a,b){var c=a.proc("draw",1);B(a,c);T(a,c,b.context);O(a,c,b.framebuffer);S(a,c,b);K(a,c,b.state);V(a,c,b,!1,!0);var d=b.shader.progVar.append(a,c);c(a.shared.gl,".useProgram(",d,".program);");if(b.shader.program)ca(a,c,b,b.shader.program);
else{c(a.shared.vao,".setVAO(null);");var e=a.global.def("{}"),f=c.def(d,".id"),g=c.def(e,"[",f,"]");c(a.cond(g).then(g,".call(this,a0);")["else"](g,"=",e,"[",f,"]=",a.link(function(c){return ya(ca,a,b,c,1)}),"(",d,");",g,".call(this,a0);"))}0<Object.keys(b.state).length&&c(a.shared.current,".dirty=true;")}function ga(a,b,c,d){function e(){return!0}a.batchId="a1";B(a,b);N(a,b,c,d.attributes,e);xa(a,b,c,d.uniforms,e);ba(a,b,b,c)}function M(a,b,c,d){function e(a){return a.contextDep&&g||a.propDep}function f(a){return!e(a)}
B(a,b);var g=c.contextDep,h=b.def(),k=b.def();a.shared.props=k;a.batchId=h;var l=a.scope(),m=a.scope();b(l.entry,"for(",h,"=0;",h,"<","a1",";++",h,"){",k,"=","a0","[",h,"];",m,"}",l.exit);c.needsContext&&T(a,m,c.context);c.needsFramebuffer&&O(a,m,c.framebuffer);K(a,m,c.state,e);c.profile&&e(c.profile)&&V(a,m,c,!1,!0);d?(c.useVAO?c.drawVAO?e(c.drawVAO)?m(a.shared.vao,".setVAO(",c.drawVAO.append(a,m),");"):l(a.shared.vao,".setVAO(",c.drawVAO.append(a,l),");"):l(a.shared.vao,".setVAO(",a.shared.vao,
".targetVAO);"):(l(a.shared.vao,".setVAO(null);"),N(a,l,c,d.attributes,f),N(a,m,c,d.attributes,e)),xa(a,l,c,d.uniforms,f),xa(a,m,c,d.uniforms,e),ba(a,l,m,c)):(b=a.global.def("{}"),d=c.shader.progVar.append(a,m),k=m.def(d,".id"),l=m.def(b,"[",k,"]"),m(a.shared.gl,".useProgram(",d,".program);","if(!",l,"){",l,"=",b,"[",k,"]=",a.link(function(b){return ya(ga,a,c,b,2)}),"(",d,");}",l,".call(this,a0[",h,"],",h,");"))}function X(a,b){function c(a){return a.contextDep&&e||a.propDep}var d=a.proc("batch",
2);a.batchId="0";B(a,d);var e=!1,f=!0;Object.keys(b.context).forEach(function(a){e=e||b.context[a].propDep});e||(T(a,d,b.context),f=!1);var g=b.framebuffer,h=!1;g?(g.propDep?e=h=!0:g.contextDep&&e&&(h=!0),h||O(a,d,g)):O(a,d,null);b.state.viewport&&b.state.viewport.propDep&&(e=!0);S(a,d,b);K(a,d,b.state,function(a){return!c(a)});b.profile&&c(b.profile)||V(a,d,b,!1,"a1");b.contextDep=e;b.needsContext=f;b.needsFramebuffer=h;f=b.shader.progVar;if(f.contextDep&&e||f.propDep)M(a,d,b,null);else if(f=f.append(a,
d),d(a.shared.gl,".useProgram(",f,".program);"),b.shader.program)M(a,d,b,b.shader.program);else{d(a.shared.vao,".setVAO(null);");var g=a.global.def("{}"),h=d.def(f,".id"),k=d.def(g,"[",h,"]");d(a.cond(k).then(k,".call(this,a0,a1);")["else"](k,"=",g,"[",h,"]=",a.link(function(c){return ya(M,a,b,c,2)}),"(",f,");",k,".call(this,a0,a1);"))}0<Object.keys(b.state).length&&d(a.shared.current,".dirty=true;")}function Y(a,c){function d(b){var g=c.shader[b];g&&e.set(f.shader,"."+b,g.append(a,e))}var e=a.proc("scope",
3);a.batchId="a2";var f=a.shared,g=f.current;T(a,e,c.context);c.framebuffer&&c.framebuffer.append(a,e);wb(Object.keys(c.state)).forEach(function(b){var d=c.state[b].append(a,e);oa(d)?d.forEach(function(c,d){e.set(a.next[b],"["+d+"]",c)}):e.set(f.next,"."+b,d)});V(a,e,c,!0,!0);["elements","offset","count","instances","primitive"].forEach(function(b){var d=c.draw[b];d&&e.set(f.draw,"."+b,""+d.append(a,e))});Object.keys(c.uniforms).forEach(function(d){e.set(f.uniforms,"["+b.id(d)+"]",c.uniforms[d].append(a,
e))});Object.keys(c.attributes).forEach(function(b){var d=c.attributes[b].append(a,e),f=a.scopeAttrib(b);Object.keys(new ja).forEach(function(a){e.set(f,"."+a,d[a])})});c.scopeVAO&&e.set(f.vao,".targetVAO",c.scopeVAO.append(a,e));d("vert");d("frag");0<Object.keys(c.state).length&&(e(g,".dirty=true;"),e.exit(g,".dirty=true;"));e("a1(",a.shared.context,",a0,",a.batchId,");")}function ia(a){if("object"===typeof a&&!oa(a)){for(var b=Object.keys(a),c=0;c<b.length;++c)if(ha.isDynamic(a[b[c]]))return!0;
return!1}}function ka(a,b,c){function d(a,b){g.forEach(function(c){var d=e[c];ha.isDynamic(d)&&(d=a.invoke(b,d),b(m,".",c,"=",d,";"))})}var e=b["static"][c];if(e&&ia(e)){var f=a.global,g=Object.keys(e),h=!1,k=!1,l=!1,m=a.global.def("{}");g.forEach(function(b){var c=e[b];if(ha.isDynamic(c))"function"===typeof c&&(c=e[b]=ha.unbox(c)),b=L(c,null),h=h||b.thisDep,l=l||b.propDep,k=k||b.contextDep;else{f(m,".",b,"=");switch(typeof c){case "number":f(c);break;case "string":f('"',c,'"');break;case "object":Array.isArray(c)&&
f("[",c.join(),"]");break;default:f(a.link(c))}f(";")}});b.dynamic[c]=new ha.DynamicVariable(4,{thisDep:h,contextDep:k,propDep:l,ref:m,append:d});delete b["static"][c]}}var ja=q.Record,W={add:32774,subtract:32778,"reverse subtract":32779};c.ext_blend_minmax&&(W.min=32775,W.max=32776);var pa=c.angle_instanced_arrays,Ka=c.webgl_draw_buffers,qa={dirty:!0,profile:h.profile},Da={},La=[],ra={},sa={};p("dither",3024);p("blend.enable",3042);m("blend.color","blendColor",[0,0,0,0]);m("blend.equation","blendEquationSeparate",
[32774,32774]);m("blend.func","blendFuncSeparate",[1,0,1,0]);p("depth.enable",2929,!0);m("depth.func","depthFunc",513);m("depth.range","depthRange",[0,1]);m("depth.mask","depthMask",!0);m("colorMask","colorMask",[!0,!0,!0,!0]);p("cull.enable",2884);m("cull.face","cullFace",1029);m("frontFace","frontFace",2305);m("lineWidth","lineWidth",1);p("polygonOffset.enable",32823);m("polygonOffset.offset","polygonOffset",[0,0]);p("sample.alpha",32926);p("sample.enable",32928);m("sample.coverage","sampleCoverage",
[1,!1]);p("stencil.enable",2960);m("stencil.mask","stencilMask",-1);m("stencil.func","stencilFunc",[519,0,-1]);m("stencil.opFront","stencilOpSeparate",[1028,7680,7680,7680]);m("stencil.opBack","stencilOpSeparate",[1029,7680,7680,7680]);p("scissor.enable",3089);m("scissor.box","scissor",[0,0,a.drawingBufferWidth,a.drawingBufferHeight]);m("viewport","viewport",[0,0,a.drawingBufferWidth,a.drawingBufferHeight]);var la={gl:a,context:F,strings:b,next:Da,current:qa,draw:l,elements:g,buffer:d,shader:t,attributes:q.state,
vao:q,uniforms:u,framebuffer:n,extensions:c,timer:k,isBufferArgs:Pa},Z={primTypes:Ta,compareFuncs:$a,blendFuncs:Fa,blendEquations:W,stencilOps:Qa,glTypes:Ia,orientationType:xb};Ka&&(Z.backBuffer=[1029],Z.drawBuffer=A(e.maxDrawbuffers,function(a){return 0===a?[0]:A(a,function(a){return 36064+a})}));var ua=0;return{next:Da,current:qa,procs:function(){var a=v(),b=a.proc("poll"),d=a.proc("refresh"),f=a.block();b(f);d(f);var g=a.shared,h=g.gl,k=g.next,l=g.current;f(l,".dirty=false;");O(a,b);O(a,d,null,
!0);var m;pa&&(m=a.link(pa));c.oes_vertex_array_object&&d(a.link(c.oes_vertex_array_object),".bindVertexArrayOES(null);");for(var n=0;n<e.maxAttributes;++n){var p=d.def(g.attributes,"[",n,"]"),q=a.cond(p,".buffer");q.then(h,".enableVertexAttribArray(",n,");",h,".bindBuffer(",34962,",",p,".buffer.buffer);",h,".vertexAttribPointer(",n,",",p,".size,",p,".type,",p,".normalized,",p,".stride,",p,".offset);")["else"](h,".disableVertexAttribArray(",n,");",h,".vertexAttrib4f(",n,",",p,".x,",p,".y,",p,".z,",
p,".w);",p,".buffer=null;");d(q);pa&&d(m,".vertexAttribDivisorANGLE(",n,",",p,".divisor);")}d(a.shared.vao,".currentVAO=null;",a.shared.vao,".setVAO(",a.shared.vao,".targetVAO);");Object.keys(ra).forEach(function(c){var e=ra[c],g=f.def(k,".",c),m=a.block();m("if(",g,"){",h,".enable(",e,")}else{",h,".disable(",e,")}",l,".",c,"=",g,";");d(m);b("if(",g,"!==",l,".",c,"){",m,"}")});Object.keys(sa).forEach(function(c){var e=sa[c],g=qa[c],m,n,p=a.block();p(h,".",e,"(");oa(g)?(e=g.length,m=a.global.def(k,
".",c),n=a.global.def(l,".",c),p(A(e,function(a){return m+"["+a+"]"}),");",A(e,function(a){return n+"["+a+"]="+m+"["+a+"];"}).join("")),b("if(",A(e,function(a){return m+"["+a+"]!=="+n+"["+a+"]"}).join("||"),"){",p,"}")):(m=f.def(k,".",c),n=f.def(l,".",c),p(m,");",l,".",c,"=",m,";"),b("if(",m,"!==",n,"){",p,"}"));d(p)});return a.compile()}(),compile:function(a,b,c,d,e){var f=v();f.stats=f.link(e);Object.keys(b["static"]).forEach(function(a){ka(f,b,a)});Ub.forEach(function(b){ka(f,a,b)});c=ma(a,b,c,
d,f);Ea(f,c);Y(f,c);X(f,c);return f.compile()}}}function zb(a,b){for(var c=0;c<a.length;++c)if(a[c]===b)return c;return-1}var H=function(a,b){for(var c=Object.keys(b),e=0;e<c.length;++e)a[c[e]]=b[c[e]];return a},Bb=0,ha={DynamicVariable:ka,define:function(a,b){return new ka(a,bb(b+""))},isDynamic:function(a){return"function"===typeof a&&!a._reglType||a instanceof ka},unbox:function(a,b){return"function"===typeof a?new ka(0,a):a},accessor:bb},ab={next:"function"===typeof requestAnimationFrame?function(a){return requestAnimationFrame(a)}:
function(a){return setTimeout(a,16)},cancel:"function"===typeof cancelAnimationFrame?function(a){return cancelAnimationFrame(a)}:clearTimeout},Ab="undefined"!==typeof performance&&performance.now?function(){return performance.now()}:function(){return+new Date},z=fb();z.zero=fb();var Vb=function(a,b){var c=1;b.ext_texture_filter_anisotropic&&(c=a.getParameter(34047));var e=1,d=1;b.webgl_draw_buffers&&(e=a.getParameter(34852),d=a.getParameter(36063));var g=!!b.oes_texture_float;if(g){g=a.createTexture();
a.bindTexture(3553,g);a.texImage2D(3553,0,6408,1,1,0,6408,5126,null);var r=a.createFramebuffer();a.bindFramebuffer(36160,r);a.framebufferTexture2D(36160,36064,3553,g,0);a.bindTexture(3553,null);if(36053!==a.checkFramebufferStatus(36160))g=!1;else{a.viewport(0,0,1,1);a.clearColor(1,0,0,1);a.clear(16384);var n=z.allocType(5126,4);a.readPixels(0,0,1,1,6408,5126,n);a.getError()?g=!1:(a.deleteFramebuffer(r),a.deleteTexture(g),g=1===n[0]);z.freeType(n)}}n=!0;"undefined"!==typeof navigator&&(/MSIE/.test(navigator.userAgent)||
/Trident\//.test(navigator.appVersion)||/Edge/.test(navigator.userAgent))||(n=a.createTexture(),r=z.allocType(5121,36),a.activeTexture(33984),a.bindTexture(34067,n),a.texImage2D(34069,0,6408,3,3,0,6408,5121,r),z.freeType(r),a.bindTexture(34067,null),a.deleteTexture(n),n=!a.getError());return{colorBits:[a.getParameter(3410),a.getParameter(3411),a.getParameter(3412),a.getParameter(3413)],depthBits:a.getParameter(3414),stencilBits:a.getParameter(3415),subpixelBits:a.getParameter(3408),extensions:Object.keys(b).filter(function(a){return!!b[a]}),
maxAnisotropic:c,maxDrawbuffers:e,maxColorAttachments:d,pointSizeDims:a.getParameter(33901),lineWidthDims:a.getParameter(33902),maxViewportDims:a.getParameter(3386),maxCombinedTextureUnits:a.getParameter(35661),maxCubeMapSize:a.getParameter(34076),maxRenderbufferSize:a.getParameter(34024),maxTextureUnits:a.getParameter(34930),maxTextureSize:a.getParameter(3379),maxAttributes:a.getParameter(34921),maxVertexUniforms:a.getParameter(36347),maxVertexTextureUnits:a.getParameter(35660),maxVaryingVectors:a.getParameter(36348),
maxFragmentUniforms:a.getParameter(36349),glsl:a.getParameter(35724),renderer:a.getParameter(7937),vendor:a.getParameter(7936),version:a.getParameter(7938),readFloat:g,npotTextureCube:n}},G=function(a){return a instanceof Uint8Array||a instanceof Uint16Array||a instanceof Uint32Array||a instanceof Int8Array||a instanceof Int16Array||a instanceof Int32Array||a instanceof Float32Array||a instanceof Float64Array||a instanceof Uint8ClampedArray},J=function(a){return Object.keys(a).map(function(b){return a[b]})},
Na={shape:function(a){for(var b=[];a.length;a=a[0])b.push(a.length);return b},flatten:function(a,b,c,e){var d=1;if(b.length)for(var g=0;g<b.length;++g)d*=b[g];else d=0;c=e||z.allocType(c,d);switch(b.length){case 0:break;case 1:e=b[0];for(b=0;b<e;++b)c[b]=a[b];break;case 2:e=b[0];b=b[1];for(g=d=0;g<e;++g)for(var r=a[g],n=0;n<b;++n)c[d++]=r[n];break;case 3:gb(a,b[0],b[1],b[2],c,0);break;default:hb(a,b,0,c,0)}return c}},Ha={"[object Int8Array]":5120,"[object Int16Array]":5122,"[object Int32Array]":5124,
"[object Uint8Array]":5121,"[object Uint8ClampedArray]":5121,"[object Uint16Array]":5123,"[object Uint32Array]":5125,"[object Float32Array]":5126,"[object Float64Array]":5121,"[object ArrayBuffer]":5121},Ia={int8:5120,int16:5122,int32:5124,uint8:5121,uint16:5123,uint32:5125,"float":5126,float32:5126},lb={dynamic:35048,stream:35040,"static":35044},Ra=Na.flatten,kb=Na.shape,ia=[];ia[5120]=1;ia[5122]=2;ia[5124]=4;ia[5121]=1;ia[5123]=2;ia[5125]=4;ia[5126]=4;var Ta={points:0,point:0,lines:1,line:1,triangles:4,
triangle:4,"line loop":2,"line strip":3,"triangle strip":5,"triangle fan":6},ob=new Float32Array(1),Jb=new Uint32Array(ob.buffer),Nb=[9984,9986,9985,9987],Ma=[0,6409,6410,6407,6408],S={};S[6409]=S[6406]=S[6402]=1;S[34041]=S[6410]=2;S[6407]=S[35904]=3;S[6408]=S[35906]=4;var Va=la("HTMLCanvasElement"),Wa=la("OffscreenCanvas"),sb=la("CanvasRenderingContext2D"),tb=la("ImageBitmap"),ub=la("HTMLImageElement"),vb=la("HTMLVideoElement"),Kb=Object.keys(Ha).concat([Va,Wa,sb,tb,ub,vb]),Z=[];Z[5121]=1;Z[5126]=
4;Z[36193]=2;Z[5123]=2;Z[5125]=4;var w=[];w[32854]=2;w[32855]=2;w[36194]=2;w[34041]=4;w[33776]=.5;w[33777]=.5;w[33778]=1;w[33779]=1;w[35986]=.5;w[35987]=1;w[34798]=1;w[35840]=.5;w[35841]=.25;w[35842]=.5;w[35843]=.25;w[36196]=.5;var E=[];E[32854]=2;E[32855]=2;E[36194]=2;E[33189]=2;E[36168]=1;E[34041]=4;E[35907]=4;E[34836]=16;E[34842]=8;E[34843]=6;var Wb=function(a,b,c,e,d){function g(a){this.id=q++;this.refCount=1;this.renderbuffer=a;this.format=32854;this.height=this.width=0;d.profile&&(this.stats=
{size:0})}function r(b){var c=b.renderbuffer;a.bindRenderbuffer(36161,null);a.deleteRenderbuffer(c);b.renderbuffer=null;b.refCount=0;delete t[b.id];e.renderbufferCount--}var n={rgba4:32854,rgb565:36194,"rgb5 a1":32855,depth:33189,stencil:36168,"depth stencil":34041};b.ext_srgb&&(n.srgba=35907);b.ext_color_buffer_half_float&&(n.rgba16f=34842,n.rgb16f=34843);b.webgl_color_buffer_float&&(n.rgba32f=34836);var u=[];Object.keys(n).forEach(function(a){u[n[a]]=a});var q=0,t={};g.prototype.decRef=function(){0>=
--this.refCount&&r(this)};d.profile&&(e.getTotalRenderbufferSize=function(){var a=0;Object.keys(t).forEach(function(b){a+=t[b].stats.size});return a});return{create:function(b,c){function k(b,c){var e=0,g=0,l=32854;"object"===typeof b&&b?("shape"in b?(g=b.shape,e=g[0]|0,g=g[1]|0):("radius"in b&&(e=g=b.radius|0),"width"in b&&(e=b.width|0),"height"in b&&(g=b.height|0)),"format"in b&&(l=n[b.format])):"number"===typeof b?(e=b|0,g="number"===typeof c?c|0:e):b||(e=g=1);if(e!==h.width||g!==h.height||l!==
h.format)return k.width=h.width=e,k.height=h.height=g,h.format=l,a.bindRenderbuffer(36161,h.renderbuffer),a.renderbufferStorage(36161,l,e,g),d.profile&&(h.stats.size=E[h.format]*h.width*h.height),k.format=u[h.format],k}var h=new g(a.createRenderbuffer());t[h.id]=h;e.renderbufferCount++;k(b,c);k.resize=function(b,c){var e=b|0,g=c|0||e;if(e===h.width&&g===h.height)return k;k.width=h.width=e;k.height=h.height=g;a.bindRenderbuffer(36161,h.renderbuffer);a.renderbufferStorage(36161,h.format,e,g);d.profile&&
(h.stats.size=E[h.format]*h.width*h.height);return k};k._reglType="renderbuffer";k._renderbuffer=h;d.profile&&(k.stats=h.stats);k.destroy=function(){h.decRef()};return k},clear:function(){J(t).forEach(r)},restore:function(){J(t).forEach(function(b){b.renderbuffer=a.createRenderbuffer();a.bindRenderbuffer(36161,b.renderbuffer);a.renderbufferStorage(36161,b.format,b.width,b.height)});a.bindRenderbuffer(36161,null)}}},Xa=[];Xa[6408]=4;Xa[6407]=3;var Oa=[];Oa[5121]=1;Oa[5126]=4;Oa[36193]=2;var Ca=["x",
"y","z","w"],Ub="blend.func blend.equation stencil.func stencil.opFront stencil.opBack sample.coverage viewport scissor.box polygonOffset.offset".split(" "),Fa={0:0,1:1,zero:0,one:1,"src color":768,"one minus src color":769,"src alpha":770,"one minus src alpha":771,"dst color":774,"one minus dst color":775,"dst alpha":772,"one minus dst alpha":773,"constant color":32769,"one minus constant color":32770,"constant alpha":32771,"one minus constant alpha":32772,"src alpha saturate":776},$a={never:512,
less:513,"<":513,equal:514,"=":514,"==":514,"===":514,lequal:515,"<=":515,greater:516,">":516,notequal:517,"!=":517,"!==":517,gequal:518,">=":518,always:519},Qa={0:0,zero:0,keep:7680,replace:7681,increment:7682,decrement:7683,"increment wrap":34055,"decrement wrap":34056,invert:5386},xb={cw:2304,ccw:2305},yb=new P(!1,!1,!1,function(){}),Xb=function(a,b){function c(){this.endQueryIndex=this.startQueryIndex=-1;this.sum=0;this.stats=null}function e(a,b,d){var e=r.pop()||new c;e.startQueryIndex=a;e.endQueryIndex=
b;e.sum=0;e.stats=d;n.push(e)}if(!b.ext_disjoint_timer_query)return null;var d=[],g=[],r=[],n=[],u=[],q=[];return{beginQuery:function(a){var c=d.pop()||b.ext_disjoint_timer_query.createQueryEXT();b.ext_disjoint_timer_query.beginQueryEXT(35007,c);g.push(c);e(g.length-1,g.length,a)},endQuery:function(){b.ext_disjoint_timer_query.endQueryEXT(35007)},pushScopeStats:e,update:function(){var a,c;a=g.length;if(0!==a){q.length=Math.max(q.length,a+1);u.length=Math.max(u.length,a+1);u[0]=0;var e=q[0]=0;for(c=
a=0;c<g.length;++c){var k=g[c];b.ext_disjoint_timer_query.getQueryObjectEXT(k,34919)?(e+=b.ext_disjoint_timer_query.getQueryObjectEXT(k,34918),d.push(k)):g[a++]=k;u[c+1]=e;q[c+1]=a}g.length=a;for(c=a=0;c<n.length;++c){var e=n[c],h=e.startQueryIndex,k=e.endQueryIndex;e.sum+=u[k]-u[h];h=q[h];k=q[k];k===h?(e.stats.gpuTime+=e.sum/1E6,r.push(e)):(e.startQueryIndex=h,e.endQueryIndex=k,n[a++]=e)}n.length=a}},getNumPendingQueries:function(){return g.length},clear:function(){d.push.apply(d,g);for(var a=0;a<
d.length;a++)b.ext_disjoint_timer_query.deleteQueryEXT(d[a]);g.length=0;d.length=0},restore:function(){g.length=0;d.length=0}}};return function(a){function b(){if(0===B.length)w&&w.update(),ba=null;else{ba=ab.next(b);t();for(var a=B.length-1;0<=a;--a){var c=B[a];c&&c(A,null,0)}k.flush();w&&w.update()}}function c(){!ba&&0<B.length&&(ba=ab.next(b))}function e(){ba&&(ab.cancel(b),ba=null)}function d(a){a.preventDefault();e();V.forEach(function(a){a()})}function g(a){k.getError();f.restore();D.restore();
R.restore();x.restore();N.restore();T.restore();J.restore();w&&w.restore();O.procs.refresh();c();X.forEach(function(a){a()})}function r(a){function b(a){var c={},d={};Object.keys(a).forEach(function(b){var e=a[b];ha.isDynamic(e)?d[b]=ha.unbox(e,b):c[b]=e});return{dynamic:d,"static":c}}function c(a){for(;m.length<a;)m.push(null);return m}var d=b(a.context||{}),e=b(a.uniforms||{}),f=b(a.attributes||{}),g=b(function(a){function b(a){if(a in c){var d=c[a];delete c[a];Object.keys(d).forEach(function(b){c[a+
"."+b]=d[b]})}}var c=H({},a);delete c.uniforms;delete c.attributes;delete c.context;delete c.vao;"stencil"in c&&c.stencil.op&&(c.stencil.opBack=c.stencil.opFront=c.stencil.op,delete c.stencil.op);b("blend");b("depth");b("cull");b("stencil");b("polygonOffset");b("scissor");b("sample");"vao"in a&&(c.vao=a.vao);return c}(a));a={gpuTime:0,cpuTime:0,count:0};var d=O.compile(g,f,e,d,a),h=d.draw,k=d.batch,l=d.scope,m=[];return H(function(a,b){var d;if("function"===typeof a)return l.call(this,null,a,0);if("function"===
typeof b)if("number"===typeof a)for(d=0;d<a;++d)l.call(this,null,b,d);else if(Array.isArray(a))for(d=0;d<a.length;++d)l.call(this,a[d],b,d);else return l.call(this,a,b,0);else if("number"===typeof a){if(0<a)return k.call(this,c(a|0),a|0)}else if(Array.isArray(a)){if(a.length)return k.call(this,a,a.length)}else return h.call(this,a)},{stats:a})}function n(a,b){var c=0;O.procs.poll();var d=b.color;d&&(k.clearColor(+d[0]||0,+d[1]||0,+d[2]||0,+d[3]||0),c|=16384);"depth"in b&&(k.clearDepth(+b.depth),c|=
256);"stencil"in b&&(k.clearStencil(b.stencil|0),c|=1024);k.clear(c)}function u(a){B.push(a);c();return{cancel:function(){function b(){var a=zb(B,b);B[a]=B[B.length-1];--B.length;0>=B.length&&e()}var c=zb(B,a);B[c]=b}}}function q(){var a=S.viewport,b=S.scissor_box;a[0]=a[1]=b[0]=b[1]=0;A.viewportWidth=A.framebufferWidth=A.drawingBufferWidth=a[2]=b[2]=k.drawingBufferWidth;A.viewportHeight=A.framebufferHeight=A.drawingBufferHeight=a[3]=b[3]=k.drawingBufferHeight}function t(){A.tick+=1;A.time=z();q();
O.procs.poll()}function l(){q();O.procs.refresh();w&&w.update()}function z(){return(Ab()-C)/1E3}a=Fb(a);if(!a)return null;var k=a.gl,h=k.getContextAttributes();k.isContextLost();var f=Gb(k,a);if(!f)return null;var p=Cb(),m={vaoCount:0,bufferCount:0,elementsCount:0,framebufferCount:0,shaderCount:0,textureCount:0,cubeCount:0,renderbufferCount:0,maxTextureUnits:0},v=f.extensions,w=Xb(k,v),C=Ab(),E=k.drawingBufferWidth,L=k.drawingBufferHeight,A={tick:0,time:0,viewportWidth:E,viewportHeight:L,framebufferWidth:E,
framebufferHeight:L,drawingBufferWidth:E,drawingBufferHeight:L,pixelRatio:a.pixelRatio},G=Vb(k,v),R=Hb(k,m,a,function(a){return J.destroyBuffer(a)}),J=Pb(k,v,G,m,R),P=Ib(k,v,R,m),D=Qb(k,p,m,a),x=Lb(k,v,G,function(){O.procs.poll()},A,m,a),N=Wb(k,v,G,m,a),T=Ob(k,v,G,x,N,m),O=Tb(k,p,v,G,R,P,x,T,{},J,D,{elements:null,primitive:4,count:-1,offset:0,instances:-1},A,w,a),p=Rb(k,T,O.procs.poll,A,h,v,G),S=O.next,K=k.canvas,B=[],V=[],X=[],Y=[a.onDestroy],ba=null;K&&(K.addEventListener("webglcontextlost",d,!1),
K.addEventListener("webglcontextrestored",g,!1));var Z=T.setFBO=r({framebuffer:ha.define.call(null,1,"framebuffer")});l();h=H(r,{clear:function(a){if("framebuffer"in a)if(a.framebuffer&&"framebufferCube"===a.framebuffer_reglType)for(var b=0;6>b;++b)Z(H({framebuffer:a.framebuffer.faces[b]},a),n);else Z(a,n);else n(null,a)},prop:ha.define.bind(null,1),context:ha.define.bind(null,2),"this":ha.define.bind(null,3),draw:r({}),buffer:function(a){return R.create(a,34962,!1,!1)},elements:function(a){return P.create(a,
!1)},texture:x.create2D,cube:x.createCube,renderbuffer:N.create,framebuffer:T.create,framebufferCube:T.createCube,vao:J.createVAO,attributes:h,frame:u,on:function(a,b){var c;switch(a){case "frame":return u(b);case "lost":c=V;break;case "restore":c=X;break;case "destroy":c=Y}c.push(b);return{cancel:function(){for(var a=0;a<c.length;++a)if(c[a]===b){c[a]=c[c.length-1];c.pop();break}}}},limits:G,hasExtension:function(a){return 0<=G.extensions.indexOf(a.toLowerCase())},read:p,destroy:function(){B.length=
0;e();K&&(K.removeEventListener("webglcontextlost",d),K.removeEventListener("webglcontextrestored",g));D.clear();T.clear();N.clear();x.clear();P.clear();R.clear();J.clear();w&&w.clear();Y.forEach(function(a){a()})},_gl:k,_refresh:l,poll:function(){t();w&&w.update()},now:z,stats:m});a.onDone(null,h);return h}});

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_Position = vec4(position, 0, 1);\n  uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tSource;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_FragColor = texture2D(tSource, uv);\n}\n"]),
    attributes: { position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1] },
    count: 6,
    uniforms: { tSource: regl.prop('source') },
    viewport: regl.prop('vpScreen'),
    depth: { enable: false },
    framebuffer: regl.prop('destination')
  });

  cmd.position = regl({
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec3 position;\n\nuniform sampler2D tNoise;\nuniform mat4 model, view, projection;\nuniform float tNoiseSize, height, scale;\n\nvarying vec3 vPos;\n\nfloat smootherstep(float a, float b, float r) {\n    r = clamp(r, 0.0, 1.0);\n    r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);\n    return mix(a, b, r);\n}\n\nfloat perlin2D(vec2 p, sampler2D tNoise, float tNoiseSize) {\n  vec2 p0 = floor(p);\n  vec2 p1 = p0 + vec2(1, 0);\n  vec2 p2 = p0 + vec2(1, 1);\n  vec2 p3 = p0 + vec2(0, 1);\n  vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;\n  vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;\n  vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;\n  vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;\n  vec2 p0p = p - p0;\n  vec2 p1p = p - p1;\n  vec2 p2p = p - p2;\n  vec2 p3p = p - p3;\n  float dp0 = dot(d0, p0p);\n  float dp1 = dot(d1, p1p);\n  float dp2 = dot(d2, p2p);\n  float dp3 = dot(d3, p3p);\n  float fx = p.x - p0.x;\n  float fy = p.y - p0.y;\n  float m01 = smootherstep(dp0, dp1, fx);\n  float m32 = smootherstep(dp3, dp2, fx);\n  float m01m32 = smootherstep(m01, m32, fy);\n  return m01m32;\n}\n\nfloat perlin2D_normal_1604150559(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    return perlin2D(p, tNoise, tNoiseSize) * 0.5 + 0.5;\n}\n\nfloat cursive_noise_1117569599(vec2 p, float scale, sampler2D tNoise, float tNoiseSize) {\n    const int steps = 13;\n    float sigma = 0.7;\n    float gamma = pow(1.0/sigma, float(steps));\n    vec2 displace = vec2(0);\n    for (int i = 0; i < steps; i++) {\n        displace = 1.5 * vec2(\n          perlin2D_normal_1604150559(p.xy * gamma + displace, tNoise, tNoiseSize),\n          perlin2D_normal_1604150559(p.yx * gamma + displace, tNoise, tNoiseSize)\n        );\n        gamma *= sigma;\n    }\n    return perlin2D_normal_1604150559(p * gamma + displace, tNoise, tNoiseSize);\n}\n\nfloat height_0(vec2 p, float scale, float height, sampler2D tNoise, float tNoiseSize) {\n    p = p * 0.001 * scale;\n    p += 11.0;\n    float h = cursive_noise_1117569599(p, scale, tNoise, tNoiseSize) * height * 1.0;\n    h += pow(perlin2D_normal_1604150559(p * 0.25, tNoise, tNoiseSize) + 0.25, 4.0) * height * 3.0;\n    h = mix(perlin2D_normal_1604150559(p * 0.4, tNoise, tNoiseSize) * height * 1.0, h, h/(height*4.0));\n    return h;\n}\n\nvoid main() {\n  vec4 p = model * vec4(position, 1);\n  p.y = height_0(p.xz, scale, height, tNoise, tNoiseSize);\n  gl_Position = projection * view * p;\n  vPos = p.xyz;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nvarying vec3 vPos;\n\nvoid main() {\n  gl_FragColor = vec4(vPos, 1);\n}\n"]),
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
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_Position = vec4(position, 0, 1);\n  uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tNoise;\nuniform float tNoiseSize, scale, height, dist;\nuniform bool origin;\n\nvarying vec2 uv;\n\nfloat smootherstep(float a, float b, float r) {\n    r = clamp(r, 0.0, 1.0);\n    r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);\n    return mix(a, b, r);\n}\n\nfloat perlin2D(vec2 p, sampler2D tNoise, float tNoiseSize) {\n  vec2 p0 = floor(p);\n  vec2 p1 = p0 + vec2(1, 0);\n  vec2 p2 = p0 + vec2(1, 1);\n  vec2 p3 = p0 + vec2(0, 1);\n  vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;\n  vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;\n  vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;\n  vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;\n  vec2 p0p = p - p0;\n  vec2 p1p = p - p1;\n  vec2 p2p = p - p2;\n  vec2 p3p = p - p3;\n  float dp0 = dot(d0, p0p);\n  float dp1 = dot(d1, p1p);\n  float dp2 = dot(d2, p2p);\n  float dp3 = dot(d3, p3p);\n  float fx = p.x - p0.x;\n  float fy = p.y - p0.y;\n  float m01 = smootherstep(dp0, dp1, fx);\n  float m32 = smootherstep(dp3, dp2, fx);\n  float m01m32 = smootherstep(m01, m32, fy);\n  return m01m32;\n}\n\nfloat perlin2D_normal_1604150559(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    return perlin2D(p, tNoise, tNoiseSize) * 0.5 + 0.5;\n}\n\nfloat cursive_noise_1117569599(vec2 p, float scale, sampler2D tNoise, float tNoiseSize) {\n    const int steps = 13;\n    float sigma = 0.7;\n    float gamma = pow(1.0/sigma, float(steps));\n    vec2 displace = vec2(0);\n    for (int i = 0; i < steps; i++) {\n        displace = 1.5 * vec2(\n          perlin2D_normal_1604150559(p.xy * gamma + displace, tNoise, tNoiseSize),\n          perlin2D_normal_1604150559(p.yx * gamma + displace, tNoise, tNoiseSize)\n        );\n        gamma *= sigma;\n    }\n    return perlin2D_normal_1604150559(p * gamma + displace, tNoise, tNoiseSize);\n}\n\nfloat height_0(vec2 p, float scale, float height, sampler2D tNoise, float tNoiseSize) {\n    p = p * 0.001 * scale;\n    p += 11.0;\n    float h = cursive_noise_1117569599(p, scale, tNoise, tNoiseSize) * height * 1.0;\n    h += pow(perlin2D_normal_1604150559(p * 0.25, tNoise, tNoiseSize) + 0.25, 4.0) * height * 3.0;\n    h = mix(perlin2D_normal_1604150559(p * 0.4, tNoise, tNoiseSize) * height * 1.0, h, h/(height*4.0));\n    return h;\n}\n\nvoid main() {\n  vec2 p = uv * 2.0 - 1.0;\n  if (origin) p = vec2(0);\n  float h = height_0(p * dist, scale, height, tNoise, tNoiseSize);\n  gl_FragColor = vec4(h);\n}\n"]),
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
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_Position = vec4(position, 0, 1);\n  uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform mat4 _invpv;\nuniform vec3 sunDir;\n\nvarying vec2 uv;\n\n#define PI 3.141592\n#define iSteps 16\n#define jSteps 8\n\nvec2 rsi(vec3 r0, vec3 rd, float sr) {\n    // ray-sphere intersection that assumes\n    // the sphere is centered at the origin.\n    // No intersection when result.x > result.y\n    float a = dot(rd, rd);\n    float b = 2.0 * dot(rd, r0);\n    float c = dot(r0, r0) - (sr * sr);\n    float d = (b*b) - 4.0*a*c;\n    if (d < 0.0) return vec2(1e5,-1e5);\n    return vec2(\n        (-b - sqrt(d))/(2.0*a),\n        (-b + sqrt(d))/(2.0*a)\n    );\n}\n\nvec3 atmosphere(vec3 r, vec3 r0, vec3 pSun, float iSun, float rPlanet, float rAtmos, vec3 kRlh, float kMie, float shRlh, float shMie, float g) {\n    // Normalize the sun and view directions.\n    pSun = normalize(pSun);\n    r = normalize(r);\n\n    // Calculate the step size of the primary ray.\n    vec2 p = rsi(r0, r, rAtmos);\n    if (p.x > p.y) return vec3(0,0,0);\n    p.y = min(p.y, rsi(r0, r, rPlanet).x);\n    float iStepSize = (p.y - p.x) / float(iSteps);\n\n    // Initialize the primary ray time.\n    float iTime = 0.0;\n\n    // Initialize accumulators for Rayleigh and Mie scattering.\n    vec3 totalRlh = vec3(0,0,0);\n    vec3 totalMie = vec3(0,0,0);\n\n    // Initialize optical depth accumulators for the primary ray.\n    float iOdRlh = 0.0;\n    float iOdMie = 0.0;\n\n    // Calculate the Rayleigh and Mie phases.\n    float mu = dot(r, pSun);\n    float mumu = mu * mu;\n    float gg = g * g;\n    float pRlh = 3.0 / (16.0 * PI) * (1.0 + mumu);\n    float pMie = 3.0 / (8.0 * PI) * ((1.0 - gg) * (mumu + 1.0)) / (pow(1.0 + gg - 2.0 * mu * g, 1.5) * (2.0 + gg));\n\n    // Sample the primary ray.\n    for (int i = 0; i < iSteps; i++) {\n\n        // Calculate the primary ray sample position.\n        vec3 iPos = r0 + r * (iTime + iStepSize * 0.5);\n\n        // Calculate the height of the sample.\n        float iHeight = length(iPos) - rPlanet;\n\n        // Calculate the optical depth of the Rayleigh and Mie scattering for this step.\n        float odStepRlh = exp(-iHeight / shRlh) * iStepSize;\n        float odStepMie = exp(-iHeight / shMie) * iStepSize;\n\n        // Accumulate optical depth.\n        iOdRlh += odStepRlh;\n        iOdMie += odStepMie;\n\n        // Calculate the step size of the secondary ray.\n        float jStepSize = rsi(iPos, pSun, rAtmos).y / float(jSteps);\n\n        // Initialize the secondary ray time.\n        float jTime = 0.0;\n\n        // Initialize optical depth accumulators for the secondary ray.\n        float jOdRlh = 0.0;\n        float jOdMie = 0.0;\n\n        // Sample the secondary ray.\n        for (int j = 0; j < jSteps; j++) {\n\n            // Calculate the secondary ray sample position.\n            vec3 jPos = iPos + pSun * (jTime + jStepSize * 0.5);\n\n            // Calculate the height of the sample.\n            float jHeight = length(jPos) - rPlanet;\n\n            // Accumulate the optical depth.\n            jOdRlh += exp(-jHeight / shRlh) * jStepSize;\n            jOdMie += exp(-jHeight / shMie) * jStepSize;\n\n            // Increment the secondary ray time.\n            jTime += jStepSize;\n        }\n\n        // Calculate attenuation.\n        vec3 attn = exp(-(kMie * (iOdMie + jOdMie) + kRlh * (iOdRlh + jOdRlh)));\n\n        // Accumulate scattering.\n        totalRlh += odStepRlh * attn;\n        totalMie += odStepMie * attn;\n\n        // Increment the primary ray time.\n        iTime += iStepSize;\n\n    }\n\n    // Calculate and return the final color.\n    return iSun * (pRlh * kRlh * totalRlh + pMie * kMie * totalMie);\n}\n\nvoid main() {\n  vec4 r4 = _invpv * vec4(2.0 * uv - 1.0, 1, 1);\n  vec3 r = normalize(r4.xyz/r4.w);\n  vec3 c = atmosphere(\n      r,                              // normalized ray direction\n      vec3(0,6372e3,0),               // ray origin\n      sunDir,                         // direction of the sun\n      22.0,                           // intensity of the sun\n      6371e3,                         // radius of the planet in meters\n      6471e3,                         // radius of the atmosphere in meters\n      vec3(5.5e-6, 13.0e-6, 22.4e-6), // Rayleigh scattering coefficient\n      21e-6,                          // Mie scattering coefficient\n      8e3,                            // Rayleigh scale height\n      1.2e3,                          // Mie scale height\n      0.758                           // Mie preferred scattering direction\n    );\n  // super duper hacky approximation of sun intensity & radius\n  float d = clamp(dot(r, sunDir), 0.0, 1.0);\n  float d2 = clamp(dot(vec3(0,1,0), sunDir), 0.0, 1.0);\n  c = mix(c, c * mix(4.0, 8.0, d2), smoothstep(0.999, 0.9999, d));\n  gl_FragColor = vec4(c, 1);\n}\n"]),
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
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_Position = vec4(position, 0, 1);\n  uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tHeight;\nuniform vec3 sunDir;\nuniform float horizon;\n\nvarying vec2 uv;\n\nfloat noise(vec2 p) {\n  p = (p + horizon) / (horizon * 2.0);\n  return texture2D(tHeight, p).r;\n}\n\nvoid main() {\n  vec2 r0_2d = horizon * (uv * 2.0 - 1.0);\n  vec3 r0 = vec3(r0_2d.x, noise(r0_2d.xy), r0_2d.y);\n  float t = 0.1;\n  float dt = 8.0;\n  float hShadow = 0.0;\n  for (int i = 0; i < 8192; i++) {\n    vec3 r = r0 + sunDir * t;\n    float h = noise(r.xz) - sunDir.y * t;\n    hShadow = max(hShadow, h);\n    t += dt;\n  }\n  gl_FragColor = vec4(hShadow);\n}\n"]),
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
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_Position = vec4(position, 0, 1);\n  uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tPosition, tNoise;\nuniform float tNoiseSize, scale, height;\n\nvarying vec2 uv;\n\nfloat smootherstep(float a, float b, float r) {\n    r = clamp(r, 0.0, 1.0);\n    r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);\n    return mix(a, b, r);\n}\n\nfloat perlin2D(vec2 p, sampler2D tNoise, float tNoiseSize) {\n  vec2 p0 = floor(p);\n  vec2 p1 = p0 + vec2(1, 0);\n  vec2 p2 = p0 + vec2(1, 1);\n  vec2 p3 = p0 + vec2(0, 1);\n  vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;\n  vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;\n  vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;\n  vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;\n  vec2 p0p = p - p0;\n  vec2 p1p = p - p1;\n  vec2 p2p = p - p2;\n  vec2 p3p = p - p3;\n  float dp0 = dot(d0, p0p);\n  float dp1 = dot(d1, p1p);\n  float dp2 = dot(d2, p2p);\n  float dp3 = dot(d3, p3p);\n  float fx = p.x - p0.x;\n  float fy = p.y - p0.y;\n  float m01 = smootherstep(dp0, dp1, fx);\n  float m32 = smootherstep(dp3, dp2, fx);\n  float m01m32 = smootherstep(m01, m32, fy);\n  return m01m32;\n}\n\nfloat perlin2D_normal_1604150559(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    return perlin2D(p, tNoise, tNoiseSize) * 0.5 + 0.5;\n}\n\nfloat cursive_noise_1117569599(vec2 p, float scale, sampler2D tNoise, float tNoiseSize) {\n    const int steps = 13;\n    float sigma = 0.7;\n    float gamma = pow(1.0/sigma, float(steps));\n    vec2 displace = vec2(0);\n    for (int i = 0; i < steps; i++) {\n        displace = 1.5 * vec2(\n          perlin2D_normal_1604150559(p.xy * gamma + displace, tNoise, tNoiseSize),\n          perlin2D_normal_1604150559(p.yx * gamma + displace, tNoise, tNoiseSize)\n        );\n        gamma *= sigma;\n    }\n    return perlin2D_normal_1604150559(p * gamma + displace, tNoise, tNoiseSize);\n}\n\nfloat height_0(vec2 p, float scale, float height, sampler2D tNoise, float tNoiseSize) {\n    p = p * 0.001 * scale;\n    p += 11.0;\n    float h = cursive_noise_1117569599(p, scale, tNoise, tNoiseSize) * height * 1.0;\n    h += pow(perlin2D_normal_1604150559(p * 0.25, tNoise, tNoiseSize) + 0.25, 4.0) * height * 3.0;\n    h = mix(perlin2D_normal_1604150559(p * 0.4, tNoise, tNoiseSize) * height * 1.0, h, h/(height*4.0));\n    return h;\n}\n\nvoid main() {\n  vec4 src = texture2D(tPosition, uv);\n  if (src.a == 0.0) discard;\n  vec2 p = src.xz;\n  float dr = 0.1;\n  float n0, nx, nz;\n  n0 = height_0(p, scale, height, tNoise, tNoiseSize);\n  nx = height_0(p + vec2(dr, 0), scale, height, tNoise, tNoiseSize);\n  nz = height_0(p + vec2(0, dr), scale, height, tNoise, tNoiseSize);\n  vec3 n0nx = vec3(dr, nx - n0, 0);\n  vec3 n0nz = vec3(0,  nz - n0, dr);\n  gl_FragColor = vec4(normalize(cross(n0nz, n0nx)), 1);\n}\n"]),
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
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_Position = vec4(position, 0, 1);\n  uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform samplerCube tSky;\nuniform sampler2D tPosition, tShadow;\nuniform mat4 invpv;\nuniform vec3 sunDir, campos;\nuniform float horizon, fog, groundFog, groundFogAlt;\n\nvarying vec2 uv;\n\nfloat shadow(vec2 p) {\n  p = (p + horizon) / (horizon * 2.0);\n  return texture2D(tShadow, p).r;\n}\n\nfloat light(vec3 r0) {\n  return clamp(0.01 * (r0.y - shadow(r0.xz)), 0.0, 1.0);\n}\n\nfloat density(vec3 p) {\n  float constant_fog = fog;\n  float ground_fog = (1.0 - exp(-0.001 * max(0.0, groundFogAlt - p.y))) * groundFog;\n  return constant_fog + ground_fog;\n}\n\nvoid main() {\n  vec4 pos = texture2D(tPosition, uv);\n  vec3 sunColor = textureCube(tSky, sunDir).rgb;\n  vec3 skyColor = textureCube(tSky, vec3(0,1,0)).rgb;\n  float extinction = 1.0;\n  vec3 scattering = vec3(0);\n  const int steps = 256;\n  const float scatteringFactor = 0.01;\n  const float extinctionFactor = 0.05;\n  float dist;\n  vec3 rd;\n  if (pos.a == 0.0) {\n    dist = horizon;\n    vec4 r4 = invpv * vec4(2.0 * uv - 1.0, 1, 1);\n    rd = normalize(r4.xyz/r4.w);\n  } else {\n    dist = distance(pos.xyz, campos);\n    rd = normalize(pos.xyz - campos);\n  }\n  float dt = dist/float(steps - 1);\n  float t = 0.0;\n  for (int i = 0; i < steps; i++) {\n    vec3 r = campos + rd * t;\n    float dens = density(r);\n    float coeffScattering = scatteringFactor * dens;\n    float coeffExtinction = extinctionFactor * dens;\n    extinction *= exp(-coeffExtinction * dt);\n    vec3 sun = skyColor * 8.0;\n    sun += light(r) * sunColor;\n    vec3 stepScattering = coeffScattering * dt * sun;\n    scattering += extinction * stepScattering;\n    t += dt;\n  }\n  gl_FragColor = vec4(scattering, extinction);\n}\n"]),
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
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_Position = vec4(position, 0, 1);\n  uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform sampler2D tPosition, tNormal, tNoise;\nuniform vec3 highFlat0, highFlat1, highSteep0, highSteep1, lowFlat0, lowFlat1, lowSteep0, lowSteep1;\nuniform float tNoiseSize;\n\nfloat smootherstep(float a, float b, float r) {\n    r = clamp(r, 0.0, 1.0);\n    r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);\n    return mix(a, b, r);\n}\n\nfloat perlin2D(vec2 p, sampler2D tNoise, float tNoiseSize) {\n  vec2 p0 = floor(p);\n  vec2 p1 = p0 + vec2(1, 0);\n  vec2 p2 = p0 + vec2(1, 1);\n  vec2 p3 = p0 + vec2(0, 1);\n  vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;\n  vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;\n  vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;\n  vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;\n  vec2 p0p = p - p0;\n  vec2 p1p = p - p1;\n  vec2 p2p = p - p2;\n  vec2 p3p = p - p3;\n  float dp0 = dot(d0, p0p);\n  float dp1 = dot(d1, p1p);\n  float dp2 = dot(d2, p2p);\n  float dp3 = dot(d3, p3p);\n  float fx = p.x - p0.x;\n  float fy = p.y - p0.y;\n  float m01 = smootherstep(dp0, dp1, fx);\n  float m32 = smootherstep(dp3, dp2, fx);\n  float m01m32 = smootherstep(m01, m32, fy);\n  return m01m32;\n}\n\nfloat perlin2D_normal_1604150559(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    return perlin2D(p, tNoise, tNoiseSize) * 0.5 + 0.5;\n}\n\nfloat cursive_noise_1117569599(vec2 p, float scale, sampler2D tNoise, float tNoiseSize) {\n    const int steps = 13;\n    float sigma = 0.7;\n    float gamma = pow(1.0/sigma, float(steps));\n    vec2 displace = vec2(0);\n    for (int i = 0; i < steps; i++) {\n        displace = 1.5 * vec2(\n          perlin2D_normal_1604150559(p.xy * gamma + displace, tNoise, tNoiseSize),\n          perlin2D_normal_1604150559(p.yx * gamma + displace, tNoise, tNoiseSize)\n        );\n        gamma *= sigma;\n    }\n    return perlin2D_normal_1604150559(p * gamma + displace, tNoise, tNoiseSize);\n}\n\nvarying vec2 uv;\n\nvoid main() {\n  vec4 pos = texture2D(tPosition, uv).rgba;\n  if (pos.a == 0.0) discard;\n  vec3 n = texture2D(tNormal, uv).xyz;\n  float slope = clamp(dot(n, vec3(0,1,0)), 0.0, 1.0);\n  slope = pow(slope, 4.0);\n  float h = clamp(pos.y/51200.0, 0.0, 1.0);\n  vec3 lowFlat = mix(lowFlat0, lowFlat1, cursive_noise_1117569599(pos.xz * 0.001 + 1.0, 1.0, tNoise, tNoiseSize));\n  vec3 highFlat = mix(highFlat0, highFlat1, cursive_noise_1117569599(pos.xz * 0.001 - 1.0, 1.0, tNoise, tNoiseSize));\n  vec3 lowSteep = mix(lowSteep0, lowSteep1, cursive_noise_1117569599(pos.xz * 0.001 + 2.0, 1.0, tNoise, tNoiseSize));\n  vec3 highSteep = mix(highSteep0, highSteep1, cursive_noise_1117569599(pos.xz * 0.001 - 2.0, 1.0, tNoise, tNoiseSize));\n  vec3 _flat = mix(lowFlat, highFlat, h);\n  vec3 steep = mix(lowSteep, highSteep, h);\n  vec3 c = mix(steep, _flat, slope) * 0.25;\n  gl_FragColor = vec4(c, 1);\n}\n"]),
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
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_Position = vec4(position, 0, 1);\n  uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform samplerCube tSky;\nuniform sampler2D tPosition, tNormal, tAOSampling, tNoise;\nuniform float tNoiseSize, scale, height, tAOSamplingSize;\n\nvarying vec2 uv;\n\nfloat smootherstep(float a, float b, float r) {\n    r = clamp(r, 0.0, 1.0);\n    r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);\n    return mix(a, b, r);\n}\n\nfloat perlin2D(vec2 p, sampler2D tNoise, float tNoiseSize) {\n  vec2 p0 = floor(p);\n  vec2 p1 = p0 + vec2(1, 0);\n  vec2 p2 = p0 + vec2(1, 1);\n  vec2 p3 = p0 + vec2(0, 1);\n  vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;\n  vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;\n  vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;\n  vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;\n  vec2 p0p = p - p0;\n  vec2 p1p = p - p1;\n  vec2 p2p = p - p2;\n  vec2 p3p = p - p3;\n  float dp0 = dot(d0, p0p);\n  float dp1 = dot(d1, p1p);\n  float dp2 = dot(d2, p2p);\n  float dp3 = dot(d3, p3p);\n  float fx = p.x - p0.x;\n  float fy = p.y - p0.y;\n  float m01 = smootherstep(dp0, dp1, fx);\n  float m32 = smootherstep(dp3, dp2, fx);\n  float m01m32 = smootherstep(m01, m32, fy);\n  return m01m32;\n}\n\nfloat perlin2D_normal_1604150559(vec2 p, sampler2D tNoise, float tNoiseSize) {\n    return perlin2D(p, tNoise, tNoiseSize) * 0.5 + 0.5;\n}\n\nfloat cursive_noise_1117569599(vec2 p, float scale, sampler2D tNoise, float tNoiseSize) {\n    const int steps = 13;\n    float sigma = 0.7;\n    float gamma = pow(1.0/sigma, float(steps));\n    vec2 displace = vec2(0);\n    for (int i = 0; i < steps; i++) {\n        displace = 1.5 * vec2(\n          perlin2D_normal_1604150559(p.xy * gamma + displace, tNoise, tNoiseSize),\n          perlin2D_normal_1604150559(p.yx * gamma + displace, tNoise, tNoiseSize)\n        );\n        gamma *= sigma;\n    }\n    return perlin2D_normal_1604150559(p * gamma + displace, tNoise, tNoiseSize);\n}\n\nfloat height_0(vec2 p, float scale, float height, sampler2D tNoise, float tNoiseSize) {\n    p = p * 0.001 * scale;\n    p += 11.0;\n    float h = cursive_noise_1117569599(p, scale, tNoise, tNoiseSize) * height * 1.0;\n    h += pow(perlin2D_normal_1604150559(p * 0.25, tNoise, tNoiseSize) + 0.25, 4.0) * height * 3.0;\n    h = mix(perlin2D_normal_1604150559(p * 0.4, tNoise, tNoiseSize) * height * 1.0, h, h/(height*4.0));\n    return h;\n}\n\nvoid main() {\n  vec4 src = texture2D(tPosition, uv);\n  if (src.a == 0.0) discard;\n  vec3 n = texture2D(tNormal, uv).xyz;\n  vec3 p = src.xyz;\n  p.y = height_0(p.xz, scale, height, tNoise, tNoiseSize);\n  vec3 ambient = vec3(0);\n  float occlusion = 0.0;\n  for (int i = 0; i < 65536; i++) {\n    if (float(i) > tAOSamplingSize) break;\n    vec3 r = texture2D(tAOSampling, vec2(float(i)/tAOSamplingSize)).xyz;\n    if (dot(n, r) < 0.0) {\n      r = -r;\n    }\n    vec3 p2 = p + r;\n    if (p2.y <= height_0(p2.xz, scale, height, tNoise, tNoiseSize)) {\n      occlusion += 1.0;\n    }\n    r.y = abs(r.y);\n    ambient += textureCube(tSky, normalize(r)).rgb;\n  }\n  ambient = ambient / tAOSamplingSize;\n  float ao = 1.0 - occlusion / tAOSamplingSize;\n  gl_FragColor = vec4(ambient, ao);\n}\n"]),
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
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_Position = vec4(position, 0, 1);\n  uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform samplerCube tSky;\nuniform sampler2D tPosition, tNormal, tHeight, tShadow;\nuniform vec3 sunDir;\nuniform float horizon;\n\nvarying vec2 uv;\n\nfloat noise(vec2 p) {\n  p = (p + horizon) / (horizon * 2.0);\n  return texture2D(tHeight, p).r;\n}\n\nfloat shadow(vec2 p) {\n  p = (p + horizon) / (horizon * 2.0);\n  return texture2D(tShadow, p).r;\n}\n\nfloat light(vec3 r0) {\n  return clamp(0.01 * (r0.y - shadow(r0.xz)), 0.0, 1.0);\n}\n\nvoid main() {\n  vec4 src = texture2D(tPosition, uv);\n  if (src.a == 0.0) discard;\n  vec3 n = texture2D(tNormal, uv).xyz;\n  vec3 p = src.xyz;\n  p.y = noise(p.xz);\n  float angle = clamp(dot(n, sunDir), 0.0, 1.0);\n  vec3 sunlight = textureCube(tSky, sunDir).rgb * light(p + n * 64.0) * angle;\n  gl_FragColor = vec4(sunlight, 1);\n}\n"]),
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
    vert: glslify(["precision highp float;\n#define GLSLIFY 1\n\nattribute vec2 position;\n\nvarying vec2 uv;\n\nvoid main() {\n  gl_Position = vec4(position, 0, 1);\n  uv = 0.5 + 0.5 * position;\n}\n"]),
    frag: glslify(["precision highp float;\n#define GLSLIFY 1\n\nuniform samplerCube tSky;\nuniform sampler2D tPosition, tDirect, tAO, tDiffuse, tMedia;\nuniform mat4 invpv;\nuniform vec3 sunDir;\n\nvarying vec2 uv;\n\nvoid main() {\n\n  vec4 pos = texture2D(tPosition, uv);\n  vec4 r4 = invpv * vec4(2.0 * uv - 1.0, 1, 1);\n  vec3 rd = normalize(r4.xyz/r4.w);\n  vec3 sky = textureCube(tSky, rd).rgb;\n  vec3 sun = textureCube(tSky, sunDir).rgb;\n  vec3 direct = texture2D(tDirect, uv).rgb;\n  vec4 ao = texture2D(tAO, uv);\n  vec3 diffuse = texture2D(tDiffuse, uv).rgb;\n  vec4 pmedia = texture2D(tMedia, uv);\n\n  vec3 c;\n  if (pos.a == 0.0) {\n    c = sky;\n  } else {\n    c = diffuse * (1.0 * direct + ao.rgb * pow(ao.a, 8.0));\n  }\n\n  c = pmedia.rgb + pmedia.a * c;\n  c = pow(c, vec3(1.0/2.2));\n  gl_FragColor = vec4(c, 1);\n\n}\n"]),
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

},{"glslify":4}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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
var Alea = require('alea');

const status = document.getElementById('status');
const next = document.getElementById('next');
const download = document.getElementById('download');
const canvas = document.getElementById('render-canvas');

let regl;
let random = new Alea();

document.addEventListener('DOMContentLoaded', main, false);
window.addEventListener('resize', reflow, false);
next.addEventListener('click', render);
download.addEventListener('click', downloadImage);
window.addEventListener('error', handleError);

function main() {
  regl = reglib({
    canvas: canvas,
    extensions: ['OES_texture_float', 'OES_texture_float_linear', 'OES_element_index_uint'],
    attributes: {
      preserveDrawingBuffer: true
    }
  });
  reflow();
  render();
}

function render() {
  status.style.display = 'block';
  status.style.lineHeight = window.innerHeight + 'px';
  renderer.render(regl, {
    callback: updateStatus,
    canvas: canvas,
    fov: random() * 50 + 25,
    dir: random() * 360,
    alt: random() * 1024 * 2 + 1,
    tod: 6 + random(),
    colors: {
      high: {
        steep: [[0.45 - random() * 0.35, 0.25 - random() * 0.15, 0], [0.45 - random() * 0.35, 0.25 - random() * 0.15, 0]],
        flat: [[1, 1, 1], [1, 1, 1]]
      },
      low: {
        steep: [[0.5 - random() * 0.25, 0.25 - random() * 0.25, 0], [0.5 - random() * 0.25, 0.25 - random() * 0.25, 0]],
        flat: [[1, 1, 1], [1, 1, 1]]
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

},{"./render.js":10,"alea":1,"filesaver.js":2,"regl":5,"sprintf":6}],10:[function(require,module,exports){
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

let cmd, tNoise, tAOSampling, chunkMesh, progressiveCmd;

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
    let r = Math.random() * Math.PI * 2.0;
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
    let r = Math.random() * 2.0 * Math.PI;
    let z = Math.random() * 2.0 - 1.0;
    let zScale = Math.sqrt(1.0 - z * z) * len;
    array[i * 3 + 0] = Math.cos(r) * zScale;
    array[i * 3 + 1] = Math.sin(r) * zScale;
    array[i * 3 + 2] = z * len;
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

},{"./commands":7,"./framebuffers":8,"gl-matrix":3}]},{},[9]);
