var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var path = require('path');
var fs = require('fs');

const PLUGIN_NAME = 'gulp-taffy-jsclient';

function gulpTaffy(resourceModule, configParam, sourceFile) {
    // creating a stream through which each file will pass
    var stream = through.obj(function(file, enc, cb) {
        function handleBuffer(err, data) {
            if (err) {
                this.emit.bind(this, 'error');

                cb();

                return;
            }

            file.contents = new Buffer(generateClient(file, resourceModule, data, configParam));

            // make sure the file goes through the next gulp plugin
            this.push(file);

            // tell the stream engine that we are done with this file
            cb();
        }

        if (file.isBuffer()) {
            fs.readFile(sourceFile, 'utf8', handleBuffer.bind(this));
        }

        if (file.isStream()) {
            // define the streamer that will transform the content
            var streamer = taffyStream();
            // catch errors from the streamer and emit a gulp plugin error
            streamer.on('error', this.emit.bind(this, 'error'));
            // start the transformation
            file.contents = file.contents.pipe(streamer);
        }
    });

    // returning the file stream
    return stream;
};

function capitalize(str) {
    if (str.length === 0) {
        return str;
    }

    return str.substr(0, 1).toUpperCase() + str.substr(1);
}

function taffyStream() {
    var stream = through();
    stream.write("woot");
    return stream;
}

function startsWithBracket (item) {
    return item.charAt(0) === '{';
}

function strpBrackets(item) {
    return item.replace(/[\{\}]/g, '');
}

function generateClient(file, resourceModule, sourceFile, configParam) {
    var obj = JSON.parse(file.contents);
    var component = obj.cfcomponent;

    if (!component.$.taffy_uri) {
        return "";
    }

    var endpoint = {
        name: path.basename(file.path).split('.').shift(),
        url: component.$.taffy_uri,
        arguments: component.$.taffy_uri.split('/').filter(startsWithBracket).map(strpBrackets),
        verbs: []
    };

    component.cffunction.forEach(function (func) {
        endpoint.verbs.push({
            name: func.$.name,
            arguments: !func.cfargument ? [] : func.cfargument.map(function (item) {
                return item.$
            })
        });
    });

    var funcTemp = " function {0}({1}) {\n {2} \n}\n";

    ////////// Methods

    var methods = [];
    endpoint.verbs.forEach(function (verb) {
        var comment = "\n/**\n";

        verb.arguments.forEach(function (arg) {
            comment += format("* @param {{0}} {1} {2}\n", arg.type, arg.name, (arg.required == 'true' ? " (optional)" : ""));
        });
        comment += "*/\n"

        var methodBody = '';
        if (verb.name.match(/(post|put|patch)/i)) {
            methodBody = format('return $http.{0}(url, data, options);', verb.name);
        } else {
            methodBody = format('return $http.{0}(url + Util.encodeQueryData(data), options);', verb.name)
        }
        var methodName = "do" + capitalize(verb.name);

        methods.push(comment + format(funcTemp, methodName, 'data, options', methodBody));
    });

    ////////// Class

    var classArgs = endpoint.arguments;
    var body = format(
        'var url = '+configParam+' + Util.stringFormat("{0}", { {1} });' +
            'return { {2}, url: url } ' +
            '{3}',
        endpoint.url,
        classArgs.map(function(i) {return format('"{0}": {1}', i, i)}).join(', '),
        endpoint.verbs.map(function (i) {
            return format('\t"do{0}": do{1}', capitalize(i.name), capitalize(i.name))
        }).join(",\n"),
        methods.join('')
    );

    var classData = format(funcTemp, endpoint.name, classArgs.join(','), body);

    var toReturn = "this." + endpoint.name + ' = ' + classData;

    var isUsed = sourceFile.indexOf(endpoint.name) > -1;
    if (!isUsed) {
        toReturn = "//" + toReturn.replace(/\n/g, "\n//") + "\n";
    }

    return toReturn;
}

function format(string, args)
{
    for (var i = 1; i < arguments.length; i++) {
        string = string.replace('{'+(i-1)+'}', arguments[i]);
    }

    return string;
}

function getFieldIterator(name) {
    return function (item) {
        return item[name];
    }
}

// exporting the plugin main function
module.exports = gulpTaffy;