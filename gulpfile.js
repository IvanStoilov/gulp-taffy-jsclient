var gulp = require('gulp');
var gulpTaffyTypescriptClient = require('./index.js');

gulp.task('default', run);

function run() {
    return gulp.src(['./test/fixtures/*.cfc'])
        .pipe(gulpTaffyTypescriptClient('http://example.com.'))
        .pipe(gulp.dest('./dist'));
}
