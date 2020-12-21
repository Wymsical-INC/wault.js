const {src, dest, series, parallel, watch, task} = require('gulp');
const browserify = require('browserify');
const tsify = require('tsify');
const source = require('vinyl-source-stream');
const uglify = require('gulp-uglify');
const streamify = require('gulp-streamify');
const connect = require('gulp-connect');
const sourcemaps = require('gulp-sourcemaps');
const buffer = require('vinyl-buffer');
const sass = require('gulp-sass');
sass.compiler = require('node-sass');

task('scripts', function () {
    return browserify({
        basedir: './src',
        debug: true,
        entries: ['./index.ts'],
        cache: {},
        packageCache: {}
    })
        .plugin(tsify)
        .bundle().on('error', function (e) {
            return console.log(e);
        })
        .pipe(source('wault.js'))
        .pipe(buffer())
        .pipe(streamify(uglify()))
        .pipe(dest('./dist'))
        .pipe(connect.reload());
});

task('styles', function () {
    return src('./src/wault.scss')
        .pipe(sass({
            outputStyle: 'compressed'
        }).on('error', sass.logError))
        .pipe(dest('./dist'))
        .pipe(connect.reload());
});

task('watchScripts', function () {
    watch(['./src/**/*.ts'], series('scripts'));
});

task('watchStyles', function () {
    watch(['./src/wault.scss'], series('styles'));
});

task('server', function () {
    connect.server({
        name: 'server',
        root: 'dist',
        livereload: true,
        port: 5019
    });
});

task('default', series('scripts', 'styles', parallel('watchScripts', 'watchStyles', 'server')));
task('build', series('scripts', 'styles'));
