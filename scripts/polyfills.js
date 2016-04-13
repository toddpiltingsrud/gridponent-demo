if (!String.prototype.repeat) {
  String.prototype.repeat = function(count) {
    'use strict';
    if (this == null) {
      throw new TypeError('can\'t convert ' + this + ' to object');
    }
    var str = '' + this;
    count = +count;
    if (count != count) {
      count = 0;
    }
    if (count < 0) {
      throw new RangeError('repeat count must be non-negative');
    }
    if (count == Infinity) {
      throw new RangeError('repeat count must be less than infinity');
    }
    count = Math.floor(count);
    if (str.length == 0 || count == 0) {
      return '';
    }
    // Ensuring count is a 31-bit integer allows us to heavily optimize the
    // main part. But anyway, most current (August 2014) browsers can't handle
    // strings 1 << 28 chars or longer, so:
    if (str.length * count >= 1 << 28) {
      throw new RangeError('repeat count must not overflow maximum string size');
    }
    var rpt = '';
    for (;;) {
      if ((count & 1) == 1) {
        rpt += str;
      }
      count >>>= 1;
      if (count == 0) {
        break;
      }
      str += str;
    }
    // Could we try:
    // return Array(count + 1).join(this);
    return rpt;
  }
}


if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function(predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.findIndex called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return i;
      }
    }
    return -1;
  };
}

var todd = todd || {};

todd.indent = 0;

todd.stringify = function (a) {
    var t, i, props, s = new gridponent.StringBuilder(), apos = "'";
    // this is a recursive function
    // so we have to detect the type on every iteration
    t = gridponent.getType(a);
    if (/^(true|false)$/.test(a)) t = 'boolean';
    switch (t) {
        case null:
            s.add('null');
            break;
        case 'number':
        case 'boolean':
            s.add(a);
            break;
        case 'string':
            s.add(apos)
             .add(a)
             .add(apos);
            break;
        case 'date':
            s.add('Date(' + a.getTime() + ')');
            break;
        case 'array':
            s.add('[\r\n');
            todd.indent += 4;
            for (i = 0; i < a.length; i++) {
                if (i > 0) {
                    s.add(',\r\n');
                }
                s.add(' '.repeat(todd.indent))
                 .add(todd.stringify(a[i]));
            }
            todd.indent -= 4;
            s.add('\r\n')
             .add(' '.repeat(todd.indent))
             .add(']');
            break;
        case 'object':
            props = Object.getOwnPropertyNames(a);
            s.add('{\r\n');
            todd.indent += 4;
            for (i = 0; i < props.length; i++) {
                if (props[i] != 'id' && !gridponent.isNullOrEmpty(a[props[i]])) {
                    s.add(' '.repeat(todd.indent))
                     .add(apos + props[i].replace('-', '') + apos + ':')
                     .add(todd.stringify(a[props[i]]));
                    if (i < props.length) {
                        s.add(',\r\n');
                    }
                }
            }
            todd.indent -= 4;
            s.add(' '.repeat(todd.indent));
            s.add('}');
            break;
        default:
            throw "Could not determine type: " + a;
    }
    return s.toString();
};

todd.ponentia = function (options) {
    var html = new gridponent.StringBuilder();
    todd.indent = 4;
    html.add('<grid-ponent');

    // attributes
    Object.getOwnPropertyNames(options).forEach(function (attr) {
        if (attr != 'columns' && /template/.test(attr) == false) {
            html.add('\r\n')
                .add(' '.repeat(todd.indent))
                .add(attr).add('="').add(gridponent.escapeHTML(options[attr])).add('"');
        }
    });

    html.add('>');

    // templates
    Object.getOwnPropertyNames(options).forEach(function (attr) {
        if (/template/.test(attr)) {
            html.add(todd.getTemplate(options[attr], attr));
        }
    });

    // columns
    options.columns.forEach(function (colConfig) {
        html.add(todd.getColumn(colConfig));
    });

    todd.indent -= 4;

    html.add('\r\n</grid-ponent>');

    return html.toString();
};

todd.getColumn = function (colConfig) {
    var html = new gridponent.StringBuilder();
    var hasTemplates = false;

    html.add('\r\n')
        .add(' '.repeat(todd.indent))
        .add('<gp-column');

    // atributes
    Object.getOwnPropertyNames(colConfig).forEach(function (attr) {
        if (attr != 'id' && /template/.test(attr) == false) {
            html.add(' ').add(attr).add('="').add(gridponent.escapeHTML(colConfig[attr])).add('"');
        }
    });

    html.add('>');

    todd.indent += 4;

    // templates
    Object.getOwnPropertyNames(colConfig).forEach(function (attr) {
        if (/template/.test(attr)) {
            hasTemplates = true;
            html.add(todd.getTemplate(colConfig[attr], attr));
        }
    });

    todd.indent -= 4;

    if (hasTemplates) html.add('\r\n').add(' '.repeat(todd.indent));

    html.add('</gp-column>');

    return html.toString();
};

todd.getTemplate = function (template, attr, indent) {
    var type = attr.replace('template', '').replace('-', ''),
        html = new gridponent.StringBuilder();

    html.add('\r\n')
        .add(' '.repeat(todd.indent))
        .add('<script type="text/html" data-template="')
        .add(type)
        .add('">\r\n')
        .add( (todd.indent += 4) ? '' : '' )
        .add(' '.repeat(todd.indent))
        .add(template)
        .add( (todd.indent -= 4) ? '' : '' )
        .add('\r\n')
        .add(' '.repeat(todd.indent))
        .add('</script>');

    return html.toString();
};