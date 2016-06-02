var through = require('through2');
var path = require('path');
var fs = require('fs');
var taffyTypescriptClient = require('taffy-typescript-client');

const PLUGIN_NAME = 'gulp-taffy-typescript-client';

function gulpTaffyTypescriptClient(baseUrl) {
    // creating a stream through which each file will pass
    var stream = through.obj(function (file, enc, cb) {
        if (file.isBuffer()) {
            handleBuffer.call(this, file, baseUrl, enc, cb);
        }

        if (file.isStream()) {
            // TODO: Implement this
        }
    });

    // returning the file stream
    return stream;
}

function handleBuffer(file, baseUrl, enc, cb) {
    var endpointName = path.basename(file.path, path.extname(file.path));

    taffyTypescriptClient(file.contents.toString(enc), endpointName, baseUrl, (err, data) => {
        if (err) {
            this.emit.bind(this, 'error', err);
        } else {
            file.contents = new Buffer(data);

            // make sure the file goes through the next gulp plugin
            this.push(file);
        }

        // tell the stream engine that we are done with this file
        cb();
    });
}

function taffyStream() {
    return through();
}

// exporting the plugin main function
module.exports = gulpTaffyTypescriptClient;